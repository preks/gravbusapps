import { act, renderHook } from '@testing-library/react'
import type { UseCommentsReturn } from '@/business-apps/platform/apps/shared/hooks/useComments'
import type { Comment } from '@/business-apps/platform/apps/shared/types/versioning'
import { useSpreadsheetCommentSidebar } from '../useSpreadsheetCommentSidebar'

function createCommentsStub(overrides?: Partial<UseCommentsReturn>): UseCommentsReturn {
  return {
    comments: [],
    unresolvedCount: 0,
    isLoading: false,
    error: null,
    loadComments: jest.fn(),
    createComment: jest.fn(),
    updateComment: jest.fn(),
    resolveComment: jest.fn().mockResolvedValue(true),
    unresolveComment: jest.fn().mockResolvedValue(true),
    deleteComment: jest.fn().mockResolvedValue(true),
    replyToComment: jest.fn(),
    clearError: jest.fn(),
    ...overrides
  }
}

describe('useSpreadsheetCommentSidebar', () => {
  it('creates a root cell comment when a cell is selected', async () => {
    const comments = createCommentsStub({
      createComment: jest.fn().mockResolvedValue({ id: 'comment-1' })
    })

    const { result } = renderHook(() =>
      useSpreadsheetCommentSidebar({
        comments,
        activeSheetId: 'sheet-1',
        showComments: false,
        setShowComments: jest.fn(),
        getSelectedCellRef: () => 'A20'
      })
    )

    await act(async () => {
      await result.current.handleCreateComment('Hello')
    })

    expect(comments.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'cell',
        content: 'Hello',
        cellReference: 'A20',
        sheetId: 'sheet-1'
      })
    )
  })

  it('creates a root cell comment using the full selected range when multiple cells are selected', async () => {
    const comments = createCommentsStub({
      createComment: jest.fn().mockResolvedValue({ id: 'comment-2' })
    })

    const { result } = renderHook(() =>
      useSpreadsheetCommentSidebar({
        comments,
        activeSheetId: 'sheet-1',
        showComments: false,
        setShowComments: jest.fn(),
        getSelectedCellRef: () => 'B5:C9'
      })
    )

    await act(async () => {
      await result.current.handleCreateComment('Range comment')
    })

    expect(comments.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'cell',
        content: 'Range comment',
        cellReference: 'B5:C9',
        sheetId: 'sheet-1'
      })
    )
  })

  it('falls back to a document comment when no cell is selected', async () => {
    const comments = createCommentsStub({
      createComment: jest.fn().mockResolvedValue({ id: 'comment-1' })
    })

    const { result } = renderHook(() =>
      useSpreadsheetCommentSidebar({
        comments,
        activeSheetId: 'sheet-1',
        showComments: false,
        setShowComments: jest.fn(),
        getSelectedCellRef: () => null
      })
    )

    await act(async () => {
      await result.current.handleCreateComment('Hello')
    })

    expect(comments.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'document',
        content: 'Hello'
      })
    )
  })

  it('routes replies through replyToComment and filters unresolved comments per sheet', async () => {
    const allComments: Comment[] = [
      {
        id: 'comment-1',
        entityId: 'app-1',
        entityType: 'spreadsheet_app',
        type: 'cell',
        content: 'Active sheet',
        createdBy: 'user-1',
        createdAt: '2026-06-04T10:00:00.000Z',
        cellReference: 'B5:C9',
        sheetId: 'sheet-1'
      },
      {
        id: 'comment-2',
        entityId: 'app-1',
        entityType: 'spreadsheet_app',
        type: 'cell',
        content: 'Other sheet',
        createdBy: 'user-1',
        createdAt: '2026-06-04T10:00:00.000Z',
        cellReference: 'B2',
        sheetId: 'sheet-2'
      },
      {
        id: 'reply-1',
        entityId: 'app-1',
        entityType: 'spreadsheet_app',
        type: 'cell',
        content: 'Reply',
        createdBy: 'user-2',
        createdAt: '2026-06-04T10:01:00.000Z',
        parentId: 'comment-1'
      }
    ]
    const comments = createCommentsStub({
      comments: allComments,
      replyToComment: jest.fn().mockResolvedValue({ id: 'reply-1' })
    })
    const focusCellReference = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetCommentSidebar({
        comments,
        activeSheetId: 'sheet-1',
        showComments: false,
        setShowComments: jest.fn(),
        focusCellReference
      })
    )

    await act(async () => {
      await result.current.handleCreateComment('Reply', 'comment-1', 'Jane', 'avatar')
    })

    expect(comments.replyToComment).toHaveBeenCalledWith('comment-1', 'Reply', 'Jane', 'avatar')
    expect(result.current.filteredComments.map(comment => comment.id)).toEqual(['comment-1', 'reply-1'])
    expect(result.current.unresolvedCommentCount).toBe(1)

    act(() => {
      result.current.handleScrollToHighlight('comment-1')
    })

    expect(focusCellReference).toHaveBeenCalledWith('B5:C9', 'sheet-1')
  })

  it('enriches missing avatars from the comment author display map', () => {
    const comments = createCommentsStub({
      comments: [
        {
          id: 'comment-1',
          entityId: 'app-1',
          entityType: 'spreadsheet_app',
          type: 'cell',
          content: 'Hello',
          createdBy: 'user-2',
          createdAt: '2026-06-04T10:00:00.000Z',
          cellReference: 'A1',
          sheetId: 'sheet-1'
        }
      ]
    })

    const { result } = renderHook(() =>
      useSpreadsheetCommentSidebar({
        comments,
        activeSheetId: 'sheet-1',
        showComments: false,
        setShowComments: jest.fn(),
        commentUserDisplayMap: {
          'user-2': { displayName: 'Mo Salah', avatarUrl: 'data:image/png;base64,abc' }
        }
      })
    )

    expect(result.current.filteredComments[0]?.createdByAvatar).toBe('data:image/png;base64,abc')
    expect(result.current.filteredComments[0]?.createdByName).toBe('Mo Salah')
  })
})
