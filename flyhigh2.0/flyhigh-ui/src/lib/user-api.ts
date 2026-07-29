import { api } from "@/api/client"
import type { UserProfileResponse, UpdateProfileRequest, NotificationPreferences } from "@/types/auth"
import type { MessageResponse } from "@/types/auth"

export async function fetchProfile(): Promise<UserProfileResponse> {
  return api.get<UserProfileResponse>("/users/profile")
}

export async function updateProfile(data: UpdateProfileRequest): Promise<UserProfileResponse> {
  return api.put<UserProfileResponse>("/users/profile", data)
}

export async function changePassword(data: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<MessageResponse> {
  return api.put<MessageResponse>("/users/change-password", data)
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  return api.get<NotificationPreferences>("/users/notification-preferences")
}

export async function updateNotificationPreferences(data: NotificationPreferences): Promise<MessageResponse> {
  return api.put<MessageResponse>("/users/notification-preferences", data)
}
