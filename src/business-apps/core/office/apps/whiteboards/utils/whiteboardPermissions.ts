import type { WhiteboardPermission, WhiteboardSummary } from '../types'
import { getShareCapabilities } from '@/business-apps/core/office/sharing'

type WhiteboardPermissionSource = Pick<WhiteboardSummary, 'permission' | 'isOwner'> | null | undefined

export interface WhiteboardCapabilities {
  permission: WhiteboardPermission
  canEditCanvas: boolean
  canComment: boolean
  canRename: boolean
  canDuplicate: boolean
  canManageSharing: boolean
  canDelete: boolean
  canUseAi: boolean
  isReadonlyCanvas: boolean
}

export function getEffectiveWhiteboardPermission(whiteboard: WhiteboardPermissionSource): WhiteboardPermission {
  if (whiteboard?.isOwner) {
    return 'admin'
  }

  return whiteboard?.permission ?? 'view'
}

export function getWhiteboardCapabilities(whiteboard: WhiteboardPermissionSource): WhiteboardCapabilities {
  const capabilities = getShareCapabilities({
    permission: getEffectiveWhiteboardPermission(whiteboard),
    isOwner: Boolean(whiteboard?.isOwner)
  })

  return {
    permission: capabilities.permission as WhiteboardPermission,
    canEditCanvas: capabilities.canEdit,
    canComment: capabilities.canComment,
    canRename: capabilities.canEdit,
    canDuplicate: true,
    canManageSharing: capabilities.canManageSharing,
    canDelete: capabilities.canDelete,
    canUseAi: capabilities.canEdit,
    isReadonlyCanvas: !capabilities.canEdit
  }
}
