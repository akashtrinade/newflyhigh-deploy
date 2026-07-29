import { useContext } from "react"
import { PaymentSocketContext } from "@/contexts/PaymentSocketContext"

export function usePaymentSocket() {
  const ctx = useContext(PaymentSocketContext)
  if (!ctx) {
    throw new Error("usePaymentSocket must be used within a PaymentSocketProvider")
  }
  return ctx
}
