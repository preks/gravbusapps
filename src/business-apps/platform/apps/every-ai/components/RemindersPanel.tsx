import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  const notifiedReminders = useRef<Set<string>>(new Set())

  // Extract userId once to prevent dependency issues
  const userId = userInfo?.employeeDetails?.employeeId || ''

  const loadReminders = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const baseUrl = window.location.origin

      // Skip if no user ID
      if (!userId) {
        setReminders([])
        setIsLoading(false)
        return
      }

      // Query Conductor for workflows with reminder tag
      const searchParams = new URLSearchParams({
        freeText: '*',
        query: `tags.app = 'reminder' AND tags.userId = '${userId}' AND status IN (RUNNING, SCHEDULED)`
      })

      const response = await fetch(`${baseUrl}/flow-engine/api/flows/search?${searchParams}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.warn(`Failed to fetch reminders: ${response.statusText}`)
        setReminders([])
        setIsLoading(false)
        return
      }

      const data = await response.json()
      const workflows = Array.isArray(data.results) ? data.results : []

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
        .filter(r => r.reminderDateTime) // Filter out reminders without time
        .sort((a: Reminder, b: Reminder) => {
          // Sort by reminder time (earliest first)
          return new Date(a.reminderDateTime).getTime() - new Date(b.reminderDateTime).getTime()
        })

      setReminders(reminderList)

      // Check for due reminders and send browser notifications (wrapped in try-catch)
      try {
        checkAndNotifyReminders(reminderList)
      } catch (notifyErr) {
        console.error('Failed to check/notify reminders:', notifyErr)
      }
    } catch (err) {
      console.error('Failed to load reminders:', err)
      setError(err instanceof Error ? err.message : 'Failed to load reminders')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, userId])

  const checkAndNotifyReminders = useCallback((reminderList: Reminder[]) => {
    // Check if Notification API is available
    if (typeof Notification === 'undefined') {
      return
    }

    reminderList.forEach(reminder => {
      try {
        // Skip if no valid reminder time
        if (!reminder.reminderDateTime) return

        const isDue = dayjs(reminder.reminderDateTime).isBefore(dayjs())

        // If reminder is due and we haven't notified yet
        if (isDue && !notifiedReminders.current.has(reminder.workflowId)) {
          notifiedReminders.current.add(reminder.workflowId)

          // Request notification permission if needed
          if (Notification.permission === 'granted') {
            new Notification(`⏰ Reminder: ${reminder.title}`, {
              body: reminder.message || `Time to: ${reminder.title}`,
              icon: '/icon.png', // Optional: add your app icon
              tag: reminder.workflowId // Prevents duplicate notifications
            })
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification(`⏰ Reminder: ${reminder.title}`, {
                  body: reminder.message || `Time to: ${reminder.title}`,
                  tag: reminder.workflowId
                })
              }
            })
          }
        }
      } catch (err) {
        console.error(`Failed to notify for reminder ${reminder.workflowId}:`, err)
      }
    })
  }, [])

  useEffect(() => {
    // Only load if we have accessToken and userId
    if (!accessToken || !userId) return

    loadReminders()

    // Poll every 60 seconds for updates
    const interval = setInterval(() => {
      loadReminders()
    }, 60000)

    return () => {
      clearInterval(interval)
    }
  }, [accessToken, userId, loadReminders])

  const handleDismiss = async (workflowId: string) => {
    if (!confirm('Cancel this reminder?')) return

    try {
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/flow-engine/api/flows/${workflowId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to cancel reminder')
      }

      // Remove from list and from notified set
      setReminders(prev => prev.filter(r => r.workflowId !== workflowId))
      notifiedReminders.current.delete(workflowId)
    } catch (err) {
      console.error('Failed to cancel reminder:', err)
      alert('Failed to cancel reminder. Please try again.')
    }
  }

  const handlePostpone = async (workflowId: string, minutesToAdd: number) => {
    const reminder = reminders.find(r => r.workflowId === workflowId)
    if (!reminder) return

    try {
      const newReminderTime = dayjs(reminder.reminderDateTime).add(minutesToAdd, 'minute')
      const baseUrl = window.location.origin

      // Update workflow input with new reminder time
      const response = await fetch(`${baseUrl}/flow-engine/api/flows/${workflowId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: {
            ...reminder,
            reminderDateTime: newReminderTime.toISOString(),
            reminderDateTimeFormatted: newReminderTime.format('dddd, MMMM D, YYYY [at] h:mm A'),
            postponedAt: new Date().toISOString(),
            postponedBy: minutesToAdd
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to postpone reminder')
      }

      // Remove from notified set so it can notify again
      notifiedReminders.current.delete(workflowId)

      // Reload reminders to show updated time
      await loadReminders()
    } catch (err) {
      console.error('Failed to postpone reminder:', err)
      alert('Failed to postpone reminder. Please try again.')
    }
  }

  const handleMarkAsDone = async (workflowId: string) => {
    try {
      const baseUrl = window.location.origin

      // Complete the workflow
      const response = await fetch(`${baseUrl}/flow-engine/api/flows/${workflowId}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to mark reminder as done')
      }

      // Remove from list
      setReminders(prev => prev.filter(r => r.workflowId !== workflowId))
      notifiedReminders.current.delete(workflowId)
    } catch (err) {
      console.error('Failed to mark reminder as done:', err)
      // If complete endpoint doesn't exist, just dismiss it
      handleDismiss(workflowId)
    }
  }

  const isDue = (reminderTime: string) => {
    return dayjs(reminderTime).isBefore(dayjs())
  }

  return (
    <Card className="gba:w-96 gba:max-h-[600px] gba:overflow-y-auto gba:shadow-2xl" data-testid="reminders-panel">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-4 gba:border-b gba:border-border">
        <CardTitle className="gba:text-xl gba:flex gba:items-center gba:gap-2">
          <svg
            className="gba:h-5 gba:w-5 gba:text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-label="bell icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
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
            <svg
              className="gba:h-12 gba:w-12 gba:text-destructive gba:mx-auto gba:mb-3"
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
            <div className="gba:text-destructive gba:font-semibold gba:mb-2">Failed to load reminders</div>
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-4">{error}</div>
            <Button size="sm" onClick={loadReminders} data-testid="reminders-retry">
              Try Again
            </Button>
          </div>
        ) : reminders.length === 0 ? (
          <div className="gba:text-center gba:py-8">
            <svg
              className="gba:h-16 gba:w-16 gba:text-muted-foreground gba:mx-auto gba:mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
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

                    {/* Action buttons */}
                    <div className="gba:flex gba:flex-col gba:gap-1 gba:flex-shrink-0">
                      {due && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsDone(reminder.workflowId)}
                          className="gba:h-6 gba:px-2 gba:text-xs hover:gba:bg-success/10 hover:gba:text-success"
                          data-testid={`mark-done-reminder-${reminder.workflowId}`}
                          title="Mark as done"
                        >
                          ✓
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const minutes = window.prompt('Postpone by how many minutes?', '10')
                          if (minutes) handlePostpone(reminder.workflowId, parseInt(minutes))
                        }}
                        className="gba:h-6 gba:px-2 gba:text-xs hover:gba:bg-info/10 hover:gba:text-info"
                        data-testid={`postpone-reminder-${reminder.workflowId}`}
                        title="Postpone"
                      >
                        ⏰
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismiss(reminder.workflowId)}
                        className="gba:h-6 gba:px-2 gba:text-xs hover:gba:bg-destructive/10 hover:gba:text-destructive"
                        data-testid={`dismiss-reminder-${reminder.workflowId}`}
                        title="Cancel"
                      >
                        ✕
                      </Button>
                    </div>
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
