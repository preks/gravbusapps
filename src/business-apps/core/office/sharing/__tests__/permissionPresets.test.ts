import {
  DOCUMENT_SHARE_PERMISSIONS,
  getIntersectedPermissionOptions,
  NOTE_SHARE_PERMISSIONS,
  OFFICE_CONTENT_SHARE_PERMISSIONS,
  SLIDE_SHARE_PERMISSIONS,
  SPREADSHEET_SHARE_PERMISSIONS,
  WHITEBOARD_SHARE_PERMISSIONS
} from '../permissionPresets'

describe('permissionPresets', () => {
  it('keeps spreadsheet sharing permissions distinct from notes-style permissions', () => {
    expect(SPREADSHEET_SHARE_PERMISSIONS.map(option => option.id)).toEqual(['view', 'edit', 'admin'])
    expect(OFFICE_CONTENT_SHARE_PERMISSIONS.map(option => option.id)).toEqual(['view', 'comment', 'edit', 'admin'])
    expect(NOTE_SHARE_PERMISSIONS.map(option => option.id)).toEqual(['view', 'comment', 'edit', 'admin'])
  })

  it('reuses the notes-style preset for slides, documents, and whiteboards', () => {
    const noteIds = NOTE_SHARE_PERMISSIONS.map(option => option.id)

    expect(SLIDE_SHARE_PERMISSIONS.map(option => option.id)).toEqual(noteIds)
    expect(DOCUMENT_SHARE_PERMISSIONS.map(option => option.id)).toEqual(noteIds)
    expect(WHITEBOARD_SHARE_PERMISSIONS.map(option => option.id)).toEqual(noteIds)
  })

  it('intersects mixed entity permissions for drive bulk sharing', () => {
    expect(getIntersectedPermissionOptions(['document', 'drive_file']).map(option => option.id)).toEqual([
      'view',
      'comment',
      'edit',
      'admin'
    ])

    expect(getIntersectedPermissionOptions(['document', 'spreadsheet_app']).map(option => option.id)).toEqual([
      'view',
      'edit',
      'admin'
    ])
  })
})
