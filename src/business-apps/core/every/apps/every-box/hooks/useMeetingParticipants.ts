/**
 * Fetches meeting participants from chat-service when opening a meeting-invite task.
 * Returns current participant list with latest status (pending, accepted, declined, tentative).
 * Use when task.tags?.app === 'meeting-invite' && task.tags?.meetingId.
 */

import { useState, useEffect, useCallback } from 'react'
import { useChatClient } from '@/common/network/chat/useChatClient'

export interface MeetingParticipantWithStatus {
  userId: string
  displayName: string
  status: 'pending' | 'accepted' | 'declined' | 'tentative'
  isOrganizer: boolean
}

export function useMeetingParticipants(
  meetingId: string | undefined,
  accessToken: string | undefined
): {
  participants: MeetingParticipantWithStatus[]
  isLoading: boolean
  error: Error | null
} {
  const chatClient = useChatClient(accessToken)
  const [participants, setParticipants] = useState<MeetingParticipantWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchMeeting = useCallback(async () => {
    if (!meetingId || !accessToken) {
      setParticipants([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const data = await chatClient.getMeeting<{ meeting: any }>(meetingId)
      const meeting = data?.meeting
      const raw = meeting?.participants || []
      const list: MeetingParticipantWithStatus[] = raw.map((p: any) => {
        const u = p.user
        const displayName =
          u?.displayName || [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.id || p.userId || ''
        return {
          userId: p.userId,
          displayName,
          status: (p.status || 'pending').toLowerCase(),
          isOrganizer: !!p.isOrganizer
        }
      })
      setParticipants(list)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load participants'))
      setParticipants([])
    } finally {
      setIsLoading(false)
    }
  }, [meetingId, accessToken, chatClient])

  useEffect(() => {
    fetchMeeting()
  }, [fetchMeeting])

  return { participants, isLoading, error }
}
