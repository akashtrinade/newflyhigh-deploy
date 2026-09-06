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

// ── Types ──

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
    socketRef,
  } = useSocket()

  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const screenVideoRef = useRef<HTMLVideoElement | null>(null)
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
  // Enable onnegotiationneeded only after initial call setup is complete
  const negotiationEnabledRef = useRef(false)
  // Perfect-negotiation glare prevention (polite peer pattern)
  const isMakingOfferRef = useRef(false)
  const ignoreOfferRef = useRef(false)
  // Track received video track IDs to distinguish camera (first) from screen (subsequent)
  const receivedVideoTrackIdsRef = useRef<Set<string>>(new Set())
  // Store the screen stream until the video element mounts (React batching: ontrack
  // fires before the conditional <video> element is committed to the DOM)
  const pendingScreenStreamRef = useRef<MediaStream | null>(null)

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

  // ── Enable renegotiation once connected ──

  useEffect(() => {
    if (connectionStatus === "connected") {
      // Small delay to ensure the initial signaling cycle is fully settled
      const t = setTimeout(() => {
        negotiationEnabledRef.current = true
        debug(`[WebRTC:${role}] Renegotiation enabled`)
      }, 1000)
      return () => clearTimeout(t)
    }
  }, [connectionStatus, role])

  // ── Deferred screen stream attachment ──
  // ontrack fires BEFORE React commits the conditional <video> element to the
  // DOM, so the stream must be stored and attached after the element mounts.
  useEffect(() => {
    if (isRemoteScreenSharing && pendingScreenStreamRef.current && screenVideoRef.current) {
      debug(`[WebRTC:${role}] Attaching deferred screen stream to screenVideoRef`)
      screenVideoRef.current.srcObject = pendingScreenStreamRef.current
      pendingScreenStreamRef.current = null
    }
  }, [isRemoteScreenSharing, role])

  // ── Cleanup ──

  const cleanup = useCallback(() => {
    debug(`[WebRTC:${role}] cleanup() called`)
    isCallActiveRef.current = false
    negotiationEnabledRef.current = false

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
    pendingScreenStreamRef.current = null
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null
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
    isMakingOfferRef.current = false
    ignoreOfferRef.current = false
    receivedVideoTrackIdsRef.current = new Set()
    setConnectionStatus("disconnected")
    setRemoteStreamConnected(false)
    setIsScreenSharing(false)
    setIsRemoteScreenSharing(false)
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

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== "closed") {
      debug(
        `[WebRTC:${role}] createPeerConnection — reusing existing PC (signalingState=${peerConnectionRef.current.signalingState})`,
      )
      return peerConnectionRef.current
    }

    debug(`[WebRTC:${role}] createPeerConnection — creating NEW PC`)
    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnectionRef.current = pc

    pc.onsignalingstatechange = () => {
      logState(pc, `signalingstatechange → ${pc.signalingState}`, role)
      // Reset glare-prevention flags when returning to stable
      if (pc.signalingState === "stable") {
        isMakingOfferRef.current = false
        ignoreOfferRef.current = false
      }
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
      debug(`[WebRTC:${role}] iceGatheringState → ${pc.iceGatheringState}`)
    }

    pc.onconnectionstatechange = () => {
      debug(`[WebRTC:${role}] connectionState → ${pc.connectionState}`)
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && roomId) {
        debug(
          `[WebRTC:${role}] ICE candidate generated: ${event.candidate.type} ${event.candidate.protocol} sdpMLineIndex=${event.candidate.sdpMLineIndex}`,
        )
        emitIceCandidate(event.candidate, roomId)
      } else if (!event.candidate) {
        debug(`[WebRTC:${role}] ICE candidate gathering complete (null candidate)`)
      }
    }

    pc.ontrack = (event) => {
      debug(
        `[WebRTC:${role}] ontrack fired — streams=${event.streams.length} trackKind=${event.track.kind} trackLabel=${event.track.label}`,
      )
      const track = event.track

      if (track.kind === "video") {
        // Robust detection: the FIRST video track is the camera; any subsequent
        // video track added via renegotiation MUST be a screen share. This
        // avoids the fragile label-based heuristic which fails for tab/window
        // shares (Chrome labels like "web-contents-media-stream" don't contain
        // "screen" or "display").
        const isFirstVideoTrack = receivedVideoTrackIdsRef.current.size === 0
        receivedVideoTrackIdsRef.current.add(track.id)
        const isScreenTrack = !isFirstVideoTrack

        if (isScreenTrack) {
          // Store stream for deferred attachment — the <video> element won't
          // exist in the DOM until React re-renders with isRemoteScreenSharing=true
          debug(`[WebRTC:${role}] Screen share track detected (track #${receivedVideoTrackIdsRef.current.size}) — storing for deferred attachment`)
          if (event.streams[0]) {
            pendingScreenStreamRef.current = event.streams[0]
          }
          setIsRemoteScreenSharing(true)
          // Listen for track ending
          track.onended = () => {
            debug(`[WebRTC:${role}] Remote screen share track ended`)
            setIsRemoteScreenSharing(false)
            pendingScreenStreamRef.current = null
            if (screenVideoRef.current) {
              screenVideoRef.current.srcObject = null
            }
          }
        } else {
          // First video track — the camera
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0]
            setRemoteStreamConnected(true)
            debug(`[WebRTC:${role}] Camera track attached to remoteVideoRef`)
          }
          // NOTE: do NOT call setIsRemoteScreenSharing(false) here —
          // if a screen track arrived first (edge case), we don't want to undo it
        }
      }
      // Audio tracks are handled automatically by the video element
    }

    // Renegotiation handler — gated by negotiationEnabledRef
    // Only fires for post-setup changes (screen share add/remove)
    pc.onnegotiationneeded = async () => {
      if (!negotiationEnabledRef.current) {
        debug(`[WebRTC:${role}] onnegotiationneeded — skipped (negotiation not yet enabled)`)
        return
      }
      if (pc.signalingState !== "stable") {
        debug(`[WebRTC:${role}] onnegotiationneeded — skipped (signalingState=${pc.signalingState})`)
        return
      }

      debug(`[WebRTC:${role}] onnegotiationneeded — starting renegotiation`)
      try {
        isMakingOfferRef.current = true
        const offer = await pc.createOffer()
        if (pc.signalingState !== "stable") {
          debug(`[WebRTC:${role}] onnegotiationneeded — state changed during createOffer, aborting`)
          return
        }
        await pc.setLocalDescription(offer)
        logState(pc, "renegotiation — after setLocalDescription(offer)", role)
        if (roomId) {
          emitOffer(offer, roomId)
          debug(`[WebRTC:${role}] Renegotiation offer emitted to room ${roomId}`)
        }
      } catch (err) {
        debugWarn(`[WebRTC:${role}] Renegotiation failed:`, err)
      } finally {
        isMakingOfferRef.current = false
      }
    }

    logState(pc, "PeerConnection created", role)
    return pc
  }, [roomId, emitIceCandidate, role, emitOffer])

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

    if (isCallActiveRef.current) {
      debug(`[WebRTC:${role}] startCall — call already active, skipping`)
      return
    }
    isCallActiveRef.current = true

    setIsLoading(true)
    setPermissionError(null)
    debug(`[WebRTC:${role}] startCall() BEGIN — roomId=${roomId}`)

    try {
      const pc = createPeerConnection()
      logState(pc, "startCall — after createPeerConnection", role)

      await startLocalStream()

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          debug(`[WebRTC:${role}] addTrack ${track.kind} (enabled=${track.enabled})`)
          pc.addTrack(track, localStreamRef.current!)
        })
        logState(pc, "startCall — after addTrack", role, {
          trackCount: localStreamRef.current.getTracks().length,
        })
      }

      joinRoom(roomId, userEmail, role)
      debug(`[WebRTC:${role}] joinRoom sent for roomId=${roomId}`)

      if (pc.signalingState !== "stable") {
        console.error(`[WebRTC:${role}] Cannot createOffer in signalingState=${pc.signalingState}`)
        return
      }

      const offer = await pc.createOffer()
      debug(`[WebRTC:${role}] createOffer OK`)

      if (pc.signalingState !== "stable") {
        console.error(`[WebRTC:${role}] Cannot setLocalDescription(offer) in signalingState=${pc.signalingState}`)
        return
      }

      await pc.setLocalDescription(offer)
      logState(pc, "startCall — after setLocalDescription(offer)", role)

      emitOffer(offer, roomId)
      debug(`[WebRTC:${role}] offer emitted to room ${roomId}`)
      setConnectionStatus("connecting")

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
        if (currentPc.localDescription) {
          debug(
            `[WebRTC:${role}] Retrying offer — signalingState=${currentPc.signalingState} iceConnectionState=${currentPc.iceConnectionState}`,
          )
          emitOffer(currentPc.localDescription, roomId)
        }
      }, 4000)

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

    if (isCallActiveRef.current) {
      debug(`[WebRTC:${role}] answerCall — call already active, skipping`)
      return
    }
    isCallActiveRef.current = true

    setIsLoading(true)
    setPermissionError(null)
    debug(`[WebRTC:${role}] answerCall() BEGIN — roomId=${roomId}`)

    try {
      const pc = createPeerConnection()
      logState(pc, "answerCall — after createPeerConnection", role)

      await startLocalStream()

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          debug(`[WebRTC:${role}] addTrack ${track.kind} (enabled=${track.enabled})`)
          pc.addTrack(track, localStreamRef.current!)
        })
        logState(pc, "answerCall — after addTrack", role, {
          trackCount: localStreamRef.current.getTracks().length,
        })
      }

      joinRoom(roomId, userEmail, role)
      debug(`[WebRTC:${role}] joinRoom sent — waiting for offer from caller`)
    } catch (err: any) {
      console.error(`[WebRTC:${role}] answerCall ERROR:`, err)
    } finally {
      setIsLoading(false)
    }
  }, [roomId, userEmail, role, startLocalStream, createPeerConnection, joinRoom])

  // ── Incoming signaling handlers (offer / answer / ICE) ──

  useEffect(() => {
    if (!roomId) return

    if (listenersAttachedForRoomRef.current === roomId) {
      debug(`[WebRTC:${role}] Socket listeners already attached for room ${roomId}, skipping`)
      return
    }
    listenersAttachedForRoomRef.current = roomId
    debug(`[WebRTC:${role}] Attaching socket listeners for room ${roomId}`)

    // ── Offer handler (expert / answerer + renegotiation) ──
    const unsubOffer = onOffer(async (offer: any) => {
      const pc = peerConnectionRef.current
      if (!pc) {
        debugWarn(`[WebRTC:${role}] Offer received but no PC exists — ignoring`)
        return
      }
      if (pc.signalingState === "closed") {
        debugWarn(`[WebRTC:${role}] Offer received but PC is closed — ignoring`)
        return
      }

      // Perfect-negotiation glare prevention
      const isCollision =
        isMakingOfferRef.current || pc.signalingState !== "stable"

      if (isCollision && isMakingOfferRef.current) {
        // Both peers tried to negotiate — ignore the incoming offer
        // (the polite peer yields; here both use the same rule: if we're making an offer, ignore)
        debugWarn(`[WebRTC:${role}] Ignoring colliding offer (we are making an offer)`)
        ignoreOfferRef.current = true
        return
      }

      debug(`[WebRTC:${role}] Offer received — signalingState=${pc.signalingState} offerType=${offer?.type}`)

      try {
        // Accept in either "stable" (renegotiation) or "have-local-offer" (initial — shouldn't happen for answerer but safety)
        const validStates = ["stable", "have-local-offer"]
        if (!validStates.includes(pc.signalingState)) {
          debugWarn(`[WebRTC:${role}] Cannot setRemoteDescription(offer) in signalingState=${pc.signalingState} — ignoring`)
          return
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        logState(pc, "after setRemoteDescription(offer)", role)

        const pending = pendingCandidatesRef.current
        if (pending.length > 0) {
          debug(`[WebRTC:${role}] Flushing ${pending.length} pending ICE candidates`)
          for (const c of pending) {
            pc.addIceCandidate(new RTCIceCandidate(c)).catch((err) =>
              console.error(`[WebRTC:${role}] Error adding pending ICE candidate:`, err),
            )
          }
          pendingCandidatesRef.current = []
        }

        if ((pc.signalingState as string) !== "have-remote-offer") {
          debugWarn(`[WebRTC:${role}] Cannot createAnswer in signalingState=${pc.signalingState} — ignoring`)
          return
        }

        const answer = await pc.createAnswer()
        debug(`[WebRTC:${role}] createAnswer OK`)

        if ((pc.signalingState as string) !== "have-remote-offer") {
          debugWarn(`[WebRTC:${role}] Signaling state changed during createAnswer — aborting`)
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

    // ── Answer handler (client / offerer + renegotiation) ──
    const unsubAnswer = onAnswer(async (answer: any) => {
      const pc = peerConnectionRef.current
      if (!pc) {
        debugWarn(`[WebRTC:${role}] Answer received but no PC exists — ignoring`)
        return
      }
      if (pc.signalingState === "closed") {
        debugWarn(`[WebRTC:${role}] Answer received but PC is closed — ignoring`)
        return
      }

      // If we ignored a colliding offer, process that now
      if (ignoreOfferRef.current) {
        ignoreOfferRef.current = false
        // The remote's answer is for OUR offer, which is the correct one
      }

      debug(`[WebRTC:${role}] Answer received — signalingState=${pc.signalingState} answerType=${answer?.type}`)

      try {
        if (
          pc.signalingState !== "have-local-offer" &&
          pc.signalingState !== "stable"
        ) {
          debugWarn(`[WebRTC:${role}] Cannot setRemoteDescription(answer) in signalingState=${pc.signalingState} — ignoring`)
          return
        }

        await pc.setRemoteDescription(new RTCSessionDescription(answer))
        logState(pc, "after setRemoteDescription(answer)", role)

        const pending = pendingCandidatesRef.current
        if (pending.length > 0) {
          debug(`[WebRTC:${role}] Flushing ${pending.length} pending ICE candidates`)
          for (const c of pending) {
            pc.addIceCandidate(new RTCIceCandidate(c)).catch((err) =>
              console.error(`[WebRTC:${role}] Error adding pending ICE candidate:`, err),
            )
          }
          pendingCandidatesRef.current = []
        }

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
        debugWarn(`[WebRTC:${role}] ICE candidate arrived but PC is null/closed — discarding`)
        return
      }

      debug(
        `[WebRTC:${role}] ICE candidate received — type=${candidate.candidate ? candidate.candidate.substring(0, 30) : 'null'} signalingState=${pc.signalingState} hasRemoteDesc=${!!pc.remoteDescription}`,
      )

      if (!pc.remoteDescription) {
        debug(`[WebRTC:${role}] Queueing ICE candidate (remote description not yet set) — queue size=${pendingCandidatesRef.current.length + 1}`)
        pendingCandidatesRef.current.push(candidate)
        return
      }

      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) =>
        console.error(`[WebRTC:${role}] Error adding ICE candidate:`, err),
      )
    })

    return () => {
      debug(`[WebRTC:${role}] Removing socket listeners for room ${roomId}`)
      unsubOffer()
      unsubAnswer()
      unsubIce()
      listenersAttachedForRoomRef.current = null
    }
  }, [roomId, onOffer, onAnswer, onIceCandidate, emitAnswer, role, socketRef])

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

  // ── Screen Sharing (dual-stream: camera + screen simultaneously) ──

  const toggleScreenShare = useCallback(async () => {
    const pc = peerConnectionRef.current
    if (!pc) return

    if (isScreenSharing) {
      // Stop screen sharing
      debug(`[WebRTC:${role}] Stopping screen share`)
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop())
        screenStreamRef.current = null
      }

      // Remove screen video senders from the peer connection
      const senders = pc.getSenders()
      for (const sender of senders) {
        if (
          sender.track?.kind === "video" &&
          sender.track.label !== localStreamRef.current?.getVideoTracks()[0]?.label
        ) {
          pc.removeTrack(sender)
          debug(`[WebRTC:${role}] Removed screen video sender`)
        }
      }

      setIsScreenSharing(false)
      // Renegotiation will be triggered by onnegotiationneeded
    } else {
      // Start screen sharing with system audio
      try {
        debug(`[WebRTC:${role}] Starting screen share with system audio`)
        const ss = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true, // System audio capture
        })
        screenStreamRef.current = ss

        // Add screen video track as a NEW track (separate from camera)
        const screenVideoTrack = ss.getVideoTracks()[0]
        if (screenVideoTrack) {
          pc.addTrack(screenVideoTrack, ss)
          debug(`[WebRTC:${role}] Screen video track added (dual-stream)`)
        }

        // Add screen audio track if available
        const screenAudioTrack = ss.getAudioTracks()[0]
        if (screenAudioTrack) {
          pc.addTrack(screenAudioTrack, ss)
          debug(`[WebRTC:${role}] Screen audio track added`)
        }

        // Auto-stop when user clicks browser's "Stop Sharing" button
        screenVideoTrack.onended = () => {
          debug(`[WebRTC:${role}] Screen share track ended by user (browser stop button)`)
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop())
            screenStreamRef.current = null
          }
          // Remove screen senders
          const senders = pc.getSenders()
          for (const sender of senders) {
            if (
              sender.track?.kind === "video" &&
              sender.track.label !== localStreamRef.current?.getVideoTracks()[0]?.label
            ) {
              pc.removeTrack(sender)
            }
          }
          setIsScreenSharing(false)
        }

        setIsScreenSharing(true)
        // Renegotiation will be triggered automatically by onnegotiationneeded
      } catch {
        // user cancelled the screen share dialog
        debug(`[WebRTC:${role}] Screen share cancelled by user`)
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
    screenVideoRef,
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
