/**
 * useRowPageCollaboration - manages Yjs collaboration for the RowPage panel.
 *
 * Connects to the /collaboration namespace via SocketIoYjsProvider when a noteId
 * is present, syncs a shared Y.Doc, and exposes collaboration state (participants,
 * sync status, Y.Doc, Awareness).
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import type { Editor } from '@tiptap/react'
import { useCollaboration } from '../../../shared/hooks/useCollaboration'
import { SocketIoYjsProvider } from '../../../shared/services/SocketIoYjsProvider'
import type { DocumentParticipant } from '../../../shared/services/CollaborationClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface UseRowPageCollaborationOptions {
  noteId: string | null
  accessToken: string
  editorRef: React.RefObject<Editor | null>
  onLocalDocumentChange?: () => void
}

export interface UseRowPageCollaborationReturn {
  ydoc: Y.Doc
  awareness: Awareness
  participants: DocumentParticipant[]
  isYjsSynced: boolean
  isCollaborationConnected: boolean
  lastSyncError: string | null
}

function safeParseJwtPayload(token: string): {
  sub?: string
  userId?: string
  name?: string
  preferred_username?: string
  username?: string
  picture?: string
  avatar?: string
} | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || !parts[1]) return null
    const base64 = parts[1].replaceAll('-', '+').replaceAll('_', '/')
    const json = atob(base64)
    const payload = JSON.parse(json)
    return typeof payload === 'object' && payload !== null ? payload : null
  } catch {
    return null
  }
}

export function useRowPageCollaboration({
  noteId,
  accessToken,
  editorRef,
  onLocalDocumentChange
}: UseRowPageCollaborationOptions): UseRowPageCollaborationReturn {
  const ydoc = useMemo(() => new Y.Doc(), [noteId])
  const awareness = useMemo(() => new Awareness(ydoc), [ydoc])
  const [isYjsSynced, setIsYjsSynced] = useState(false)
  const [lastSyncError, setLastSyncError] = useState<string | null>(null)
  const yjsProviderRef = useRef<SocketIoYjsProvider | null>(null)
  const currentUser = useMemo(() => safeParseJwtPayload(accessToken), [accessToken])
  const graphqlClient = useGraphQLClient(accessToken)
  const [participants, setParticipants] = useState<DocumentParticipant[]>([])
  const [currentUserName, setCurrentUserName] = useState<string | null>(
    currentUser?.name || currentUser?.preferred_username || currentUser?.username || null
  )
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | undefined>(
    currentUser?.picture || currentUser?.avatar || undefined
  )

  const {
    participants: rawParticipants,
    isConnected: isCollaborationConnected,
    socket: collaborationSocket
  } = useCollaboration({
    entityType: 'note',
    entityId: noteId ?? '',
    enabled: Boolean(noteId),
    accessToken
  })

  useEffect(() => {
    if (!rawParticipants.length) {
      setParticipants([])
      return
    }

    const fetchAvatars = async () => {
      const userIds = rawParticipants
        .filter(p => p.userId && !p.avatarUrl)
        .map(p => p.userId)
        .filter((id, index, arr) => arr.indexOf(id) === index)

      if (userIds.length === 0 || !graphqlClient) {
        setParticipants(rawParticipants)
        return
      }

      try {
        const query = `
          query GetEmployeeAvatars($userIds: [String!]!) {
            Employee(where: {userId: {_in: $userIds}}) {
              userId
              pictureThumbnail
            }
          }
        `
        const result = await graphqlClient.request<{
          Employee: Array<{ userId: string; pictureThumbnail: string | null }>
        }>(query, { userIds })

        const avatarMap = new Map<string, string>()
        result?.Employee?.forEach(emp => {
          if (emp.pictureThumbnail) {
            const avatarUrl = emp.pictureThumbnail.startsWith('data:')
              ? emp.pictureThumbnail
              : `data:image/png;base64,${emp.pictureThumbnail}`
            avatarMap.set(emp.userId, avatarUrl)
          }
        })

        setParticipants(
          rawParticipants.map(p => ({
            ...p,
            avatarUrl: p.avatarUrl || avatarMap.get(p.userId) || undefined
          }))
        )
      } catch {
        setParticipants(rawParticipants)
      }
    }

    void fetchAvatars()
  }, [rawParticipants, graphqlClient])

  useEffect(() => {
    const currentUserId = currentUser?.sub || currentUser?.userId || null
    if (!currentUserId || !graphqlClient) return

    const fetchCurrentUserAvatar = async () => {
      try {
        const query = `
          query GetCurrentUserAvatar($userId: String!) {
            Employee(where: { userId: { _eq: $userId } }) {
              displayName
              pictureThumbnail
            }
          }
        `
        const result = await graphqlClient.request<{
          Employee: Array<{ displayName?: string; pictureThumbnail?: string | null }>
        }>(query, { userId: currentUserId })

        const emp = result.Employee?.[0]
        if (emp?.pictureThumbnail) {
          const avatarUrl = emp.pictureThumbnail.startsWith('data:')
            ? emp.pictureThumbnail
            : `data:image/png;base64,${emp.pictureThumbnail}`
          setCurrentUserAvatar(avatarUrl)
        }
        if (emp?.displayName) {
          setCurrentUserName(emp.displayName)
        }
      } catch {
        // avatar is optional
      }
    }

    void fetchCurrentUserAvatar()
  }, [currentUser, graphqlClient])

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

  const forceEditorViewRefresh = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ed = editorRef.current as { state?: unknown; view?: { updateState?: (state: unknown) => void } } | null
        if (ed?.view?.updateState && ed.state) {
          ed.view.updateState(ed.state)
        }
      })
    })
  }, [editorRef])

  useEffect(() => {
    if (!noteId || !collaborationSocket) return

    const provider = new SocketIoYjsProvider({
      socket: collaborationSocket,
      documentId: noteId,
      entityType: 'note',
      ydoc,
      awareness,
      onBeforeFirstSync: getEditorReadyPromise,
      onSyncedChange: setIsYjsSynced,
      onLocalDocumentChange,
      onRemoteDocumentChange: forceEditorViewRefresh,
      onRemoteAwarenessChange: forceEditorViewRefresh,
      onSyncError: setLastSyncError,
      onBootstrapRequired: async (html: string) => {
        const start = Date.now()
        while (!editorRef.current && Date.now() - start < 5000) {
          await new Promise(resolve => setTimeout(resolve, 25))
        }
        const ed = editorRef.current
        if (!ed) throw new Error('Editor not ready for bootstrap')
        ed.commands.setContent(html || '<p></p>', true)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    })

    yjsProviderRef.current = provider
    provider.start()

    return () => {
      provider.destroy()
      yjsProviderRef.current = null
      setIsYjsSynced(false)
      setLastSyncError(null)
    }
  }, [
    noteId,
    collaborationSocket,
    ydoc,
    awareness,
    editorRef,
    getEditorReadyPromise,
    forceEditorViewRefresh,
    onLocalDocumentChange
  ])

  useEffect(() => {
    if (!noteId || !isYjsSynced) return

    const currentUserId = currentUser?.sub || currentUser?.userId || null
    if (!currentUserId) return

    let cancelled = false
    const deadline = Date.now() + 5000

    const applyWhenViewReady = () => {
      if (cancelled) return
      try {
        const ed = editorRef.current as { view?: unknown } | null
        if (ed?.view) {
          awareness.setLocalStateField('user', {
            id: currentUserId,
            userId: currentUserId,
            name: currentUserName || 'User',
            color: participants.find(p => p.userId === currentUserId)?.userColor || '#4ECDC4',
            avatar: currentUserAvatar
          })
          return
        }
      } catch {
        // view may not be ready yet
      }
      if (Date.now() > deadline) return
      setTimeout(applyWhenViewReady, 50)
    }

    setTimeout(applyWhenViewReady, 0)

    return () => {
      cancelled = true
    }
  }, [noteId, isYjsSynced, currentUser, awareness, participants, editorRef, currentUserName, currentUserAvatar])

  return { ydoc, awareness, participants, isYjsSynced, isCollaborationConnected, lastSyncError }
}
