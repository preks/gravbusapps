import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface Reminder {
  workflowId: string
  title: string
  message?: string
  reminderDateTime: string
  reminderDateTimeFormatted: string
  status: string
  createdAt: string
}

interface RemindersPanelProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  onClose?: () => void
}

export const RemindersPanel: React.FC<RemindersPanelProps> = ({ accessToken, userInfo, onClose }) => {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReminders = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const baseUrl = window.location.origin
      const userId = userInfo?.employeeDetails?.employeeId || ''

      // Query Conductor for workflows with reminder tag
      const searchParams = new URLSearchParams({
        freeText: '*',
        query: `tags.app = 'reminder' AND tags.userId = '${userId}' AND status IN (RUNNING, SCHEDULED)`
      })

      const response = await fetch(`${baseUrl}/flow-engine/api/workflow/search?${searchParams}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch reminders: ${response.statusText}`)
      }

      const data = await response.json()
      const workflows = data.results || []

      // Transform workflows to reminders
      const reminderList: Reminder[] = workflows
        .map((wf: any) => ({
          workflowId: wf.workflowId || wf.id,
          title: wf.input?.reminderTitle || 'Reminder',
          message: wf.input?.reminderMessage,
          reminderDateTime: wf.input?.reminderDateTime,
          reminderDateTimeFormatted: wf.input?.reminderDateTimeFormatted,
          status: wf.status,
          createdAt: wf.input?.createdAt || wf.createTime
        }))
        .sort((a: Reminder, b: Reminder) => {
          // Sort by reminder time (earliest first)
          return new Date(a.reminderDateTime).getTime() - new Date(b.reminderDateTime).getTime()
        })

      setReminders(reminderList)
    } catch (err) {
      console.error('Failed to load reminders:', err)
      setError(err instanceof Error ? err.message : 'Failed to load reminders')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, userInfo])

  useEffect(() => {
    loadReminders()

    // Poll every 60 seconds for updates
    const interval = setInterval(loadReminders, 60000)

    return () => clearInterval(interval)
  }, [loadReminders])

  const handleDismiss = async (workflowId: string) => {
    if (!confirm('Cancel this reminder?')) return

    try {
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/flow-engine/api/workflow/${workflowId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to cancel reminder')
      }

      // Remove from list
      setReminders(prev => prev.filter(r => r.workflowId !== workflowId))
    } catch (err) {
      console.error('Failed to cancel reminder:', err)
      alert('Failed to cancel reminder. Please try again.')
    }
  }

  const isDue = (reminderTime: string) => {
    return dayjs(reminderTime).isBefore(dayjs())
  }

  return (
    <Card className="gba:w-96 gba:max-h-[600px] gba:overflow-y-auto gba:shadow-2xl" data-testid="reminders-panel">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-4 gba:border-b gba:border-border">
        <CardTitle className="gba:text-xl gba:flex gba:items-center gba:gap-2">
          <span aria-label="bell icon">🔔</span>
          My Reminders
          {reminders.length > 0 && (
            <Badge variant="default" className="gba:ml-2">
              {reminders.length}
            </Badge>
          )}
        </CardTitle>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gba:h-6 gba:w-6 gba:p-0"
            data-testid="reminders-panel-close"
          >
            ✕
          </Button>
        )}
      </CardHeader>

      <CardContent className="gba:p-4">
        {isLoading ? (
          <div className="gba:text-center gba:py-8">
            <div className="gba:animate-spin gba:h-8 gba:w-8 gba:border-2 gba:border-primary gba:border-t-transparent gba:rounded-full gba:mx-auto gba:mb-3" />
            <div className="gba:text-muted-foreground gba:text-sm">Loading reminders...</div>
          </div>
        ) : error ? (
          <div className="gba:text-center gba:py-8">
            <div className="gba:text-4xl gba:mb-3">⚠️</div>
            <div className="gba:text-destructive gba:font-semibold gba:mb-2">Failed to load reminders</div>
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-4">{error}</div>
            <Button size="sm" onClick={loadReminders} data-testid="reminders-retry">
              Try Again
            </Button>
          </div>
        ) : reminders.length === 0 ? (
          <div className="gba:text-center gba:py-8">
            <div className="gba:text-6xl gba:mb-3">📭</div>
            <div className="gba:text-muted-foreground gba:font-medium gba:mb-1">No upcoming reminders</div>
            <div className="gba:text-xs gba:text-muted-foreground">Ask EveryAI to set a reminder for you!</div>
          </div>
        ) : (
          <div className="gba:space-y-3">
            {reminders.map(reminder => {
              const due = isDue(reminder.reminderDateTime)
              const timeDisplay = dayjs(reminder.reminderDateTime).fromNow()

              return (
                <Card
                  key={reminder.workflowId}
                  className={`gba:border gba:p-3 gba:transition-all hover:gba:shadow-md ${
                    due ? 'gba:border-destructive gba:bg-destructive/5' : 'gba:border-border'
                  }`}
                  data-testid={`reminder-item-${reminder.workflowId}`}
                >
                  <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                    <div className="gba:flex-1 gba:min-w-0">
                      {/* Title */}
                      <div className="gba:font-semibold gba:text-sm gba:flex gba:items-center gba:gap-2 gba:mb-1">
                        <span>{reminder.title}</span>
                        {due && (
                          <Badge variant="destructive" className="gba:text-xs gba:px-1.5 gba:py-0.5">
                            DUE
                          </Badge>
                        )}
                      </div>

                      {/* Time */}
                      <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">
                        {reminder.reminderDateTimeFormatted}
                      </div>
                      <div
                        className={`gba:text-xs gba:font-medium ${due ? 'gba:text-destructive' : 'gba:text-primary'}`}
                      >
                        {timeDisplay}
                      </div>

                      {/* Message */}
                      {reminder.message && (
                        <div className="gba:text-xs gba:mt-2 gba:text-muted-foreground gba:line-clamp-2">
                          {reminder.message}
                        </div>
                      )}
                    </div>

                    {/* Cancel button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(reminder.workflowId)}
                      className="gba:h-6 gba:w-6 gba:p-0 gba:flex-shrink-0 hover:gba:bg-destructive/10 hover:gba:text-destructive"
                      data-testid={`dismiss-reminder-${reminder.workflowId}`}
                      title="Cancel reminder"
                    >
                      ✕
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
