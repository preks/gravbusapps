import type { WhiteboardPermission, WhiteboardSummary } from '../types'

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
  const permission = getEffectiveWhiteboardPermission(whiteboard)
  const canEditCanvas = permission === 'edit' || permission === 'admin'
  const canComment = canEditCanvas || permission === 'comment'

  return {
    permission,
    canEditCanvas,
    canComment,
    canRename: canEditCanvas,
    canDuplicate: true,
    canManageSharing: permission === 'admin',
    canDelete: Boolean(whiteboard?.isOwner),
    canUseAi: canEditCanvas,
    isReadonlyCanvas: !canEditCanvas
  }
}
