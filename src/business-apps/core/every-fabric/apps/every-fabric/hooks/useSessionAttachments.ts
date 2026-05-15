import { useCallback, useEffect, useRef, useState } from 'react'
import { useEnterpriseAgentClient } from './useEnterpriseAgentClient'
import type { PendingComposerAttachment, SessionAttachment } from '../types/enterpriseAgent'

const POLL_INTERVAL_MS = 4_000
const POLL_TIMEOUT_MS = 5 * 60_000

interface StagedFile {
  client_id: string
  file: File
}

const makeClientId = (file: File): string => `${crypto.randomUUID()}-${file.name}`

/**
 * Owns the list of session attachments for a single deep-agent session and
 * exposes upload / remove handlers wired to prompt-manager.
 *
 * When `sessionId` is `null` (e.g. landing screen before a session exists),
 * uploads are STAGED as plain `File` objects. The moment `sessionId` becomes
 * truthy the staged files are automatically flushed to the backend, so a user
 * can attach a PDF on the landing hero and the agent will see it on turn 1.
 *
 * Polls `GET /deep-agent/sessions/{id}/attachments` while any attachment is
 * still in `pending` indexing state so the chip can flip to `ready` without
 * a manual refresh.
 */
/** Image MIME types eligible for blob-URL preview thumbnails. */
const IMAGE_PREVIEW_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])

export function useSessionAttachments(sessionId: string | null | undefined, accessToken: string) {
  const client = useEnterpriseAgentClient(accessToken)
  const [attachments, setAttachments] = useState<SessionAttachment[]>([])
  const [pendingAttachments, setPendingAttachments] = useState<PendingComposerAttachment[]>([])
  const stagedFilesRef = useRef<StagedFile[]>([])
  const pollDeadlineRef = useRef<number | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushingRef = useRef(false)
  /**
   * Tracks client-generated blob URLs for image previews.
   * Keyed by client_id (pending) and attachment.id (confirmed).
   * Stored in a ref so it survives re-renders without triggering them.
   */
  const previewUrlMapRef = useRef<Map<string, string>>(new Map())

  const setPendingState = useCallback((clientId: string, patch: Partial<PendingComposerAttachment>) => {
    setPendingAttachments(prev => prev.map(entry => (entry.client_id === clientId ? { ...entry, ...patch } : entry)))
  }, [])

  const removePending = useCallback((clientId: string) => {
    stagedFilesRef.current = stagedFilesRef.current.filter(s => s.client_id !== clientId)
    // Revoke any blob preview URL created for this pending entry.
    const blobUrl = previewUrlMapRef.current.get(clientId)
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      previewUrlMapRef.current.delete(clientId)
    }
    setPendingAttachments(prev => prev.filter(entry => entry.client_id !== clientId))
  }, [])

  const refresh = useCallback(async () => {
    if (!sessionId) return
    try {
      const fresh = await client.listSessionAttachments(sessionId)
      setAttachments(Array.isArray(fresh) ? fresh : [])
    } catch {
      // Listing is best-effort; failures shouldn't break the composer.
    }
  }, [client, sessionId])

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    pollDeadlineRef.current = null
  }, [])

  const uploadOne = useCallback(
    async (clientId: string, file: File, targetSessionId: string) => {
      setPendingState(clientId, { state: 'uploading' })
      try {
        const created = await client.uploadSessionAttachment(targetSessionId, file)
        // Carry the blob preview URL from the pending entry to the confirmed attachment.
        const blobUrl = previewUrlMapRef.current.get(clientId)
        const enriched: SessionAttachment = blobUrl ? { ...created, preview_url: blobUrl } : created
        if (blobUrl) {
          previewUrlMapRef.current.set(created.id, blobUrl)
          previewUrlMapRef.current.delete(clientId)
        }
        setAttachments(prev => {
          const next = prev.filter(a => a.id !== enriched.id)
          next.push(enriched)
          return next
        })
        // Server-truth attachment now exists; drop the pending row.
        setPendingAttachments(prev => prev.filter(entry => entry.client_id !== clientId))
        return enriched
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setPendingState(clientId, { state: 'failed', error: message })
        throw err
      }
    },
    [client, setPendingState]
  )

  const flushPendingToSession = useCallback(
    async (targetSessionId: string) => {
      if (flushingRef.current) return
      const staged = stagedFilesRef.current
      if (staged.length === 0) return

      flushingRef.current = true
      const queue = staged.slice()
      stagedFilesRef.current = []

      try {
        await Promise.all(
          queue.map(async item => {
            try {
              await uploadOne(item.client_id, item.file, targetSessionId)
            } catch (err) {
              console.error(`[useSessionAttachments] Failed to flush staged file ${item.file.name}:`, err)
              setPendingState(item.client_id, {
                state: 'failed',
                error: err instanceof Error ? err.message : 'Upload failed'
              })
              throw err
            }
          })
        )
      } finally {
        flushingRef.current = false
      }
    },
    [setPendingState, uploadOne]
  )

  // Flush any staged files once a sessionId becomes available.
  useEffect(() => {
    if (!sessionId || flushingRef.current) return
    const staged = stagedFilesRef.current
    if (staged.length === 0) return

    const flushStagedFiles = async () => {
      try {
        await flushPendingToSession(sessionId)
      } catch {
        // Upload failures are already reflected in pending attachment state.
      }
    }

    flushStagedFiles().catch(() => undefined)
  }, [sessionId, flushPendingToSession])

  // Reset when session id is cleared (e.g. new chat).
  useEffect(() => {
    if (sessionId) return
    setAttachments([])
    stopPolling()
    // Note: we do NOT clear stagedFilesRef here — files staged on the landing
    // screen must survive until the new session id appears.
  }, [sessionId, stopPolling])

  // Initial load + polling lifecycle.
  useEffect(() => {
    if (!sessionId) return

    const refreshAttachments = async () => {
      await refresh()
    }

    refreshAttachments().catch(() => undefined)
    return () => stopPolling()
  }, [sessionId, refresh, stopPolling])

  useEffect(() => {
    if (!sessionId) return
    const hasPending = attachments.some(a => a.indexing_status === 'pending')
    if (!hasPending) {
      stopPolling()
      return
    }
    if (pollTimerRef.current) return
    if (pollDeadlineRef.current === null) {
      pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS
    }
    pollTimerRef.current = setTimeout(async () => {
      pollTimerRef.current = null
      await refresh()
      const deadline = pollDeadlineRef.current ?? 0
      if (Date.now() >= deadline) stopPolling()
    }, POLL_INTERVAL_MS)
  }, [attachments, sessionId, refresh, stopPolling])

  const upload = useCallback(
    async (file: File): Promise<SessionAttachment | null> => {
      const clientId = makeClientId(file)
      const mimeType = file.type || 'application/octet-stream'
      // Create a blob preview URL for images so the chip can show a thumbnail.
      let previewUrl: string | undefined
      if (IMAGE_PREVIEW_MIME_TYPES.has(mimeType)) {
        previewUrl = URL.createObjectURL(file)
        previewUrlMapRef.current.set(clientId, previewUrl)
      }
      const stub: PendingComposerAttachment = {
        client_id: clientId,
        name: file.name,
        mime_type: mimeType,
        size: file.size,
        state: sessionId ? 'uploading' : 'pending',
        preview_url: previewUrl
      }
      setPendingAttachments(prev => [...prev, stub])

      if (!sessionId) {
        // No session yet — stash the file. The flush effect will upload it the
        // moment a sessionId materialises.
        stagedFilesRef.current.push({ client_id: clientId, file })
        return null
      }

      try {
        return await uploadOne(clientId, file, sessionId)
      } catch {
        return null
      }
    },
    [sessionId, uploadOne]
  )

  const remove = useCallback(
    async (id: string) => {
      // Drop pending / staged first so the chip disappears immediately.
      removePending(id)
      if (!sessionId) return
      // Treat `id` as either local pending client id or a server attachment id.
      const matchingAttachment = attachments.find(a => a.id === id)
      if (!matchingAttachment) return
      // Revoke any lingering preview blob URL for this confirmed attachment.
      const blobUrl = previewUrlMapRef.current.get(matchingAttachment.id)
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
        previewUrlMapRef.current.delete(matchingAttachment.id)
      }
      try {
        await client.deleteSessionAttachment(sessionId, matchingAttachment.id)
      } finally {
        setAttachments(prev => prev.filter(a => a.id !== matchingAttachment.id))
      }
    },
    [attachments, client, removePending, sessionId]
  )

  return {
    attachments,
    pendingAttachments,
    upload,
    remove,
    removePending,
    flushPendingToSession,
    refresh
  }
}

export type UseSessionAttachmentsReturn = ReturnType<typeof useSessionAttachments>
