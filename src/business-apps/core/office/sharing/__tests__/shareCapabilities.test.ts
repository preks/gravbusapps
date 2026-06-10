import { getEffectiveSharePermission, getShareCapabilities } from '../shareCapabilities'

describe('shareCapabilities', () => {
  it('maps owner-like permissions to admin capabilities', () => {
    expect(getEffectiveSharePermission({ isOwner: true })).toBe('admin')
    expect(getEffectiveSharePermission({ permission: 'owner' })).toBe('admin')
    expect(getEffectiveSharePermission({ permission: 'admin' })).toBe('admin')
  })

  it('derives comment and edit capabilities correctly', () => {
    expect(getShareCapabilities({ permission: 'comment' })).toEqual({
      permission: 'comment',
      canView: true,
      canComment: true,
      canEdit: false,
      canManageSharing: false,
      canDelete: false
    })

    expect(getShareCapabilities({ permission: 'edit' })).toEqual({
      permission: 'edit',
      canView: true,
      canComment: true,
      canEdit: true,
      canManageSharing: false,
      canDelete: false
    })
  })

  it('allows sharing management only for full access and delete only for owners', () => {
    expect(getShareCapabilities({ permission: 'admin' })).toEqual({
      permission: 'admin',
      canView: true,
      canComment: true,
      canEdit: true,
      canManageSharing: true,
      canDelete: false
    })

    expect(getShareCapabilities({ isOwner: true })).toEqual({
      permission: 'admin',
      canView: true,
      canComment: true,
      canEdit: true,
      canManageSharing: true,
      canDelete: true
    })
  })
})
