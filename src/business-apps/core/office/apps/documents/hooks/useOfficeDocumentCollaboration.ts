import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { Socket } from 'socket.io-client'
import { useOfficeWebSocketClient } from '@/common/network/office/useOfficeWebSocketClient'
import type { OfficeDocumentOperation, OfficeDocumentParticipant } from '@/common/network/office/OfficeWebSocketClient'
import translations from '../_i18n'

type SocketParticipant = {
  odId?: string
  userId?: string
  id?: string
  userName?: string
  userColor?: string
  socketId?: string
  avatarUrl?: string
  avatar?: string
  cursor?: unknown
  selection?: unknown
  lastActiveAt?: string | number | Date
}

type ParticipantEventData = {
  userId: string
  userName: string
  userColor: string
  socketId?: string
  avatarUrl?: string
  avatar?: string
}

type CursorEventData = {
  userId: string
  userName?: string
  userColor?: string
  position: OfficeDocumentParticipant['cursor']
}

type SelectionEventData = {
  userId: string
  userName?: string
  userColor?: string
  selection: OfficeDocumentParticipant['selection']
}

function mapSocketParticipantToParticipant(participant: SocketParticipant): OfficeDocumentParticipant {
  return {
    userId: (participant.odId || participant.userId || participant.id || '') as string,
    userName: participant.userName || '',
    userColor: participant.userColor || '',
    socketId: participant.socketId || '',
    avatarUrl: participant.avatarUrl || participant.avatar,
    cursor: participant.cursor as OfficeDocumentParticipant['cursor'],
    selection: participant.selection as OfficeDocumentParticipant['selection'],
    lastActiveAt: participant.lastActiveAt ? new Date(participant.lastActiveAt) : new Date()
  }
}

function addParticipantIfMissing(
  participants: OfficeDocumentParticipant[],
  data: ParticipantEventData
): OfficeDocumentParticipant[] {
  if (participants.some(participant => participant.userId === data.userId)) {
    return participants
  }

  return [
    ...participants,
    {
      userId: data.userId,
      userName: data.userName,
      userColor: data.userColor,
      socketId: data.socketId || '',
      avatarUrl: data.avatarUrl || data.avatar,
      lastActiveAt: new Date()
    }
  ]
}

function removeParticipant(participants: OfficeDocumentParticipant[], userId: string): OfficeDocumentParticipant[] {
  return participants.filter(participant => participant.userId !== userId)
}

function updateParticipantCursor(
  participants: OfficeDocumentParticipant[],
  data: CursorEventData,
  fallbackUserName: string
): OfficeDocumentParticipant[] {
  let found = false
  const nextParticipants = participants.map(participant => {
    if (participant.userId !== data.userId) {
      return participant
    }

    found = true
    return {
      ...participant,
      cursor: data.position,
      lastActiveAt: new Date()
    }
  })

  if (found) {
    return nextParticipants
  }

  return [
    ...nextParticipants,
    {
      userId: data.userId,
      userName: data.userName || fallbackUserName,
      userColor: data.userColor || '#4ECDC4',
      socketId: '',
      cursor: data.position,
      lastActiveAt: new Date()
    }
  ]
}

function updateParticipantSelection(
  participants: OfficeDocumentParticipant[],
  data: SelectionEventData,
  fallbackUserName: string
): OfficeDocumentParticipant[] {
  let found = false
  const nextParticipants = participants.map(participant => {
    if (participant.userId !== data.userId) {
      return participant
    }

    found = true
    return {
      ...participant,
      selection: data.selection,
      lastActiveAt: new Date()
    }
  })

  if (found) {
    return nextParticipants
  }

  return [
    ...nextParticipants,
    {
      userId: data.userId,
      userName: data.userName || fallbackUserName,
      userColor: data.userColor || '#4ECDC4',
      socketId: '',
      selection: data.selection,
      lastActiveAt: new Date()
    }
  ]
}

export interface UseOfficeDocumentCollaborationOptions {
  entityId: string
  enabled?: boolean
  accessToken?: string
  onOperationReceived?: (operation: {
    userId: string
    userName: string
    operation: OfficeDocumentOperation
    version?: number
    timestamp: number
  }) => void
  onError?: (error: Error) => void
}

export interface UseOfficeDocumentCollaborationReturn {
  participants: OfficeDocumentParticipant[]
  isConnected: boolean
  socket: Socket | null
  emitOperation: (operation: OfficeDocumentOperation) => void
  emitCursor: (position: { line?: number; column?: number; offset?: number; path?: string[] }) => void
  emitSelection: (
    selection: {
      start: { line?: number; column?: number; offset?: number }
      end: { line?: number; column?: number; offset?: number }
    } | null
  ) => void
  emitTypingStart: () => void
  emitTypingStop: () => void
  reconnect: () => void
}

export function useOfficeDocumentCollaboration({
  entityId,
  enabled = true,
  accessToken,
  onOperationReceived,
  onError
}: UseOfficeDocumentCollaborationOptions): UseOfficeDocumentCollaborationReturn {
  const { t } = useTranslation(translations)
  const fallbackUserName = t('editor-user-fallback')
  const officeWebSocketClient = useOfficeWebSocketClient(accessToken)
  const [participants, setParticipants] = useState<OfficeDocumentParticipant[]>([])
  const [isConnected, setIsConnected] = useState(officeWebSocketClient.isConnected())
  const [socket, setSocket] = useState<Socket | null>(officeWebSocketClient.getSocket())

  const hasJoinedRef = useRef(false)
  const isJoiningRef = useRef(false)
  const joinAckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingOperationsRef = useRef<OfficeDocumentOperation[]>([])
  const pendingCursorRef = useRef<{ line?: number; column?: number; offset?: number; path?: string[] } | null>(null)

  useEffect(() => {
    if (!enabled || !entityId) {
      setParticipants([])
      setIsConnected(false)
      setSocket(null)
      hasJoinedRef.current = false
      isJoiningRef.current = false
      return
    }

    if (!accessToken) {
      onError?.(new Error('No authentication token available'))
      setParticipants([])
      setIsConnected(false)
      setSocket(null)
      hasJoinedRef.current = false
      isJoiningRef.current = false
      return
    }

    const clearJoinAckTimeout = () => {
      if (joinAckTimeoutRef.current) {
        clearTimeout(joinAckTimeoutRef.current)
        joinAckTimeoutRef.current = null
      }
    }

    const flushPendingEvents = () => {
      if (!officeWebSocketClient.getSocket()?.connected || !hasJoinedRef.current) {
        return
      }

      const pendingOperations = pendingOperationsRef.current
      if (pendingOperations.length > 0) {
        pendingOperationsRef.current = []
        pendingOperations.forEach(operation => {
          officeWebSocketClient.sendDocumentOperation('document', entityId, operation)
        })
      }

      const pendingCursor = pendingCursorRef.current
      if (pendingCursor) {
        pendingCursorRef.current = null
        officeWebSocketClient.sendCursorMove('document', entityId, pendingCursor)
      }
    }

    const joinRoomIfNeeded = () => {
      if (hasJoinedRef.current || isJoiningRef.current || !officeWebSocketClient.getSocket()?.connected) {
        return
      }

      isJoiningRef.current = true
      clearJoinAckTimeout()
      joinAckTimeoutRef.current = setTimeout(() => {
        isJoiningRef.current = false
      }, 6000)

      officeWebSocketClient.joinDocument('document', entityId, rawParticipants => {
        setParticipants((rawParticipants as SocketParticipant[]).map(mapSocketParticipantToParticipant))
        hasJoinedRef.current = true
        isJoiningRef.current = false
        clearJoinAckTimeout()
        flushPendingEvents()
      })
    }

    const handleConnect = () => {
      setIsConnected(true)
      setSocket(officeWebSocketClient.getSocket())
      joinRoomIfNeeded()
    }

    const handleDisconnect = () => {
      setIsConnected(false)
      setSocket(null)
      setParticipants([])
      hasJoinedRef.current = false
      isJoiningRef.current = false
      clearJoinAckTimeout()
    }

    const unsubscribeConnect = officeWebSocketClient.onConnect(handleConnect)
    const unsubscribeDisconnect = officeWebSocketClient.onDisconnect(handleDisconnect)
    const unsubscribeConnectError = officeWebSocketClient.onConnectError(error => {
      onError?.(error)
    })
    const unsubscribeUserJoined = officeWebSocketClient.onUserJoined(data => {
      setParticipants(currentParticipants => addParticipantIfMissing(currentParticipants, data))
    })
    const unsubscribeUserLeft = officeWebSocketClient.onUserLeft(data => {
      setParticipants(currentParticipants => removeParticipant(currentParticipants, data.userId))
    })
    const unsubscribeOperationApplied = officeWebSocketClient.onOperationApplied(data => {
      onOperationReceived?.(data)
    })
    const unsubscribeCursorUpdate = officeWebSocketClient.onCursorUpdate(data => {
      setParticipants(currentParticipants => updateParticipantCursor(currentParticipants, data, fallbackUserName))
    })
    const unsubscribeSelectionUpdate = officeWebSocketClient.onSelectionUpdate(data => {
      setParticipants(currentParticipants => updateParticipantSelection(currentParticipants, data, fallbackUserName))
    })

    if (officeWebSocketClient.getSocket()?.connected) {
      handleConnect()
    } else {
      setSocket(officeWebSocketClient.getSocket())
      setIsConnected(officeWebSocketClient.isConnected())
    }

    return () => {
      clearJoinAckTimeout()
      pendingOperationsRef.current = []
      pendingCursorRef.current = null

      if (hasJoinedRef.current) {
        officeWebSocketClient.leaveDocument('document', entityId)
      }

      hasJoinedRef.current = false
      isJoiningRef.current = false
      setParticipants([])
      setSocket(null)

      unsubscribeSelectionUpdate()
      unsubscribeCursorUpdate()
      unsubscribeOperationApplied()
      unsubscribeUserLeft()
      unsubscribeUserJoined()
      unsubscribeConnectError()
      unsubscribeDisconnect()
      unsubscribeConnect()
    }
  }, [accessToken, enabled, entityId, fallbackUserName, officeWebSocketClient, onError, onOperationReceived])

  const emitOperation = useCallback(
    (operation: OfficeDocumentOperation) => {
      if (!officeWebSocketClient.isConnected()) {
        return
      }

      if (!hasJoinedRef.current) {
        pendingOperationsRef.current.push(operation)

        if (!isJoiningRef.current) {
          isJoiningRef.current = true
          officeWebSocketClient.joinDocument('document', entityId, rawParticipants => {
            setParticipants((rawParticipants as SocketParticipant[]).map(mapSocketParticipantToParticipant))
            hasJoinedRef.current = true
            isJoiningRef.current = false
            const pendingOperations = pendingOperationsRef.current
            pendingOperationsRef.current = []
            pendingOperations.forEach(pendingOperation => {
              officeWebSocketClient.sendDocumentOperation('document', entityId, pendingOperation)
            })
          })
        }

        return
      }

      officeWebSocketClient.sendDocumentOperation('document', entityId, operation)
    },
    [entityId, officeWebSocketClient]
  )

  const emitCursor = useCallback(
    (position: { line?: number; column?: number; offset?: number; path?: string[] }) => {
      if (!officeWebSocketClient.isConnected()) {
        return
      }

      if (!hasJoinedRef.current) {
        pendingCursorRef.current = position
        return
      }

      officeWebSocketClient.sendCursorMove('document', entityId, position)
    },
    [entityId, officeWebSocketClient]
  )

  const emitSelection = useCallback(
    (
      selection: {
        start: { line?: number; column?: number; offset?: number }
        end: { line?: number; column?: number; offset?: number }
      } | null
    ) => {
      if (!officeWebSocketClient.isConnected() || !hasJoinedRef.current) {
        return
      }

      officeWebSocketClient.sendSelectionChange('document', entityId, selection)
    },
    [entityId, officeWebSocketClient]
  )

  const emitTypingStart = useCallback(() => {
    if (!officeWebSocketClient.isConnected() || !hasJoinedRef.current) {
      return
    }

    officeWebSocketClient.sendTypingStart('document', entityId)
  }, [entityId, officeWebSocketClient])

  const emitTypingStop = useCallback(() => {
    if (!officeWebSocketClient.isConnected() || !hasJoinedRef.current) {
      return
    }

    officeWebSocketClient.sendTypingStop('document', entityId)
  }, [entityId, officeWebSocketClient])

  const reconnect = useCallback(() => {
    officeWebSocketClient.forceReconnect()
  }, [officeWebSocketClient])

  return {
    participants,
    isConnected,
    socket,
    emitOperation,
    emitCursor,
    emitSelection,
    emitTypingStart,
    emitTypingStop,
    reconnect
  }
}
