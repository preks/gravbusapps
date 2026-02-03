import React, { useEffect, useState } from 'react'
import { SessionCard } from './SessionCard'
import type { CallSession, QuerySessionsParams } from '../types/call-session'
import { Skeleton } from '@newwork/nw-design-system'
import { AlertCircle } from 'lucide-react'

interface SessionHistoryListProps {
  meetingId?: string
  conversationId?: string
  accessToken: string
  apiBaseUrl: string
  onViewTranscript?: (noteId: string) => void
}

export const SessionHistoryList: React.FC<SessionHistoryListProps> = ({
  meetingId,
  conversationId,
  accessToken,
  apiBaseUrl,
  onViewTranscript
}) => {
  const [sessions, setSessions] = useState<CallSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSessions = async () => {
      if (!meetingId && !conversationId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const params: QuerySessionsParams = {
          ...(meetingId && { meetingId }),
          ...(conversationId && { conversationId }),
          limit: 50
        }

        const queryString = new URLSearchParams(
          Object.entries(params).reduce(
            (acc, [key, value]) => {
              if (value !== undefined) {
                acc[key] = String(value)
              }
              return acc
            },
            {} as Record<string, string>
          )
        ).toString()

        const response = await fetch(`${apiBaseUrl}/api/v1/call-sessions?${queryString}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch sessions: ${response.statusText}`)
        }

        const data = await response.json()
        setSessions(data.data || [])
      } catch (err) {
        console.error('Error fetching call sessions:', err)
        setError(err instanceof Error ? err.message : 'Failed to load call history')
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [meetingId, conversationId, accessToken, apiBaseUrl])

  if (loading) {
    return (
      <div className="gba:space-y-4">
        <Skeleton className="gba:h-32 gba:w-full" />
        <Skeleton className="gba:h-32 gba:w-full" />
        <Skeleton className="gba:h-32 gba:w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:flex gba:items-center gba:gap-2 gba:p-4 gba:text-destructive gba:bg-destructive-secondary gba:rounded-md">
        <AlertCircle className="gba:h-5 gba:w-5" />
        <p className="gba:text-sm">{error}</p>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
        <p className="gba:text-sm">No call sessions yet</p>
        <p className="gba:text-xs gba:mt-1">Sessions will appear here once calls are started</p>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4">
      <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Call History ({sessions.length})</h3>
      {sessions.map(session => (
        <SessionCard key={session.id} session={session} onViewTranscript={onViewTranscript} />
      ))}
    </div>
  )
}
