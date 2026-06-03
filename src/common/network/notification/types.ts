export interface NotificationUserNotification {
  title?: string
  body?: string
  read?: boolean
}

export interface NotificationItem {
  id: string
  type?: string
  classification?: string
  createdAt?: string
  userNotification?: NotificationUserNotification
}

export interface NotificationsListResponse {
  notifications?: NotificationItem[]
  totalCount?: number
}

export interface GetNotificationsParams {
  page?: number
  size?: number
  read?: boolean
  sortDirection?: 'ASC' | 'DESC'
}
