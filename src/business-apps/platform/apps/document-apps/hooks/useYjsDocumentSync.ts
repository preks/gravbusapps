/**
 * useYjsDocumentSync
 *
 * Drives Yjs CRDT sync over Socket.IO for the document editor: starts/destroys
 * SocketIoYjsProvider and provides debounced snapshot save for exports/search.
 * Used by PagedDocumentEditor when editing an existing document with collaboration.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { SocketIoYjsProvider } from '../../shared/services/SocketIoYjsProvider'
import { markNextPaginationHydrationDocChange } from '@/components/tiptap-extensions/tiptap-custom-pagination/PaginationPlus'
import { DocumentApiService } from '../services/DocumentApiService'
import type { DocumentFormatting } from '../types'
import {
  containsCustomDocumentTags,
  isEffectivelyEmptyDocumentHtml,
  normalizeDocumentHtmlForEditor,
  sanitizePaginationRuntimeHtml
} from '../utils/documentContentUtils'

const SNAPSHOT_SAVE_DELAY_MS = 2000

type HydrationRefreshableEditor = {
  commands: {
    setContent: (editorHtml: string, emit?: boolean) => void
    refreshPages?: () => boolean
    refreshPagesAndStabilize?: () => boolean
  }
  getHTML?: () => string
}

function schedulePostHydrationPaginationRefresh(editor: HydrationRefreshableEditor) {
  const refreshPagination = () => {
    if (editor.commands.refreshPagesAndStabilize) {
      editor.commands.refreshPagesAndStabilize()
      return
    }

    editor.commands.refreshPages?.()
  }

  requestAnimationFrame(() => {
    refreshPagination()
  })

  setTimeout(() => {
    refreshPagination()
  }, 120)
}

export interface UseYjsDocumentSyncParams {
  documentId: string | undefined
  collaborationSocket: Socket | null
  ydoc: import('yjs').Doc
  awareness: import('y-protocols/awareness').Awareness
  editorRef: React.MutableRefObject<unknown>
  suppressSnapshotSaveRef?: React.MutableRefObject<boolean>
  isReadOnly: boolean
  title: string
  getFormattingForSave?: () => DocumentFormatting | undefined
  setLastSaved: (date: Date | null) => void
  setHasUnsavedChanges: (value: boolean) => void
}

export interface UseYjsDocumentSyncResult {
  isYjsSynced: boolean
  scheduleSnapshotSaveRef: React.MutableRefObject<(editor: { getHTML?: () => string }) => void>
}

export function useYjsDocumentSync({
  documentId,
  collaborationSocket,
  ydoc,
  awareness,
  editorRef,
  suppressSnapshotSaveRef,
  isReadOnly,
  title,
  getFormattingForSave,
  setLastSaved,
  setHasUnsavedChanges
}: UseYjsDocumentSyncParams): UseYjsDocumentSyncResult {
  const [isYjsSynced, setIsYjsSynced] = useState(false)
  const scheduleSnapshotSaveRef = useRef<(editor: { getHTML?: () => string }) => void>(() => {})
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const providerRef = useRef<SocketIoYjsProvider | null>(null)
  const recoveryAttemptedRef = useRef(false)

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

        DocumentApiService.updateDocument(documentId, updates, { createVersion: false })
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

  const getEditorReadyPromise = useCallback((): Promise<void> => {
    return new Promise(resolve => {
      const deadline = Date.now() + 5000
      const check = () => {
        const ed = editorRef.current as { view?: unknown } | null
        if (ed?.view) {
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

      const normalizedHtml = normalizeDocumentHtmlForEditor(html || '<p></p>')

      try {
        if (suppressSnapshotSaveRef) {
          suppressSnapshotSaveRef.current = true
        }
        markNextPaginationHydrationDocChange(ed)
        ed.commands.setContent(normalizedHtml, true)
        schedulePostHydrationPaginationRefresh(ed)
        await new Promise(resolve => setTimeout(resolve, 140))
      } finally {
        setTimeout(() => {
          if (suppressSnapshotSaveRef) {
            suppressSnapshotSaveRef.current = false
          }
        }, 1500)
      }
    },
    [documentId, editorRef, suppressSnapshotSaveRef]
  )

  const handleReadyStateApplied = useCallback(
    async (info: {
      source: 'sync' | 'event' | 'remote-update'
      status: 'ready' | 'already_ready'
      fragmentLength: number
      fragmentContent: unknown
    }) => {
      const serializedFragment =
        typeof info.fragmentContent === 'string' ? info.fragmentContent : JSON.stringify(info.fragmentContent ?? null)
      const looksCorrupted = containsCustomDocumentTags(serializedFragment)

      if (!documentId || recoveryAttemptedRef.current || !looksCorrupted) {
        return
      }

      recoveryAttemptedRef.current = true

      const latest = await DocumentApiService.getDocument(documentId, { fresh: true })
      if (!latest?.content) return

      await applyNormalizedContentToEditor(latest.content)
    },
    [applyNormalizedContentToEditor, documentId]
  )

  // Drive Yjs sync over Socket.IO: create provider, start, cleanup
  useEffect(() => {
    if (!documentId || !collaborationSocket) return

    recoveryAttemptedRef.current = false

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
      }
    })

    providerRef.current = provider
    provider.start()

    return () => {
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
    handleReadyStateApplied
  ])

  // Cleanup snapshot timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  return { isYjsSynced, scheduleSnapshotSaveRef }
}
