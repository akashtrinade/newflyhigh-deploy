import { useState, useEffect, useCallback } from "react"
import { LogOut, KeyRound, Bell, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InputField } from "@/shared/components/atoms/InputField"
import { GradientButton } from "@/shared/components/atoms/GradientButton"
import { useAuth } from "@/contexts/AuthContext"
import { changePassword, fetchNotificationPreferences, updateNotificationPreferences } from "@/lib/user-api"
import { toast } from "@/hooks/use-toast"
import type { NotificationPreferences } from "@/types/auth"

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

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  consultationReminders: true,
  paymentNotifications: true,
  marketingEmails: false,
  reminderNotifications: true,
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

export default function ClientSettingsPage() {
  const { logout } = useAuth()

  // ── Password state ──
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({})
  const [passwordTouched, setPasswordTouched] = useState<Record<string, boolean>>({})
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // ── Notification preferences state ──
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS)
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true)
  const [isSavingPrefs, setIsSavingPrefs] = useState(false)

  // ── Load notification preferences on mount ──
  useEffect(() => {
    let cancelled = false
    async function loadPrefs() {
      try {
        const prefs = await fetchNotificationPreferences()
        if (!cancelled) {
          setNotifPrefs(prefs)
        }
      } catch {
        // Keep defaults if fetch fails
      } finally {
        if (!cancelled) {
          setIsLoadingPrefs(false)
        }
      }
    }
    loadPrefs()
    return () => { cancelled = true }
  }, [])

  // ── Password handlers ──
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

  // ── Notification preferences handlers ──
  const toggleNotifPref = useCallback((key: keyof NotificationPreferences) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const handleSaveNotifPrefs = useCallback(async () => {
    setIsSavingPrefs(true)
    try {
      await updateNotificationPreferences(notifPrefs)
      toast({ title: "Notification preferences saved", variant: "success" })
    } catch (err: any) {
      toast({
        title: "Failed to save preferences",
        description: err?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingPrefs(false)
    }
  }, [notifPrefs])

  const handleResetNotifPrefs = useCallback(() => {
    setNotifPrefs(DEFAULT_NOTIFICATION_PREFS)
  }, [])

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight text-slate-950">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Security, notification preferences, and account actions.</p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Change Password ── */}
        <Card className="rounded-lg border-slate-200 shadow-sm">
          <CardHeader className="p-5 pb-0">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-slate-500" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <InputField
              label="Current Password"
              id="currentPassword"
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
              id="newPassword"
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
              id="confirmPassword"
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

        {/* ── Notification Preferences ── */}
        <Card className="rounded-lg border-slate-200 shadow-sm">
          <CardHeader className="p-5 pb-0">
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5 text-slate-500" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {isLoadingPrefs ? (
              <p className="text-sm text-slate-500">Loading preferences...</p>
            ) : (
              <>
                <ToggleRow
                  label="Email Notifications"
                  description="Receive updates via email"
                  checked={notifPrefs.emailNotifications}
                  onChange={() => toggleNotifPref("emailNotifications")}
                />
                <ToggleRow
                  label="Push Notifications"
                  description="Browser push notifications"
                  checked={notifPrefs.pushNotifications}
                  onChange={() => toggleNotifPref("pushNotifications")}
                />
                <ToggleRow
                  label="Consultation Reminders"
                  description="Reminders before scheduled consultations"
                  checked={notifPrefs.consultationReminders}
                  onChange={() => toggleNotifPref("consultationReminders")}
                />
                <ToggleRow
                  label="Payment Notifications"
                  description="Receipts and payment confirmations"
                  checked={notifPrefs.paymentNotifications}
                  onChange={() => toggleNotifPref("paymentNotifications")}
                />
                <ToggleRow
                  label="Marketing Emails"
                  description="Promotions, tips, and newsletters"
                  checked={notifPrefs.marketingEmails}
                  onChange={() => toggleNotifPref("marketingEmails")}
                />
                <ToggleRow
                  label="Reminder Notifications"
                  description="General reminders for your account"
                  checked={notifPrefs.reminderNotifications}
                  onChange={() => toggleNotifPref("reminderNotifications")}
                />
                <div className="flex items-center gap-3 pt-2">
                  <GradientButton
                    type="button"
                    isLoading={isSavingPrefs}
                    loadingText="Saving..."
                    showArrow={false}
                    onClick={handleSaveNotifPrefs}
                  >
                    Save Changes
                  </GradientButton>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl border-slate-300 px-6"
                    onClick={handleResetNotifPrefs}
                    disabled={isSavingPrefs}
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Logout ── */}
      <Card className="rounded-lg border-slate-200 shadow-sm">
        <CardHeader className="p-5 pb-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <LogOut className="size-5 text-rose-500" />
            Logout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm leading-6 text-slate-600">End this session on the current device.</p>
          <Button variant="destructive" className="h-10 gap-2" onClick={logout}>
            <LogOut className="size-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

/** Inline toggle-switch row for notification preferences */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={onChange}
        />
        <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300" />
        <div className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </label>
    </div>
  )
}
