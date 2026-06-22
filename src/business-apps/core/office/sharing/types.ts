import type { ComponentType } from 'react'

export type SharePermissionId = string

export interface SharedEntityUser {
  shareId?: string
  userId: string
  userName?: string
  userEmail?: string
  userAvatar?: string
  permission: SharePermissionId
  sharedAt?: string
}

export interface ShareInviteRecipient {
  userId: string
  permission: SharePermissionId
}

export interface PermissionOption {
  id: SharePermissionId
  labelKey: string
  descriptionKey?: string
  badgeLabelKey?: string
  icon: ComponentType<{ className?: string }>
}

export interface EntitySharingAdapterShare {
  id: string
  userId: string
  permission: SharePermissionId
  sharedAt?: string
}

export interface EntitySharingAdapter {
  getSharedUsers: (entityId: string) => Promise<EntitySharingAdapterShare[]>
  updateSharePermission: (shareId: string, permission: SharePermissionId) => Promise<boolean>
  revokeShare: (shareId: string) => Promise<boolean>
}

export interface ShareNotificationRecipient {
  userId: string
  userName?: string
  userEmail?: string
  userAvatar?: string
  permission: SharePermissionId
}

export interface ShareNotificationContext {
  accessToken: string
  entityId: string
  entityTitle: string
  recipients: ShareNotificationRecipient[]
  initiatorId: string
  initiatorName?: string
  message?: string
}

export interface BulkShareEntity {
  entityType: string
  entityId: string
  entityTitle: string
}

export interface BulkShareEntityResult {
  entityType: string
  entityId: string
  success: boolean
  shareCount: number
  error?: string
}

export interface BulkShareResult {
  totalEntities: number
  successCount: number
  failureCount: number
  results: BulkShareEntityResult[]
}
