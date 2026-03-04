/**
 * Fetches meeting participants from chat-service when opening a meeting-invite task.
 * Returns current participant list with latest status (pending, accepted, declined, tentative).
 * Use when task.tags?.app === 'meeting-invite' && task.tags?.meetingId.
 */

import { useState, useEffect, useCallback } from 'react'
import { env } from '@/common/env/EnvUtils'

export interface MeetingParticipantWithStatus {
  userId: string
  displayName: string
  status: 'pending' | 'accepted' | 'declined' | 'tentative'
  isOrganizer: boolean
}

const CHAT_SERVICE_API_PREFIX = '/api/v1'

function getChatServiceApiUrl(): string {
  const override = env('NEXT_PUBLIC_CHAT_SERVICE_URL')
  if (override) {
    const base = override.endsWith('/') ? override.slice(0, -1) : override
    return base.includes(CHAT_SERVICE_API_PREFIX) ? base : `${base}${CHAT_SERVICE_API_PREFIX}`
  }
  const api = env('NEXT_PUBLIC_CHAT_API')
  if (api && !api.includes('localhost')) return api
  let base = env('NEXT_PUBLIC_BASE_URL') || ''
  base = base.endsWith('/') ? base.slice(0, -1) : base
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost' &&
    ['3000', '5173'].includes(window.location.port)
  ) {
    base = 'https://newwork-dev.newwork.com'
  }
  return `${base}/chat-service${CHAT_SERVICE_API_PREFIX}`
}

export function useMeetingParticipants(
  meetingId: string | undefined,
  accessToken: string | undefined
): {
  participants: MeetingParticipantWithStatus[]
  isLoading: boolean
  error: Error | null
} {
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
      const baseUrl = getChatServiceApiUrl()
      const res = await fetch(`${baseUrl}/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'Meeting not found' : `Failed to load meeting: ${res.status}`)
      }
      const data = await res.json()
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
  }, [meetingId, accessToken])

  useEffect(() => {
    fetchMeeting()
  }, [fetchMeeting])

  return { participants, isLoading, error }
}
