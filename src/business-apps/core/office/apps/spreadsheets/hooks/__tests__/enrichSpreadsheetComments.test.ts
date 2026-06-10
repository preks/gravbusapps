import type { Comment } from '@/business-apps/platform/apps/shared/types/versioning'
import { enrichCommentWithUserDisplay } from '../enrichSpreadsheetComments'

const baseComment: Comment = {
  id: 'comment-1',
  entityId: 'app-1',
  entityType: 'spreadsheet_app',
  type: 'cell',
  content: 'Hello',
  createdBy: 'user-2',
  createdAt: '2026-06-04T10:00:00.000Z'
}

describe('enrichCommentWithUserDisplay', () => {
  it('prefers stored avatar, then current user avatar, then display map', () => {
    const fromMap = enrichCommentWithUserDisplay(baseComment, {
      'user-2': { displayName: 'Mo Salah', avatarUrl: 'data:image/png;base64,map' }
    })
    expect(fromMap.createdByAvatar).toBe('data:image/png;base64,map')

    const fromCurrentUser = enrichCommentWithUserDisplay(
      { ...baseComment, createdBy: 'user-1' },
      {},
      { currentUserId: 'user-1', currentUserAvatar: 'data:image/png;base64,me' }
    )
    expect(fromCurrentUser.createdByAvatar).toBe('data:image/png;base64,me')

    const stored = enrichCommentWithUserDisplay(
      { ...baseComment, createdByAvatar: 'data:image/png;base64,stored' },
      { 'user-2': { displayName: 'Mo Salah', avatarUrl: 'data:image/png;base64,map' } }
    )
    expect(stored.createdByAvatar).toBe('data:image/png;base64,stored')
  })
})
