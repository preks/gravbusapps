import { act, renderHook } from '@testing-library/react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type { UseCommentsReturn } from '../../../shared/hooks/useComments'
import { findInlineCommentSelection, usePagedDocumentCommentSidebar } from '../hooks/usePagedDocumentCommentSidebar'

function createCommentsStub(overrides?: Partial<UseCommentsReturn>): UseCommentsReturn {
  return {
    comments: [],
    unresolvedCount: 0,
    isLoading: false,
    error: null,
    loadComments: jest.fn(),
    createComment: jest.fn(),
    updateComment: jest.fn(),
    resolveComment: jest.fn(),
    unresolveComment: jest.fn(),
    deleteComment: jest.fn(),
    replyToComment: jest.fn(),
    clearError: jest.fn(),
    ...overrides
  }
}

function createSelectionChain() {
  const run = jest.fn()
  const setInlineComment = jest.fn(() => ({ run }))
  const unsetInlineComment = jest.fn(() => ({ run }))
  const focus = jest.fn(() => ({
    setTextSelection,
    setInlineComment,
    unsetInlineComment,
    run
  }))
  const setTextSelection = jest.fn(() => ({
    focus,
    setInlineComment,
    unsetInlineComment,
    run
  }))

  return {
    run,
    focus,
    setTextSelection,
    setInlineComment,
    unsetInlineComment
  }
}

describe('findInlineCommentSelection', () => {
  it('falls back to stored positions when no inline-comment marks exist', () => {
    const selection = findInlineCommentSelection(
      {
        state: {
          doc: {
            content: { size: 200 },
            descendants: jest.fn()
          }
        }
      },
      'comment-1',
      {
        selectionStart: 14,
        selectionEnd: 28,
        selectedText: 'Saved text'
      }
    )

    expect(selection).toEqual({ from: 14, to: 28 })
  })
})

describe('usePagedDocumentCommentSidebar', () => {
  it('creates an inline comment from the prepared panel anchor and applies the mark', async () => {
    const chain = createSelectionChain()
    const editor = {
      isDestroyed: false,
      state: {
        selection: {
          from: 3,
          to: 8,
          empty: false
        },
        doc: {
          content: { size: 100 },
          textBetween: jest.fn(() => 'Hello')
        }
      },
      on: jest.fn(),
      off: jest.fn(),
      chain: jest.fn(() => chain)
    } as unknown as TiptapEditor
    const comments = createCommentsStub({
      createComment: jest.fn().mockResolvedValue({
        id: 'comment-1',
        createdAt: '2026-03-21T10:00:00.000Z'
      })
    })

    const { result } = renderHook(() =>
      usePagedDocumentCommentSidebar({
        editor,
        activeEditor: editor,
        comments,
        currentUserId: 'user-1',
        currentUserName: 'Ada',
        currentUserAvatar: 'avatar',
        rightSidebar: 'closed',
        setRightSidebar: jest.fn()
      })
    )

    act(() => {
      result.current.handleCommentsButtonPointerDown()
    })

    await act(async () => {
      await result.current.handleCreateComment('Looks good')
    })

    expect(comments.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'inline',
        content: 'Looks good',
        selectionStart: 3,
        selectionEnd: 8,
        selectedText: 'Hello',
        createdByName: 'Ada',
        createdByAvatar: 'avatar'
      })
    )
    expect(chain.focus).toHaveBeenCalled()
    expect(chain.setTextSelection).toHaveBeenCalledWith({ from: 3, to: 8 })
    expect(chain.setInlineComment).toHaveBeenCalledWith(
      expect.objectContaining({
        commentId: 'comment-1',
        commentType: 'inline',
        createdBy: 'user-1'
      })
    )
    expect(chain.run).toHaveBeenCalled()
  })

  it('creates a document reply when a parent id is provided', async () => {
    const comments = createCommentsStub({
      createComment: jest.fn().mockResolvedValue(null)
    })

    const { result } = renderHook(() =>
      usePagedDocumentCommentSidebar({
        editor: null,
        activeEditor: null,
        comments,
        currentUserId: null,
        currentUserName: 'Ada',
        currentUserAvatar: null,
        rightSidebar: 'comments',
        setRightSidebar: jest.fn()
      })
    )

    await act(async () => {
      await result.current.handleCreateComment('Reply text', 'parent-1')
    })

    expect(comments.createComment).toHaveBeenCalledWith({
      type: 'document',
      content: 'Reply text',
      parentId: 'parent-1',
      createdByName: 'Ada',
      createdByAvatar: undefined
    })
  })
})
