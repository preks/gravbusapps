/**
 * PagedDocumentEditor Component
 *
 * A professional document editor with proper A4 page layout,
 * page breaks, and Word-like editing experience.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef, forwardRef } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import DOMPurify from 'dompurify'
import { ChevronRight } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useOfficeClient } from '@/common/network/office/useOfficeClient'
import type { Document, DocumentFormatting } from '../../types'
import { sanitizeDocumentHtmlForEditor } from '../../utils/documentContentUtils'
import { setDocumentTocLayoutHints } from '../../utils/tocLayoutBridge'
import { createDocumentImageUploadHandler } from '../../utils/documentImageBindings'
import { useDocumentEditorAvatars, useDocumentEditorShortcuts, useVersionUserDisplays } from '../../hooks'
import { useOfficeDocumentCollaboration } from '../../hooks/useOfficeDocumentCollaboration'
import { useYjsDocumentSync } from '../../hooks/useYjsDocumentSync'
import { useEditorKeyboardIsolation } from '@/business-apps/platform/apps/shared/hooks/useEditorKeyboardIsolation'
import {
  type ActivePagesEditorState,
  type PaginationPlusStorage as PagesStorage
} from '@/components/tiptap-extensions/tiptap-custom-pagination'
import { useImageDataUrlResolver } from '../../hooks/useImageDataUrlResolver'
import { useVersioning } from '@/business-apps/platform/apps/shared/hooks/useVersioning'
import { useFileLock } from '@/business-apps/platform/apps/shared/hooks/useFileLock'
import { useComments } from '@/business-apps/platform/apps/shared/hooks/useComments'
import { usePublishing } from '@/business-apps/platform/apps/shared/hooks/usePublishing'
import { env } from '@/common/env/EnvUtils'
import { flowbotClient } from '@/common/network/flowbot/FlowbotClient'
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
import {
  CLOSED_TABLE_SIDEBAR,
  getSelectedImageState,
  usePagedDocumentSelectionSidebars
} from './hooks/usePagedDocumentSelectionSidebars'
import { VirtualizedDocumentViewport } from './VirtualizedDocumentViewport'
import { DOCUMENT_TOC_OPEN_FORMAT_EVENT } from './components/DocumentTableOfContentsView'
import { useDocumentContextMenu } from './useDocumentContextMenu'
import translations from '../../_i18n'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import {
  buildDocumentLock,
  buildPublishMetadata,
  compareDocumentVersions,
  createDocumentComment,
  createDocumentVersion,
  getDocumentById,
  listDocumentComments,
  listDocumentVersions,
  replyToDocumentComment,
  updateDocumentComment
} from '../../utils/documentOfficeOperations'

/** Delay before auto-saving new documents/templates (no document id). 5 minutes. */
const AUTO_SAVE_DELAY_MS = 5 * 60 * 1000
const AUTOCOMPLETE_ROLLOUT_STORAGE_KEY = 'document-autocomplete-rollout'
const AUTOCOMPLETE_TOGGLE_STORAGE_KEY = 'document-autocomplete:enabled'
const DOCUMENT_DISABLE_PAGINATION_STORAGE_KEY = 'document-editor:disable-pagination'
const DOCUMENT_TABLE_DEBUG_STORAGE_KEY = 'document-editor:debug-table-doc-id'
const PAGINATION_DEBUG_FLAG = '__RM_PAGINATION_DEBUG'

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

function isTargetDocumentTableDebugEnabled(documentId?: string): boolean {
  if (!documentId || globalThis.window === undefined) return false

  const searchParams = new URLSearchParams(globalThis.window.location.search)
  const queryValue = searchParams.get('debugDocumentTables')
  const localValue = globalThis.window.localStorage.getItem(DOCUMENT_TABLE_DEBUG_STORAGE_KEY)
  const configuredValue = queryValue ?? localValue

  if (!configuredValue) {
    return false
  }

  if (isTruthyFlag(configuredValue)) {
    return true
  }

  return configuredValue
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .includes(documentId)
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

function parseIsoDateMs(value?: string): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Minimum time between local typing and applying remote collaboration content (ms). */
const DOCUMENT_REMOTE_TYPING_GUARD_MS = 1500

/** Interval for optional HTTP poll when live sync needs a fallback (ms). */
const DOCUMENT_LIVE_SYNC_POLL_INTERVAL_MS = 8000

/**
 * When true, poll the document API while Yjs reports synced (emergency fallback).
 * Off by default — keep false in production unless Yjs is proven unavailable; polling
 * duplicates full-document work and fights collaborative state.
 */
const ENABLE_DOCUMENT_LIVE_SYNC_POLL_FALLBACK = false
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
    const translateRef = useRef(t)
    translateRef.current = t
    const translateStable = useCallback((key: string) => translateRef.current(key), [])
    const officeClient = useOfficeClient(accessTokenProp)
    // Editor state
    const [title, setTitle] = useState(document?.title || initialTitle || t('title-untitled-document'))
    const [lastSaved, setLastSaved] = useState<Date | null>(document ? new Date(document.updatedAt) : null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [pageNumbersDialogOpen, setPageNumbersDialogOpen] = useState(false)
    const [zoom, setZoom] = useState(100)

    const editorContainerRef = useRef<HTMLDivElement | null>(null)
    const editorChromeRef = useRef<HTMLDivElement | null>(null)
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [pagesEditorState, setPagesEditorState] = useState<ActivePagesEditorState>({
      activeEditor: null,
      activeEditorType: null,
      activePageNumber: null
    })
    const editorRef = useRef<any>(null) // Store editor instance
    const lastRemoteUpdateMsRef = useRef(0)
    const isApplyingRemoteContentRef = useRef(false)
    const lastLocalTypingMsRef = useRef(0)
    const pendingRemoteContentRef = useRef<string | null>(null)
    const pendingRemoteTitleRef = useRef<string | null>(null)
    const pendingRemoteApplyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    /** Latest Yjs sync flag for socket handlers defined before `useYjsDocumentSync`. */
    const isYjsSyncedRef = useRef(false)

    useEffect(() => {
      lastRemoteUpdateMsRef.current = parseIsoDateMs(document?.updatedAt)
    }, [document?.id, document?.updatedAt])

    useEffect(() => {
      if (!document?.id) return

      type FlowbotDocumentStreamCompleteDetail = {
        documentId?: string
        mode?: 'document' | 'selection'
        changed?: boolean
        changeSummary?: string
      }

      const handleFlowbotDocumentStreamComplete = async (evt: Event) => {
        const customEvent = evt as CustomEvent<FlowbotDocumentStreamCompleteDetail>
        const targetDocumentId = customEvent.detail?.documentId
        if (!targetDocumentId || targetDocumentId !== document.id) return

        try {
          const latest = await getDocumentById(officeClient, document.id)
          if (!latest || !editorRef.current) return

          const nextTitle = latest.title || title
          setTitle(nextTitle)

          const latestHtml =
            DOMPurify.sanitize(sanitizeDocumentHtmlForEditor(latest.content || '<p></p>'), {
              USE_PROFILES: { html: true },
              FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea'],
              ALLOW_DATA_ATTR: true
            }) || '<p></p>'
          const currentHtml = editorRef.current.getHTML?.() || ''
          if (!isYjsSyncedRef.current && latestHtml && latestHtml !== currentHtml) {
            isApplyingRemoteContentRef.current = true
            editorRef.current.commands?.setContent?.(latestHtml, false)
            queueMicrotask(() => {
              isApplyingRemoteContentRef.current = false
            })
          }

          setLastSaved(new Date())
          setHasUnsavedChanges(false)
        } catch (error) {
          console.error('[PagedDocumentEditor] Failed to refresh document after stream commit:', error)
        }
      }

      globalThis.window.addEventListener('flowbot:document-stream-complete', handleFlowbotDocumentStreamComplete)
      return () => {
        globalThis.window.removeEventListener('flowbot:document-stream-complete', handleFlowbotDocumentStreamComplete)
      }
    }, [document?.id, officeClient, title])

    const isHeaderFooterEditing = pagesEditorState.activeEditorType !== null
    const paginationDebugDisabled = useMemo(() => isDocumentPaginationDisabled(), [])
    const targetDocumentTableDebugEnabled = useMemo(
      () => isTargetDocumentTableDebugEnabled(document?.id),
      [document?.id]
    )

    useEffect(() => {
      ;(globalThis as typeof globalThis & { [PAGINATION_DEBUG_FLAG]?: boolean })[PAGINATION_DEBUG_FLAG] =
        targetDocumentTableDebugEnabled
      return () => {
        ;(globalThis as typeof globalThis & { [PAGINATION_DEBUG_FLAG]?: boolean })[PAGINATION_DEBUG_FLAG] = false
      }
    }, [targetDocumentTableDebugEnabled])

    useEffect(() => {
      setPagesEditorState({
        activeEditor: null,
        activeEditorType: null,
        activePageNumber: null
      })
    }, [document?.id])

    const [showInsertTableDialog, setShowInsertTableDialog] = useState(false)
    const [showInsertSignatureDialog, setShowInsertSignatureDialog] = useState(false)
    // Right sidebar: only one can be open at a time (comments vs AI editor)
    const [rightSidebar, setRightSidebar] = useState<RightSidebar>('closed')
    const [tocSidebarNodePos, setTocSidebarNodePos] = useState<number | null>(null)
    const [showNavigationPanel, setShowNavigationPanel] = useNavigationPanelState()
    const [navigationPanelTab, setNavigationPanelTab] = useState<NavigationPanelTab>('headings')
    const suppressYjsSnapshotSaveRef = useRef(false)
    const autocompleteRolloutEnabled = useMemo(() => isAutocompleteRolloutEnabled(), [])

    useEffect(() => {
      if (globalThis.window === undefined) return
      type TocOpenFormatEvent = CustomEvent<{ pos: number }>
      const handleOpenTocSidebar = (evt: Event) => {
        const customEvent = evt as TocOpenFormatEvent
        const nextPos = customEvent.detail?.pos
        if (typeof nextPos !== 'number') return
        setTocSidebarNodePos(nextPos)
        setRightSidebar('toc')
      }

      globalThis.window.addEventListener(DOCUMENT_TOC_OPEN_FORMAT_EVENT, handleOpenTocSidebar)
      return () => globalThis.window.removeEventListener(DOCUMENT_TOC_OPEN_FORMAT_EVENT, handleOpenTocSidebar)
    }, [])

    const ydoc = React.useMemo(() => new Y.Doc(), [document?.id])
    const awareness = React.useMemo(() => new Awareness(ydoc), [ydoc])

    // Collaborative page layout (formatting) sync via Yjs.
    // Content is already synced via Collaboration; formatting must be synced separately.
    const formattingYMap = React.useMemo(() => ydoc.getMap('documentFormatting'), [ydoc])
    const metaYMap = React.useMemo(() => ydoc.getMap('documentMeta'), [ydoc])

    useEffect(() => {
      return () => {
        try {
          awareness.destroy()
        } catch {
          // ignore
        }
        try {
          ydoc.destroy()
        } catch {
          // ignore
        }
      }
    }, [ydoc, awareness])

    const onErrorCallback = useCallback((error: Error) => {
      console.error('[PagedDocumentEditor] Collaboration error:', error)
    }, [])

    const applyRemoteOperationContent = useCallback(
      (nextHtml: string, nextTitle?: string) => {
        const editorInstance = editorRef.current as {
          getHTML?: () => string
          commands?: { setContent?: (html: string, emit?: boolean) => void }
        } | null
        if (!editorInstance || !nextHtml) return

        const currentHtml = editorInstance.getHTML?.() || ''
        if (currentHtml === nextHtml) return

        isApplyingRemoteContentRef.current = true
        editorInstance.commands?.setContent?.(nextHtml, false)
        queueMicrotask(() => {
          isApplyingRemoteContentRef.current = false
        })
        if (nextTitle) {
          setTitle(prev => (prev === nextTitle ? prev : nextTitle))
        }
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
      },
      [setLastSaved, setHasUnsavedChanges]
    )

    const onCollaborationOperationReceived = useCallback(
      (payload: {
        userId: string
        userName: string
        operation: {
          type: string
          data?: unknown
        }
        version?: number
        timestamp: number
      }) => {
        if (!document?.id) return
        if (payload?.operation?.type !== 'content_update') return

        const operationData =
          payload.operation.data && typeof payload.operation.data === 'object'
            ? (payload.operation.data as Record<string, unknown>)
            : null
        const source = typeof operationData?.source === 'string' ? operationData.source : ''
        if (typeof source === 'string' && !source.startsWith('flowbot_realtime')) {
          return
        }

        const nextHtml = typeof operationData?.content === 'string' ? operationData.content : null
        if (!nextHtml) return
        const nextTitle = typeof operationData?.title === 'string' ? operationData.title : null

        if (isYjsSyncedRef.current) {
          if (pendingRemoteApplyTimeoutRef.current) {
            clearTimeout(pendingRemoteApplyTimeoutRef.current)
            pendingRemoteApplyTimeoutRef.current = null
          }
          pendingRemoteContentRef.current = null
          pendingRemoteTitleRef.current = null
          if (nextTitle) {
            setTitle(prev => (prev === nextTitle ? prev : nextTitle))
          }
          return
        }

        const typingAgeMs = Date.now() - lastLocalTypingMsRef.current
        if (typingAgeMs < DOCUMENT_REMOTE_TYPING_GUARD_MS) {
          pendingRemoteContentRef.current = nextHtml
          pendingRemoteTitleRef.current = nextTitle
          if (pendingRemoteApplyTimeoutRef.current) {
            clearTimeout(pendingRemoteApplyTimeoutRef.current)
          }
          pendingRemoteApplyTimeoutRef.current = setTimeout(() => {
            pendingRemoteApplyTimeoutRef.current = null
            const pendingHtml = pendingRemoteContentRef.current
            const pendingTitle = pendingRemoteTitleRef.current || undefined
            pendingRemoteContentRef.current = null
            pendingRemoteTitleRef.current = null
            if (pendingHtml) {
              applyRemoteOperationContent(pendingHtml, pendingTitle)
            }
          }, DOCUMENT_REMOTE_TYPING_GUARD_MS)
          return
        }

        applyRemoteOperationContent(nextHtml, nextTitle || undefined)
      },
      [applyRemoteOperationContent, document?.id]
    )

    // Only use the injected access token so editor behavior never depends on browser storage.
    const accessToken = accessTokenProp || ''

    useEffect(() => {
      flowbotClient.setAccessToken(accessToken)
    }, [accessToken])

    const entityId = document?.id || ''

    // Collaboration state
    const { participants: rawParticipants, socket: collaborationSocket } = useOfficeDocumentCollaboration({
      entityId,
      enabled: !!document?.id,
      accessToken,
      onOperationReceived: onCollaborationOperationReceived,
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
    const documentVersioningApi = useMemo(
      () => ({
        createVersion: (
          id: string,
          options: { content?: string; changeDescription?: string; isCheckpoint?: boolean }
        ) => createDocumentVersion(officeClient, id, options),
        listVersions: (id: string, page?: number, limit?: number) =>
          listDocumentVersions(officeClient, id, page, limit),
        getVersion: (id: string, versionNumber: number) => officeClient.documents.getDocumentVersion(id, versionNumber),
        restoreVersion: async (id: string, versionNumber: number) => {
          try {
            const versionData = await officeClient.documents.getDocumentVersion<Record<string, unknown>>(
              id,
              versionNumber
            )
            const snapshot = versionData.contentSnapshot as Record<string, unknown>
            if (!snapshot) return false

            await officeClient.documents.update(id, {
              title: snapshot.title as string,
              content:
                DOMPurify.sanitize(sanitizeDocumentHtmlForEditor((snapshot.content as string) || ''), {
                  USE_PROFILES: { html: true },
                  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea'],
                  ALLOW_DATA_ATTR: true
                }) || '',
              description: snapshot.description as string | undefined,
              tags: snapshot.tags as string[] | undefined,
              category: snapshot.category as string | undefined,
              contentJson: {}
            })
            await createDocumentVersion(officeClient, id, {
              changeDescription: `Restored from version ${versionNumber}`,
              isCheckpoint: true
            })
            return true
          } catch {
            return false
          }
        },
        compareVersions: (id: string, versionA: number, versionB: number) =>
          compareDocumentVersions(officeClient, id, versionA, versionB),
        deleteVersion: async (id: string, versionNumber: number) => {
          try {
            await officeClient.documents.deleteVersion(id, versionNumber)
            return true
          } catch {
            return false
          }
        }
      }),
      [officeClient]
    )
    const documentCommentsApi = useMemo(
      () => ({
        createComment: (id: string, input: any) => createDocumentComment(officeClient, id, input),
        listComments: (id: string, options?: any) => listDocumentComments(officeClient, id, options),
        updateComment: (commentId: string, updates: any) => updateDocumentComment(officeClient, commentId, updates),
        resolveComment: async (commentId: string) => {
          try {
            await officeClient.documents.resolveComment(commentId)
            return true
          } catch {
            return false
          }
        },
        deleteComment: async (commentId: string) => {
          try {
            await officeClient.documents.deleteComment(commentId)
            return true
          } catch {
            return false
          }
        },
        replyToComment: (commentId: string, reply: string) => replyToDocumentComment(officeClient, commentId, reply)
      }),
      [officeClient]
    )
    const documentLockApi = useMemo(
      () => ({
        lockFile: async (id: string, input?: any) => {
          try {
            const response = await officeClient.documents.acquireLock<Record<string, unknown>>(id, input || {})
            return buildDocumentLock({ ...response, isLocked: true })
          } catch {
            return null
          }
        },
        unlockFile: async (id: string) => {
          try {
            await officeClient.documents.releaseLock(id)
            return true
          } catch {
            return false
          }
        },
        getLockStatus: async (id: string) => {
          try {
            return buildDocumentLock(await officeClient.documents.getLock<Record<string, unknown>>(id))
          } catch {
            return null
          }
        },
        forceUnlock: async (id: string) => {
          try {
            await officeClient.documents.forceReleaseLock(id)
            return true
          } catch {
            return false
          }
        }
      }),
      [officeClient]
    )
    const documentPublishingApi = useMemo(
      () => ({
        publish: async (id: string, input?: any) =>
          buildPublishMetadata(
            await officeClient.documents.publish<Record<string, unknown>>(id, input || {}),
            'published'
          ),
        unpublish: async (id: string) => {
          try {
            await officeClient.documents.unpublish(id)
            return true
          } catch {
            return false
          }
        },
        updateStatus: async (id: string, status: any) => {
          try {
            await officeClient.documents.updateStatus(id, { status })
            return { status }
          } catch {
            return null
          }
        }
      }),
      [officeClient]
    )
    const versioning = useVersioning({
      entityId,
      entityType: 'document',
      apiService: documentVersioningApi,
      autoSaveEnabled: !!document?.id && !isReadOnly,
      autoSaveInterval: 30000,
      onVersionCreated: () => {}
    })

    const versionUserDisplayMap = useVersionUserDisplays(versioning.versions, accessToken)

    const comments = useComments({
      entityId,
      entityType: 'document',
      apiService: documentCommentsApi
    })

    const fileLock = useFileLock({
      entityId,
      entityType: 'document',
      currentUserId: currentUserId || undefined,
      apiService: documentLockApi
    })

    const currentPublishStatus = document?.publishMetadata?.status || 'draft'

    const publishing = usePublishing({
      entityId,
      entityType: 'document',
      currentStatus: currentPublishStatus,
      apiService: documentPublishingApi
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
      accessToken,
      documentId: document?.id,
      collaborationSocket,
      ydoc,
      awareness,
      editorRef,
      suppressSnapshotSaveRef: suppressYjsSnapshotSaveRef,
      debugTablesEnabled: targetDocumentTableDebugEnabled,
      isReadOnly,
      title,
      getFormattingForSave: () => buildPersistedFormatting(layoutFormatting),
      setLastSaved,
      setHasUnsavedChanges
    })

    useEffect(() => {
      isYjsSyncedRef.current = isYjsSynced
    }, [isYjsSynced])

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

    useEffect(() => {
      if (!ENABLE_DOCUMENT_LIVE_SYNC_POLL_FALLBACK) return
      if (!document?.id || !isYjsSynced) return

      let cancelled = false

      const pollLatestDocumentState = async () => {
        try {
          const latest = await getDocumentById(officeClient, document.id)
          if (!latest || cancelled) return

          const latestUpdatedAtMs = parseIsoDateMs(latest.updatedAt)
          if (latestUpdatedAtMs <= lastRemoteUpdateMsRef.current) return
          lastRemoteUpdateMsRef.current = latestUpdatedAtMs

          const editorInstance = editorRef.current as {
            getHTML?: () => string
            commands?: { setContent?: (html: string, emit?: boolean) => void }
          } | null
          if (!editorInstance) return

          const latestHtml = latest.content || '<p></p>'
          const currentHtml = editorInstance.getHTML?.() || ''
          if (latestHtml && latestHtml !== currentHtml) {
            isApplyingRemoteContentRef.current = true
            editorInstance.commands?.setContent?.(latestHtml, false)
            queueMicrotask(() => {
              isApplyingRemoteContentRef.current = false
            })
          }

          const nextTitle = latest.title || title
          setTitle(prev => (prev === nextTitle ? prev : nextTitle))
          setLastSaved(new Date(latestUpdatedAtMs || Date.now()))
          setHasUnsavedChanges(false)
        } catch (error) {
          if (!cancelled) {
            console.error('[PagedDocumentEditor] Live sync poll failed:', error)
          }
        }
      }

      void pollLatestDocumentState()
      const pollInterval = globalThis.window.setInterval(() => {
        void pollLatestDocumentState()
      }, DOCUMENT_LIVE_SYNC_POLL_INTERVAL_MS)

      return () => {
        cancelled = true
        globalThis.window.clearInterval(pollInterval)
      }
    }, [document?.id, isYjsSynced, officeClient, title])

    useEffect(() => {
      return () => {
        if (pendingRemoteApplyTimeoutRef.current) {
          clearTimeout(pendingRemoteApplyTimeoutRef.current)
          pendingRemoteApplyTimeoutRef.current = null
        }
      }
    }, [])

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
      return (
        DOMPurify.sanitize(sanitizeDocumentHtmlForEditor(rawContent), {
          USE_PROFILES: { html: true },
          FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea'],
          ALLOW_DATA_ATTR: true
        }) || '<p></p>'
      )
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
      uploadContext: imageUploadContext,
      paginationConfig
    })

    // Layout snapshot drives page count/current page, while header/footer editor state can temporarily override page UI.
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
      translate: translateStable,
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

    const activeHeaderFooterEditor = pagesEditorState.activeEditor
    const activeEditor = activeHeaderFooterEditor ?? editor
    const { currentPage, handleScroll, layoutSnapshot, layoutViewportModel } = usePagedDocumentLayoutState({
      editor,
      editorContainerRef,
      documentId: document?.id,
      isYjsSynced,
      layoutInputsKey
    })

    useEffect(() => {
      setDocumentTocLayoutHints({
        pageBounds: layoutViewportModel.pageBounds,
        mountedPageBodyBounds: layoutViewportModel.mountedPageBodyBounds,
        pagePositionRanges: layoutViewportModel.pagePositionRanges,
        pageSpans: layoutViewportModel.pageSpans,
        retainedPageSpans: layoutViewportModel.retainedPageSpans
      })
      return () => setDocumentTocLayoutHints(undefined)
    }, [
      layoutViewportModel.layoutVersion,
      layoutViewportModel.mountedPageBodyBounds,
      layoutViewportModel.pageBounds,
      layoutViewportModel.pagePositionRanges,
      layoutViewportModel.pageSpans,
      layoutViewportModel.retainedPageSpans
    ])

    const handleInsertSignatureFromDialog = useCallback(
      (sig: {
        snapshotSvg: string
        name: string
        kind: 'typed' | 'drawn' | 'uploaded'
        id?: string
        insertPart: 'full' | 'initials'
      }) => {
        if (!activeEditor) return
        const pageNum = pagesEditorState.activePageNumber ?? currentPage ?? 1
        const isInitials = sig.insertPart === 'initials'
        const width = isInitials ? 120 : 200
        const height = isInitials ? 64 : 80
        activeEditor
          .chain()
          .focus()
          .insertSignature({
            signatureId: sig.id,
            kind: sig.kind,
            snapshotSvg: sig.snapshotSvg,
            name: sig.name,
            pageNumber: pageNum,
            x: 50,
            y: 80,
            width,
            height
          })
          .run()
      },
      [activeEditor, pagesEditorState.activePageNumber, currentPage]
    )

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
      setSelectedImageSidebarState,
      setSelectedTableSidebarState,
      closeImageSettingsSidebar,
      closeTableSettingsSidebar,
      openTableSettingsSidebar
    } = usePagedDocumentSelectionSidebars({
      editor,
      activeEditor,
      activeHeaderFooterEditor,
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
      openLinkDialogForEditor,
      openInsertImageDialog,
      openReplaceImageDialog,
      handleReplaceSelectedImage,
      handleLinkApply,
      handleLinkRemove,
      handleAddInlineComment,
      openAiEditSidebar,
      handleConfirmAiInstruction,
      closeAiInstructionDialog
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

    const openImageSettingsSidebar = useCallback(() => {
      if (!activeEditor) return

      const imageSelection = getSelectedImageState(activeEditor)
      if (!imageSelection) return

      setSelectedImageSidebarState({
        open: true,
        editor: activeEditor,
        pos: imageSelection.pos,
        nodeSize: imageSelection.nodeSize,
        attrs: imageSelection.attrs
      })
    }, [activeEditor, setSelectedImageSidebarState])

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
      accessToken,
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
      onAiEdit: openAiEditSidebar,
      onOpenLinkDialog: openLinkDialog,
      editorContainerRef
    })

    const { contextMenuState, handleContextMenuCapture } = useDocumentContextMenu({
      activeEditor
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
    const pagesStorage =
      (editor as (typeof editor & { storage?: { pages?: PagesStorage } }) | null)?.storage?.pages ?? null
    const clampPageCount = (value: number | null | undefined) =>
      Math.max(1, Math.min(2000, Number.isFinite(value as number) ? (value as number) : 1))
    const resolvedPageCount = Math.max(
      clampPageCount(layoutSnapshot.pageCount),
      clampPageCount(pagesStorage?.getPageCount?.()),
      clampPageCount(pagesStorage?.pageCount),
      1
    )
    const resolvedCurrentPage = Math.max(
      1,
      Math.min(pagesEditorState.activePageNumber ?? currentPage ?? 1, resolvedPageCount)
    )
    const proseMinHeight =
      paginationConfig != null
        ? paginationConfig.pageHeight - paginationConfig.marginTop - paginationConfig.marginBottom
        : 400
    const headerTopMarginPx =
      pagesFormattingConfig.headerTopMargin ?? (paginationConfig ? Math.round(paginationConfig.marginTop / 2) : 48)
    const footerBottomMarginPx =
      pagesFormattingConfig.footerBottomMargin ??
      (paginationConfig ? Math.round(paginationConfig.marginBottom / 2) : 48)
    let viewportBodyStateClass = ''
    if (isHeaderFooterEditing && showBodyWhileEditingHeaderFooter === false) {
      viewportBodyStateClass =
        '[&_.rm-page-body-layer]:opacity-40 [&_.rm-page-body-layer]:pointer-events-none [&_.rm-page-body-layer]:select-none'
    }
    const editorViewportStyle =
      documentEditorRightReservePx == null ? undefined : { paddingRight: documentEditorRightReservePx }

    return (
      <div
        className="gba:relative gba:flex gba:h-full gba:min-h-0 gba:min-w-0 gba:flex-col gba:bg-background"
        data-testid={testId}
      >
        <div className="gba:sticky gba:top-0 gba:z-20 gba:flex-shrink-0 gba:bg-background">
          <PagedDocumentEditorHeader
            document={document}
            paginationConfig={paginationConfig}
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
            onAiEditClick={openAiEditSidebar}
            activeEditor={activeEditor}
            canOpenPageNumbersDialog={Boolean(editor)}
            onOpenLinkDialog={openLinkDialog}
            onOpenInsertImageDialog={openInsertImageDialog}
            onOpenInsertSignatureDialog={() => setShowInsertSignatureDialog(true)}
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
        </div>

        {/* Main content: Navigation panel, or expand strip + optional template panel, then editor */}
        <div className="gba:flex gba:flex-1 gba:min-h-0 gba:min-w-0 gba:flex-row gba:overflow-hidden">
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
          <VirtualizedDocumentViewport
            editor={editor}
            activeEditor={activeEditor}
            editorContainerRef={editorContainerRef}
            zoom={zoom}
            viewportBodyStateClass={viewportBodyStateClass}
            editorViewportStyle={editorViewportStyle}
            layoutSnapshotPageCount={layoutSnapshot.pageCount}
            layoutViewportModel={layoutViewportModel}
            contextMenuState={contextMenuState}
            onContextMenuCapture={handleContextMenuCapture}
            onScroll={handleScroll}
            onOpenLinkDialog={openLinkDialog}
            onAddInlineComment={() => handleAddInlineComment()}
            onAiEditClick={openAiEditSidebar}
            onOpenReplaceImageDialog={openReplaceImageDialog}
            onOpenImageSidebar={openImageSettingsSidebar}
            onOpenLinkDialogForEditor={openLinkDialogForEditor}
          />
        </div>

        <div className="gba:sticky gba:bottom-0 gba:z-20 gba:flex-shrink-0 gba:bg-background">
          <DocumentBottomBar
            zoom={zoom}
            wordCount={wordCount}
            charCount={charCount}
            currentPage={resolvedCurrentPage}
            pageCount={resolvedPageCount}
            layoutWindowLabel={layoutViewportModel.rangeLabel}
            layoutWindowMode={layoutViewportModel.isWindowed ? 'windowed' : 'full'}
            onZoomOut={handleZoomOut}
            onZoomChange={setZoom}
            onZoomIn={handleZoomIn}
            data-testid={`${testId}-bottom-bar`}
          />
        </div>

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
          paginationConfig={paginationConfig}
          onSubmitImage={imageDialogMode === 'replace' ? handleReplaceSelectedImage : undefined}
          showInsertTableDialog={showInsertTableDialog}
          setShowInsertTableDialog={setShowInsertTableDialog}
          showInsertSignatureDialog={showInsertSignatureDialog}
          setShowInsertSignatureDialog={setShowInsertSignatureDialog}
          signatureDialogAccessToken={accessTokenProp ?? null}
          onInsertSignature={handleInsertSignatureFromDialog}
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
          tocSidebarNodePos={tocSidebarNodePos}
          onCloseTocSidebar={() => {
            setRightSidebar('closed')
            setTocSidebarNodePos(null)
          }}
          showInlineCommentPopover={showInlineCommentPopover}
          inlineCommentPosition={inlineCommentPosition}
          onSubmitInlineComment={handleSubmitInlineComment}
          onCloseInlineCommentPopover={handleCloseInlineCommentPopover}
          translate={t}
        />
      </div>
    )
  }
)

export default PagedDocumentEditor
