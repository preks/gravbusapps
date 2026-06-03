import { NOTIFICATION_API_URL } from '@/common/utils/serviceResolver'
import { assignBearerAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import type { GetNotificationsParams, NotificationsListResponse } from './types'

export class NotificationClient extends RestClient {
  constructor() {
    super(NOTIFICATION_API_URL, {})
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    assignBearerAuthorizationHeader(this.headers, accessToken)
  }

  getNotifications(params: GetNotificationsParams): Promise<NotificationsListResponse> {
    return this.get<NotificationsListResponse>('/notifications', {
      params,
      withCredentials: true
    })
  }

  markAllRead(): Promise<void> {
    return this.patch<void>('/notifications/user/read', undefined, {
      withCredentials: true
    })
  }

  setNotificationRead(id: string, isRead: boolean): Promise<void> {
    return this.patch<void>(`/notifications/${id}`, undefined, {
      params: { isRead },
      withCredentials: true
    })
  }

  markNotificationRead(id: string): Promise<void> {
    return this.setNotificationRead(id, true)
  }

  getSseUrl(): string {
    const base = NOTIFICATION_API_URL.replace(/\/$/, '')
    return `${base}/notifications/sse`
  }
}

export const notificationClient = new NotificationClient()
