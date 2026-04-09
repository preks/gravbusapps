/**
 * useYjsDocumentSync
 *
 * Drives Yjs CRDT sync over Socket.IO for the document editor: starts/destroys
 * SocketIoYjsProvider and provides debounced snapshot save for exports/search.
 * Used by PagedDocumentEditor when editing an existing document with collaboration.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import * as Y from 'yjs'
import { SocketIoYjsProvider } from '@/business-apps/platform/apps/shared/services/SocketIoYjsProvider'
import { markNextPaginationHydrationDocChange } from '@/components/tiptap-extensions/tiptap-custom-pagination/PaginationPlus'
import { useOfficeClient } from '@/common/network/office/useOfficeClient'
import type { DocumentFormatting } from '../types'
import {
  containsCustomDocumentTags,
  containsPaginationRuntimeTableMarkup,
  isEffectivelyEmptyDocumentHtml,
  sanitizeDocumentHtmlForEditor,
  sanitizePaginationRuntimeHtml
} from '../utils/documentContentUtils'
import { getDocumentById } from '../utils/documentOfficeOperations'

const SNAPSHOT_SAVE_DELAY_MS = 2000

type HydrationRefreshableEditor = {
  commands: {
    setContent: (editorHtml: string, options?: { emitUpdate?: boolean }) => void
    refreshPages?: () => boolean
    refreshPagesAndStabilize?: () => boolean
  }
  getHTML?: () => string
}

interface PendingHydrationRefresh {
  rafId: number | null
  timeoutId: ReturnType<typeof setTimeout> | null
}

interface TableDebugSummary {
  index: number
  rowCount: number
  firstRowCellCount: number
  paginationAttrs: Record<string, string>
  tableAttrs: Record<string, string>
  nextTablePaginationAttrs: Record<string, string> | null
}

const pendingHydrationRefreshes = new WeakMap<HydrationRefreshableEditor, PendingHydrationRefresh>()

function schedulePostHydrationPaginationRefresh(editor: HydrationRefreshableEditor) {
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

function waitForNextAnimationFrame(): Promise<void> {
  return new Promise(resolve => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
      return
    }

    setTimeout(resolve, 16)
  })
}

function seedEmptyCollaborativeFragment(ydoc: Y.Doc, html: string): boolean {
  if (!isEffectivelyEmptyDocumentHtml(html)) {
    return false
  }

  const fragment = ydoc.getXmlFragment('default')
  if (fragment.length > 0) {
    return false
  }

  Y.transact(
    ydoc,
    () => {
      fragment.insert(0, [new Y.XmlElement('paragraph')])
    },
    'bootstrap-empty-document'
  )

  return true
}

function getDebuggableTableAttributes(element: Element): Record<string, string> {
  return Object.fromEntries(
    Array.from(element.attributes)
      .filter(attribute => {
        const name = attribute.name.toLowerCase()
        return (
          name === 'class' || name === 'style' || name.startsWith('data-pagination-') || name.startsWith('data-table-')
        )
      })
      .map(attribute => [attribute.name, attribute.value])
  )
}

function collectTableDebugSummaryFromHtml(html: string): TableDebugSummary[] {
  if (!html || globalThis.DOMParser === undefined) {
    return []
  }

  try {
    const doc = new globalThis.DOMParser().parseFromString(html, 'text/html')
    return Array.from(doc.body.querySelectorAll('table')).map((table, index) => {
      const firstRow = table.querySelector('tr')
      const paginationAttrs = Object.fromEntries(
        Object.entries(getDebuggableTableAttributes(table)).filter(([name]) => name.startsWith('data-pagination-'))
      )
      const nextTable = table.nextElementSibling?.tagName.toLowerCase() === 'table' ? table.nextElementSibling : null
      const nextTablePaginationAttrs =
        nextTable == null
          ? null
          : Object.fromEntries(
              Object.entries(getDebuggableTableAttributes(nextTable)).filter(([name]) =>
                name.startsWith('data-pagination-')
              )
            )

      return {
        index,
        rowCount: table.querySelectorAll('tr').length,
        firstRowCellCount: firstRow?.children.length ?? 0,
        paginationAttrs,
        tableAttrs: getDebuggableTableAttributes(table),
        nextTablePaginationAttrs
      }
    })
  } catch {
    return []
  }
}

function logDocumentTableDebug(
  enabled: boolean | undefined,
  documentId: string | undefined,
  event: string,
  payload: Record<string, unknown>
) {
  if (!enabled || !documentId) {
    return
  }

  console.info(`[document-table-debug:${documentId}] ${event}`, payload)
}

export interface UseYjsDocumentSyncParams {
  accessToken?: string
  documentId: string | undefined
  collaborationSocket: Socket | null
  ydoc: import('yjs').Doc
  awareness: import('y-protocols/awareness').Awareness
  editorRef: React.MutableRefObject<unknown>
  suppressSnapshotSaveRef?: React.MutableRefObject<boolean>
  debugTablesEnabled?: boolean
  isReadOnly: boolean
  title: string
  onBootstrapEditorRebind?: () => void
  getFormattingForSave?: () => DocumentFormatting | undefined
  setLastSaved: (date: Date | null) => void
  setHasUnsavedChanges: (value: boolean) => void
}

export interface UseYjsDocumentSyncResult {
  isYjsSynced: boolean
  onCollaborationFirstRender: () => void
  scheduleSnapshotSaveRef: React.MutableRefObject<(editor: { getHTML?: () => string }) => void>
}

export function useYjsDocumentSync({
  accessToken,
  documentId,
  collaborationSocket,
  ydoc,
  awareness,
  editorRef,
  suppressSnapshotSaveRef,
  debugTablesEnabled = false,
  isReadOnly,
  title,
  onBootstrapEditorRebind,
  getFormattingForSave,
  setLastSaved,
  setHasUnsavedChanges
}: UseYjsDocumentSyncParams): UseYjsDocumentSyncResult {
  const officeClient = useOfficeClient(accessToken)
  const [isYjsSynced, setIsYjsSynced] = useState(false)
  const scheduleSnapshotSaveRef = useRef<(editor: { getHTML?: () => string }) => void>(() => {})
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const providerRef = useRef<SocketIoYjsProvider | null>(null)
  const readyStateInspectionCompletedRef = useRef(false)
  const recoveryAttemptedRef = useRef(false)
  const paginationRuntimeRecoveryAttemptedRef = useRef(false)
  const collaborationFirstRenderCompletedRef = useRef(false)
  const bootstrapEditorRebindRequestedRef = useRef(false)
  const pendingNormalizationRecoveryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSnapshotSave = useCallback(
    (currentEditor: { getHTML?: () => string }) => {
      if (!documentId || isReadOnly || !isYjsSynced) return

      setHasUnsavedChanges(true)
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        const html = sanitizePaginationRuntimeHtml(currentEditor?.getHTML?.() || '')
        const updates: {
          title: string
          content: string
          formatting?: DocumentFormatting
          contentJson?: Record<string, never>
        } = {
          title,
          content: html,
          formatting: getFormattingForSave?.()
        }

        if (isEffectivelyEmptyDocumentHtml(html)) {
          updates.contentJson = {}
        }

        officeClient.documents
          .update(documentId, {
            ...updates,
            createVersion: false
          })
          .then(() => {
            setLastSaved(new Date())
            setHasUnsavedChanges(false)
          })
          .catch(error => {
            console.error('[PagedDocumentEditor] Snapshot save failed:', error)
          })
      }, SNAPSHOT_SAVE_DELAY_MS)
    },
    [documentId, getFormattingForSave, isReadOnly, isYjsSynced, title, setLastSaved, setHasUnsavedChanges]
  )

  useEffect(() => {
    scheduleSnapshotSaveRef.current = scheduleSnapshotSave
  }, [scheduleSnapshotSave])

  const handleCollaborationFirstRender = useCallback(() => {
    if (collaborationFirstRenderCompletedRef.current) return
    collaborationFirstRenderCompletedRef.current = true
  }, [])

  const getEditorReadyPromise = useCallback((): Promise<void> => {
    return new Promise(resolve => {
      const deadline = Date.now() + 5000
      const check = () => {
        const ed = editorRef.current as { view?: unknown } | null
        const collaborationBindingReady = !documentId || collaborationFirstRenderCompletedRef.current
        if (ed?.view && collaborationBindingReady) {
          resolve()
          return
        }
        if (Date.now() > deadline) {
          resolve()
          return
        }
        setTimeout(check, 50)
      }
      check()
    })
  }, [documentId, editorRef])

  const forceEditorViewRefresh = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ed = editorRef.current as HydrationRefreshableEditor | null
        if (!ed) return
        schedulePostHydrationPaginationRefresh(ed)
      })
    })
  }, [editorRef])

  const applyNormalizedContentToEditor = useCallback(
    async (html: string) => {
      const start = Date.now()
      while (!editorRef.current && Date.now() - start < 5000) {
        await new Promise(resolve => setTimeout(resolve, 25))
      }

      const ed = editorRef.current as HydrationRefreshableEditor | null

      if (!ed) {
        throw new Error('Editor not ready for content apply')
      }

      const normalizedHtml = sanitizeDocumentHtmlForEditor(html || '<p></p>')

      if (debugTablesEnabled) {
        logDocumentTableDebug(debugTablesEnabled, documentId, 'apply-normalized-content:before-set', {
          sourceHtmlHasPaginationRuntimeMarkup: containsPaginationRuntimeTableMarkup(html || ''),
          normalizedHtmlHasPaginationRuntimeMarkup: containsPaginationRuntimeTableMarkup(normalizedHtml),
          sourceTableSummary: collectTableDebugSummaryFromHtml(html || ''),
          normalizedTableSummary: collectTableDebugSummaryFromHtml(normalizedHtml)
        })
      }

      const collaborativeFragment = ydoc.getXmlFragment('default')
      const shouldRebindEditorAfterApply =
        collaborativeFragment.length === 0 && bootstrapEditorRebindRequestedRef.current === false

      try {
        if (suppressSnapshotSaveRef) {
          suppressSnapshotSaveRef.current = true
        }
        markNextPaginationHydrationDocChange(ed)
        ed.commands.setContent(normalizedHtml, { emitUpdate: true })
        seedEmptyCollaborativeFragment(ydoc, normalizedHtml)
        schedulePostHydrationPaginationRefresh(ed)
        await new Promise(resolve => setTimeout(resolve, 140))
        const postApplyHtml = ed.getHTML?.() || ''
        if (debugTablesEnabled) {
          logDocumentTableDebug(debugTablesEnabled, documentId, 'apply-normalized-content:after-set', {
            postApplyHtmlHasPaginationRuntimeMarkup: containsPaginationRuntimeTableMarkup(postApplyHtml),
            postApplyTableSummary: collectTableDebugSummaryFromHtml(postApplyHtml)
          })
        }
        if (shouldRebindEditorAfterApply) {
          bootstrapEditorRebindRequestedRef.current = true
          onBootstrapEditorRebind?.()
        }
      } finally {
        setTimeout(() => {
          if (suppressSnapshotSaveRef) {
            suppressSnapshotSaveRef.current = false
          }
        }, 1500)
      }
    },
    [debugTablesEnabled, documentId, editorRef, onBootstrapEditorRebind, suppressSnapshotSaveRef, ydoc]
  )

  const getCurrentEditorHtmlSnapshot = useCallback(async (): Promise<string> => {
    await getEditorReadyPromise()
    await waitForNextAnimationFrame()
    await waitForNextAnimationFrame()

    const ed = editorRef.current as HydrationRefreshableEditor | null
    return ed?.getHTML?.() || ''
  }, [editorRef, getEditorReadyPromise])

  const scheduleNormalizedRecovery = useCallback(
    (html: string, reason: 'custom-tags' | 'pagination-runtime') => {
      if (pendingNormalizationRecoveryRef.current) {
        clearTimeout(pendingNormalizationRecoveryRef.current)
      }

      pendingNormalizationRecoveryRef.current = setTimeout(() => {
        pendingNormalizationRecoveryRef.current = null

        void applyNormalizedContentToEditor(html).catch(error => {
          console.error(`[PagedDocumentEditor] Failed normalized recovery for ${reason}:`, error)
        })
      }, 0)
    },
    [applyNormalizedContentToEditor]
  )

  const handleReadyStateApplied = useCallback(
    async (info: { source: 'sync' | 'event'; status: 'ready' | 'already_ready'; fragmentLength: number }) => {
      logDocumentTableDebug(debugTablesEnabled, documentId, 'ready-state-applied', {
        source: info.source,
        status: info.status,
        fragmentLength: info.fragmentLength
      })

      if (!documentId || readyStateInspectionCompletedRef.current) {
        return
      }

      readyStateInspectionCompletedRef.current = true

      const currentHtml = await getCurrentEditorHtmlSnapshot()
      const sanitizedSnapshot = sanitizePaginationRuntimeHtml(currentHtml)
      const htmlHasCustomTags = containsCustomDocumentTags(sanitizedSnapshot)
      const htmlHasPaginationRuntimeMarkup = containsPaginationRuntimeTableMarkup(sanitizedSnapshot)

      if (debugTablesEnabled) {
        logDocumentTableDebug(debugTablesEnabled, documentId, 'ready-state-html-snapshot', {
          htmlHasCustomTags,
          htmlHasPaginationRuntimeMarkup,
          tableSummary: collectTableDebugSummaryFromHtml(currentHtml)
        })
      }

      if (!documentId) {
        return
      }

      if (htmlHasCustomTags && !recoveryAttemptedRef.current) {
        recoveryAttemptedRef.current = true

        const latest = await getDocumentById(officeClient, documentId, { fresh: true })
        if (latest?.content) {
          scheduleNormalizedRecovery(latest.content, 'custom-tags')
        }
        return
      }

      if (!htmlHasPaginationRuntimeMarkup || paginationRuntimeRecoveryAttemptedRef.current) {
        return
      }

      paginationRuntimeRecoveryAttemptedRef.current = true
      // Apply the sanitized snapshot directly to avoid leaking pagination runtime metadata into collaboration state.
      await applyNormalizedContentToEditor(sanitizedSnapshot)
    },
    [applyNormalizedContentToEditor, debugTablesEnabled, documentId, getCurrentEditorHtmlSnapshot, officeClient]
  )

  // Drive Yjs sync over Socket.IO: create provider, start, cleanup
  useEffect(() => {
    if (!documentId || !collaborationSocket) return

    readyStateInspectionCompletedRef.current = false
    recoveryAttemptedRef.current = false
    paginationRuntimeRecoveryAttemptedRef.current = false
    collaborationFirstRenderCompletedRef.current = false
    bootstrapEditorRebindRequestedRef.current = false
    if (pendingNormalizationRecoveryRef.current) {
      clearTimeout(pendingNormalizationRecoveryRef.current)
      pendingNormalizationRecoveryRef.current = null
    }

    const provider = new SocketIoYjsProvider({
      socket: collaborationSocket,
      documentId,
      ydoc,
      awareness,
      onBeforeFirstSync: getEditorReadyPromise,
      onSyncedChange: setIsYjsSynced,
      onBootstrapRequired: applyNormalizedContentToEditor,
      onReadyStateApplied: handleReadyStateApplied,
      onLocalDocumentChange: () => {
        if (suppressSnapshotSaveRef?.current) {
          return
        }
        const ed = editorRef.current
        if (ed) scheduleSnapshotSaveRef.current(ed as { getHTML?: () => string })
      },
      onRemoteDocumentChange: forceEditorViewRefresh
    })

    providerRef.current = provider
    provider.start()

    return () => {
      if (pendingNormalizationRecoveryRef.current) {
        clearTimeout(pendingNormalizationRecoveryRef.current)
        pendingNormalizationRecoveryRef.current = null
      }
      provider.destroy()
      providerRef.current = null
      setIsYjsSynced(false)
    }
  }, [
    documentId,
    collaborationSocket,
    ydoc,
    awareness,
    editorRef,
    suppressSnapshotSaveRef,
    getEditorReadyPromise,
    applyNormalizedContentToEditor,
    handleReadyStateApplied,
    forceEditorViewRefresh
  ])

  // Cleanup snapshot timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      if (pendingNormalizationRecoveryRef.current) {
        clearTimeout(pendingNormalizationRecoveryRef.current)
      }
    }
  }, [])

  return { isYjsSynced, onCollaborationFirstRender: handleCollaborationFirstRender, scheduleSnapshotSaveRef }
}
