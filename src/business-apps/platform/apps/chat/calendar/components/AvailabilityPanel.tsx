import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Spinner } from '@newwork/nw-design-system'
import { useChatClient } from '@/common/network/chat/useChatClient'
import type { AvailabilityResponse } from '../types'

interface AvailabilityParticipant {
  id: string
  displayName?: string
  firstName?: string
  lastName?: string
}

interface AvailabilityPanelProps {
  accessToken: string
  participants: AvailabilityParticipant[]
  date: string
  startTime: string
  endTime: string
  onApplySuggestion: (start: string, end: string) => void
}

function formatPersonName(participant: AvailabilityParticipant): string {
  return (
    participant.displayName || `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || 'Participant'
  )
}

function formatSuggestionTime(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  })
}

export const AvailabilityPanel: React.FC<AvailabilityPanelProps> = ({
  accessToken,
  participants,
  date,
  startTime,
  endTime,
  onApplySuggestion
}) => {
  const chatClient = useChatClient(accessToken)
  const [data, setData] = useState<AvailabilityResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userIds = useMemo(
    () => Array.from(new Set(participants.map(participant => participant.id).filter(Boolean))),
    [participants]
  )

  const durationMinutes = useMemo(() => {
    const start = new Date(`${date}T${startTime}`)
    const end = new Date(`${date}T${endTime}`)
    const diffMs = end.getTime() - start.getTime()

    if (Number.isNaN(diffMs) || diffMs <= 0) {
      return 60
    }

    return Math.max(30, Math.round(diffMs / (1000 * 60)))
  }, [date, startTime, endTime])

  useEffect(() => {
    if (!date || userIds.length === 0) {
      setData(null)
      setError(null)
      return
    }

    const startDate = new Date(`${date}T00:00:00`)
    const endDate = new Date(`${date}T23:59:59`)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setData(null)
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    chatClient
      .getCalendarAvailability<AvailabilityResponse>({
        userIds,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        durationMinutes
      })
      .then(response => {
        if (!cancelled) {
          setData(response)
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Error loading availability:', err)
          setError(err instanceof Error ? err.message : 'Failed to load availability')
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [chatClient, date, durationMinutes, userIds])

  if (userIds.length === 0) {
    return null
  }

  return (
    <div className="gba:space-y-3 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <div>
          <p className="gba:text-sm gba:font-medium gba:text-foreground">Scheduling assistant</p>
          <p className="gba:text-xs gba:text-muted-foreground">Review busy time and quick suggestions for invitees</p>
        </div>
        {isLoading && <Spinner className="gba:h-4 gba:w-4" />}
      </div>

      {error && <p className="gba:text-xs gba:text-destructive">{error}</p>}

      {!error && data?.suggestions?.length ? (
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          {data.suggestions.slice(0, 4).map(suggestion => (
            <Button
              key={suggestion.start}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onApplySuggestion(suggestion.start, suggestion.end)}
              data-testid={`availability-suggestion-${suggestion.start}`}
            >
              {formatSuggestionTime(suggestion.start)} - {formatSuggestionTime(suggestion.end)}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="gba:space-y-2">
        {(data?.availability || []).map(entry => {
          const participant = participants.find(item => item.id === entry.userId)

          return (
            <div
              key={entry.userId}
              className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:rounded-md gba:bg-background gba:px-3 gba:py-2"
            >
              <div className="gba:min-w-0">
                <p className="gba:text-sm gba:font-medium gba:text-foreground">
                  {participant ? formatPersonName(participant) : entry.userId}
                </p>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {entry.busySlots.length === 0 ? 'No conflicts on this day' : `${entry.busySlots.length} busy slot(s)`}
                </p>
              </div>

              <div className="gba:flex gba:flex-wrap gba:justify-end gba:gap-2">
                {entry.busySlots.length === 0 ? (
                  <Badge variant="secondary">Free</Badge>
                ) : (
                  entry.busySlots.slice(0, 3).map(slot => (
                    <Badge key={`${entry.userId}-${slot.start}`} variant="outline">
                      {formatSuggestionTime(slot.start)} - {formatSuggestionTime(slot.end)}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
