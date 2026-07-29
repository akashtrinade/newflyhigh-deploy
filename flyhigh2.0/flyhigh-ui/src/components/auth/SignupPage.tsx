import { useState, useEffect, useTransition } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ArrowLeft, AlertCircle, Clock } from "lucide-react"
import AuthLayout from "./AuthLayout"
import AccountTypeSelector from "./AccountTypeSelector"
import SocialLogin from "./SocialLogin"
import TermsCheckbox from "./TermsCheckbox"
import { useAuth } from "@/contexts/AuthContext"
import { GradientButton } from "@/shared/components/atoms/GradientButton"
import { InputField } from "@/shared/components/atoms/InputField"
import { api, ApiError } from "@/api/client"
import type {
  AccountType,
  SignupFormData,
  FormErrors,
  AuthResponse,
  MessageResponse,
} from "./types"

export default function SignupPage() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [accountType, setAccountType] = useState<AccountType>("client")
  const [showAccountSelect, setShowAccountSelect] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError] = useState<string | null>(null)
  const [isGoogleUser, setIsGoogleUser] = useState(false)

  const [formData, setFormData] = useState<SignupFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  // Check for pending Google user data
  useEffect(() => {
    const pendingUserStr = sessionStorage.getItem("pendingGoogleUser")
    if (pendingUserStr) {
      try {
        const pendingUser = JSON.parse(pendingUserStr)
        setFormData({
          firstName: pendingUser.firstName || "",
          lastName: pendingUser.lastName || "",
          email: pendingUser.email || "",
          password: "",
          confirmPassword: "",
        })
        setIsGoogleUser(true)
        setShowAccountSelect(true)
      } catch {
        // Invalid data, ignore
      }
    }
  }, [])

  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [formTouched, setFormTouched] = useState<Partial<Record<keyof SignupFormData, boolean>>>({})
  const [isPending, startTransition] = useTransition()

  // OTP state
  const [showOtp, setShowOtp] = useState(false)
  const [otp, setOtp] = useState("")
  const [otpError, setOtpError] = useState<string | null>(null)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isResendingOtp, setIsResendingOtp] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // ── Validation ──
  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!formData.firstName || formData.firstName.trim().length < 2)
      e.firstName = "First name must be at least 2 characters"
    if (!formData.lastName || formData.lastName.trim().length < 2)
      e.lastName = "Last name must be at least 2 characters"
    if (!formData.email) e.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      e.email = "Invalid email format"
    if (!formData.password) e.password = "Password is required"
    else if (formData.password.length < 8)
      e.password = "Min 8 characters"
    else if (
      !/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=])(?=\S+$).{8,}$/.test(
        formData.password,
      )
    ) {
      e.password = "Must contain uppercase, lowercase, number & special char"
    }
    if (formData.password !== formData.confirmPassword)
      e.confirmPassword = "Passwords do not match"
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const updateField = (field: keyof SignupFormData) => (value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }))

  const touchField = (field: keyof SignupFormData) => () =>
    setFormTouched((prev) => ({ ...prev, [field]: true }))

  // ── Step 1: Choose account type ──
  const handleAccountSelect = async (type: AccountType) => {
    setAccountType(type)
    setTermsError(null)

    if (isGoogleUser) {
      if (!termsAccepted) {
        setTermsError("Please agree to the Terms & Conditions to continue")
        return
      }
      setApiError(null)
      startTransition(async () => {
        try {
          const fullName = `${formData.firstName} ${formData.lastName}`.trim()
          const data = await api.post<AuthResponse>("/auth/complete-google-registration", {
            email: formData.email.trim().toLowerCase(),
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            fullName: fullName || formData.firstName.trim(),
            role: type.toUpperCase(),
          })
          if (!data.success) {
            setApiError(data.message || "Google registration failed")
            return
          }
          sessionStorage.removeItem("pendingGoogleUser")
          setUser({
            id: data.id || "",
            email: data.email || "",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            fullName: data.fullName || "",
            role: data.role || "",
            profileCompleted: data.profileCompleted || false,
            country: data.country || undefined,
            status: data.status || undefined,
            isOnline: data.isOnline ?? undefined,
          })
          navigate(
            data.redirectUrl ||
              (type === "client" ? "/client-dashboard" : "/expert-profile-completion"),
          )
        } catch {
          setApiError("Network error. Please check your connection and try again.")
        }
      })
      return
    }

    setShowAccountSelect(false)
  }

  // ── Step 2: Submit signup ──
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)
    setTermsError(null)
    if (!termsAccepted) {
      setTermsError("Please agree to the Terms & Conditions to continue")
      return
    }
    if (!validate()) return

    startTransition(async () => {
      try {
        const data = await api.post<AuthResponse>("/auth/signup", {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          role: accountType,
        })
        if (!data.success) {
          setApiError(data.message || "Signup failed")
          return
        }
      setShowOtp(true)
      startCooldown()
    } catch {
      setApiError("Network error. Please check your connection and try again.")
    }
  })
  }

  // ── Step 3: OTP ──
  const handleVerifyOtp = async () => {
    setOtpError(null)
    if (otp.length !== 6) {
      setOtpError("Please enter the full 6-digit OTP")
      return
    }
    setIsVerifyingOtp(true)
    try {
      const data = await api.post<AuthResponse>("/auth/verify-signup-otp", {
        email: formData.email.trim().toLowerCase(),
        otp,
      })
      if (!data.success) {
        setOtpError(data.message || "Invalid or expired OTP")
        return
      }
      navigate("/login")
    } catch {
      setOtpError("Network error. Please try again.")
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const startCooldown = () => {
    setCooldown(60)
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleResendOtp = async () => {
    if (cooldown > 0 || isResendingOtp) return
    setIsResendingOtp(true)
    setOtpError(null)
    try {
      const data = await api.post<MessageResponse>("/auth/resend-signup-otp", {
        email: formData.email.trim().toLowerCase(),
      })
      if (!data.success) {
        setOtpError(data.message || "Failed to resend OTP")
        setIsResendingOtp(false)
        return
      }
      startCooldown()
    } catch {
      setOtpError("Network error. Please try again.")
    } finally {
      setIsResendingOtp(false)
    }
  }

  // ── Render ──
  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {showAccountSelect ? (
          <motion.div
            key="account-select"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--flyhigh-text)]">
                Join FlyHigh
              </h2>
              <p className="mt-1 text-sm text-[var(--flyhigh-text-muted)]">
                Choose how you'd like to get started.
              </p>
            </div>

            {isPending ? (
              <motion.div
                key="google-loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 space-y-4"
              >
                <Loader2 className="size-10 animate-spin text-[#2563EB]" />
                <p className="text-[var(--flyhigh-text-muted)] text-sm">
                  Creating your account...
                </p>
              </motion.div>
            ) : (
              <>
                <AccountTypeSelector
                  selected={accountType}
                  onChange={handleAccountSelect}
                />

                <TermsCheckbox
                  checked={termsAccepted}
                  onChange={(checked) => {
                    setTermsAccepted(checked)
                    if (checked) setTermsError(null)
                  }}
                  error={termsError}
                />

                {apiError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{apiError}</span>
                  </motion.div>
                )}
              </>
            )}

            <p className="text-center text-sm text-[var(--flyhigh-text-muted)]">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-[#2563EB] hover:text-[#1d4ed8]"
              >
                Sign In
              </Link>
            </p>
          </motion.div>
        ) : showOtp ? (
          /* OTP Verification */
          <motion.div
            key="otp"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center space-y-6"
          >
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] shadow-lg shadow-[#2563EB]/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[var(--flyhigh-text)]">
                Verify Your Email
              </h2>
              <p className="mt-2 text-sm text-[var(--flyhigh-text-muted)]">
                We've sent a 6-digit OTP to{" "}
                <span className="font-semibold">{formData.email}</span>
              </p>
            </div>
            {otpError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 w-full">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}
            <div className="w-full max-w-xs space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-[0.1em] text-[var(--flyhigh-text)] uppercase">
                  Enter OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  className={`w-full text-center text-2xl tracking-[0.5em] font-bold rounded-xl border bg-white px-4 py-3 text-[var(--flyhigh-text)] outline-none transition-all ${
                    otpError
                      ? "border-red-400 ring-2 ring-red-100"
                      : "border-[var(--flyhigh-border)] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
                  }`}
                />
              </div>
              <GradientButton
                isLoading={isVerifyingOtp}
                loadingText="Verifying..."
                disabled={otp.length !== 6}
                onClick={handleVerifyOtp}
              >
                Verify Email
              </GradientButton>
            </div>
            <div className="text-center">
              <p className="text-sm text-[var(--flyhigh-text-muted)]">
                Didn't receive the code?{" "}
                {cooldown > 0 ? (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-400">
                    <Clock className="size-3.5" />
                    Resend in {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResendingOtp}
                    className="font-semibold text-[#2563EB] hover:text-[#1d4ed8] transition-colors"
                  >
                    {isResendingOtp ? "Sending..." : "Resend OTP"}
                  </button>
                )}
              </p>
              <p className="mt-1 text-xs text-[var(--flyhigh-text-muted)]">
                OTP expires in 10 minutes
              </p>
            </div>
          </motion.div>
        ) : (
          /* Signup Form */
          <motion.div
            key="signup-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAccountSelect(true)}
                className="flex size-8 items-center justify-center rounded-lg border border-[var(--flyhigh-border)] text-[var(--flyhigh-text-muted)] transition-all hover:bg-slate-100"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[var(--flyhigh-text)]">
                  {accountType === "client"
                    ? "Create Client Account"
                    : "Become an Expert"}
                </h2>
                <p className="text-sm text-[var(--flyhigh-text-muted)]">
                  {accountType === "client"
                    ? "Book consultations with verified experts."
                    : "Offer your expertise and earn."}
                </p>
              </div>
            </div>

            <AnimatePresence>
              {apiError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{apiError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="First Name"
                  id="signup-first"
                  value={formData.firstName}
                  onChange={updateField("firstName")}
                  onBlur={touchField("firstName")}
                  placeholder="John"
                  error={formErrors.firstName}
                  touched={formTouched.firstName}
                />
                <InputField
                  label="Last Name"
                  id="signup-last"
                  value={formData.lastName}
                  onChange={updateField("lastName")}
                  onBlur={touchField("lastName")}
                  placeholder="Doe"
                  error={formErrors.lastName}
                  touched={formTouched.lastName}
                />
              </div>
              <InputField
                label="Email"
                id="signup-email"
                type="email"
                value={formData.email}
                onChange={updateField("email")}
                onBlur={touchField("email")}
                placeholder="you@example.com"
                error={formErrors.email}
                touched={formTouched.email}
              />
              <InputField
                label="Password"
                id="signup-password"
                type="password"
                value={formData.password}
                onChange={updateField("password")}
                onBlur={touchField("password")}
                placeholder="Create a strong password"
                error={formErrors.password}
                touched={formTouched.password}
              />
              <InputField
                label="Confirm Password"
                id="signup-confirm"
                type="password"
                value={formData.confirmPassword}
                onChange={updateField("confirmPassword")}
                onBlur={touchField("confirmPassword")}
                placeholder="Repeat your password"
                error={formErrors.confirmPassword}
                touched={formTouched.confirmPassword}
              />

              <p className="text-xs text-slate-400 leading-relaxed">
                Password must be at least 8 characters with 1 uppercase, 1 lowercase,
                1 number, and 1 special character.
              </p>

              <TermsCheckbox
                checked={termsAccepted}
                onChange={(checked) => {
                  setTermsAccepted(checked)
                  if (checked) setTermsError(null)
                }}
                error={termsError}
              />

              <GradientButton
                isLoading={isPending}
                loadingText="Creating account..."
              >
                Create Account
              </GradientButton>
            </form>

            <SocialLogin />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  )
}
