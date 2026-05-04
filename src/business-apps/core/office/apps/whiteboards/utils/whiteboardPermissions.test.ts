import { getEffectiveWhiteboardPermission, getWhiteboardCapabilities } from './whiteboardPermissions'

describe('whiteboardPermissions', () => {
  it('treats owners as admins', () => {
    expect(getEffectiveWhiteboardPermission({ isOwner: true, permission: 'view' })).toBe('admin')
  })

  it('keeps comment users non-editable but comment-capable', () => {
    expect(getWhiteboardCapabilities({ isOwner: false, permission: 'comment' })).toEqual(
      expect.objectContaining({
        permission: 'comment',
        canEditCanvas: false,
        canComment: true,
        canRename: false,
        canManageSharing: false,
        isReadonlyCanvas: true
      })
    )
  })

  it('allows admins to manage sharing and edit', () => {
    expect(getWhiteboardCapabilities({ isOwner: false, permission: 'admin' })).toEqual(
      expect.objectContaining({
        canEditCanvas: true,
        canComment: true,
        canRename: true,
        canManageSharing: true,
        canUseAi: true,
        isReadonlyCanvas: false
      })
    )
  })
})
