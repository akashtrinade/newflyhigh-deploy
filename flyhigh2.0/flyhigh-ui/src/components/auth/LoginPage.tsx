import { useState, useCallback, useEffect, useRef, useTransition } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle } from "lucide-react"
import AuthLayout from "./AuthLayout"
import TermsCheckbox from "./TermsCheckbox"
import { useAuth } from "@/contexts/AuthContext"
import { GradientButton } from "@/shared/components/atoms/GradientButton"
import { InputField } from "@/shared/components/atoms/InputField"
import { api, ApiError } from "@/api/client"

import type { LoginFormData, FormErrors, AuthResponse } from "./types"

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  })
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof LoginFormData, boolean>>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError] = useState<string | null>(null)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  // Keep a ref in sync with termsAccepted so the Google Sign-In callback
  // (captured once on mount by the GIS library) always reads the latest value.
  const termsAcceptedRef = useRef(termsAccepted)
  useEffect(() => {
    termsAcceptedRef.current = termsAccepted
  }, [termsAccepted])

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.email) newErrors.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Invalid email address"
    if (!formData.password) newErrors.password = "Password is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmit = (e: React.FormEvent) => {
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
        const data = await api.post<AuthResponse>("/auth/login", {
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        })

        if (!data.success) {
          setApiError(data.message || "Invalid email or password")
          return
        }

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

        navigate(data.redirectUrl || "/")
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setApiError(err.message || "Invalid email or password")
        } else {
          setApiError("Network error. Please check your connection and try again.")
        }
      }
    })
  }

  // ── Google Sign-In ──

  function loadGoogleScript() {
    if (document.getElementById("google-gsi-script")) {
      renderGoogleButton()
      return
    }
    const script = document.createElement("script")
    script.id = "google-gsi-script"
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => renderGoogleButton()
    document.body.appendChild(script)
  }

  function renderGoogleButton() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gsi = (window as any)?.google?.accounts?.id
    if (!gsi || !googleBtnRef.current) {
      setTimeout(() => renderGoogleButton(), 300)
      return
    }
    if (!GOOGLE_CLIENT_ID) {
      setApiError(
        "Google sign-in is not configured. Missing VITE_GOOGLE_CLIENT_ID environment variable.",
      )
      return
    }
    gsi.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      cancel_on_tap_outside: true,
    })
    gsi.renderButton(googleBtnRef.current, {
      type: "standard",
      shape: "pill",
      theme: "outline",
      text: "signin_with",
      size: "large",
      width: "100%",
      logo_alignment: "center",
    })
  }

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("VITE_GOOGLE_CLIENT_ID=", GOOGLE_CLIENT_ID)
    }
    if (typeof window !== "undefined") loadGoogleScript()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGoogleCredential = async (response: { credential?: string }) => {
    const idToken = response.credential
    if (!idToken) {
      setApiError("Google login failed: No credential received")
      return
    }
    setApiError(null)
    if (!termsAcceptedRef.current) {
      setTermsError("Please agree to the Terms & Conditions to continue")
      return
    }

    startTransition(async () => {
      try {
        const data = await api.post<AuthResponse>("/auth/google-login", {
          credential: idToken,
        })

        if (!data.success) {
          setApiError(data.message || "Google login failed")
          return
        }

        if (data.role === "PENDING") {
          sessionStorage.setItem(
            "pendingGoogleUser",
            JSON.stringify({
              email: data.email,
              firstName: data.firstName,
              lastName: data.lastName,
              fullName: data.fullName,
            }),
          )
          navigate("/signup")
          return
        }

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

        navigate(data.redirectUrl || "/")
      } catch {
        setApiError("Network error during Google login. Please try again.")
      }
    })
  }

  const handleBlur = (field: keyof LoginFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center lg:text-left">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold tracking-tight text-[var(--flyhigh-text)]"
          >
            Welcome Back
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-1 text-sm text-[var(--flyhigh-text-muted)]"
          >
            Sign in to continue your FlyHigh journey.
          </motion.p>
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

        {/* Google Sign-In */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.99 }}
        >
          <div
            ref={googleBtnRef}
            // className="flex w-full justify-center overflow-hidden rounded-xl border border-[var(--flyhigh-border)] "
          />
        </motion.div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--flyhigh-border)]" />
          <span className="text-xs font-medium text-[var(--flyhigh-text-muted)]">
            or sign in with email
          </span>
          <div className="h-px flex-1 bg-[var(--flyhigh-border)]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <InputField
              label="Email Address"
              id="login-email"
              type="email"
              value={formData.email}
              onChange={(v) =>
                setFormData((prev) => ({ ...prev, email: v }))
              }
              onBlur={() => handleBlur("email")}
              placeholder="you@example.com"
              error={errors.email}
              touched={touched.email}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Password uses native handling for showPassword toggle */}
            <InputField
              label="Password"
              id="login-password"
              type="password"
              value={formData.password}
              onChange={(v) =>
                setFormData((prev) => ({ ...prev, password: v }))
              }
              onBlur={() => handleBlur("password")}
              placeholder="Enter your password"
              error={errors.password}
              touched={touched.password}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex justify-end"
          >
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-[#2563EB] transition-colors hover:text-[#1d4ed8]"
            >
              Forgot Password?
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
          >
            <TermsCheckbox
              checked={termsAccepted}
              onChange={(checked) => {
                setTermsAccepted(checked)
                if (checked) setTermsError(null)
              }}
              error={termsError}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GradientButton isLoading={isPending} loadingText="Signing in...">
              Login to FlyHigh
            </GradientButton>
          </motion.div>
        </form>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        />

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-[var(--flyhigh-text-muted)]"
        >
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="font-semibold text-[#2563EB] transition-colors hover:text-[#1d4ed8]"
          >
            Create Account
          </Link>
        </motion.p>
      </div>
    </AuthLayout>
  )
}
