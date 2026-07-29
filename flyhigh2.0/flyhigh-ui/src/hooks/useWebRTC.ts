import { useEffect, useRef, useState, useCallback } from "react"
import { useSocket } from "./useSocket"

// Debug logger: no-op in production, console.log in dev
const debug = import.meta.env.DEV
  ? (...args: unknown[]) => console.log("[WebRTC]", ...args)
  : (..._args: unknown[]) => {}

const debugWarn = import.meta.env.DEV
  ? (...args: unknown[]) => console.warn("[WebRTC]", ...args)
  : (..._args: unknown[]) => {}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
}

// ── Diagnostic logger ──

function logState(
  pc: RTCPeerConnection | null,
  label: string,
  role: string,
  extra?: Record<string, unknown>,
) {
  const state = pc
    ? {
        signalingState: pc.signalingState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        connectionState: pc.connectionState,
        localDescription: pc.localDescription
          ? `${pc.localDescription.type} (${pc.localDescription.sdp?.substring(0, 60)}...)`
          : null,
        remoteDescription: pc.remoteDescription
          ? `${pc.remoteDescription.type} (${pc.remoteDescription.sdp?.substring(0, 60)}...)`
          : null,
        senders: pc.getSenders().length,
        receivers: pc.getReceivers().length,
      }
    : null
  debug(
    `[WebRTC:${role}] ${label}`,
    JSON.stringify({ ...(state || {}), ...(extra || {}) }),
  )
}

export function useWebRTC(roomId: string | null, userEmail: string, role: string) {
  const {
    joinRoom,
    emitOffer,
    emitAnswer,
    emitIceCandidate,
    emitEndCall,
    onOffer,
    onAnswer,
    onIceCandidate,
    onCallEnded,
  } = useSocket()

  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const offerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Prevent duplicate startCall/answerCall (React Strict Mode double-mount)
  const isCallActiveRef = useRef(false)
  // Track whether socket listeners have been attached for this room
  const listenersAttachedForRoomRef = useRef<string | null>(null)
  // Queue for ICE candidates that arrive before remoteDescription is set
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])

  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected")
  const [networkQuality, setNetworkQuality] = useState<string>("good")
  const [callDuration, setCallDuration] = useState(0)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [callEnded, setCallEnded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [remoteStreamConnected, setRemoteStreamConnected] = useState(false)

  // ── Cleanup ──

  const cleanup = useCallback(() => {
    debug(`[WebRTC:${role}] cleanup() called`)
    isCallActiveRef.current = false

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (offerIntervalRef.current) {
      clearInterval(offerIntervalRef.current)
      offerIntervalRef.current = null
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
      connectionTimeoutRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
    }
    if (peerConnectionRef.current) {
      const pc = peerConnectionRef.current
      logState(pc, "cleanup — closing PC", role)
      // Remove all event handlers before closing to prevent post-close callbacks
      pc.onicecandidate = null
      pc.ontrack = null
      pc.oniceconnectionstatechange = null
      pc.onnegotiationneeded = null
      pc.onsignalingstatechange = null
      pc.close()
      peerConnectionRef.current = null
    }
    pendingCandidatesRef.current = []
    setConnectionStatus("disconnected")
    setRemoteStreamConnected(false)
  }, [role])

  // ── Timer ──

  useEffect(() => {
    if (connectionStatus === "connected" && !timerRef.current) {
      debug(`[WebRTC:${role}] Starting call timer`)
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [connectionStatus, role])

  // ── Remote call-ended handler ──

  useEffect(() => {
    if (!roomId) return
    const unsub = onCallEnded(() => {
      debug(`[WebRTC:${role}] Remote call-ended received`)
      setCallEnded(true)
      cleanup()
    })
    return unsub
  }, [roomId, onCallEnded, cleanup, role])

  // ── Peer Connection Factory ──
  // Creates the RTCPeerConnection and wires up ICE + track handlers.
  // Does NOT add local tracks — callers must add them after getUserMedia.
  // CRITICAL: Does NOT register onnegotiationneeded — this event fires when
  // addTrack() is called while signalingState is "stable", creating a race
  // with the manual createOffer() in startCall(). The old FlyHigh project
  // never used onnegotiationneeded; screen sharing uses replaceTrack() instead.

  const createPeerConnection = useCallback(() => {
    // Guard: if a non-closed PC already exists, reuse it
    if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== "closed") {
      debug(
        `[WebRTC:${role}] createPeerConnection — reusing existing PC (signalingState=${peerConnectionRef.current.signalingState})`,
      )
      return peerConnectionRef.current
    }

    debug(`[WebRTC:${role}] createPeerConnection — creating NEW PC`)
    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnectionRef.current = pc

    // Log every signalling state change
    pc.onsignalingstatechange = () => {
      logState(pc, `signalingstatechange → ${pc.signalingState}`, role)
    }

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState
      logState(pc, `iceconnectionstatechange → ${state}`, role)
      if (state === "connected" || state === "completed") {
        setConnectionStatus("connected")
        setNetworkQuality("good")
      } else if (state === "disconnected" || state === "failed") {
        setConnectionStatus("disconnected")
        setNetworkQuality("poor")
      } else {
        setConnectionStatus("connecting")
      }
    }

    pc.onicegatheringstatechange = () => {
      debug(
        `[WebRTC:${role}] iceGatheringState → ${pc.iceGatheringState}`,
      )
    }

    pc.onconnectionstatechange = () => {
      debug(
        `[WebRTC:${role}] connectionState → ${pc.connectionState}`,
      )
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && roomId) {
        debug(
          `[WebRTC:${role}] ICE candidate generated: ${event.candidate.type} ${event.candidate.protocol} sdpMLineIndex=${event.candidate.sdpMLineIndex}`,
        )
        emitIceCandidate(event.candidate, roomId)
      } else if (!event.candidate) {
        debug(
          `[WebRTC:${role}] ICE candidate gathering complete (null candidate)`,
        )
      }
    }

    pc.ontrack = (event) => {
      debug(
        `[WebRTC:${role}] ontrack fired — streams=${event.streams.length} trackKind=${event.track.kind} trackLabel=${event.track.label}`,
      )
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
        setRemoteStreamConnected(true)
        debug(`[WebRTC:${role}] Remote stream attached to video element`)

        // Detect remote screen sharing — screen tracks have no device label
        // and getDisplayMedia tracks typically have "screen" or empty labels
        const track = event.track
        const isScreenTrack = track.kind === "video"
          && (track.label === "" || track.label.toLowerCase().includes("screen") || !track.label)
        if (isScreenTrack) {
          setIsRemoteScreenSharing(true)
          debug(`[WebRTC:${role}] Remote peer is sharing their screen`)
        } else if (track.kind === "video") {
          setIsRemoteScreenSharing(false)
          debug(`[WebRTC:${role}] Remote peer is showing camera`)
        }
      }
    }

    // IMPORTANT: No onnegotiationneeded handler.
    // The old working FlyHigh code never used it.
    // addTrack() before createOffer() is the ONLY track addition.
    // Screen sharing uses replaceTrack() which does not require renegotiation.
    // Setting onnegotiationneeded = null explicitly disables the default behavior.
    pc.onnegotiationneeded = null

    logState(pc, "PeerConnection created", role)
    return pc
  }, [roomId, emitIceCandidate, role])

  // ── Local Stream ──

  const startLocalStream = useCallback(async () => {
    try {
      debug(`[WebRTC:${role}] Requesting getUserMedia...`)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      localStreamRef.current = stream
      debug(
        `[WebRTC:${role}] getUserMedia OK — videoTracks=${stream.getVideoTracks().length} audioTracks=${stream.getAudioTracks().length}`,
      )
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      return stream
    } catch (err: any) {
      console.error(`[WebRTC:${role}] getUserMedia failed:`, err.name, err.message)
      const message =
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera and microphone access is required for the video call."
          : "Failed to access camera and microphone. Please check your permissions."
      setPermissionError(message)
      throw err
    }
  }, [role])

  // ── Start / Answer ──

  const startCall = useCallback(async () => {
    if (!roomId) return

    // Guard: prevent duplicate calls
    if (isCallActiveRef.current) {
      debug(`[WebRTC:${role}] startCall — call already active, skipping`)
      return
    }
    isCallActiveRef.current = true

    setIsLoading(true)
    setPermissionError(null)
    debug(`[WebRTC:${role}] startCall() BEGIN — roomId=${roomId}`)

    try {
      // 1. Create PC — guards against duplicate creation internally
      const pc = createPeerConnection()
      logState(pc, "startCall — after createPeerConnection", role)

      // 2. Get media
      await startLocalStream()

      // 3. Add local tracks BEFORE creating offer
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          debug(
            `[WebRTC:${role}] addTrack ${track.kind} (enabled=${track.enabled})`,
          )
          pc.addTrack(track, localStreamRef.current!)
        })
        logState(pc, "startCall — after addTrack", role, {
          trackCount: localStreamRef.current.getTracks().length,
        })
      }

      // 4. Join room
      joinRoom(roomId, userEmail, role)
      debug(`[WebRTC:${role}] joinRoom sent for roomId=${roomId}`)

      // 5. Create and send offer — verify state first
      if (pc.signalingState !== "stable") {
        console.error(
          `[WebRTC:${role}] Cannot createOffer in signalingState=${pc.signalingState}`,
        )
        return
      }

      const offer = await pc.createOffer()
      debug(`[WebRTC:${role}] createOffer OK`)

      if (pc.signalingState !== "stable") {
        console.error(
          `[WebRTC:${role}] Cannot setLocalDescription(offer) in signalingState=${pc.signalingState}`,
        )
        return
      }

      await pc.setLocalDescription(offer)
      logState(pc, "startCall — after setLocalDescription(offer)", role)

      emitOffer(offer, roomId)
      debug(`[WebRTC:${role}] offer emitted to room ${roomId}`)
      setConnectionStatus("connecting")

      // 6. Retry sending the offer every 4 seconds until connection is established
      if (offerIntervalRef.current) {
        clearInterval(offerIntervalRef.current)
      }
      offerIntervalRef.current = setInterval(() => {
        const currentPc = peerConnectionRef.current
        if (
          !currentPc ||
          currentPc.signalingState === "closed" ||
          currentPc.iceConnectionState === "connected" ||
          currentPc.iceConnectionState === "completed"
        ) {
          if (offerIntervalRef.current) {
            clearInterval(offerIntervalRef.current)
            offerIntervalRef.current = null
          }
          return
        }
        // Re-send the existing local description (initial offer only,
        // since we no longer use onnegotiationneeded)
        if (currentPc.localDescription) {
          debug(
            `[WebRTC:${role}] Retrying offer — signalingState=${currentPc.signalingState} iceConnectionState=${currentPc.iceConnectionState}`,
          )
          emitOffer(currentPc.localDescription, roomId)
        }
      }, 4000)

      // 7. Connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
      }
      connectionTimeoutRef.current = setTimeout(() => {
        const currentPc = peerConnectionRef.current
        if (
          currentPc &&
          currentPc.iceConnectionState !== "connected" &&
          currentPc.iceConnectionState !== "completed"
        ) {
          debugWarn(
            `[WebRTC:${role}] Connection timeout after 30s — iceConnectionState=${currentPc.iceConnectionState}`,
          )
          setPermissionError(
            "Connection timed out. The other participant may not have joined the call. Please try again.",
          )
        }
      }, 30000)
    } catch (err: any) {
      console.error(`[WebRTC:${role}] startCall ERROR:`, err)
    } finally {
      setIsLoading(false)
    }
  }, [roomId, userEmail, role, startLocalStream, createPeerConnection, joinRoom, emitOffer])

  const answerCall = useCallback(async () => {
    if (!roomId) return

    // Guard: prevent duplicate calls
    if (isCallActiveRef.current) {
      debug(`[WebRTC:${role}] answerCall — call already active, skipping`)
      return
    }
    isCallActiveRef.current = true

    setIsLoading(true)
    setPermissionError(null)
    debug(`[WebRTC:${role}] answerCall() BEGIN — roomId=${roomId}`)

    try {
      // 1. Create PC — guards against duplicate creation internally
      const pc = createPeerConnection()
      logState(pc, "answerCall — after createPeerConnection", role)

      // 2. Get media and add tracks BEFORE joining the room
      await startLocalStream()

      // 3. Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          debug(
            `[WebRTC:${role}] addTrack ${track.kind} (enabled=${track.enabled})`,
          )
          pc.addTrack(track, localStreamRef.current!)
        })
        logState(pc, "answerCall — after addTrack", role, {
          trackCount: localStreamRef.current.getTracks().length,
        })
      }

      // 4. Join room — tracks are ready when the offer arrives
      joinRoom(roomId, userEmail, role)
      debug(
        `[WebRTC:${role}] joinRoom sent — waiting for offer from caller`,
      )
    } catch (err: any) {
      console.error(`[WebRTC:${role}] answerCall ERROR:`, err)
    } finally {
      setIsLoading(false)
    }
  }, [roomId, userEmail, role, startLocalStream, createPeerConnection, joinRoom])

  // ── Incoming signaling handlers (offer / answer / ICE) ──
  // Both peers need all three: offer (for answerer), answer (for offerer),
  // and ICE candidates (for both).

  useEffect(() => {
    if (!roomId) return

    // Prevent duplicate listener attachments for the same room
    if (listenersAttachedForRoomRef.current === roomId) {
      debug(
        `[WebRTC:${role}] Socket listeners already attached for room ${roomId}, skipping`,
      )
      return
    }
    listenersAttachedForRoomRef.current = roomId
    debug(
      `[WebRTC:${role}] Attaching socket listeners for room ${roomId}`,
    )

    // ── Offer handler (expert / answerer) ──
    const unsubOffer = onOffer(async (offer: any) => {
      const pc = peerConnectionRef.current
      if (!pc) {
        debugWarn(
          `[WebRTC:${role}] Offer received but no PC exists — ignoring`,
        )
        return
      }
      if (pc.signalingState === "closed") {
        debugWarn(
          `[WebRTC:${role}] Offer received but PC is closed — ignoring`,
        )
        return
      }
      debug(
        `[WebRTC:${role}] Offer received — signalingState=${pc.signalingState} offerType=${offer?.type}`,
      )

      try {
        // Verify state before setRemoteDescription
        if (pc.signalingState !== "stable") {
          debugWarn(
            `[WebRTC:${role}] Cannot setRemoteDescription(offer) in signalingState=${pc.signalingState} — ignoring`,
          )
          return
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        logState(pc, "after setRemoteDescription(offer)", role)

        // Flush queued ICE candidates now that remote description is set
        const pending = pendingCandidatesRef.current
        if (pending.length > 0) {
          debug(
            `[WebRTC:${role}] Flushing ${pending.length} pending ICE candidates`,
          )
          for (const c of pending) {
            pc.addIceCandidate(new RTCIceCandidate(c)).catch((err) =>
              console.error(
                `[WebRTC:${role}] Error adding pending ICE candidate:`,
                err,
              ),
            )
          }
          pendingCandidatesRef.current = []
        }

        // Verify state before createAnswer
        if ((pc.signalingState as string) !== "have-remote-offer") {
          debugWarn(
            `[WebRTC:${role}] Cannot createAnswer in signalingState=${pc.signalingState} — ignoring`,
          )
          return
        }

        const answer = await pc.createAnswer()
        debug(`[WebRTC:${role}] createAnswer OK`)

        if ((pc.signalingState as string) !== "have-remote-offer") {
          debugWarn(
            `[WebRTC:${role}] Signaling state changed during createAnswer — aborting`,
          )
          return
        }

        await pc.setLocalDescription(answer)
        logState(pc, "after setLocalDescription(answer)", role)

        emitAnswer(answer, roomId)
        debug(`[WebRTC:${role}] answer emitted to room ${roomId}`)
      } catch (err) {
        console.error(`[WebRTC:${role}] Error handling offer:`, err)
      }
    })

    // ── Answer handler (client / offerer) ──
    const unsubAnswer = onAnswer(async (answer: any) => {
      const pc = peerConnectionRef.current
      if (!pc) {
        debugWarn(
          `[WebRTC:${role}] Answer received but no PC exists — ignoring`,
        )
        return
      }
      if (pc.signalingState === "closed") {
        debugWarn(
          `[WebRTC:${role}] Answer received but PC is closed — ignoring`,
        )
        return
      }
      debug(
        `[WebRTC:${role}] Answer received — signalingState=${pc.signalingState} answerType=${answer?.type}`,
      )

      try {
        // Verify state before setRemoteDescription
        // Valid states for receiving an answer: "have-local-offer" or "stable"
        // (Chrome may transition to "stable" after ICE gathering completes)
        if (
          pc.signalingState !== "have-local-offer" &&
          pc.signalingState !== "stable"
        ) {
          debugWarn(
            `[WebRTC:${role}] Cannot setRemoteDescription(answer) in signalingState=${pc.signalingState} — ignoring`,
          )
          return
        }

        await pc.setRemoteDescription(new RTCSessionDescription(answer))
        logState(pc, "after setRemoteDescription(answer)", role)

        // Flush queued ICE candidates
        const pending = pendingCandidatesRef.current
        if (pending.length > 0) {
          debug(
            `[WebRTC:${role}] Flushing ${pending.length} pending ICE candidates`,
          )
          for (const c of pending) {
            pc.addIceCandidate(new RTCIceCandidate(c)).catch((err) =>
              console.error(
                `[WebRTC:${role}] Error adding pending ICE candidate:`,
                err,
              ),
            )
          }
          pendingCandidatesRef.current = []
        }

        // Stop offer retry now that we have an answer
        if (offerIntervalRef.current) {
          clearInterval(offerIntervalRef.current)
          offerIntervalRef.current = null
        }
      } catch (err) {
        console.error(`[WebRTC:${role}] Error handling answer:`, err)
      }
    })

    // ── ICE candidate handler (both peers) ──
    const unsubIce = onIceCandidate((candidate: any) => {
      if (!candidate) return

      const pc = peerConnectionRef.current
      if (!pc || pc.signalingState === "closed") {
        debugWarn(
          `[WebRTC:${role}] ICE candidate arrived but PC is null/closed — discarding`,
        )
        return
      }

      debug(
        `[WebRTC:${role}] ICE candidate received — type=${candidate.candidate ? candidate.candidate.substring(0, 30) : 'null'} signalingState=${pc.signalingState} hasRemoteDesc=${!!pc.remoteDescription}`,
      )

      // If remote description isn't set yet, queue the candidate
      if (!pc.remoteDescription) {
        debug(
          `[WebRTC:${role}] Queueing ICE candidate (remote description not yet set) — queue size=${pendingCandidatesRef.current.length + 1}`,
        )
        pendingCandidatesRef.current.push(candidate)
        return
      }

      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) =>
        console.error(`[WebRTC:${role}] Error adding ICE candidate:`, err),
      )
    })

    return () => {
      debug(
        `[WebRTC:${role}] Removing socket listeners for room ${roomId}`,
      )
      unsubOffer()
      unsubAnswer()
      unsubIce()
      listenersAttachedForRoomRef.current = null
    }
  }, [roomId, onOffer, onAnswer, onIceCandidate, emitAnswer, role])

  // ── Controls ──

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const t = localStreamRef.current.getAudioTracks()[0]
      if (t) {
        t.enabled = !t.enabled
        setIsMicOn(t.enabled)
        debug(`[WebRTC:${role}] Mic ${t.enabled ? "unmuted" : "muted"}`)
      }
    }
  }, [role])

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const t = localStreamRef.current.getVideoTracks()[0]
      if (t) {
        t.enabled = !t.enabled
        setIsCameraOn(t.enabled)
        debug(`[WebRTC:${role}] Camera ${t.enabled ? "on" : "off"}`)
      }
    }
  }, [role])

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
      const camTrack = localStreamRef.current?.getVideoTracks()[0]
      if (camTrack && peerConnectionRef.current) {
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track?.kind === "video")
        if (sender) {
          sender.replaceTrack(camTrack)
          debug(`[WebRTC:${role}] Screen share stopped — camera track restored`)
        }
      }
      setIsScreenSharing(false)
    } else {
      try {
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: true })
        screenStreamRef.current = ss
        const vt = ss.getVideoTracks()[0]
        if (vt && peerConnectionRef.current) {
          const sender = peerConnectionRef.current
            .getSenders()
            .find((s) => s.track?.kind === "video")
          if (sender) {
            sender.replaceTrack(vt)
            debug(`[WebRTC:${role}] Screen share started`)
          }
          vt.onended = () => {
            debug(`[WebRTC:${role}] Screen share track ended by user`)
            setIsScreenSharing(false)
            const camTrack = localStreamRef.current?.getVideoTracks()[0]
            if (camTrack && peerConnectionRef.current) {
              const sender2 = peerConnectionRef.current
                .getSenders()
                .find((s) => s.track?.kind === "video")
              if (sender2) sender2.replaceTrack(camTrack)
            }
          }
        }
        setIsScreenSharing(true)
      } catch {
        // user cancelled
      }
    }
  }, [isScreenSharing, role])

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullScreen(true)
    } else {
      document.exitFullscreen()
      setIsFullScreen(false)
    }
  }, [])

  const endCall = useCallback(() => {
    debug(`[WebRTC:${role}] endCall() triggered`)
    if (roomId) {
      emitEndCall(roomId)
    }
    cleanup()
    setCallEnded(true)
  }, [roomId, emitEndCall, cleanup, role])

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }, [])

  return {
    localVideoRef,
    remoteVideoRef,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    isRemoteScreenSharing,
    connectionStatus,
    networkQuality,
    callDuration,
    isFullScreen,
    callEnded,
    isLoading,
    permissionError,
    remoteStreamConnected,
    startCall,
    answerCall,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    toggleFullScreen,
    endCall,
    formatDuration,
    cleanup,
  }
}
