/**
 * Mute participant and mute-all handlers for GroupCallModalRtk (WebSocket emit).
 */

import { useCallback } from 'react'
import { toast } from '@newwork/nw-design-system'
import { rtkDebug } from '../../utils/rtkDebug'
import type { GroupCallModalRtkProps } from '../../components/call/groupCallModalTypes'

export function useGroupCallModalMuteHandlers(
  props: Pick<GroupCallModalRtkProps, 'wsClient' | 'callState'>,
  meeting: any,
  currentParticipant: any,
  stableRemotePeers: any[]
) {
  const { wsClient, callState } = props

  const handleMuteParticipant = useCallback(
    (participantId: string, participantName: string) => {
      if (!wsClient || !currentParticipant || !meeting) {
        console.error('[MUTE] No WebSocket client, current participant, or meeting available')
        return
      }

      const socket = wsClient.getSocket()
      if (!socket) {
        console.error('[MUTE] Socket not available')
        return
      }

      const targetPeer = meeting.participants?.joined?.get(participantId)
      const targetUserId = targetPeer?.customParticipantId || participantId

      try {
        rtkDebug.log('[MUTE] Sending mute request via WebSocket:', {
          participantRtkId: participantId,
          targetUserId,
          targetParticipantName: participantName,
          requestedBy: currentParticipant.id,
          requestedByName: currentParticipant.odName
        })

        socket.emit('group-call:request-mute', {
          targetParticipantId: targetUserId,
          targetParticipantName: participantName,
          requestedBy: currentParticipant.id,
          requestedByName: currentParticipant.odName
        })

        toast.success(`Mute request sent to ${participantName}`, {
          duration: 2000
        })
      } catch (error) {
        console.error('[MUTE] Failed to send mute request:', error)
        toast.error(`Failed to mute ${participantName}`, {
          duration: 3000
        })
      }
    },
    [wsClient, currentParticipant, meeting]
  )

  const handleMuteAll = useCallback(() => {
    if (!wsClient || !currentParticipant || !callState.roomId || !meeting) {
      console.error('[MUTE ALL] No WebSocket client, current participant, roomId, or meeting available')
      return
    }

    const socket = wsClient.getSocket()
    if (!socket) {
      console.error('[MUTE ALL] Socket not available')
      return
    }

    const participantCount = stableRemotePeers.length

    try {
      rtkDebug.log('[MUTE ALL] Sending mute-all request via backend:', {
        conversationId: callState.roomId,
        totalParticipantCount: stableRemotePeers.length + 1,
        remoteParticipantCount: participantCount,
        requestedBy: currentParticipant.id,
        requestedByName: currentParticipant.odName
      })

      socket.emit('group-call:request-mute-all', {
        conversationId: callState.roomId,
        requestedBy: currentParticipant.id,
        requestedByName: currentParticipant.odName
      })

      toast.success(`Mute request sent to all ${participantCount} participants`, {
        duration: 2000
      })
    } catch (error) {
      console.error('[MUTE ALL] Failed to send mute-all request:', error)
      toast.error('Failed to mute all participants', {
        duration: 3000
      })
    }
  }, [wsClient, currentParticipant, callState.roomId, meeting, stableRemotePeers.length])

  return { handleMuteParticipant, handleMuteAll }
}
