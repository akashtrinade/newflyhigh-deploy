// ── Auth-related types ──

export type Role = "client" | "expert" | "admin" | "pending"
export type AccountType = "client" | "expert"

export interface LoginFormData {
  email: string
  password: string
}

export interface SignupFormData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

/** Typed form errors — keyed by field name */
export type FormErrors<T extends string = string> = Partial<Record<T, string>>

export interface NotificationPreferences {
  emailNotifications: boolean
  pushNotifications: boolean
  consultationReminders: boolean
  paymentNotifications: boolean
  marketingEmails: boolean
  reminderNotifications: boolean
}

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: string
  profileCompleted: boolean
  country?: string
  status?: string
  isOnline?: boolean
  // Extended profile fields
  phoneNumber?: string
  city?: string
  state?: string
  address?: string
  postalCode?: string
  profileImage?: string
  // Notification preferences
  notificationPreferences?: NotificationPreferences
}

export interface AuthResponse {
  success: boolean
  message: string
  id?: string
  redirectUrl?: string
  email?: string
  firstName?: string
  lastName?: string
  fullName?: string
  role?: string
  profileCompleted?: boolean
  country?: string
  status?: string
  isOnline?: boolean
  phoneNumber?: string
  city?: string
  state?: string
  address?: string
  postalCode?: string
  profileImage?: string
  notificationPreferences?: NotificationPreferences
}

export interface UserProfileResponse {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  country?: string
  role: string
  profileCompleted: boolean
  isActive: boolean
  status?: string
  isOnline?: boolean
  phoneNumber?: string
  city?: string
  state?: string
  address?: string
  postalCode?: string
  profileImage?: string
  notificationPreferences?: NotificationPreferences
}

export interface UpdateProfileRequest {
  firstName: string
  lastName: string
  phoneNumber?: string
  city?: string
  state?: string
  country?: string
  address?: string
  postalCode?: string
  profileImage?: string
}

export interface MessageResponse {
  success: boolean
  message: string
}
