import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type { Doc as YDoc } from 'yjs'
import { markNextPaginationHydrationDocChange } from '@/components/tiptap-extensions/tiptap-custom-pagination'
import { DocumentApiService } from '../../../services/DocumentApiService'
import { normalizeDocumentHtmlForEditor, sanitizePaginationRuntimeHtml } from '../../../utils/documentContentUtils'

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
  documentId: string
  versionNumber: number
  editor: TiptapEditor | null
  versioning: ExternalVersioningControls
  setTitle: Dispatch<SetStateAction<string>>
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>
  setLastSaved: Dispatch<SetStateAction<Date | null>>
  closeVersionHistory: () => void
}

export interface UsePagedDocumentExternalContentSyncParams {
  editor: TiptapEditor | null
  documentId?: string
  editorContainerRef: MutableRefObject<HTMLDivElement | null>
  ydoc: YDoc
  suppressYjsSnapshotSaveRef: MutableRefObject<boolean>
  setTitle: Dispatch<SetStateAction<string>>
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>
  setLastSaved: Dispatch<SetStateAction<Date | null>>
  versioning: ExternalVersioningControls
  setShowVersionHistory: Dispatch<SetStateAction<boolean>>
}

export interface UsePagedDocumentExternalContentSyncResult {
  handleRestoreVersion: (versionNumber: number) => Promise<void>
}

export function schedulePostHydrationPaginationRefresh(editor: TiptapEditor) {
  const refreshPagination = () => {
    if (editor.commands.refreshPagesAndStabilize) {
      editor.commands.refreshPagesAndStabilize()
      return
    }

    editor.commands.refreshPages?.()
  }

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      refreshPagination()
      requestAnimationFrame(() => refreshPagination())
    })
    return
  }

  refreshPagination()
  setTimeout(refreshPagination, 0)
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
  const normalizedHtml = normalizeDocumentHtmlForEditor(html)

  try {
    suppressYjsSnapshotSaveRef.current = true
    const fragment = ydoc.getXmlFragment('default')
    ydoc.transact(() => {
      fragment.delete(0, fragment.length)
    })

    markNextPaginationHydrationDocChange(editor)
    editor.commands.setContent(normalizedHtml, { emitUpdate: true })
    schedulePostHydrationPaginationRefresh(editor)
    await new Promise(resolve => setTimeout(resolve, 0))

    const applied = areHtmlSemanticallyEquivalent(sanitizePaginationRuntimeHtml(editor.getHTML()), normalizedHtml)
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
  documentId,
  versionNumber,
  editor,
  versioning,
  setTitle,
  setHasUnsavedChanges,
  setLastSaved,
  closeVersionHistory
}: RestoreVersionContentParams): Promise<void> {
  const versionData = await DocumentApiService.getVersion(documentId, versionNumber)
  if (!versionData) {
    console.error('[PagedDocumentEditor] Failed to get version data')
    return
  }

  const success = await versioning.restoreVersion(versionNumber)
  if (!success || !editor || !versionData.content) {
    return
  }

  markNextPaginationHydrationDocChange(editor)
  editor.commands.setContent(normalizeDocumentHtmlForEditor(versionData.content))
  schedulePostHydrationPaginationRefresh(editor)
  setTitle(versionData.title)
  setHasUnsavedChanges(false)
  setLastSaved(new Date())

  await versioning.loadVersions()
  closeVersionHistory()
}

export function usePagedDocumentExternalContentSync({
  editor,
  documentId,
  editorContainerRef,
  ydoc,
  suppressYjsSnapshotSaveRef,
  setTitle,
  setHasUnsavedChanges,
  setLastSaved,
  versioning,
  setShowVersionHistory
}: UsePagedDocumentExternalContentSyncParams): UsePagedDocumentExternalContentSyncResult {
  const everyAiFallbackPollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      const latest = await DocumentApiService.getDocument(documentId, { fresh: true })
      if (!latest?.content) return false

      const latestHtml = normalizeDocumentHtmlForEditor(latest.content)
      const currentHtml = sanitizePaginationRuntimeHtml(editor.getHTML())
      if (areHtmlSemanticallyEquivalent(latestHtml, currentHtml)) {
        return false
      }

      return await applyLatestDocumentContentFromSource(latest.content, latest.updatedAt)
    } catch (error) {
      console.warn('[PagedDocumentEditor] Failed syncing document after AI edit', error)
      return false
    }
  }, [applyLatestDocumentContentFromSource, documentId, editor])

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

  const handleRestoreVersion = useCallback(
    async (versionNumber: number) => {
      if (!documentId) return

      await restoreVersionContent({
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
    [documentId, editor, setHasUnsavedChanges, setLastSaved, setShowVersionHistory, setTitle, versioning]
  )

  return {
    handleRestoreVersion
  }
}
