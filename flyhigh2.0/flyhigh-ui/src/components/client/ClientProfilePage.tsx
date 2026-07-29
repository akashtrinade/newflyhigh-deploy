import { useState, useCallback, useEffect } from "react"
import { Mail, Phone, MapPin, UserCircle, Pencil, Save, X, AlertCircle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InputField } from "@/shared/components/atoms/InputField"
import { GradientButton } from "@/shared/components/atoms/GradientButton"
import { useAuth } from "@/contexts/AuthContext"
import { fetchProfile, updateProfile } from "@/lib/user-api"
import { toast } from "@/hooks/use-toast"
import type { UserProfileResponse } from "@/types/auth"

interface ProfileFormData {
  firstName: string
  lastName: string
  phoneNumber: string
  city: string
  state: string
  country: string
  address: string
  postalCode: string
}

interface FormErrors {
  firstName?: string
  lastName?: string
  phoneNumber?: string
}

export default function ClientProfilePage() {
  const { refreshUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfileResponse | null>(null)
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    city: "",
    state: "",
    country: "",
    address: "",
    postalCode: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // ── Fetch latest profile from backend on mount ──
  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await fetchProfile()
      setProfile(data)
      setFormData({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        phoneNumber: data.phoneNumber || "",
        city: data.city || "",
        state: data.state || "",
        country: data.country || "",
        address: data.address || "",
        postalCode: data.postalCode || "",
      })
    } catch (err: any) {
      const message = err?.message || "Failed to load profile"
      setLoadError(message)
      toast({
        title: "Failed to load profile",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const updateField = useCallback(
    (field: keyof ProfileFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      setTouched((prev) => ({ ...prev, [field]: true }))
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => {
          const next = { ...prev }
          delete next[field as keyof FormErrors]
          return next
        })
      }
    },
    [errors],
  )

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    if (
      !formData.firstName ||
      formData.firstName.trim().length < 2 ||
      formData.firstName.trim().length > 50
    ) {
      newErrors.firstName = "First name is required (2-50 characters)"
    }
    if (
      !formData.lastName ||
      formData.lastName.trim().length < 2 ||
      formData.lastName.trim().length > 50
    ) {
      newErrors.lastName = "Last name is required (2-50 characters)"
    }
    if (
      formData.phoneNumber &&
      !/^\+?\d{7,15}$/.test(formData.phoneNumber.trim())
    ) {
      newErrors.phoneNumber =
        "Phone must be 7-15 digits, optionally starting with +"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleEdit = useCallback(() => {
    // Repopulate from the latest fetched profile (not stale context)
    setFormData({
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      phoneNumber: profile?.phoneNumber || "",
      city: profile?.city || "",
      state: profile?.state || "",
      country: profile?.country || "",
      address: profile?.address || "",
      postalCode: profile?.postalCode || "",
    })
    setErrors({})
    setTouched({})
    setIsEditing(true)
  }, [profile])

  const handleCancel = useCallback(() => {
    setIsEditing(false)
    setErrors({})
    setTouched({})
  }, [])

  const handleSave = useCallback(async () => {
    if (!validate()) return

    setIsSaving(true)
    try {
      const updated = await updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        country: formData.country.trim() || undefined,
        address: formData.address.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined,
      })

      // Update local profile with the response (source of truth from backend)
      setProfile(updated)
      setFormData({
        firstName: updated.firstName || "",
        lastName: updated.lastName || "",
        phoneNumber: updated.phoneNumber || "",
        city: updated.city || "",
        state: updated.state || "",
        country: updated.country || "",
        address: updated.address || "",
        postalCode: updated.postalCode || "",
      })

      // Refresh auth context so header/sidebar show updated name
      await refreshUser()

      toast({ title: "Profile updated successfully", variant: "success" })
      setIsEditing(false)
      setErrors({})
      setTouched({})
    } catch (err: any) {
      toast({
        title: "Failed to update profile",
        description: err?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [formData, validate, refreshUser])

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <RefreshCw className="size-8 animate-spin text-slate-400 mx-auto" />
          <p className="text-sm text-slate-500">Loading profile…</p>
        </div>
      </div>
    )
  }

  // ── Error state with retry ──
  if (loadError && !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="size-10 text-red-400 mx-auto" />
          <p className="text-sm text-slate-700">{loadError}</p>
          <Button variant="outline" onClick={loadProfile}>
            <RefreshCw className="size-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-950">
            Client Profile
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage your personal information and contact details.
          </p>
        </div>
        {!isEditing && (
          <Button
            className="h-10 gap-2 bg-slate-950 hover:bg-slate-800"
            onClick={handleEdit}
          >
            <Pencil className="size-4" />
            Edit Profile
          </Button>
        )}
      </section>

      {isEditing ? (
        <Card className="rounded-lg border-slate-200 shadow-sm">
          <CardHeader className="p-5 pb-0">
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="size-5 text-slate-500" />
              Edit Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
            <InputField
              label="First Name"
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(v) => updateField("firstName", v)}
              placeholder="Enter first name"
              error={errors.firstName}
              touched={touched.firstName}
              autoComplete="given-name"
            />
            <InputField
              label="Last Name"
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(v) => updateField("lastName", v)}
              placeholder="Enter last name"
              error={errors.lastName}
              touched={touched.lastName}
              autoComplete="family-name"
            />
            <InputField
              label="Phone Number"
              id="phoneNumber"
              type="text"
              value={formData.phoneNumber}
              onChange={(v) => updateField("phoneNumber", v)}
              placeholder="+1234567890"
              error={errors.phoneNumber}
              touched={touched.phoneNumber}
              autoComplete="tel"
            />
            <InputField
              label="City"
              id="city"
              type="text"
              value={formData.city}
              onChange={(v) => updateField("city", v)}
              placeholder="Enter city"
              autoComplete="address-level2"
            />
            <InputField
              label="State"
              id="state"
              type="text"
              value={formData.state}
              onChange={(v) => updateField("state", v)}
              placeholder="Enter state"
              autoComplete="address-level1"
            />
            <InputField
              label="Country"
              id="country"
              type="text"
              value={formData.country}
              onChange={(v) => updateField("country", v)}
              placeholder="Enter country"
              autoComplete="country-name"
            />
            <InputField
              label="Postal Code"
              id="postalCode"
              type="text"
              value={formData.postalCode}
              onChange={(v) => updateField("postalCode", v)}
              placeholder="Enter postal code"
              autoComplete="postal-code"
            />
            <InputField
              label="Address"
              id="address"
              type="text"
              value={formData.address}
              onChange={(v) => updateField("address", v)}
              placeholder="Enter full address"
              autoComplete="street-address"
              className="sm:col-span-2"
            />
            <div className="flex items-center gap-3 pt-2 sm:col-span-2">
              <GradientButton
                type="button"
                isLoading={isSaving}
                loadingText="Saving..."
                showArrow={false}
                onClick={handleSave}
              >
                <Save className="size-4" />
                Save Changes
              </GradientButton>
              <Button
                type="button"
                variant="outline"
                className="h-11 gap-2 rounded-xl border-slate-300 px-6"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="size-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-lg border-slate-200 shadow-sm">
          <CardHeader className="p-5 pb-0">
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="size-5 text-slate-500" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <ProfileRow
              label="Full Name"
              value={
                profile?.fullName ||
                `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() ||
                "N/A"
              }
              icon={UserCircle}
            />
            <ProfileRow
              label="Email"
              value={profile?.email || "Not available"}
              icon={Mail}
            />
            <ProfileRow
              label="Phone"
              value={profile?.phoneNumber || "Not provided"}
              icon={Phone}
            />
            <ProfileRow
              label="City"
              value={profile?.city || "Not provided"}
              icon={MapPin}
            />
            <ProfileRow
              label="State"
              value={profile?.state || "Not provided"}
              icon={MapPin}
            />
            <ProfileRow
              label="Country"
              value={profile?.country || "Not provided"}
              icon={MapPin}
            />
            <ProfileRow
              label="Address"
              value={profile?.address || "Not provided"}
              icon={MapPin}
            />
            <ProfileRow
              label="Postal Code"
              value={profile?.postalCode || "Not provided"}
              icon={MapPin}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ProfileRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof UserCircle
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="size-4" />
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  )
}
