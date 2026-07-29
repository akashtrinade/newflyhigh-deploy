import { useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, ArrowRight, Loader2, Mail, AlertCircle, Clock } from "lucide-react"
import { useNavigate } from "react-router-dom"
import AuthLayout from "./AuthLayout"
import { api } from "@/api/client"
import type { MessageResponse } from "./types"

type ForgotStep = "email" | "otp" | "reset" | "success"

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<ForgotStep>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  /* ─── Step 1: Send OTP ─── */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address")
      return
    }
    setIsLoading(true)

    try {
      const data = await api.post<MessageResponse>("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      })

      if (!data.success) {
        setError(data.message || "Failed to send OTP")
        return
      }

      setStep("otp")
      startCooldown()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  /* ─── Step 2: Verify OTP ─── */
  const handleVerifyOtp = async () => {
    setError(null)
    if (otp.length !== 6) {
      setError("Please enter the full 6-digit OTP")
      return
    }
    setIsLoading(true)

    try {
      const data = await api.post<MessageResponse>("/auth/verify-reset-otp", {
        email: email.trim().toLowerCase(),
        otp,
      })

      if (!data.success) {
        setError(data.message || "Invalid OTP")
        return
      }

      setStep("reset")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  /* ─── Step 3: Reset Password ─── */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    if (!/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=])(?=\S+$).{8,}$/.test(newPassword)) {
      setError("Must contain uppercase, lowercase, number & special char")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      const data = await api.post<MessageResponse>("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        otp,
        newPassword,
      })

      if (!data.success) {
        setError(data.message || "Failed to reset password")
        return
      }

      setStep("success")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  /* ─── Resend OTP ─── */
  const startCooldown = () => {
    setCooldown(60)
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleResendOtp = async () => {
    if (cooldown > 0 || isLoading) return
    setError(null)
    setIsLoading(true)

    try {
      const data = await api.post<MessageResponse>("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      })
      if (!data.success) {
        setError(data.message || "Failed to resend OTP")
      } else {
        startCooldown()
      }
    } catch {
      setError("Network error")
    } finally {
      setIsLoading(false)
    }
  }

  /* ─── Render ─── */
  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {step === "email" && (
          <motion.div
            key="email"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] shadow-lg shadow-[#2563EB]/20">
                <Mail className="size-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[var(--flyhigh-text)]">
                Forgot Password?
              </h2>
              <p className="mt-2 text-sm text-[var(--flyhigh-text-muted)]">
                Enter your email and we&apos;ll send you a 6-digit OTP.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="fp-email" className="mb-1.5 block text-xs font-semibold tracking-[0.1em] text-[var(--flyhigh-text)] uppercase">
                  Email Address
                </label>
                <input
                  id="fp-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-[var(--flyhigh-border)] bg-white px-4 py-2.5 text-sm text-[var(--flyhigh-text)] outline-none transition-all placeholder:text-[var(--flyhigh-text-muted)] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#2563EB]/20 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-70"
              >
                <div className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Send OTP
                    <ArrowRight className="size-4" />
                  </span>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-[var(--flyhigh-text-muted)]">
              <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-[#2563EB] hover:text-[#1d4ed8]">
                <ArrowLeft className="size-3.5" />
                Back to Login
              </Link>
            </p>
          </motion.div>
        )}

        {step === "otp" && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center space-y-6"
          >
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] shadow-lg shadow-[#2563EB]/20">
              <Mail className="size-8 text-white" />
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[var(--flyhigh-text)]">
                Enter OTP
              </h2>
              <p className="mt-2 text-sm text-[var(--flyhigh-text-muted)]">
                We&apos;ve sent a 6-digit OTP to{" "}
                <span className="font-semibold">{email}</span>
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 w-full">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="w-full max-w-xs space-y-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full text-center text-2xl tracking-[0.5em] font-bold rounded-xl border border-[var(--flyhigh-border)] bg-white px-4 py-3 text-[var(--flyhigh-text)] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
              />

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#2563EB]/20 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Verify OTP
                    <ArrowRight className="size-4" />
                  </span>
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-[var(--flyhigh-text-muted)]">
                Didn&apos;t receive the code?{" "}
                {cooldown > 0 ? (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-400">
                    <Clock className="size-3.5" />
                    Resend in {cooldown}s
                  </span>
                ) : (
                  <button onClick={handleResendOtp} disabled={isLoading} className="font-semibold text-[#2563EB] hover:text-[#1d4ed8] transition-colors">
                    Resend OTP
                  </button>
                )}
              </p>
            </div>
          </motion.div>
        )}

        {step === "reset" && (
          <motion.div
            key="reset"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--flyhigh-text)]">
                Set New Password
              </h2>
              <p className="mt-2 text-sm text-[var(--flyhigh-text-muted)]">
                Choose a strong password for your account.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label htmlFor="rp-password" className="mb-1.5 block text-xs font-semibold tracking-[0.1em] text-[var(--flyhigh-text)] uppercase">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="rp-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-xl border border-[var(--flyhigh-border)] bg-white px-4 py-2.5 pr-11 text-sm text-[var(--flyhigh-text)] outline-none transition-all placeholder:text-[var(--flyhigh-text-muted)] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" tabIndex={-1}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="rp-confirm" className="mb-1.5 block text-xs font-semibold tracking-[0.1em] text-[var(--flyhigh-text)] uppercase">
                  Confirm Password
                </label>
                <input
                  id="rp-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-xl border border-[var(--flyhigh-border)] bg-white px-4 py-2.5 text-sm text-[var(--flyhigh-text)] outline-none transition-all placeholder:text-[var(--flyhigh-text-muted)] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
                />
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.
              </p>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#2563EB]/20 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Resetting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Reset Password
                    <ArrowRight className="size-4" />
                  </span>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center space-y-6"
          >
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--flyhigh-text)]">
              Password Reset!
            </h2>
            <p className="text-sm text-[var(--flyhigh-text-muted)]">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#2563EB]/20 transition-all hover:shadow-xl"
            >
              Go to Login
              <ArrowRight className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  )
}

function Eye({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOff({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
      <line x1="2" x2="22" y1="2" y2="22"/>
    </svg>
  )
}
