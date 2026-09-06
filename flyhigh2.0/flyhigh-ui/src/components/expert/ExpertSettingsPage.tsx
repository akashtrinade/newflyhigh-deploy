import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { KeyRound, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InputField } from "@/shared/components/atoms/InputField"
import { GradientButton } from "@/shared/components/atoms/GradientButton"
import { changePassword } from "@/lib/user-api"
import { toast } from "@/hooks/use-toast"

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface PasswordErrors {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

function validatePasswordForm(data: PasswordFormData): PasswordErrors {
  const errors: PasswordErrors = {}

  if (!data.currentPassword) {
    errors.currentPassword = "Current password is required"
  }
  if (!data.newPassword) {
    errors.newPassword = "New password is required"
  } else if (data.newPassword.length < 8) {
    errors.newPassword = "Password must be at least 8 characters"
  } else if (!/[a-z]/.test(data.newPassword)) {
    errors.newPassword = "Password must contain a lowercase letter"
  } else if (!/[A-Z]/.test(data.newPassword)) {
    errors.newPassword = "Password must contain an uppercase letter"
  } else if (!/\d/.test(data.newPassword)) {
    errors.newPassword = "Password must contain a digit"
  } else if (!/[!@#$%^&*(),.?":{}|<>[\]\\/_~\-;=+]/.test(data.newPassword)) {
    errors.newPassword = "Password must contain a special character"
  }
  if (data.newPassword && data.currentPassword && data.newPassword === data.currentPassword) {
    errors.newPassword = "New password must be different from current password"
  }
  if (!data.confirmPassword) {
    errors.confirmPassword = "Please confirm your new password"
  } else if (data.newPassword && data.newPassword !== data.confirmPassword) {
    errors.confirmPassword = "Passwords do not match"
  }

  return errors
}

export default function ExpertSettingsPage() {
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({})
  const [passwordTouched, setPasswordTouched] = useState<Record<string, boolean>>({})
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const updatePasswordField = useCallback((field: keyof PasswordFormData, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }))
    setPasswordTouched((prev) => ({ ...prev, [field]: true }))
    setPasswordErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const handleChangePassword = useCallback(async () => {
    const errors = validatePasswordForm(passwordForm)
    setPasswordErrors(errors)
    setPasswordTouched({ currentPassword: true, newPassword: true, confirmPassword: true })
    if (Object.keys(errors).length > 0) return

    setIsChangingPassword(true)
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      })
      toast({ title: "Password changed successfully", variant: "success" })
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setPasswordTouched({})
      setPasswordErrors({})
    } catch (err: any) {
      toast({
        title: "Failed to change password",
        description: err?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }, [passwordForm])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-[var(--flyhigh-text)]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--flyhigh-text-muted)]">
          Manage your account security.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="rounded-lg border-slate-200 shadow-sm max-w-lg">
          <CardHeader className="p-5 pb-0">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-slate-500" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <InputField
              label="Current Password"
              id="expert-currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(v) => updatePasswordField("currentPassword", v)}
              placeholder="Enter current password"
              error={passwordErrors.currentPassword}
              touched={passwordTouched.currentPassword}
              autoComplete="current-password"
            />
            <InputField
              label="New Password"
              id="expert-newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(v) => updatePasswordField("newPassword", v)}
              placeholder="Enter new password"
              error={passwordErrors.newPassword}
              touched={passwordTouched.newPassword}
              autoComplete="new-password"
            />
            <InputField
              label="Confirm Password"
              id="expert-confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(v) => updatePasswordField("confirmPassword", v)}
              placeholder="Confirm new password"
              error={passwordErrors.confirmPassword}
              touched={passwordTouched.confirmPassword}
              autoComplete="new-password"
            />
            <GradientButton
              type="button"
              isLoading={isChangingPassword}
              loadingText="Updating..."
              showArrow={false}
              onClick={handleChangePassword}
            >
              <ShieldCheck className="size-4" />
              Update Password
            </GradientButton>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
