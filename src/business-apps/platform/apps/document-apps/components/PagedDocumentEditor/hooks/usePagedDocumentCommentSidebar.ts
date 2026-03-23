import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type { Transaction as ProseMirrorTransaction } from '@tiptap/pm/state'
import type { UseCommentsReturn } from '../../../shared/hooks/useComments'
import { computePanelCommentAnchor, type PanelCommentAnchor } from '../../../utils/commentPanelAnchor'
import { scrollInlineCommentRangeIntoView } from '../commentSidebarNavigation'
import type { RightSidebar } from './usePagedDocumentInteractionDialogs'
import type { DocumentLayoutViewportModel } from './useDocumentLayoutViewportModel'

type InlineCommentMeta = {
  selectionStart?: number
  selectionEnd?: number
  selectedText?: string
}

export interface UsePagedDocumentCommentSidebarParams {
  editor: TiptapEditor | null
  activeEditor: TiptapEditor | null
  layoutViewportModel?: Pick<
    DocumentLayoutViewportModel,
    'pageBounds' | 'mountedPageBodyBounds' | 'pagePositionRanges' | 'pageSpans' | 'retainedPageSpans' | 'windowKey'
  >
  comments: UseCommentsReturn
  currentUserId?: string | null
  currentUserName?: string | null
  currentUserAvatar?: string | null
  rightSidebar: RightSidebar
  setRightSidebar: Dispatch<SetStateAction<RightSidebar>>
}

export interface UsePagedDocumentCommentSidebarResult {
  handleCommentsButtonPointerDown: () => void
  toggleCommentsSidebar: () => void
  closeCommentsSidebar: () => void
  handleCreateComment: (content: string, parentId?: string) => Promise<void>
  handleUpdateComment: (commentId: string, content: string) => Promise<void>
  handleResolveComment: (commentId: string) => Promise<void>
  handleDeleteComment: (commentId: string) => Promise<void>
  handleUnhighlightComment: (commentId: string) => void
  handleScrollToHighlight: (commentId: string) => void
}

/**
 * Resolves the full document range for an inline comment. The previous implementation
 * only used the first text node with the mark; formatted selections (bold/mixed marks)
 * split into multiple text nodes, so only a fragment was highlighted.
 * When marks are split across pagination, we fall back to stored selection positions.
 */
export function findInlineCommentSelection(
  editor: { state: { doc: any } },
  commentId: string,
  comment?: InlineCommentMeta | null
): { from: number; to: number } | null {
  const { doc } = editor.state
  const ranges: { from: number; to: number }[] = []

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return
    for (const mark of node.marks ?? []) {
      if (mark?.type?.name === 'inlineComment' && mark?.attrs?.commentId === commentId) {
        ranges.push({ from: pos, to: pos + node.nodeSize })
        break
      }
    }
  })

  const docSize = doc.content.size
  const tryStoredRange = (): { from: number; to: number } | null => {
    if (
      comment?.selectionStart == null ||
      comment?.selectionEnd == null ||
      comment.selectionEnd <= comment.selectionStart
    ) {
      return null
    }
    const from = Math.max(0, Math.min(comment.selectionStart, docSize))
    const to = Math.max(from, Math.min(comment.selectionEnd, docSize))
    return to > from ? { from, to } : null
  }

  if (!ranges.length) {
    return tryStoredRange()
  }

  ranges.sort((a, b) => a.from - b.from)
  const merged: { from: number; to: number }[] = []
  for (const range of ranges) {
    const previous = merged[merged.length - 1]
    if (previous && range.from <= previous.to) {
      previous.to = Math.max(previous.to, range.to)
    } else {
      merged.push({ ...range })
    }
  }

  if (merged.length > 1) {
    const stored = tryStoredRange()
    if (stored) return stored
    return merged.reduce((current, candidate) =>
      candidate.to - candidate.from > current.to - current.from ? candidate : current
    )
  }

  const single = merged[0]
  const expectedLength = comment?.selectedText?.trim().length ?? 0
  const markLength = single.to - single.from
  if (expectedLength > 0 && markLength < expectedLength * 0.85) {
    const stored = tryStoredRange()
    if (stored && stored.to - stored.from >= expectedLength * 0.85) return stored
  }

  return single
}

function isValidPanelCommentAnchor(anchor: PanelCommentAnchor | null): anchor is PanelCommentAnchor {
  const editor = anchor?.editor
  if (!anchor || !editor || editor.isDestroyed) return false
  const docSize = editor.state.doc.content.size
  return anchor.from < anchor.to && anchor.from >= 0 && anchor.to <= docSize
}

export function usePagedDocumentCommentSidebar({
  editor,
  activeEditor,
  layoutViewportModel,
  comments,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  rightSidebar,
  setRightSidebar
}: UsePagedDocumentCommentSidebarParams): UsePagedDocumentCommentSidebarResult {
  const panelCommentAnchorRef = useRef<PanelCommentAnchor | null>(null)
  const lastHighlightedCommentIdRef = useRef<string | null>(null)
  const lastHighlightedWindowKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!editor) return
    const editors: TiptapEditor[] = [editor]
    if (activeEditor && activeEditor !== editor) {
      editors.push(activeEditor)
    }

    const subscriptions = editors.map(active => {
      const syncAnchor = () => {
        panelCommentAnchorRef.current = computePanelCommentAnchor(active)
      }
      const refreshAnchor = ({ transaction }: { transaction: ProseMirrorTransaction }) => {
        const current = panelCommentAnchorRef.current
        if (!current) {
          return
        }

        const targetEditor = active === current.editor ? active : current.editor
        if (!targetEditor || targetEditor.isDestroyed) {
          panelCommentAnchorRef.current = null
          return
        }

        if (active !== current.editor) {
          return
        }

        if (transaction.selectionSet) {
          syncAnchor()
          return
        }

        const mappedFrom = transaction.mapping.mapResult(current.from)
        const mappedTo = transaction.mapping.mapResult(current.to)
        if (mappedFrom.deleted && mappedTo.deleted) {
          panelCommentAnchorRef.current = null
          return
        }

        const docSize = targetEditor.state.doc.content.size
        const from = Math.max(0, Math.min(mappedFrom.pos, docSize))
        const to = Math.max(from, Math.min(mappedTo.pos, docSize))
        const selectedText = targetEditor.state.doc.textBetween(from, to, '\n', ' ')
        panelCommentAnchorRef.current = selectedText.trim()
          ? {
              editor: targetEditor,
              from,
              to,
              selectedText
            }
          : null
      }
      active.on('selectionUpdate', syncAnchor)
      active.on('transaction', refreshAnchor)
      return { active, syncAnchor, refreshAnchor }
    })

    return () => {
      subscriptions.forEach(({ active, syncAnchor, refreshAnchor }) => {
        active.off('selectionUpdate', syncAnchor)
        active.off('transaction', refreshAnchor)
      })
    }
  }, [activeEditor, editor])

  const handleCommentsButtonPointerDown = useCallback(() => {
    if (rightSidebar === 'comments') return
    const currentEditor = activeEditor ?? editor
    if (!currentEditor || currentEditor.isDestroyed) return
    panelCommentAnchorRef.current = computePanelCommentAnchor(currentEditor)
  }, [activeEditor, editor, rightSidebar])

  const toggleCommentsSidebar = useCallback(() => {
    setRightSidebar(previous => (previous === 'comments' ? 'closed' : 'comments'))
  }, [setRightSidebar])

  const closeCommentsSidebar = useCallback(() => {
    setRightSidebar('closed')
  }, [setRightSidebar])

  const handleCreateComment = useCallback(
    async (content: string, parentId?: string) => {
      if (parentId) {
        await comments.createComment({
          type: 'document',
          content,
          parentId,
          createdByName: currentUserName || undefined,
          createdByAvatar: currentUserAvatar || undefined
        })
        return
      }

      const anchor = panelCommentAnchorRef.current
      if (isValidPanelCommentAnchor(anchor)) {
        const anchorEditor = anchor.editor
        const docSize = anchorEditor.state.doc.content.size
        const from = Math.max(0, Math.min(anchor.from, docSize))
        const to = Math.max(from, Math.min(anchor.to, docSize))

        if (to <= from) {
          await comments.createComment({
            type: 'document',
            content,
            createdByName: currentUserName || undefined,
            createdByAvatar: currentUserAvatar || undefined
          })
          return
        }

        const selectedText = anchor.selectedText?.trim() || anchorEditor.state.doc.textBetween(from, to, '\n', ' ')
        const comment = await comments.createComment({
          type: 'inline',
          content,
          selectionStart: from,
          selectionEnd: to,
          selectedText,
          createdByName: currentUserName || undefined,
          createdByAvatar: currentUserAvatar || undefined
        })

        if (comment) {
          anchorEditor
            .chain()
            .focus()
            .setTextSelection({ from, to })
            .setInlineComment({
              commentId: comment.id,
              commentType: 'inline',
              createdBy: currentUserId || '',
              createdAt: comment.createdAt
            })
            .run()
        }
        return
      }

      await comments.createComment({
        type: 'document',
        content,
        createdByName: currentUserName || undefined,
        createdByAvatar: currentUserAvatar || undefined
      })
    },
    [comments, currentUserAvatar, currentUserId, currentUserName]
  )

  const handleUpdateComment = useCallback(
    async (commentId: string, content: string) => {
      await comments.updateComment(commentId, { content })
    },
    [comments]
  )

  const handleResolveComment = useCallback(
    async (commentId: string) => {
      await comments.resolveComment(commentId)
    },
    [comments]
  )

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      await comments.deleteComment(commentId)
    },
    [comments]
  )

  const handleUnhighlightComment = useCallback(
    (commentId: string) => {
      if (!editor) return
      const comment = comments.comments.find(entry => entry.id === commentId)
      const selection = findInlineCommentSelection(editor, commentId, comment)
      if (!selection) return
      editor.chain().setTextSelection(selection).unsetInlineComment().run()
    },
    [comments.comments, editor]
  )

  const scrollHighlightedCommentIntoView = useCallback(
    (commentId: string) => {
      if (!editor) return
      const comment = comments.comments.find(entry => entry.id === commentId)
      const selection = findInlineCommentSelection(editor, commentId, comment)
      if (!selection) return
      editor.chain().setTextSelection(selection).focus().run()
      setTimeout(
        () =>
          scrollInlineCommentRangeIntoView(
            {
              view: editor.view,
              commands: editor.commands,
              layoutHints: {
                pageBounds: layoutViewportModel?.pageBounds ?? layoutViewportModel?.mountedPageBodyBounds ?? [],
                pageSpans: layoutViewportModel?.pageSpans ?? [],
                retainedPageSpans: layoutViewportModel?.retainedPageSpans ?? [],
                mountedPageBodyBounds: layoutViewportModel?.mountedPageBodyBounds ?? [],
                pagePositionRanges: layoutViewportModel?.pagePositionRanges ?? []
              }
            },
            selection.from,
            selection.to,
            commentId
          ),
        50
      )
    },
    [
      comments.comments,
      editor,
      layoutViewportModel?.mountedPageBodyBounds,
      layoutViewportModel?.pageBounds,
      layoutViewportModel?.pagePositionRanges,
      layoutViewportModel?.pageSpans,
      layoutViewportModel?.retainedPageSpans
    ]
  )

  useEffect(() => {
    const currentWindowKey = layoutViewportModel?.windowKey ?? null
    const highlightedCommentId = lastHighlightedCommentIdRef.current
    if (!editor || rightSidebar !== 'comments' || !highlightedCommentId || !currentWindowKey) {
      return
    }

    if (lastHighlightedWindowKeyRef.current === currentWindowKey) {
      return
    }

    lastHighlightedWindowKeyRef.current = currentWindowKey
    scrollHighlightedCommentIntoView(highlightedCommentId)
  }, [editor, layoutViewportModel?.windowKey, rightSidebar, scrollHighlightedCommentIntoView])

  const handleScrollToHighlight = useCallback(
    (commentId: string) => {
      lastHighlightedCommentIdRef.current = commentId
      lastHighlightedWindowKeyRef.current = layoutViewportModel?.windowKey ?? null
      scrollHighlightedCommentIntoView(commentId)
    },
    [layoutViewportModel?.windowKey, scrollHighlightedCommentIntoView]
  )

  return {
    handleCommentsButtonPointerDown,
    toggleCommentsSidebar,
    closeCommentsSidebar,
    handleCreateComment,
    handleUpdateComment,
    handleResolveComment,
    handleDeleteComment,
    handleUnhighlightComment,
    handleScrollToHighlight
  }
}
