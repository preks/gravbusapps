/**
 * Hand-raise state and WebSocket subscription for GroupCallModalRtk.
 */

import { useState, useEffect } from 'react'
import { globalCallManager } from '../../services/globalCallManager'
import type { GroupCallModalRtkProps } from '../../components/call/groupCallModalTypes'

export function useGroupCallModalHandRaise(
  props: Pick<GroupCallModalRtkProps, 'callState' | 'wsClient' | 'accessToken' | 'currentUserId'>,
  meeting: any,
  globalMeetingId: string | null
) {
  const { callState, wsClient, accessToken, currentUserId } = props

  const [wsLocalHandRaised, setWsLocalHandRaised] = useState<boolean>(() => callState.handRaised)
  const [wsRemoteHandsRaised, setWsRemoteHandsRaised] = useState<Record<string, boolean>>(
    () => callState.remoteHandsRaised || {}
  )
  const [wsHandRaisedOrder, setWsHandRaisedOrder] = useState<Record<string, { order: number; timestamp: number }>>(
    () => callState.handRaisedOrder || {}
  )

  useEffect(() => {
    setWsLocalHandRaised(callState.handRaised)
  }, [callState.handRaised])

  useEffect(() => {
    setWsRemoteHandsRaised(callState.remoteHandsRaised || {})
  }, [callState.remoteHandsRaised])

  useEffect(() => {
    setWsHandRaisedOrder(callState.handRaisedOrder || {})
  }, [callState.handRaisedOrder])

  useEffect(() => {
    const meetingId = globalMeetingId
    const localUserId = currentUserId

    if (!wsClient || !meetingId || !localUserId) return

    let socket = wsClient.getSocket()
    if (!socket && accessToken) {
      try {
        wsClient.connect(accessToken)
        socket = wsClient.getSocket()
      } catch {
        // Best-effort only
      }
    }
    if (!socket) return

    const resolveIds = (participantId: string, isLocal: boolean) => {
      let participantPeerId: string | undefined
      let participantUserId: string | undefined
      let participantCustomId: string | undefined = participantId

      if (isLocal) {
        participantPeerId = meeting?.self?.id
        participantUserId = meeting?.self?.userId
        participantCustomId = meeting?.self?.customParticipantId || participantId
      } else if (meeting?.participants?.joined) {
        const joined = Array.from(meeting.participants.joined.values())
        const matchingPeer: any = joined.find(
          (p: any) => p.customParticipantId === participantId || p.userId === participantId || p.id === participantId
        )
        if (matchingPeer) {
          participantPeerId = matchingPeer.id
          participantUserId = matchingPeer.userId
          participantCustomId = matchingPeer.customParticipantId
        }
      }

      return { participantPeerId, participantUserId, participantCustomId }
    }

    const handleHandUpdate = (data: {
      roomId?: string
      participantId: string
      handRaised: boolean
      timestamp?: number
    }) => {
      if (data.roomId && data.roomId !== meetingId) return

      const isLocal = data.participantId === localUserId
      const { participantPeerId, participantUserId, participantCustomId } = resolveIds(data.participantId, isLocal)

      if (isLocal) {
        setWsLocalHandRaised(data.handRaised)
        globalCallManager.updateCallState({ handRaised: data.handRaised })
      } else {
        setWsRemoteHandsRaised(prev => {
          const updated = { ...prev }
          if (participantPeerId) updated[participantPeerId] = data.handRaised
          if (participantUserId) updated[participantUserId] = data.handRaised
          if (participantCustomId) updated[participantCustomId] = data.handRaised
          globalCallManager.updateCallState({ remoteHandsRaised: updated })
          return updated
        })
      }

      setWsHandRaisedOrder(prev => {
        const updated = { ...prev }

        if (participantPeerId) delete updated[participantPeerId]
        if (participantUserId) delete updated[participantUserId]
        if (participantCustomId) delete updated[participantCustomId]

        if (data.handRaised) {
          const allTimestamps = new Set<number>()
          Object.values(updated).forEach(entry => allTimestamps.add(entry.timestamp))
          const order = allTimestamps.size + 1
          const timestamp = data.timestamp || Date.now()
          const orderData = { order, timestamp }
          if (participantPeerId) updated[participantPeerId] = orderData
          if (participantUserId) updated[participantUserId] = orderData
          if (participantCustomId) updated[participantCustomId] = orderData
        } else {
          const uniqueTimestamps = Array.from(new Set(Object.values(updated).map(e => e.timestamp))).sort(
            (a, b) => a - b
          )
          uniqueTimestamps.forEach((ts, idx) => {
            const newOrder = idx + 1
            Object.keys(updated).forEach(key => {
              if (updated[key].timestamp === ts) updated[key] = { ...updated[key], order: newOrder }
            })
          })
        }

        globalCallManager.updateCallState({ handRaisedOrder: updated })
        return updated
      })
    }

    const handleSyncParticipantStates = (data: {
      roomId: string
      participantStates: Array<{ participantId: string; handRaised: boolean }>
    }) => {
      if (data.roomId !== meetingId) return

      const baseTimestamp = Date.now()
      const nextRemote: Record<string, boolean> = {}
      const nextOrder: Record<string, { order: number; timestamp: number }> = {}
      let nextLocal: boolean | null = null

      data.participantStates.forEach((state, index) => {
        const isLocal = state.participantId === localUserId
        if (isLocal) nextLocal = state.handRaised

        const { participantPeerId, participantUserId, participantCustomId } = resolveIds(state.participantId, isLocal)

        if (!isLocal) {
          if (participantPeerId) nextRemote[participantPeerId] = state.handRaised
          if (participantUserId) nextRemote[participantUserId] = state.handRaised
          if (participantCustomId) nextRemote[participantCustomId] = state.handRaised
        }

        if (state.handRaised) {
          const orderData = { order: index + 1, timestamp: baseTimestamp + index }
          if (participantPeerId) nextOrder[participantPeerId] = orderData
          if (participantUserId) nextOrder[participantUserId] = orderData
          if (participantCustomId) nextOrder[participantCustomId] = orderData
        }
      })

      const resolvedLocal = nextLocal ?? callState.handRaised
      setWsLocalHandRaised(resolvedLocal)
      setWsRemoteHandsRaised(nextRemote)
      setWsHandRaisedOrder(nextOrder)

      globalCallManager.updateCallState({
        handRaised: resolvedLocal,
        remoteHandsRaised: nextRemote,
        handRaisedOrder: nextOrder
      })
    }

    socket.on('group-call:hand-update', handleHandUpdate)
    socket.on('group-call:sync-participant-states', handleSyncParticipantStates)

    return () => {
      socket.off('group-call:hand-update', handleHandUpdate)
      socket.off('group-call:sync-participant-states', handleSyncParticipantStates)
    }
  }, [wsClient, accessToken, globalMeetingId, currentUserId, meeting, callState.handRaised])

  const effectiveLocalHandRaised = wsLocalHandRaised
  const effectiveRemoteHandsRaised = wsRemoteHandsRaised
  const effectiveHandRaisedOrder = wsHandRaisedOrder

  const isLocalUser = (checkPeerId: string | undefined) => {
    if (!checkPeerId) return false
    return checkPeerId === meeting?.self?.id || checkPeerId === 'local'
  }

  const isParticipantHandRaised = (
    peerId: string | undefined,
    participantUserId: string | undefined,
    participantCustomId: string | undefined
  ) => {
    if (!peerId && !participantUserId && !participantCustomId) return false

    if (participantUserId === meeting?.self?.userId || isLocalUser(peerId)) {
      return effectiveLocalHandRaised
    }

    const remoteHands = effectiveRemoteHandsRaised || {}
    const isRaisedByPeerId = peerId ? remoteHands[peerId] === true : false
    const isRaisedByUserId = participantUserId ? remoteHands[participantUserId] === true : false
    const isRaisedByCustomId = participantCustomId ? remoteHands[participantCustomId] === true : false
    return isRaisedByPeerId || isRaisedByUserId || isRaisedByCustomId
  }

  const getHandRaisedOrderNumber = (
    peerId: string | undefined,
    participantUserId: string | undefined,
    participantCustomId: string | undefined
  ): number | undefined => {
    if (!peerId && !participantUserId && !participantCustomId) return undefined

    const handRaisedOrder = effectiveHandRaisedOrder || {}
    if (peerId && handRaisedOrder[peerId]) return handRaisedOrder[peerId].order
    if (participantUserId && handRaisedOrder[participantUserId]) return handRaisedOrder[participantUserId].order
    if (participantCustomId && handRaisedOrder[participantCustomId]) return handRaisedOrder[participantCustomId].order
    return undefined
  }

  return {
    effectiveLocalHandRaised,
    effectiveRemoteHandsRaised,
    effectiveHandRaisedOrder,
    isLocalUser,
    isParticipantHandRaised,
    getHandRaisedOrderNumber
  }
}
