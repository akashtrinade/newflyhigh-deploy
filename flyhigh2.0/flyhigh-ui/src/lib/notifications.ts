import { api } from "@/api/client"

export interface NotificationItem {
  id: string
  userEmail: string
  expertEmail: string
  type: "chat" | "video-call"
  message: string
  roomName: string
  read: boolean
  timestamp: string
}

export interface NotificationsPage {
  success: boolean
  data: NotificationItem[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

export async function fetchNotifications(
  page = 0,
  size = 20,
): Promise<NotificationsPage> {
  return api.get<NotificationsPage>("/notifications", { page, size })
}

export async function fetchUnreadCount(): Promise<number> {
  const result = await api.get<{ success: boolean; count: number }>(
    "/notifications/unread-count",
  )
  return result.count ?? 0
}
