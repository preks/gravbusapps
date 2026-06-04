import type { EntitySharingAdapter, EntitySharingAdapterShare, SharePermissionId } from '../types'

interface CreateRestSharingAdapterOptions {
  getSharedUsers: (entityId: string) => Promise<EntitySharingAdapterShare[]>
  updateSharePermission: (shareId: string, permission: SharePermissionId) => Promise<boolean>
  revokeShare: (shareId: string) => Promise<boolean>
}

export function createRestSharingAdapter(options: CreateRestSharingAdapterOptions): EntitySharingAdapter {
  return {
    getSharedUsers: options.getSharedUsers,
    updateSharePermission: options.updateSharePermission,
    revokeShare: options.revokeShare
  }
}
