import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type { Doc as YDoc } from 'yjs'
import { markNextPaginationHydrationDocChange } from '@/components/tiptap-extensions/tiptap-custom-pagination'
import { useOfficeClient } from '@/common/network/office/useOfficeClient'
import { sanitizeDocumentHtmlForEditor, sanitizePaginationRuntimeHtml } from '../../../utils/documentContentUtils'
import { getDocumentById, getDocumentVersion } from '../../../utils/documentOfficeOperations'

export interface ExternalVersioningControls {
  restoreVersion: (versionNumber: number) => Promise<boolean>
  loadVersions: () => Promise<void>
}

export interface ApplyLatestDocumentContentParams {
  editor: TiptapEditor
  editorContainerRef: MutableRefObject<HTMLDivElement | null>
  ydoc: YDoc
  suppressYjsSnapshotSaveRef: MutableRefObject<boolean>
  html: string
  updatedAt?: string
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>
  setLastSaved: Dispatch<SetStateAction<Date | null>>
}

export interface RestoreVersionContentParams {
  officeClient: ReturnType<typeof useOfficeClient>
  documentId: string
  versionNumber: number
  editor: TiptapEditor | null
  versioning: ExternalVersioningControls
  setTitle: Dispatch<SetStateAction<string>>
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>
  setLastSaved: Dispatch<SetStateAction<Date | null>>
  closeVersionHistory: () => void
}

function parseDocumentUpdatedAtMs(value?: string): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export interface UsePagedDocumentExternalContentSyncParams {
  accessToken?: string
  editor: TiptapEditor | null
  documentId?: string
  /** `updatedAt` from the page's last document fetch — used to detect chat/API edits. */
  documentUpdatedAt?: string
  isYjsSynced?: boolean
  editorContainerRef: MutableRefObject<HTMLDivElement | null>
  ydoc: YDoc
  suppressYjsSnapshotSaveRef: MutableRefObject<boolean>
  setTitle: Dispatch<SetStateAction<string>>
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>
  setLastSaved: Dispatch<SetStateAction<Date | null>>
  versioning: ExternalVersioningControls
  setShowVersionHistory: Dispatch<SetStateAction<boolean>>
}

const FLOWBOT_STREAM_COMPLETE_EVENT = 'flowbot:document-stream-complete'
const FLOWBOT_STREAM_UPDATE_EVENT = 'flowbot:document-stream-update'
const FLOWBOT_REMOTE_APPLY_DEBOUNCE_MS = 400

export interface UsePagedDocumentExternalContentSyncResult {
  handleRestoreVersion: (versionNumber: number) => Promise<void>
  applyFlowbotRemoteHtml: (html: string, updatedAt?: string) => Promise<boolean>
  syncEditorFromLatestDocument: () => Promise<boolean>
  scheduleFlowbotRemoteHtmlApply: (html: string, options?: { force?: boolean }) => void
}

interface PendingHydrationRefresh {
  rafId: number | null
  timeoutId: ReturnType<typeof setTimeout> | null
}

const pendingHydrationRefreshes = new WeakMap<TiptapEditor, PendingHydrationRefresh>()

export function schedulePostHydrationPaginationRefresh(editor: TiptapEditor) {
  const refreshPagination = () => {
    if (editor.commands.refreshPagesAndStabilize) {
      editor.commands.refreshPagesAndStabilize()
      return
    }

    editor.commands.refreshPages?.()
  }

  const pendingRefresh = pendingHydrationRefreshes.get(editor)
  if (pendingRefresh?.rafId != null) {
    cancelAnimationFrame(pendingRefresh.rafId)
  }
  if (pendingRefresh?.timeoutId != null) {
    clearTimeout(pendingRefresh.timeoutId)
  }

  if (typeof requestAnimationFrame === 'function') {
    const rafId = requestAnimationFrame(() => {
      pendingHydrationRefreshes.delete(editor)
      refreshPagination()
    })
    pendingHydrationRefreshes.set(editor, { rafId, timeoutId: null })
    return
  }

  const timeoutId = setTimeout(() => {
    pendingHydrationRefreshes.delete(editor)
    refreshPagination()
  }, 0)
  pendingHydrationRefreshes.set(editor, { rafId: null, timeoutId })
}

function normalizeHtmlForComparison(html: string): string {
  try {
    if (globalThis.window === undefined) {
      return html.split('\u200B').join('').split(/>\s+</).join('><').split(/\s+/).join(' ').trim()
    }
    const doc = new globalThis.DOMParser().parseFromString(html, 'text/html')
    return doc.body.innerHTML.split('\u200B').join('').split(/>\s+</).join('><').split(/\s+/).join(' ').trim()
  } catch {
    return html.split('\u200B').join('').split(/>\s+</).join('><').split(/\s+/).join(' ').trim()
  }
}

export function areHtmlSemanticallyEquivalent(left: string, right: string): boolean {
  if (left === right) return true
  const normalizedLeft = normalizeHtmlForComparison(left)
  const normalizedRight = normalizeHtmlForComparison(right)
  if (normalizedLeft === normalizedRight) return true

  try {
    if (globalThis.window !== undefined) {
      const leftDoc = new globalThis.DOMParser().parseFromString(left, 'text/html')
      const rightDoc = new globalThis.DOMParser().parseFromString(right, 'text/html')
      const leftText = (leftDoc.body.textContent || '').split(/\s+/).join(' ').trim()
      const rightText = (rightDoc.body.textContent || '').split(/\s+/).join(' ').trim()
      return leftText === rightText
    }
  } catch {
    // ignore and return false below
  }

  return false
}

export async function applyLatestDocumentContent({
  editor,
  editorContainerRef,
  ydoc,
  suppressYjsSnapshotSaveRef,
  html,
  updatedAt,
  setHasUnsavedChanges,
  setLastSaved
}: ApplyLatestDocumentContentParams): Promise<boolean> {
  const scrollContainer = editorContainerRef.current
  const scrollTopBefore = scrollContainer?.scrollTop ?? 0
  const normalizedHtml = sanitizeDocumentHtmlForEditor(html)
  const safeHtml = normalizedHtml || '<p></p>'

  try {
    suppressYjsSnapshotSaveRef.current = true
    const fragment = ydoc.getXmlFragment('default')
    ydoc.transact(() => {
      fragment.delete(0, fragment.length)
    })

    markNextPaginationHydrationDocChange(editor)
    editor.commands.setContent(safeHtml, { emitUpdate: true })
    schedulePostHydrationPaginationRefresh(editor)
    await new Promise(resolve => setTimeout(resolve, 0))

    const applied = areHtmlSemanticallyEquivalent(sanitizePaginationRuntimeHtml(editor.getHTML()), safeHtml)
    if (applied) {
      setHasUnsavedChanges(false)
      if (updatedAt) {
        setLastSaved(new Date(updatedAt))
      }
    }

    return applied
  } finally {
    setTimeout(() => {
      suppressYjsSnapshotSaveRef.current = false
    }, 1500)

    if (scrollContainer) {
      const container = scrollContainer
      requestAnimationFrame(() => {
        container.scrollTop = scrollTopBefore
      })
    }
  }
}

export async function restoreVersionContent({
  officeClient,
  documentId,
  versionNumber,
  editor,
  versioning,
  setTitle,
  setHasUnsavedChanges,
  setLastSaved,
  closeVersionHistory
}: RestoreVersionContentParams): Promise<void> {
  const versionData = await getDocumentVersion(officeClient, documentId, versionNumber)
  if (!versionData) {
    console.error('[PagedDocumentEditor] Failed to get version data')
    return
  }

  const success = await versioning.restoreVersion(versionNumber)
  if (!success || !editor || !versionData.content) {
    return
  }

  markNextPaginationHydrationDocChange(editor)
  editor.commands.setContent(sanitizeDocumentHtmlForEditor(versionData.content) || '<p></p>')
  schedulePostHydrationPaginationRefresh(editor)
  setTitle(versionData.title)
  setHasUnsavedChanges(false)
  setLastSaved(new Date())

  await versioning.loadVersions()
  closeVersionHistory()
}

export function usePagedDocumentExternalContentSync({
  accessToken,
  editor,
  documentId,
  documentUpdatedAt,
  isYjsSynced = false,
  editorContainerRef,
  ydoc,
  suppressYjsSnapshotSaveRef,
  setTitle,
  setHasUnsavedChanges,
  setLastSaved,
  versioning,
  setShowVersionHistory
}: UsePagedDocumentExternalContentSyncParams): UsePagedDocumentExternalContentSyncResult {
  const officeClient = useOfficeClient(accessToken)
  const everyAiFallbackPollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flowbotRemoteApplyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingFlowbotRemoteHtmlRef = useRef<string | null>(null)
  const pendingFlowbotForceApplyRef = useRef(false)
  const lastHydratedApiUpdatedAtMsRef = useRef(0)

  const applyLatestDocumentContentFromSource = useCallback(
    async (html: string, updatedAt?: string) => {
      if (!editor) return false
      return applyLatestDocumentContent({
        editor,
        editorContainerRef,
        ydoc,
        suppressYjsSnapshotSaveRef,
        html,
        updatedAt,
        setHasUnsavedChanges,
        setLastSaved
      })
    },
    [editor, editorContainerRef, suppressYjsSnapshotSaveRef, setHasUnsavedChanges, setLastSaved, ydoc]
  )

  const syncEditorFromLatestDocument = useCallback(async (): Promise<boolean> => {
    if (!documentId || !editor) return false

    try {
      const latest = await getDocumentById(officeClient, documentId, { fresh: true })
      if (!latest?.content) return false

      const latestHtml = sanitizeDocumentHtmlForEditor(latest.content) || '<p></p>'
      const currentHtml = sanitizePaginationRuntimeHtml(editor.getHTML())
      if (areHtmlSemanticallyEquivalent(latestHtml, currentHtml)) {
        return false
      }

      return await applyLatestDocumentContentFromSource(latest.content, latest.updatedAt)
    } catch (error) {
      console.warn('[PagedDocumentEditor] Failed syncing document after AI edit', error)
      return false
    }
  }, [applyLatestDocumentContentFromSource, documentId, editor, officeClient])

  const applyFlowbotRemoteHtml = useCallback(
    async (html: string, updatedAt?: string, options?: { force?: boolean }): Promise<boolean> => {
      if (!html.trim()) return false
      if (!editor) {
        pendingFlowbotRemoteHtmlRef.current = html
        pendingFlowbotForceApplyRef.current = Boolean(options?.force)
        return false
      }

      const normalizedHtml = sanitizeDocumentHtmlForEditor(html) || '<p></p>'
      const currentHtml = sanitizePaginationRuntimeHtml(editor.getHTML())
      if (!options?.force && areHtmlSemanticallyEquivalent(normalizedHtml, currentHtml)) {
        return false
      }
      return applyLatestDocumentContentFromSource(normalizedHtml, updatedAt)
    },
    [applyLatestDocumentContentFromSource, editor]
  )

  const scheduleFlowbotRemoteHtmlApply = useCallback(
    (html: string, options?: { force?: boolean }) => {
      pendingFlowbotRemoteHtmlRef.current = html
      pendingFlowbotForceApplyRef.current = Boolean(options?.force)
      if (flowbotRemoteApplyTimeoutRef.current) {
        clearTimeout(flowbotRemoteApplyTimeoutRef.current)
      }
      flowbotRemoteApplyTimeoutRef.current = setTimeout(() => {
        flowbotRemoteApplyTimeoutRef.current = null
        const pendingHtml = pendingFlowbotRemoteHtmlRef.current
        const forceApply = pendingFlowbotForceApplyRef.current
        pendingFlowbotRemoteHtmlRef.current = null
        pendingFlowbotForceApplyRef.current = false
        if (!pendingHtml) return
        void applyFlowbotRemoteHtml(pendingHtml, undefined, { force: forceApply })
      }, FLOWBOT_REMOTE_APPLY_DEBOUNCE_MS)
    },
    [applyFlowbotRemoteHtml]
  )

  useEffect(() => {
    if (!editor || !pendingFlowbotRemoteHtmlRef.current) return
    const pendingHtml = pendingFlowbotRemoteHtmlRef.current
    const forceApply = pendingFlowbotForceApplyRef.current
    pendingFlowbotRemoteHtmlRef.current = null
    pendingFlowbotForceApplyRef.current = false
    void applyFlowbotRemoteHtml(pendingHtml, undefined, { force: forceApply })
  }, [applyFlowbotRemoteHtml, editor])

  // When the editor opens later (or in another tab), pull durable API content if Flowbot/chat
  // updated the document while this Yjs room still has stale collaborative state.
  useEffect(() => {
    if (!documentId || !editor || !isYjsSynced) return

    let cancelled = false

    const hydrateFromApiIfNewer = async () => {
      try {
        const latest = await getDocumentById(officeClient, documentId, { fresh: true })
        if (cancelled || !latest?.content) return

        const latestUpdatedAtMs = parseDocumentUpdatedAtMs(latest.updatedAt)
        if (latestUpdatedAtMs <= lastHydratedApiUpdatedAtMsRef.current) return

        const latestHtml = sanitizeDocumentHtmlForEditor(latest.content) || '<p></p>'
        const currentHtml = sanitizePaginationRuntimeHtml(editor.getHTML())
        const editorDiffersFromApi = !areHtmlSemanticallyEquivalent(latestHtml, currentHtml)

        if (!editorDiffersFromApi) {
          lastHydratedApiUpdatedAtMsRef.current = latestUpdatedAtMs
          return
        }

        const applied = await applyLatestDocumentContentFromSource(latest.content, latest.updatedAt)
        if (applied) {
          lastHydratedApiUpdatedAtMsRef.current = latestUpdatedAtMs
          const nextTitle = latest.title?.trim()
          if (nextTitle) {
            setTitle(prev => (prev === nextTitle ? prev : nextTitle))
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[PagedDocumentEditor] Failed hydrating document from API after external edit', error)
        }
      }
    }

    void hydrateFromApiIfNewer()

    return () => {
      cancelled = true
    }
  }, [applyLatestDocumentContentFromSource, documentId, documentUpdatedAt, editor, isYjsSynced, officeClient, setTitle])

  useEffect(() => {
    lastHydratedApiUpdatedAtMsRef.current = 0
  }, [documentId])

  const clearEveryAiFallbackPoll = useCallback(() => {
    if (everyAiFallbackPollRef.current) {
      clearTimeout(everyAiFallbackPollRef.current)
      everyAiFallbackPollRef.current = null
    }
  }, [])

  const startEveryAiFallbackPoll = useCallback(() => {
    clearEveryAiFallbackPoll()

    const initialDelayMs = 8000
    const repeatDelayMs = 2000
    const maxPollDurationMs = 3 * 60 * 1000
    const startedAt = Date.now()

    const runAttempt = () => {
      if (!documentId) return
      const elapsedMs = Date.now() - startedAt
      if (elapsedMs >= maxPollDurationMs) {
        clearEveryAiFallbackPoll()
        return
      }

      void syncEditorFromLatestDocument().then(applied => {
        if (applied) {
          clearEveryAiFallbackPoll()
          return
        }

        everyAiFallbackPollRef.current = setTimeout(runAttempt, repeatDelayMs)
      })
    }

    everyAiFallbackPollRef.current = setTimeout(runAttempt, initialDelayMs)
  }, [clearEveryAiFallbackPoll, documentId, syncEditorFromLatestDocument])

  useEffect(() => {
    if (!documentId) return

    const handleEveryAiOpened = (event: Event) => {
      const customEvent = event as CustomEvent<{ type?: string; payload?: { prompt?: string } }>
      if (customEvent.detail?.type !== 'OPEN_EVERY_AI') return

      startEveryAiFallbackPoll()
    }

    globalThis.addEventListener('openEveryAI', handleEveryAiOpened)
    return () => globalThis.removeEventListener('openEveryAI', handleEveryAiOpened)
  }, [documentId, startEveryAiFallbackPoll])

  useEffect(() => () => clearEveryAiFallbackPoll(), [clearEveryAiFallbackPoll])

  useEffect(() => {
    if (!documentId) return

    type FlowbotDocumentStreamUpdateDetail = {
      documentId?: string
      html?: string
      isFinal?: boolean
    }

    type FlowbotDocumentStreamCompleteDetail = {
      documentId?: string
      changed?: boolean
      html?: string
    }

    const handleFlowbotDocumentStreamUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<FlowbotDocumentStreamUpdateDetail>
      const targetDocumentId = customEvent.detail?.documentId
      const html = customEvent.detail?.html
      if (!targetDocumentId || targetDocumentId !== documentId || !html) return

      if (customEvent.detail?.isFinal) {
        if (flowbotRemoteApplyTimeoutRef.current) {
          clearTimeout(flowbotRemoteApplyTimeoutRef.current)
          flowbotRemoteApplyTimeoutRef.current = null
        }
        pendingFlowbotRemoteHtmlRef.current = null
        void applyFlowbotRemoteHtml(html, undefined, { force: true })
        return
      }

      scheduleFlowbotRemoteHtmlApply(html)
    }

    const handleFlowbotDocumentStreamComplete = (event: Event) => {
      const customEvent = event as CustomEvent<FlowbotDocumentStreamCompleteDetail>
      const targetDocumentId = customEvent.detail?.documentId
      if (!targetDocumentId || targetDocumentId !== documentId) return

      if (flowbotRemoteApplyTimeoutRef.current) {
        clearTimeout(flowbotRemoteApplyTimeoutRef.current)
        flowbotRemoteApplyTimeoutRef.current = null
      }

      const streamedHtml = customEvent.detail?.html
      if (streamedHtml && customEvent.detail?.changed !== false) {
        pendingFlowbotRemoteHtmlRef.current = null
        void applyFlowbotRemoteHtml(streamedHtml, undefined, { force: true })
        return
      }

      if (customEvent.detail?.changed === false) return
      void syncEditorFromLatestDocument()
    }

    globalThis.addEventListener(FLOWBOT_STREAM_UPDATE_EVENT, handleFlowbotDocumentStreamUpdate)
    globalThis.addEventListener(FLOWBOT_STREAM_COMPLETE_EVENT, handleFlowbotDocumentStreamComplete)
    return () => {
      globalThis.removeEventListener(FLOWBOT_STREAM_UPDATE_EVENT, handleFlowbotDocumentStreamUpdate)
      globalThis.removeEventListener(FLOWBOT_STREAM_COMPLETE_EVENT, handleFlowbotDocumentStreamComplete)
      if (flowbotRemoteApplyTimeoutRef.current) {
        clearTimeout(flowbotRemoteApplyTimeoutRef.current)
        flowbotRemoteApplyTimeoutRef.current = null
      }
      pendingFlowbotRemoteHtmlRef.current = null
      pendingFlowbotForceApplyRef.current = false
    }
  }, [applyFlowbotRemoteHtml, documentId, scheduleFlowbotRemoteHtmlApply, syncEditorFromLatestDocument])

  const handleRestoreVersion = useCallback(
    async (versionNumber: number) => {
      if (!documentId) return

      await restoreVersionContent({
        officeClient,
        documentId,
        versionNumber,
        editor,
        versioning,
        setTitle,
        setHasUnsavedChanges,
        setLastSaved,
        closeVersionHistory: () => setShowVersionHistory(false)
      })
    },
    [documentId, editor, officeClient, setHasUnsavedChanges, setLastSaved, setShowVersionHistory, setTitle, versioning]
  )

  return {
    handleRestoreVersion,
    applyFlowbotRemoteHtml,
    syncEditorFromLatestDocument,
    scheduleFlowbotRemoteHtmlApply
  }
}
