/**
 * PagedDocumentEditor Component
 *
 * A professional document editor with proper A4 page layout,
 * page breaks, and Word-like editing experience.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef, forwardRef } from 'react'
import { EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { ChevronRight } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Document, DocumentFormatting } from '../../types'
import { normalizeDocumentHtmlForEditor } from '../../utils/documentContentUtils'
import { createDocumentImageUploadHandler } from '../../utils/documentImageBindings'
import {
  useDocumentEditorAvatars,
  useYjsDocumentSync,
  useDocumentEditorShortcuts,
  useVersionUserDisplays
} from '../../hooks'
import { useEditorKeyboardIsolation } from '../../../shared/hooks/useEditorKeyboardIsolation'
import {
  type ActivePagesEditorState,
  type PaginationPlusStorage as PagesStorage
} from '@/components/tiptap-extensions/tiptap-custom-pagination'
import { useImageDataUrlResolver } from '../../hooks/useImageDataUrlResolver'
import { DocumentApiService } from '../../services/DocumentApiService'
import { useCollaboration } from '../../../shared/hooks/useCollaboration'
import { useVersioning } from '../../../shared/hooks/useVersioning'
import { useFileLock } from '../../../shared/hooks/useFileLock'
import { useComments } from '../../../shared/hooks/useComments'
import { usePublishing } from '../../../shared/hooks/usePublishing'
import { env } from '@/common/env/EnvUtils'
import { flowbotClient } from '@/common/network/flowbot/FlowbotClient'
import { LinkBubbleMenu } from './LinkBubbleMenu'
import { NavigationPanel } from './NavigationPanel'
import { DocumentBottomBar } from './DocumentBottomBar'
import { PagedDocumentAiInstructionOverlay } from './PagedDocumentAiInstructionOverlay'
import { PagedDocumentEditorDialogHost } from './PagedDocumentEditorDialogHost'
import { PagedDocumentEditorHeader } from './PagedDocumentEditorHeader'
import { PagedDocumentEditorSidebarHost } from './PagedDocumentEditorSidebarHost'
import { PagedDocumentEditorStyles } from './PagedDocumentEditorStyles'
import { usePagedDocumentChromeMetrics } from './hooks/usePagedDocumentChromeMetrics'
import { usePagedDocumentAutocompleteController } from './hooks/usePagedDocumentAutocompleteController'
import { usePagedDocumentAuxiliaryActions, type NavigationPanelTab } from './hooks/usePagedDocumentAuxiliaryActions'
import { usePagedDocumentEditorCommandBridge } from './hooks/usePagedDocumentEditorCommandBridge'
import { usePagedDocumentEditorInstance } from './hooks/usePagedDocumentEditorInstance'
import { useEditorImageHandlers } from './hooks/useEditorImageHandlers'
import { usePagedDocumentCommentSidebar } from './hooks/usePagedDocumentCommentSidebar'
import { usePagedDocumentFormattingState, useSyncPagedDocumentFormatting } from './hooks/usePagedDocumentFormatting'
import { usePagedDocumentLayoutState } from './hooks/usePagedDocumentLayoutState'
import { usePagedDocumentPageNumberActions } from './hooks/usePagedDocumentPageNumberActions'
import { usePagedDocumentEditorRuntimeEffects } from './hooks/usePagedDocumentEditorRuntimeEffects'
import { usePagedDocumentExternalContentSync } from './hooks/usePagedDocumentExternalContentSync'
import { usePagedDocumentShellControls } from './hooks/usePagedDocumentShellControls'
import { usePagedDocumentInteractionDialogs, type RightSidebar } from './hooks/usePagedDocumentInteractionDialogs'
import { CLOSED_TABLE_SIDEBAR, usePagedDocumentSelectionSidebars } from './hooks/usePagedDocumentSelectionSidebars'
import translations from '../../_i18n'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'

/** Delay before auto-saving new documents/templates (no document id). 5 minutes. */
const AUTO_SAVE_DELAY_MS = 5 * 60 * 1000
const AUTOCOMPLETE_ROLLOUT_STORAGE_KEY = 'document-autocomplete-rollout'
const AUTOCOMPLETE_TOGGLE_STORAGE_KEY = 'document-autocomplete:enabled'
const DOCUMENT_DISABLE_PAGINATION_STORAGE_KEY = 'document-editor:disable-pagination'

function readDocumentDebugFlag(searchParam: string, storageKey: string): boolean {
  if (globalThis.window === undefined) return false

  const searchParams = new URLSearchParams(globalThis.window.location.search)
  const queryValue = searchParams.get(searchParam)
  if (queryValue !== null) {
    return ['1', 'true', 'yes', 'on'].includes(queryValue.toLowerCase())
  }

  try {
    return isTruthyFlag(globalThis.localStorage.getItem(storageKey))
  } catch {
    return false
  }
}

function isDocumentPaginationDisabled(): boolean {
  return readDocumentDebugFlag('disableDocumentPagination', DOCUMENT_DISABLE_PAGINATION_STORAGE_KEY)
}

function isTruthyFlag(value: string | null | undefined): boolean {
  if (!value) return false
  return ['1', 'true', 'on', 'yes'].includes(value.toLowerCase())
}

function isAutocompleteRolloutEnabled(): boolean {
  if (globalThis.window !== undefined) {
    const localOverride = globalThis.localStorage.getItem(AUTOCOMPLETE_ROLLOUT_STORAGE_KEY)
    if (localOverride !== null) {
      return isTruthyFlag(localOverride)
    }
  }

  // Enabled by default; explicit env flag can disable globally.
  const envValue = env('NEXT_PUBLIC_DOCUMENT_AUTOCOMPLETE_ENABLED')
  if (envValue === null || envValue === undefined || envValue === '') {
    return true
  }
  return isTruthyFlag(envValue)
}

/**
 * Format approval date for display
 */
export interface PagedDocumentEditorProps extends Partial<BusinessAppContextProps> {
  document?: Document
  initialContent?: string
  initialTitle?: string
  initialFormatting?: DocumentFormatting
  onSave: (title: string, content: string, formatting?: DocumentFormatting) => Promise<void>
  onBack: () => void
  /** When provided, page setup changes are persisted immediately on OK (so layout survives when leaving without Save). */
  onPersistFormatting?: (formatting: DocumentFormatting) => Promise<void>
  onSaveAsTemplate?: (title: string, content: string) => void
  onSendForApproval?: () => void
  isReadOnly?: boolean
  /** Left panel (e.g. Insert field for templates); shown when editing a template */
  leftPanel?: React.ReactNode
  /** Extra content rendered below the title row (e.g. external-source badge) */
  headerExtra?: React.ReactNode
  'data-testid'?: string
}

export interface PagedDocumentEditorRef {
  insertAtCursor: (htmlOrText: string) => void
}

function useNavigationPanelState(): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  const [show, setShow] = useState(() => {
    if (globalThis.window === undefined) return false
    return globalThis.window.localStorage.getItem('document-editor-navigation-panel-open') === 'true'
  })
  useEffect(() => {
    if (globalThis.window === undefined) return
    globalThis.window.localStorage.setItem('document-editor-navigation-panel-open', String(show))
  }, [show])
  return [show, setShow]
}

/**
 * PagedDocumentEditor Component
 */
export const PagedDocumentEditor = forwardRef<PagedDocumentEditorRef, PagedDocumentEditorProps>(
  function PagedDocumentEditor(
    {
      document,
      initialContent = '',
      initialTitle,
      initialFormatting,
      onSave,
      onBack,
      onPersistFormatting,
      onSaveAsTemplate,
      onSendForApproval,
      isReadOnly = false,
      leftPanel,
      headerExtra,
      accessToken: accessTokenProp,
      'data-testid': testId = 'paged-document-editor'
    },
    ref
  ) {
    const { t } = useTranslation(translations)
    // Editor state
    const [title, setTitle] = useState(document?.title || initialTitle || t('title-untitled-document'))
    const [lastSaved, setLastSaved] = useState<Date | null>(document ? new Date(document.updatedAt) : null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [pageNumbersDialogOpen, setPageNumbersDialogOpen] = useState(false)
    const [zoom, setZoom] = useState(100)

    const editorContainerRef = useRef<HTMLDivElement | null>(null)
    const editorChromeRef = useRef<HTMLDivElement | null>(null)
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const editorRef = useRef<any>(null) // Store editor instance
    const [pagesEditorState, setPagesEditorState] = useState<ActivePagesEditorState>({
      activeEditor: null,
      activeEditorType: null,
      activePageNumber: null
    })

    useEffect(() => {
      DocumentApiService.setAccessToken(accessTokenProp || null)
    }, [accessTokenProp])

    const isHeaderFooterEditing = pagesEditorState.activeEditorType !== null
    const paginationDebugDisabled = useMemo(() => isDocumentPaginationDisabled(), [])

    useEffect(() => {
      setPagesEditorState({
        activeEditor: null,
        activeEditorType: null,
        activePageNumber: null
      })
    }, [document?.id])

    const [showInsertTableDialog, setShowInsertTableDialog] = useState(false)
    // Right sidebar: only one can be open at a time (comments vs AI editor)
    const [rightSidebar, setRightSidebar] = useState<RightSidebar>('closed')
    const [showNavigationPanel, setShowNavigationPanel] = useNavigationPanelState()
    const [navigationPanelTab, setNavigationPanelTab] = useState<NavigationPanelTab>('headings')
    const suppressYjsSnapshotSaveRef = useRef(false)
    const autocompleteRolloutEnabled = useMemo(() => isAutocompleteRolloutEnabled(), [])

    const ydoc = React.useMemo(() => new Y.Doc(), [document?.id])
    const awareness = React.useMemo(() => new Awareness(ydoc), [ydoc])

    // Collaborative page layout (formatting) sync via Yjs.
    // Content is already synced via Collaboration; formatting must be synced separately.
    const formattingYMap = React.useMemo(() => ydoc.getMap('documentFormatting'), [ydoc])
    const metaYMap = React.useMemo(() => ydoc.getMap('documentMeta'), [ydoc])

    const onErrorCallback = useCallback((error: Error) => {
      console.error('[PagedDocumentEditor] Collaboration error:', error)
    }, [])

    // Only use the injected access token so editor behavior never depends on browser storage.
    const accessToken = accessTokenProp || ''

    useEffect(() => {
      flowbotClient.setAccessToken(accessToken)
    }, [accessToken])

    const entityId = document?.id || ''

    // Collaboration state
    const { participants: rawParticipants, socket: collaborationSocket } = useCollaboration({
      entityType: 'document',
      entityId,
      enabled: !!document?.id,
      accessToken,
      onError: onErrorCallback
    })

    const { participants, currentUserId, currentUserName, currentUserAvatar } = useDocumentEditorAvatars({
      accessToken,
      rawParticipants
    })
    const autocompleteToggleStorageKey = useMemo(
      () => (currentUserId ? `${AUTOCOMPLETE_TOGGLE_STORAGE_KEY}:${currentUserId}` : AUTOCOMPLETE_TOGGLE_STORAGE_KEY),
      [currentUserId]
    )

    // Versioning, Comments, Locking, Publishing hooks
    const versioning = useVersioning({
      entityId,
      entityType: 'document',
      apiService: DocumentApiService,
      autoSaveEnabled: !!document?.id && !isReadOnly,
      autoSaveInterval: 30000,
      onVersionCreated: () => {}
    })

    const versionUserDisplayMap = useVersionUserDisplays(versioning.versions, accessToken)

    const comments = useComments({
      entityId,
      entityType: 'document',
      apiService: DocumentApiService
    })

    const fileLock = useFileLock({
      entityId,
      entityType: 'document',
      currentUserId: currentUserId || undefined,
      apiService: DocumentApiService
    })

    const currentPublishStatus = document?.publishMetadata?.status || 'draft'

    const publishing = usePublishing({
      entityId,
      entityType: 'document',
      currentStatus: currentPublishStatus,
      apiService: DocumentApiService
    })

    const getPagesStorageSnapshot = useCallback((): PagesStorage | null => {
      const editorInstance = editorRef.current as { storage?: { pages?: PagesStorage } } | null
      return editorInstance?.storage?.pages ?? null
    }, [])
    const {
      layoutFormatting,
      setLayoutFormatting,
      layoutFormattingRef,
      resolvedLayout,
      paginationConfig,
      pagesFormattingConfig,
      printStyleConfig,
      layoutInputsKey,
      pageColor,
      getPersistedPagesFormatting,
      buildPersistedFormatting
    } = usePagedDocumentFormattingState({
      documentFormatting: document?.formatting,
      initialFormatting,
      getPagesStorageSnapshot
    })

    const { isYjsSynced } = useYjsDocumentSync({
      documentId: document?.id,
      collaborationSocket,
      ydoc,
      awareness,
      editorRef,
      suppressSnapshotSaveRef: suppressYjsSnapshotSaveRef,
      isReadOnly,
      title,
      getFormattingForSave: () => buildPersistedFormatting(layoutFormatting),
      setLastSaved,
      setHasUnsavedChanges
    })
    const { persistFormatting } = useSyncPagedDocumentFormatting({
      documentId: document?.id,
      documentFormatting: document?.formatting,
      formattingYMap,
      isYjsSynced,
      layoutFormatting,
      setLayoutFormatting,
      getPersistedPagesFormatting,
      buildPersistedFormatting,
      activeEditorType: pagesEditorState.activeEditorType,
      onPersistFormatting
    })

    // Seed collaborative title once synced (do not overwrite an existing value from the room).
    useEffect(() => {
      if (!document?.id) return
      if (!isYjsSynced) return
      if (metaYMap.get('title')) return
      const initial = (document?.title || '').trim()
      if (!initial) return
      metaYMap.set('title', initial)
    }, [document?.id, document?.title, isYjsSynced, metaYMap])

    // Apply title updates from other collaborators.
    useEffect(() => {
      if (!document?.id) return

      const applyFromYjs = () => {
        const next = metaYMap.get('title')
        if (typeof next !== 'string') return
        const nextTitle = next.trim()
        if (!nextTitle) return
        setTitle(prev => (prev === nextTitle ? prev : nextTitle))
        lastSavedTitleRef.current = nextTitle
      }

      applyFromYjs()
      const handler = () => applyFromYjs()
      metaYMap.observe(handler)
      return () => metaYMap.unobserve(handler)
    }, [document?.id, metaYMap])

    const editorContent = React.useMemo(() => {
      const rawContent = document?.content || initialContent || '<p></p>'
      return normalizeDocumentHtmlForEditor(rawContent)
    }, [document?.content, initialContent])
    const editorEditable = React.useMemo(
      () => !isReadOnly && (!document?.id || (isYjsSynced && fileLock.canEdit)),
      [isReadOnly, document?.id, isYjsSynced, fileLock.canEdit]
    )
    const autocompleteController = usePagedDocumentAutocompleteController({
      editorRef,
      documentId: document?.id,
      title,
      editorEditable,
      autocompleteRolloutEnabled,
      autocompleteToggleStorageKey
    })
    const {
      autocompleteSuggestionRef,
      autocompleteCursorPosRef,
      clearAutocompleteSuggestion,
      scheduleAutocompleteRef
    } = autocompleteController

    const uploadImage = useMemo(
      () => createDocumentImageUploadHandler(document?.id ?? null, accessToken),
      [accessToken, document?.id]
    )

    const imageUploadContext = useMemo(() => ({ documentId: document?.id ?? null }), [document?.id])

    const imageHandlers = useEditorImageHandlers({
      editorRef,
      uploadImage,
      uploadContext: imageUploadContext
    })

    // Page count and current page from PaginationPlus DOM.
    const handlePagesActiveEditorChange = useCallback((state: ActivePagesEditorState) => {
      setPagesEditorState(state)
    }, [])
    const handleOpenCommentThread = useCallback(
      (commentId: string) => {
        setRightSidebar('comments')
        setTimeout(() => {
          const commentElement = globalThis.document.querySelector(`[data-testid="comment-thread-${commentId}"]`)
          commentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 300)
      },
      [setRightSidebar]
    )
    const editorOnUpdateRef = useRef<() => void>(() => {})

    const editor = usePagedDocumentEditorInstance({
      accessToken,
      documentId: document?.id,
      documentTitle: document?.title,
      initialTitle,
      editorContent,
      editorEditable,
      ydoc,
      awareness,
      paginationConfig,
      paginationDebugDisabled,
      pagesFormattingConfig,
      editorChromeRef,
      editorRef,
      onEditorUpdateRef: editorOnUpdateRef,
      onActiveEditorChange: handlePagesActiveEditorChange,
      onCommentClick: handleOpenCommentThread,
      translate: t,
      handlePaste: imageHandlers.handlePaste,
      handleDrop: imageHandlers.handleDrop,
      autocompleteSuggestionRef,
      autocompleteCursorPosRef,
      clearAutocompleteSuggestion,
      scheduleAutocompleteRef
    })
    const { closeHeaderFooterEditorsAndSidebar } = usePagedDocumentEditorCommandBridge({
      editor,
      editorRef,
      externalRef: ref,
      paginationConfig,
      pagesFormattingConfig,
      title,
      documentTitle: document?.title,
      initialTitle,
      isYjsSynced,
      setPagesEditorState
    })

    const activeEditor = (pagesEditorState.activeEditor as typeof editor | null) ?? editor
    const { currentPage, handleScroll, layoutSnapshot, layoutViewportModel, runtimeState } =
      usePagedDocumentLayoutState({
        editor,
        editorContainerRef,
        documentId: document?.id,
        isYjsSynced,
        layoutInputsKey
      })
    const {
      replaceImagePosRef,
      selectedImageSidebar,
      selectedTableSidebar,
      showBodyWhileEditingHeaderFooter,
      setShowBodyWhileEditingHeaderFooter,
      documentRightPanelOffset,
      showHeaderFooterSidebar,
      documentEditorRightReservePx,
      imageSidebarContextSubtitleKey,
      tableSidebarContextSubtitleKey,
      setSelectedTableSidebarState,
      closeImageSettingsSidebar,
      closeTableSettingsSidebar,
      openTableSettingsSidebar
    } = usePagedDocumentSelectionSidebars({
      editor,
      activeEditor,
      activeHeaderFooterEditor: pagesEditorState.activeEditor as typeof editor | null,
      activeHeaderFooterType: pagesEditorState.activeEditorType,
      isHeaderFooterEditing,
      rightSidebar
    })
    const {
      showInsertImageDialog,
      setShowInsertImageDialog,
      imageDialogMode,
      showLinkDialog,
      setShowLinkDialog,
      linkDialogMode,
      linkDialogInitialValues,
      showInlineCommentPopover,
      setShowInlineCommentPopover,
      inlineCommentPosition,
      pendingSelection,
      setPendingSelection,
      showAiInstructionDialog,
      aiInstruction,
      setAiInstruction,
      aiSelectionPreviewText,
      hasLongAiSelectionPreview,
      isAiSelectionPreviewExpanded,
      setIsAiSelectionPreviewExpanded,
      openLinkDialog,
      openInsertImageDialog,
      openReplaceImageDialog,
      handleReplaceSelectedImage,
      handleLinkApply,
      handleLinkRemove,
      handleAddInlineComment,
      handleAiEditClick,
      handleConfirmAiInstruction,
      closeAiInstructionDialog,
      openAiFromPendingSelection
    } = usePagedDocumentInteractionDialogs({
      editor,
      activeEditor,
      layoutViewportModel,
      documentId: document?.id,
      title,
      rightSidebar,
      setRightSidebar,
      replaceImagePosRef
    })
    const {
      handleCommentsButtonPointerDown,
      toggleCommentsSidebar,
      closeCommentsSidebar,
      handleCreateComment,
      handleUpdateComment,
      handleResolveComment,
      handleDeleteComment,
      handleUnhighlightComment,
      handleScrollToHighlight
    } = usePagedDocumentCommentSidebar({
      editor,
      activeEditor,
      layoutViewportModel,
      comments,
      currentUserId,
      currentUserName,
      currentUserAvatar,
      rightSidebar,
      setRightSidebar
    })

    useEffect(() => {
      setSelectedTableSidebarState(CLOSED_TABLE_SIDEBAR)
    }, [document?.id, setSelectedTableSidebarState])

    usePagedDocumentEditorRuntimeEffects({
      editor,
      editorRef,
      autocomplete: autocompleteController,
      awareness,
      participants,
      documentId: document?.id,
      documentTitle: document?.title,
      currentUserId,
      currentUserName,
      currentUserAvatar,
      isYjsSynced,
      isReadOnly,
      editorEditable,
      translate: t
    })

    // Cleanup auto-save timeout on unmount
    useEffect(() => {
      return () => {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current)
        }
      }
    }, [])

    const {
      handlePageSetupApply,
      handlePageNumbersApply,
      handleQuickPageNumberPlacement,
      handlePageNumbersRemove,
      persistPagesFromEditor
    } = usePagedDocumentPageNumberActions({
      editor,
      editorRef,
      layoutFormattingRef,
      buildPersistedFormatting,
      persistFormatting,
      markUnsavedChanges: () => setHasUnsavedChanges(true)
    })

    const lastSavedTitleRef = useRef(title)

    useEffect(() => {
      // Keep in sync when title is loaded/changed programmatically.
      lastSavedTitleRef.current = title
    }, [document?.id])
    const getImageDataUrl = useImageDataUrlResolver(accessToken)
    const {
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
    } = usePagedDocumentShellControls({
      title,
      setTitle,
      editor,
      documentId: document?.id,
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
      getImageDataUrl: async src => (await getImageDataUrl(src)) ?? ''
    })
    editorOnUpdateRef.current = () => {
      if (document?.id) {
        versioning.markAsChanged()
        return
      }

      setHasUnsavedChanges(true)
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        void handleSave()
      }, AUTO_SAVE_DELAY_MS)
    }
    const { measuredHeaderHeight, setHeaderChromeNode } = usePagedDocumentChromeMetrics(editorChromeRef)
    const { handleRestoreVersion } = usePagedDocumentExternalContentSync({
      editor,
      documentId: document?.id,
      editorContainerRef,
      ydoc,
      suppressYjsSnapshotSaveRef,
      setTitle,
      setHasUnsavedChanges,
      setLastSaved,
      versioning,
      setShowVersionHistory
    })

    useDocumentEditorShortcuts({
      onSave: () => {
        void handleSave()
      },
      onAddInlineComment: handleAddInlineComment,
      onOpenLinkDialog: openLinkDialog,
      editor: activeEditor,
      editorContainerRef
    })

    useEditorKeyboardIsolation(editorContainerRef)
    const {
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
    } = usePagedDocumentAuxiliaryActions({
      editor,
      title,
      onSaveAsTemplate,
      setShowNavigationPanel,
      setNavigationPanelTab,
      setShowInsertTableDialog,
      setPageNumbersDialogOpen,
      setZoom,
      createCheckpoint: versioning.createCheckpoint,
      publishDocument: publishing.publish,
      createInlineComment: comments.createComment,
      pendingSelection,
      currentUserId,
      currentUserName,
      currentUserAvatar,
      setPendingSelection,
      setShowInlineCommentPopover
    })

    // Get word count
    const wordCount =
      editor?.storage.characterCount?.words?.() || editor?.getText().trim().split(/\s+/).filter(Boolean).length || 0

    // Get character count
    const charCount = editor?.storage.characterCount?.characters?.() || editor?.getText().length || 0
    const proseMinHeight =
      paginationConfig != null
        ? paginationConfig.pageHeight - paginationConfig.marginTop - paginationConfig.marginBottom
        : 400
    const headerTopMarginPx =
      pagesFormattingConfig.headerTopMargin ?? (paginationConfig ? Math.round(paginationConfig.marginTop / 2) : 48)
    const footerBottomMarginPx =
      pagesFormattingConfig.footerBottomMargin ??
      (paginationConfig ? Math.round(paginationConfig.marginBottom / 2) : 48)

    return (
      <div className="gba:flex gba:flex-col gba:h-full gba:bg-background gba:relative" data-testid={testId}>
        <PagedDocumentEditorHeader
          document={document}
          title={title}
          isReadOnly={isReadOnly}
          isSaving={isSaving}
          isExporting={isExporting}
          hasUnsavedChanges={hasUnsavedChanges}
          lastSaved={lastSaved}
          participants={participants}
          unresolvedCommentCount={comments.unresolvedCount}
          rightSidebar={rightSidebar}
          publishingStatus={publishing.metadata?.status || 'draft'}
          setHeaderChromeNode={setHeaderChromeNode}
          onBack={onBack}
          onTitleChange={handleTitleChange}
          onTitleKeyDown={handleTitleKeyDown}
          onTitleBlur={handleTitleBlur}
          onSave={handleSave}
          onCommentsButtonPointerDown={handleCommentsButtonPointerDown}
          onToggleCommentsSidebar={toggleCommentsSidebar}
          onOpenVersionHistory={openVersionHistory}
          onOpenCheckpointDialog={openCheckpointDialog}
          onAcquireLock={() => fileLock.acquireLock()}
          onReleaseLock={() => fileLock.releaseLock()}
          onOpenPublishDialog={openPublishDialog}
          onOpenPageSetupDialog={openPageSetupDialog}
          onSaveAsTemplate={onSaveAsTemplate ? handleSaveAsTemplate : undefined}
          onSendForApproval={onSendForApproval}
          onExportWord={handleExportWord}
          onExportPDF={handleExportPDF}
          onPrint={handlePrint}
          onAiEditClick={handleAiEditClick}
          activeEditor={activeEditor}
          canOpenPageNumbersDialog={Boolean(editor)}
          onOpenLinkDialog={openLinkDialog}
          onOpenInsertImageDialog={openInsertImageDialog}
          onOpenInsertTableDialog={handleOpenInsertTableDialog}
          onOpenTableSidebar={openTableSettingsSidebar}
          onOpenPageNumbersDialog={handleOpenPageNumbersDialog}
          onOpenFind={() => openNavigationPanelTab('find')}
          onOpenReplace={() => openNavigationPanelTab('replace')}
          onTranslate={t}
          headerExtra={headerExtra}
          approvalRequest={document?.approvalRequest}
          isLocked={Boolean(fileLock.lock?.isLocked)}
          isLockedByMe={fileLock.isLockedByMe}
          testId={testId}
        />

        {/* Main content: Navigation panel, or expand strip + optional template panel, then editor */}
        <div className="gba:flex gba:flex-1 gba:min-h-0 gba:flex-row">
          {showNavigationPanel ? (
            <div className="gba:flex-shrink-0 gba:w-64 gba:min-h-0 gba:flex gba:flex-col gba:overflow-hidden">
              <NavigationPanel
                editor={editor}
                layoutViewportModel={layoutViewportModel}
                requestedTab={navigationPanelTab}
                onClose={() => {
                  setShowNavigationPanel(false)
                  editor?.commands.clearSearchHighlights?.()
                }}
                data-testid={`${testId}-navigation-panel`}
              />
            </div>
          ) : (
            <>
              {/* Expand strip: icon-only button when navigation is collapsed (nicer, no text) */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => openNavigationPanelTab('headings')}
                title={t('navigation-panel-show')}
                aria-label={t('navigation-panel-show')}
                data-testid="navigation-panel-expand"
                className="gba:flex-shrink-0 gba:h-full gba:rounded-none gba:border-r gba:border-y-0 gba:border-l-0 gba:w-10 gba:min-w-10"
              >
                <ChevronRight className="gba:h-5 gba:w-5" aria-hidden />
              </Button>
              {leftPanel ? (
                <div className="gba:flex-shrink-0 gba:w-64 gba:min-h-0 gba:flex gba:flex-col gba:overflow-hidden">
                  {leftPanel}
                </div>
              ) : null}
            </>
          )}
          {/* Editor Area with Page Layout - background matches page gap for consistent document canvas */}
          <div
            ref={editorContainerRef}
            className={`gba:flex-1 gba:overflow-auto gba:min-w-0 document-editor-viewport ${
              isHeaderFooterEditing && !showBodyWhileEditingHeaderFooter
                ? '[&_.rm-page-body-layer]:opacity-40 [&_.rm-page-body-layer]:pointer-events-none [&_.rm-page-body-layer]:select-none'
                : ''
            }`}
            style={documentEditorRightReservePx != null ? { paddingRight: documentEditorRightReservePx } : undefined}
            onScroll={handleScroll}
            data-layout-source={layoutViewportModel.source}
            data-layout-window-mode={layoutViewportModel.isWindowed ? 'windowed' : 'full'}
            data-layout-window-start={layoutViewportModel.activeRange.startPage}
            data-layout-window-end={layoutViewportModel.activeRange.endPage}
            data-layout-window-size={layoutViewportModel.activePageCount}
            data-layout-mounted-start={layoutViewportModel.mountedRange?.startPage}
            data-layout-mounted-end={layoutViewportModel.mountedRange?.endPage}
            data-layout-mounted-size={layoutViewportModel.mountedPageCount}
            data-layout-window-key={layoutViewportModel.windowKey}
            data-layout-current-page-in-window={layoutViewportModel.containsCurrentPage ? 'true' : 'false'}
            data-layout-runtime-status={runtimeState.status}
            data-layout-runtime-generation={runtimeState.resolvedGeneration}
            data-layout-runtime-reason={runtimeState.lastResolvedReason ?? ''}
          >
            <div className="gba:flex gba:justify-center gba:py-8" style={{ minHeight: '100%' }}>
              <div
                className="paged-document-editor"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center'
                }}
                data-layout-active-pages={layoutViewportModel.activePageNumbers.join(',')}
              >
                <EditorContent editor={editor} className="editor-content" />
                {editor && (
                  <BubbleMenu
                    editor={editor}
                    shouldShow={({ editor: e }) => e.isActive('link')}
                    pluginKey="linkBubbleMenu"
                    onMouseDown={event => event.preventDefault()}
                  >
                    <LinkBubbleMenu editor={editor} onEdit={openLinkDialog} data-testid="document-link-bubble-menu" />
                  </BubbleMenu>
                )}
                {/* Cursors/selections are rendered by Yjs cursor plugin inside the editor. */}
              </div>
            </div>
          </div>
        </div>

        <DocumentBottomBar
          zoom={zoom}
          wordCount={wordCount}
          charCount={charCount}
          currentPage={pagesEditorState.activePageNumber ?? Math.min(currentPage, layoutSnapshot.pageCount)}
          pageCount={layoutSnapshot.pageCount}
          layoutWindowLabel={layoutViewportModel.rangeLabel}
          layoutWindowMode={layoutViewportModel.isWindowed ? 'windowed' : 'full'}
          onZoomOut={handleZoomOut}
          onZoomChange={setZoom}
          onZoomIn={handleZoomIn}
          data-testid={`${testId}-bottom-bar`}
        />

        <PagedDocumentAiInstructionOverlay
          open={Boolean(document?.id && showAiInstructionDialog)}
          aiInstruction={aiInstruction}
          setAiInstruction={setAiInstruction}
          aiSelectionPreviewText={aiSelectionPreviewText}
          hasLongAiSelectionPreview={hasLongAiSelectionPreview}
          isAiSelectionPreviewExpanded={isAiSelectionPreviewExpanded}
          setIsAiSelectionPreviewExpanded={setIsAiSelectionPreviewExpanded}
          onClose={closeAiInstructionDialog}
          onSubmit={handleConfirmAiInstruction}
        />

        <PagedDocumentEditorStyles pageColor={pageColor} proseMinHeight={proseMinHeight} />
        <PagedDocumentEditorDialogHost
          documentId={document?.id}
          showVersionHistory={showVersionHistory}
          versions={versioning.versions}
          versionUserDisplayMap={versionUserDisplayMap}
          versionLoading={versioning.isLoading}
          currentVersion={versioning.currentVersion?.version}
          onRestoreVersion={handleRestoreVersion}
          onCloseVersionHistory={() => setShowVersionHistory(false)}
          showCheckpointDialog={showCheckpointDialog}
          onCloseCheckpointDialog={() => setShowCheckpointDialog(false)}
          onSaveCheckpoint={handleSaveCheckpoint}
          isSavingCheckpoint={versioning.isSaving}
          showPublishDialog={showPublishDialog}
          onClosePublishDialog={() => setShowPublishDialog(false)}
          onPublish={handlePublishDocument}
          isPublishing={publishing.isPublishing}
          showPageSetupDialog={showPageSetupDialog}
          setShowPageSetupDialog={setShowPageSetupDialog}
          layoutFormatting={layoutFormatting}
          onApplyPageSetup={handlePageSetupApply}
          showInsertImageDialog={showInsertImageDialog}
          setShowInsertImageDialog={setShowInsertImageDialog}
          activeEditor={activeEditor}
          imageDialogMode={imageDialogMode}
          uploadImage={uploadImage}
          imageUploadContext={imageUploadContext}
          onSubmitImage={imageDialogMode === 'replace' ? handleReplaceSelectedImage : undefined}
          showInsertTableDialog={showInsertTableDialog}
          setShowInsertTableDialog={setShowInsertTableDialog}
          hasEditor={Boolean(editor)}
          pageNumbersDialogOpen={pageNumbersDialogOpen}
          setPageNumbersDialogOpen={setPageNumbersDialogOpen}
          onApplyPageNumbers={handlePageNumbersApply}
          showLinkDialog={showLinkDialog}
          setShowLinkDialog={setShowLinkDialog}
          linkDialogMode={linkDialogMode}
          linkDialogInitialValues={linkDialogInitialValues}
          onApplyLink={handleLinkApply}
          onRemoveLink={linkDialogMode === 'edit' ? handleLinkRemove : undefined}
        />

        <PagedDocumentEditorSidebarHost
          documentId={document?.id}
          editor={editor}
          activeEditor={activeEditor}
          title={title}
          accessToken={accessToken}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserAvatar={currentUserAvatar}
          rightSidebar={rightSidebar}
          setRightSidebar={setRightSidebar}
          measuredHeaderHeight={measuredHeaderHeight}
          documentRightPanelOffset={documentRightPanelOffset}
          comments={comments.comments}
          commentsUnresolvedCount={comments.unresolvedCount}
          commentsIsLoading={comments.isLoading}
          onCreateComment={handleCreateComment}
          onUpdateComment={handleUpdateComment}
          onResolveComment={handleResolveComment}
          onDeleteComment={handleDeleteComment}
          onCloseCommentsSidebar={closeCommentsSidebar}
          onUnhighlightComment={handleUnhighlightComment}
          onScrollToHighlight={handleScrollToHighlight}
          showHeaderFooterSidebar={showHeaderFooterSidebar}
          pagesEditorState={pagesEditorState}
          differentFirstPage={pagesFormattingConfig.differentFirstPage}
          differentOddEven={pagesFormattingConfig.differentOddEven}
          headerTopMarginPx={headerTopMarginPx}
          footerBottomMarginPx={footerBottomMarginPx}
          marginUnit={resolvedLayout.marginUnit}
          showDocumentBody={showBodyWhileEditingHeaderFooter}
          onShowDocumentBodyChange={setShowBodyWhileEditingHeaderFooter}
          onPersistPagesFromEditor={persistPagesFromEditor}
          onOpenPageNumbers={handleOpenPageNumbersDialog}
          onQuickPageNumberPlacement={handleQuickPageNumberPlacement}
          onRemovePageNumber={handlePageNumbersRemove}
          onCloseHeaderFooterSidebar={closeHeaderFooterEditorsAndSidebar}
          selectedTableSidebar={selectedTableSidebar}
          tableContextSubtitle={tableSidebarContextSubtitleKey ? t(tableSidebarContextSubtitleKey) : undefined}
          onCloseTableSidebar={closeTableSettingsSidebar}
          selectedImageSidebar={selectedImageSidebar}
          imageContextSubtitle={imageSidebarContextSubtitleKey ? t(imageSidebarContextSubtitleKey) : undefined}
          onCloseImageSidebar={closeImageSettingsSidebar}
          onReplaceImage={openReplaceImageDialog}
          showInlineCommentPopover={showInlineCommentPopover}
          inlineCommentPosition={inlineCommentPosition}
          onEditInlineCommentWithAI={openAiFromPendingSelection}
          onSubmitInlineComment={handleSubmitInlineComment}
          onCloseInlineCommentPopover={handleCloseInlineCommentPopover}
          translate={t}
        />
      </div>
    )
  }
)

export default PagedDocumentEditor
