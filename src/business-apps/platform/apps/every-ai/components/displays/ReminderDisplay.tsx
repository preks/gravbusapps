import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { EntityData } from '../../types/models'

dayjs.extend(relativeTime)

interface ReminderDisplayProps {
  entity: EntityData
  accessToken: string
}

interface ReminderWorkflowData {
  workflowId?: string
  id?: string
  status: string
  tags?: {
    reminderTitle?: string
    reminderMessage?: string
    reminderDateTime?: string
    reminderDateTimeFormatted?: string
    createdAt?: string
  }
  input?: {
    reminderTitle?: string
    reminderMessage?: string
    reminderDateTime?: string
    reminderDateTimeFormatted?: string
    createdAt?: string
  }
}

export const ReminderDisplay: React.FC<ReminderDisplayProps> = ({ entity, accessToken }) => {
  const [reminder, setReminder] = useState<ReminderWorkflowData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Safety check - don't fetch if missing required data
    if (!entity?.id || !accessToken) {
      setIsLoading(false)
      setError('Missing required data')
      return
    }

    const fetchReminderData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const baseUrl = window.location.origin
        const response = await fetch(`${baseUrl}/flow-engine/api/flows/${entity.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          console.warn(`Reminder fetch failed: ${response.statusText}`)
          setError(`Could not load reminder details`)
          setIsLoading(false)
          return
        }

        const data = await response.json()
        setReminder(data)
      } catch (err) {
        console.error('Error fetching reminder:', err)
        setError('Unable to load reminder')
      } finally {
        setIsLoading(false)
      }
    }

    // Wrap in try-catch to prevent any uncaught errors
    try {
      fetchReminderData()
    } catch (err) {
      console.error('Unexpected error in ReminderDisplay:', err)
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }, [entity?.id, accessToken])

  const getOperationBadge = () => {
    const operation = entity.operation || 'create'
    const variants: Record<string, 'success' | 'info' | 'destructive'> = {
      create: 'success',
      update: 'info',
      delete: 'destructive'
    }

    const labels: Record<string, string> = {
      create: '✓ Reminder Set',
      update: '↻ Reminder Updated',
      delete: '✗ Reminder Cancelled'
    }

    return (
      <Badge variant={variants[operation] || 'default'} data-testid={`reminder-badge-${operation}`}>
        {labels[operation] || 'Reminder'}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card
        className="gba:border-l-4 gba:border-l-primary gba:shadow-lg gba:bg-gradient-to-br gba:from-card gba:to-muted/20"
        data-testid="reminder-display-loading"
      >
        <CardContent className="gba:py-8">
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <div className="gba:animate-spin gba:h-5 gba:w-5 gba:border-2 gba:border-primary gba:border-t-transparent gba:rounded-full" />
            <span className="gba:text-muted-foreground">Loading reminder...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !reminder) {
    return (
      <Card className="gba:border-l-4 gba:border-l-destructive gba:shadow-lg" data-testid="reminder-display-error">
        <CardContent className="gba:py-6">
          <div className="gba:text-center">
            <svg
              className="gba:h-12 gba:w-12 gba:text-destructive gba:mx-auto gba:mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="gba:text-destructive gba:font-semibold">Failed to load reminder</div>
            <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">{error}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Try tags first (primary location), then fall back to input
  const title = reminder.tags?.reminderTitle || reminder.input?.reminderTitle || 'Reminder'
  const message = reminder.tags?.reminderMessage || reminder.input?.reminderMessage
  const reminderTime = reminder.tags?.reminderDateTime || reminder.input?.reminderDateTime
  const formattedTime = reminder.tags?.reminderDateTimeFormatted || reminder.input?.reminderDateTimeFormatted
  const timeFromNow = reminderTime ? dayjs(reminderTime).fromNow() : ''

  return (
    <Card
      className="gba:border-l-4 gba:border-l-primary gba:shadow-lg gba:bg-gradient-to-br gba:from-card gba:to-muted/20 gba:transition-all hover:gba:shadow-xl"
      data-testid={`reminder-display-${entity.id}`}
    >
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
          <CardTitle className="gba:text-lg gba:flex gba:items-center gba:gap-2">
            <svg
              className="gba:h-5 gba:w-5 gba:text-primary gba:flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-label="reminder icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="gba:flex-1">{title}</span>
          </CardTitle>
          {getOperationBadge()}
        </div>
      </CardHeader>

      <CardContent className="gba:space-y-3">
        {/* Time Display */}
        {formattedTime && (
          <div className="gba:flex gba:items-start gba:gap-3">
            <svg
              className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5 gba:flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="gba:flex-1">
              <div className="gba:font-semibold gba:text-foreground gba:text-sm">{formattedTime}</div>
              {timeFromNow && (
                <div className="gba:text-xs gba:text-primary gba:font-medium gba:mt-0.5">{timeFromNow}</div>
              )}
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="gba:p-3 gba:bg-muted/50 gba:rounded-md gba:text-sm gba:text-foreground gba:border gba:border-border">
            {message}
          </div>
        )}

        {/* Workflow Status */}
        <div className="gba:pt-2 gba:border-t gba:border-border gba:flex gba:items-center gba:justify-between">
          <div className="gba:text-xs gba:text-muted-foreground">
            Workflow: {(reminder.workflowId || (reminder as any).id || 'unknown').slice(0, 8)}...
          </div>
          <Badge variant="outline" className="gba:text-xs">
            {reminder.status === 'RUNNING' ? 'Pending' : reminder.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
