import { useState, useCallback } from "react"
import { createOrder, verifyPayment, extendSession, verifyExtension } from "@/lib/payments"
import type {
  RazorpayPaymentResponse,
  SessionStateResponse,
  CreateOrderResponse,
} from "@/types/payment"
import { useAuth } from "@/contexts/AuthContext"

interface UseRazorpayReturn {
  isLoading: boolean
  initiatePayment: (
    interactionId: string,
    durationMinutes: number,
    expertName: string,
  ) => Promise<SessionStateResponse | null>
  initiateExtension: (
    interactionId: string,
    durationMinutes: number,
    expertName: string,
  ) => Promise<SessionStateResponse | null>
}

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js"

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement("script")
    script.src = RAZORPAY_SCRIPT_URL
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
}

export function useRazorpay(): UseRazorpayReturn {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const openCheckout = useCallback(
    (
      order: CreateOrderResponse,
      expertName: string,
      durationMinutes: number,
    ): Promise<RazorpayPaymentResponse> => {
      return new Promise((resolve, reject) => {
        const options = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "FlyHigh Consultation",
          description: `${durationMinutes}-minute consultation with ${expertName}`,
          order_id: order.orderId,
          handler: (response: RazorpayPaymentResponse) => {
            resolve(response)
          },
          prefill: {
            name: user?.fullName || user?.firstName || "User",
            email: user?.email || "",
          },
          theme: {
            color: "#4f46e5", // Indigo
          },
          modal: {
            ondismiss: () => {
              reject(new Error("Payment dismissed"))
            },
            escape: false,
            animation: true,
            backdropclose: false,
            confirm_close: true,
          },
        }

        const rzp = new window.Razorpay(options)
        rzp.open()
      })
    },
    [user],
  )

  const initiatePayment = useCallback(
    async (
      interactionId: string,
      durationMinutes: number,
      expertName: string,
    ): Promise<SessionStateResponse | null> => {
      setIsLoading(true)
      try {
        // 1. Load Razorpay script
        const loaded = await loadRazorpayScript()
        if (!loaded) {
          throw new Error("Failed to load Razorpay checkout")
        }

        // 2. Create order on backend
        const order = await createOrder({
          interactionId,
          durationMinutes,
          type: "INITIAL",
        })

        // 3. Open Razorpay checkout
        const payment = await openCheckout(order, expertName, durationMinutes)

        // 4. Verify payment on backend
        const result = await verifyPayment({
          interactionId,
          razorpayPaymentId: payment.razorpay_payment_id,
          razorpayOrderId: payment.razorpay_order_id,
          razorpaySignature: payment.razorpay_signature,
        })

        return result
      } catch (err) {
        if (err instanceof Error && err.message === "Payment dismissed") {
          // User dismissed checkout — not an error
          return null
        }
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [openCheckout],
  )

  const initiateExtension = useCallback(
    async (
      interactionId: string,
      durationMinutes: number,
      expertName: string,
    ): Promise<SessionStateResponse | null> => {
      setIsLoading(true)
      try {
        const loaded = await loadRazorpayScript()
        if (!loaded) {
          throw new Error("Failed to load Razorpay checkout")
        }

        const order = await extendSession({
          interactionId,
          durationMinutes,
          type: "EXTENSION",
        })

        const payment = await openCheckout(order, expertName, durationMinutes)

        const result = await verifyExtension({
          interactionId,
          razorpayPaymentId: payment.razorpay_payment_id,
          razorpayOrderId: payment.razorpay_order_id,
          razorpaySignature: payment.razorpay_signature,
        })

        return result
      } catch (err) {
        if (err instanceof Error && err.message === "Payment dismissed") {
          return null
        }
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [openCheckout],
  )

  return {
    isLoading,
    initiatePayment,
    initiateExtension,
  }
}
