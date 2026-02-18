/**
 * Call conversation and instance ID for GroupCallModalRtk (room-based chat panel).
 */

import { useState, useRef, useEffect } from 'react'
import { ConversationType } from '../../types'
import type { GroupCallModalRtkProps } from '../../components/call/groupCallModalTypes'

export function useGroupCallModalCallConversation(props: GroupCallModalRtkProps) {
  const { callState, conversationName, participants, activeConversation } = props
  const [instanceId] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`)

  useEffect(() => {
    return () => {
      const portalContainerId = `rtk-group-call-minimized-portal-${instanceId}`
      const portalContainer = document.getElementById(portalContainerId)
      if (portalContainer) {
        portalContainer.remove()
      }
    }
  }, [instanceId])

  const callConversationRef = useRef<any>(null)

  useEffect(() => {
    if (!callState.roomId) {
      callConversationRef.current = null
      return
    }

    const chatConversationId = callState.calendarMeetingId || callState.roomId

    if (callConversationRef.current?.id !== chatConversationId) {
      callConversationRef.current = {
        id: chatConversationId,
        name: conversationName || 'Group Call',
        type: ConversationType.GROUP,
        participants:
          activeConversation?.participants ||
          participants.map(p => {
            const pAny = p as any
            const displayName =
              p.odName ||
              (pAny.firstName || pAny.lastName ? `${pAny.firstName || ''} ${pAny.lastName || ''}`.trim() : '') ||
              'Unknown'
            return {
              userId: p.id || p.odId,
              user: {
                id: p.id || p.odId,
                displayName,
                firstName: pAny.firstName,
                lastName: pAny.lastName,
                username: p.odName || displayName,
                avatarUrl: p.avatarUrl
              }
            }
          }),
        isActive: true,
        createdBy: activeConversation?.createdBy || '',
        createdAt: activeConversation?.createdAt || new Date().toISOString(),
        updatedAt: activeConversation?.updatedAt || new Date().toISOString()
      }
    }
  }, [callState.roomId, callState.calendarMeetingId, activeConversation, conversationName, participants])

  const callConversation = callConversationRef.current

  return { instanceId, callConversation }
}
