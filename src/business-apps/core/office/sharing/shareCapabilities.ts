import type { SharePermissionId } from './types'

export type EffectiveSharePermission = 'view' | 'comment' | 'edit' | 'admin'

export interface ShareCapabilitySource {
  permission?: SharePermissionId | 'owner'
  isOwner?: boolean
}

export interface ShareCapabilities {
  permission: EffectiveSharePermission
  canView: boolean
  canComment: boolean
  canEdit: boolean
  canManageSharing: boolean
  canDelete: boolean
}

export function getEffectiveSharePermission(source: ShareCapabilitySource): EffectiveSharePermission {
  if (source.isOwner || source.permission === 'owner' || source.permission === 'admin') {
    return 'admin'
  }

  if (source.permission === 'edit') {
    return 'edit'
  }

  if (source.permission === 'comment') {
    return 'comment'
  }

  return 'view'
}

export function getShareCapabilities(source: ShareCapabilitySource): ShareCapabilities {
  const permission = getEffectiveSharePermission(source)
  const canEdit = permission === 'edit' || permission === 'admin'

  return {
    permission,
    canView: true,
    canComment: canEdit || permission === 'comment',
    canEdit,
    canManageSharing: permission === 'admin',
    canDelete: Boolean(source.isOwner)
  }
}
