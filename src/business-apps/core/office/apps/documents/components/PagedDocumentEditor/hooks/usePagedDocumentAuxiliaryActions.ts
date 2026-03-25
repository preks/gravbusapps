import { useCallback, type Dispatch, type SetStateAction } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { sanitizePaginationRuntimeHtml } from '../../../utils/documentContentUtils'
import type { PendingInlineSelection } from './usePagedDocumentInteractionDialogs'

export type NavigationPanelTab = 'headings' | 'find' | 'replace'

interface InlineCommentCreateResult {
  id: string
  createdAt?: string
}

interface InlineCommentCreateInput {
  type: 'inline'
  content: string
  selectionStart: number
  selectionEnd: number
  selectedText: string
  createdByName?: string
  createdByAvatar?: string
}

export interface UsePagedDocumentAuxiliaryActionsParams {
  editor: TiptapEditor | null
  title: string
  onSaveAsTemplate?: (title: string, content: string) => void
  setShowNavigationPanel: Dispatch<SetStateAction<boolean>>
  setNavigationPanelTab: Dispatch<SetStateAction<NavigationPanelTab>>
  setShowInsertTableDialog: Dispatch<SetStateAction<boolean>>
  setPageNumbersDialogOpen: Dispatch<SetStateAction<boolean>>
  setZoom: Dispatch<SetStateAction<number>>
  createCheckpoint: (description: string) => Promise<unknown>
  publishDocument: (publishNotes?: string, createCheckpoint?: boolean) => Promise<unknown>
  createInlineComment: (input: InlineCommentCreateInput) => Promise<InlineCommentCreateResult | null | undefined>
  pendingSelection: PendingInlineSelection | null
  currentUserId: string | null
  currentUserName: string | null
  currentUserAvatar: string | null
  setPendingSelection: Dispatch<SetStateAction<PendingInlineSelection | null>>
  setShowInlineCommentPopover: Dispatch<SetStateAction<boolean>>
}

export interface UsePagedDocumentAuxiliaryActionsResult {
  openNavigationPanelTab: (tab: NavigationPanelTab) => void
  handleOpenInsertTableDialog: () => void
  handleOpenPageNumbersDialog: () => void
  handleSaveAsTemplate: () => void
  handleZoomIn: () => void
  handleZoomOut: () => void
  handleSaveCheckpoint: (description: string) => Promise<void>
  handlePublishDocument: (publishNotes?: string, createCheckpoint?: boolean) => Promise<void>
  handleSubmitInlineComment: (content: string) => Promise<void>
  handleCloseInlineCommentPopover: () => void
}

export function usePagedDocumentAuxiliaryActions({
  editor,
  title,
  onSaveAsTemplate,
  setShowNavigationPanel,
  setNavigationPanelTab,
  setShowInsertTableDialog,
  setPageNumbersDialogOpen,
  setZoom,
  createCheckpoint,
  publishDocument,
  createInlineComment,
  pendingSelection,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  setPendingSelection,
  setShowInlineCommentPopover
}: UsePagedDocumentAuxiliaryActionsParams): UsePagedDocumentAuxiliaryActionsResult {
  const openNavigationPanelTab = useCallback(
    (tab: NavigationPanelTab) => {
      setNavigationPanelTab(tab)
      setShowNavigationPanel(true)
    },
    [setNavigationPanelTab, setShowNavigationPanel]
  )

  const handleOpenInsertTableDialog = useCallback(() => {
    setShowInsertTableDialog(true)
  }, [setShowInsertTableDialog])

  const handleOpenPageNumbersDialog = useCallback(() => {
    setPageNumbersDialogOpen(true)
  }, [setPageNumbersDialogOpen])

  const handleSaveAsTemplate = useCallback(() => {
    if (!editor || !onSaveAsTemplate) return
    onSaveAsTemplate(title, sanitizePaginationRuntimeHtml(editor.getHTML()))
  }, [editor, onSaveAsTemplate, title])

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 10, 200))
  }, [setZoom])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 10, 50))
  }, [setZoom])

  const handleSaveCheckpoint = useCallback(
    async (description: string) => {
      await createCheckpoint(description)
    },
    [createCheckpoint]
  )

  const handlePublishDocument = useCallback(
    async (publishNotes?: string, createCheckpointFlag?: boolean) => {
      await publishDocument(publishNotes, createCheckpointFlag)
    },
    [publishDocument]
  )

  const handleSubmitInlineComment = useCallback(
    async (content: string) => {
      if (!pendingSelection || !editor) return

      const comment = await createInlineComment({
        type: 'inline',
        content,
        selectionStart: pendingSelection.from,
        selectionEnd: pendingSelection.to,
        selectedText: pendingSelection.text,
        createdByName: currentUserName || undefined,
        createdByAvatar: currentUserAvatar || undefined
      })

      if (comment) {
        editor
          .chain()
          .focus()
          .setInlineComment({
            commentId: comment.id,
            commentType: 'inline',
            createdBy: currentUserId || '',
            createdAt: comment.createdAt
          })
          .run()
      }

      setPendingSelection(null)
    },
    [
      createInlineComment,
      currentUserAvatar,
      currentUserId,
      currentUserName,
      editor,
      pendingSelection,
      setPendingSelection
    ]
  )

  const handleCloseInlineCommentPopover = useCallback(() => {
    setShowInlineCommentPopover(false)
    setPendingSelection(null)
  }, [setPendingSelection, setShowInlineCommentPopover])

  return {
    openNavigationPanelTab,
    handleOpenInsertTableDialog,
    handleOpenPageNumbersDialog,
    handleSaveAsTemplate,
    handleZoomIn,
    handleZoomOut,
    handleSaveCheckpoint,
    handlePublishDocument,
    handleSubmitInlineComment,
    handleCloseInlineCommentPopover
  }
}
