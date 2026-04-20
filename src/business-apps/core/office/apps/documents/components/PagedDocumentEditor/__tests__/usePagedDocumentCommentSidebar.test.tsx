import { act, renderHook } from '@testing-library/react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type { UseCommentsReturn } from '@/business-apps/platform/apps/shared/hooks/useComments'
import { scrollInlineCommentRangeIntoView } from '../commentSidebarNavigation'
import { findInlineCommentSelection, usePagedDocumentCommentSidebar } from '../hooks/usePagedDocumentCommentSidebar'

jest.mock('../commentSidebarNavigation', () => ({
  scrollInlineCommentRangeIntoView: jest.fn()
}))

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

function createEditorStub(overrides?: {
  selection?: { from: number; to: number; empty: boolean }
  textBetween?: jest.Mock<string, [number, number, string?, string?]>
}) {
  const chain = createSelectionChain()
  const handlers: Record<string, Array<(payload?: unknown) => void>> = {}
  const selection = overrides?.selection ?? {
    from: 3,
    to: 8,
    empty: false
  }
  const textBetween = overrides?.textBetween ?? jest.fn(() => 'Hello')

  const editor = {
    isDestroyed: false,
    state: {
      selection,
      doc: {
        content: { size: 100 },
        textBetween,
        descendants: jest.fn()
      }
    },
    view: {
      dom: document.createElement('div')
    },
    commands: {},
    on: jest.fn((event: string, callback: (payload?: unknown) => void) => {
      handlers[event] = handlers[event] ?? []
      handlers[event]!.push(callback)
    }),
    off: jest.fn((event: string, callback: (payload?: unknown) => void) => {
      handlers[event] = (handlers[event] ?? []).filter(entry => entry !== callback)
    }),
    chain: jest.fn(() => chain)
  } as unknown as TiptapEditor

  return { editor, chain, handlers, textBetween }
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
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('creates an inline comment from the prepared panel anchor and applies the mark', async () => {
    const { editor, chain } = createEditorStub()
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

  it('maps the prepared panel anchor through document transactions before creating the inline comment', async () => {
    const textBetween = jest.fn<string, [number, number, string?, string?]>().mockImplementation((from, to) => {
      if (from === 5 && to === 10) {
        return 'World'
      }

      return 'Hello'
    })
    const { editor, chain, handlers } = createEditorStub({ textBetween })
    const comments = createCommentsStub({
      createComment: jest.fn().mockResolvedValue({
        id: 'comment-2',
        createdAt: '2026-03-23T10:00:00.000Z'
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

    act(() => {
      handlers.transaction?.forEach(callback =>
        callback({
          transaction: {
            selectionSet: false,
            mapping: {
              mapResult: (pos: number) => ({ pos: pos + 2, deleted: false })
            }
          }
        })
      )
    })

    await act(async () => {
      await result.current.handleCreateComment('Looks mapped')
    })

    expect(comments.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'inline',
        content: 'Looks mapped',
        selectionStart: 5,
        selectionEnd: 10,
        selectedText: 'World',
        createdByName: 'Ada',
        createdByAvatar: 'avatar'
      })
    )
    expect(chain.setTextSelection).toHaveBeenCalledWith({ from: 5, to: 10 })
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

  it('re-scrolls the highlighted comment after sparse window changes', () => {
    const { editor, chain } = createEditorStub()
    const comments = createCommentsStub({
      comments: [
        {
          id: 'comment-1',
          selectionStart: 3,
          selectionEnd: 8,
          selectedText: 'Hello'
        } as never
      ]
    })

    const { result, rerender } = renderHook(
      props =>
        usePagedDocumentCommentSidebar({
          editor,
          activeEditor: editor,
          layoutViewportModel: props.layoutViewportModel,
          comments,
          currentUserId: 'user-1',
          currentUserName: 'Ada',
          currentUserAvatar: 'avatar',
          rightSidebar: 'comments',
          setRightSidebar: jest.fn()
        }),
      {
        initialProps: {
          layoutViewportModel: {
            mountedPageBodyBounds: [],
            pagePositionRanges: [],
            windowKey: 'window-1'
          }
        }
      }
    )

    act(() => {
      result.current.handleScrollToHighlight('comment-1')
      jest.runAllTimers()
    })

    expect(chain.setTextSelection).toHaveBeenCalledWith({ from: 3, to: 8 })
    expect(scrollInlineCommentRangeIntoView).toHaveBeenCalledTimes(1)

    act(() => {
      rerender({
        layoutViewportModel: {
          mountedPageBodyBounds: [],
          pagePositionRanges: [],
          windowKey: 'window-2'
        }
      })
    })

    act(() => {
      jest.runAllTimers()
    })

    expect(scrollInlineCommentRangeIntoView).toHaveBeenCalledTimes(2)
    expect(scrollInlineCommentRangeIntoView).toHaveBeenLastCalledWith(
      expect.objectContaining({
        view: editor.view,
        commands: editor.commands,
        layoutHints: expect.objectContaining({
          mountedPageBodyBounds: [],
          pagePositionRanges: []
        })
      }),
      3,
      8,
      'comment-1'
    )
  })
})
