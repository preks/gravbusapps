import DOMPurify from 'dompurify'
import {
  useCallback,
  useState,
  type ChangeEvent,
  type Dispatch,
  type KeyboardEvent,
  type MutableRefObject,
  type SetStateAction
} from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type { DocumentFormatting } from '../../../types'
import type { DocumentPrintStyleConfig } from '../../../utils/pageLayoutUtils'
import { sanitizePaginationRuntimeHtml } from '../../../utils/documentContentUtils'
import {
  embedImagesInHtml,
  exportToPDFWithStyle,
  exportToWord,
  printHtmlDocumentWithStyle
} from '../../../utils/exportUtils'

export interface UsePagedDocumentShellControlsParams {
  title: string
  setTitle: Dispatch<SetStateAction<string>>
  editor: TiptapEditor | null
  documentId?: string
  isReadOnly: boolean
  isYjsSynced: boolean
  metaYMap: { set: (key: string, value: unknown) => void }
  lastSavedTitleRef: MutableRefObject<string>
  setLastSaved: Dispatch<SetStateAction<Date | null>>
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>
  onSave: (title: string, content: string, formatting?: DocumentFormatting) => Promise<void>
  buildPersistedFormatting: (formatting: DocumentFormatting) => DocumentFormatting
  layoutFormatting: DocumentFormatting
  printStyleConfig: DocumentPrintStyleConfig
  getImageDataUrl: (src: string) => Promise<string | null>
}

export interface UsePagedDocumentShellControlsResult {
  isSaving: boolean
  isExporting: boolean
  showVersionHistory: boolean
  setShowVersionHistory: Dispatch<SetStateAction<boolean>>
  showCheckpointDialog: boolean
  setShowCheckpointDialog: Dispatch<SetStateAction<boolean>>
  showPublishDialog: boolean
  setShowPublishDialog: Dispatch<SetStateAction<boolean>>
  showPageSetupDialog: boolean
  setShowPageSetupDialog: Dispatch<SetStateAction<boolean>>
  handleSave: () => Promise<void>
  handleTitleChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleTitleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  handleTitleBlur: () => void
  handleExportWord: () => Promise<void>
  handleExportPDF: () => Promise<void>
  handlePrint: () => Promise<void>
  openVersionHistory: () => void
  openCheckpointDialog: () => void
  openPublishDialog: () => void
  openPageSetupDialog: () => void
}

function sanitizeExportHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: [],
    ALLOW_DATA_ATTR: true
  })
}

export function usePagedDocumentShellControls({
  title,
  setTitle,
  editor,
  documentId,
  isReadOnly,
  isYjsSynced,
  metaYMap,
  lastSavedTitleRef,
  setLastSaved,
  setHasUnsavedChanges,
  onSave,
  buildPersistedFormatting,
  layoutFormatting,
  printStyleConfig,
  getImageDataUrl
}: UsePagedDocumentShellControlsParams): UsePagedDocumentShellControlsResult {
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showPageSetupDialog, setShowPageSetupDialog] = useState(false)

  const handleSave = useCallback(async () => {
    if (isReadOnly || isSaving || !editor) return

    setIsSaving(true)
    try {
      const nextTitle = title.trim() || title
      if (documentId && isYjsSynced) {
        metaYMap.set('title', nextTitle.trim())
      }

      const content = sanitizePaginationRuntimeHtml(editor.getHTML())
      const formatting = buildPersistedFormatting(layoutFormatting)
      await onSave(nextTitle, content, formatting)
      setLastSaved(new Date())
      setHasUnsavedChanges(false)

      if (documentId) {
        setShowCheckpointDialog(true)
      }
    } catch (error) {
      console.error('[PagedDocumentEditor] Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }, [
    buildPersistedFormatting,
    documentId,
    editor,
    isReadOnly,
    isSaving,
    isYjsSynced,
    layoutFormatting,
    metaYMap,
    onSave,
    setHasUnsavedChanges,
    setLastSaved,
    title
  ])

  const persistTitleIfChanged = useCallback(() => {
    if (isReadOnly) return
    if (isSaving) return

    const nextTitle = title.trim()
    if (!nextTitle) return
    if (nextTitle === lastSavedTitleRef.current) return

    lastSavedTitleRef.current = nextTitle
    setTitle(nextTitle)

    if (documentId && isYjsSynced) {
      metaYMap.set('title', nextTitle)
    }

    void handleSave()
  }, [documentId, handleSave, isReadOnly, isSaving, isYjsSynced, lastSavedTitleRef, metaYMap, setTitle, title])

  const handleTitleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setTitle(event.target.value)
      setHasUnsavedChanges(true)
    },
    [setHasUnsavedChanges, setTitle]
  )

  const handleTitleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    event.currentTarget.blur()
  }, [])

  const handleTitleBlur = useCallback(() => {
    persistTitleIfChanged()
  }, [persistTitleIfChanged])

  const getExportHtmlWithEmbeddedImages = useCallback(async (): Promise<string> => {
    if (!editor) return ''
    return embedImagesInHtml(editor.getHTML(), getImageDataUrl)
  }, [editor, getImageDataUrl])

  const handleExportWord = useCallback(async () => {
    if (!editor) return
    setIsExporting(true)
    try {
      const htmlWithImages = await getExportHtmlWithEmbeddedImages()
      const safeHtml = sanitizeExportHtml(htmlWithImages)
      await exportToWord(title, safeHtml)
    } catch (error) {
      console.error('[PagedDocumentEditor] Export to Word failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [editor, getExportHtmlWithEmbeddedImages, title])

  const handleExportPDF = useCallback(async () => {
    if (!editor) return
    setIsExporting(true)
    try {
      const htmlWithImages = await getExportHtmlWithEmbeddedImages()
      const safeHtml = sanitizeExportHtml(htmlWithImages)
      await exportToPDFWithStyle(title, safeHtml, printStyleConfig)
    } catch (error) {
      console.error('[PagedDocumentEditor] Export to PDF failed:', error)
    } finally {
      setIsExporting(false)
    }
  }, [editor, getExportHtmlWithEmbeddedImages, printStyleConfig, title])

  const handlePrint = useCallback(async () => {
    if (!editor) return
    try {
      const htmlContent = await getExportHtmlWithEmbeddedImages()
      const safeHtml = sanitizeExportHtml(htmlContent)
      printHtmlDocumentWithStyle(
        {
          title,
          htmlContent: safeHtml
        },
        printStyleConfig
      )
    } catch (error) {
      console.error('[PagedDocumentEditor] Print failed:', error)
    }
  }, [editor, getExportHtmlWithEmbeddedImages, printStyleConfig, title])

  const openVersionHistory = useCallback(() => {
    setShowVersionHistory(true)
  }, [])

  const openCheckpointDialog = useCallback(() => {
    setShowCheckpointDialog(true)
  }, [])

  const openPublishDialog = useCallback(() => {
    setShowPublishDialog(true)
  }, [])

  const openPageSetupDialog = useCallback(() => {
    setShowPageSetupDialog(true)
  }, [])

  return {
    isSaving,
    isExporting,
    showVersionHistory,
    setShowVersionHistory,
    showCheckpointDialog,
    setShowCheckpointDialog,
    showPublishDialog,
    setShowPublishDialog,
    showPageSetupDialog,
    setShowPageSetupDialog,
    handleSave,
    handleTitleChange,
    handleTitleKeyDown,
    handleTitleBlur,
    handleExportWord,
    handleExportPDF,
    handlePrint,
    openVersionHistory,
    openCheckpointDialog,
    openPublishDialog,
    openPageSetupDialog
  }
}
