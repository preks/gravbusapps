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
import { DocumentApiService } from '../services/DocumentApiService'

const SNAPSHOT_SAVE_DELAY_MS = 2000

export interface UseYjsDocumentSyncParams {
  documentId: string | undefined
  collaborationSocket: Socket | null
  ydoc: import('yjs').Doc
  awareness: import('y-protocols/awareness').Awareness
  editorRef: React.MutableRefObject<unknown>
  isReadOnly: boolean
  title: string
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
  isReadOnly,
  title,
  setLastSaved,
  setHasUnsavedChanges
}: UseYjsDocumentSyncParams): UseYjsDocumentSyncResult {
  const [isYjsSynced, setIsYjsSynced] = useState(false)
  const scheduleSnapshotSaveRef = useRef<(editor: { getHTML?: () => string }) => void>(() => {})
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const providerRef = useRef<SocketIoYjsProvider | null>(null)

  const scheduleSnapshotSave = useCallback(
    (currentEditor: { getHTML?: () => string }) => {
      if (!documentId || isReadOnly || !isYjsSynced) return

      setHasUnsavedChanges(true)
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        const html = currentEditor?.getHTML?.() || ''
        DocumentApiService.updateDocument(documentId, { title, content: html }, { createVersion: false })
          .then(() => {
            setLastSaved(new Date())
            setHasUnsavedChanges(false)
          })
          .catch(error => {
            console.error('[PagedDocumentEditor] Snapshot save failed:', error)
          })
      }, SNAPSHOT_SAVE_DELAY_MS)
    },
    [documentId, isReadOnly, isYjsSynced, title, setLastSaved, setHasUnsavedChanges]
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

  // Drive Yjs sync over Socket.IO: create provider, start, cleanup
  useEffect(() => {
    if (!documentId || !collaborationSocket) return

    const provider = new SocketIoYjsProvider({
      socket: collaborationSocket,
      documentId,
      ydoc,
      awareness,
      onBeforeFirstSync: getEditorReadyPromise,
      onSyncedChange: setIsYjsSynced,
      onBootstrapRequired: async (html: string) => {
        const start = Date.now()
        while (!editorRef.current && Date.now() - start < 5000) {
          await new Promise(resolve => setTimeout(resolve, 25))
        }
        const ed = editorRef.current as {
          isEditable: boolean
          setEditable: (v: boolean) => void
          commands: { setContent: (html: string, emit?: boolean) => void }
        } | null
        if (!ed) {
          throw new Error('Editor not ready for bootstrap')
        }
        const wasEditable = ed.isEditable
        if (!wasEditable) {
          ed.setEditable(true)
        }
        ed.commands.setContent(html || '<p></p>', true)
        await new Promise(resolve => setTimeout(resolve, 100))
      },
      onLocalDocumentChange: () => {
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
  }, [documentId, collaborationSocket, ydoc, awareness, editorRef, getEditorReadyPromise])

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
