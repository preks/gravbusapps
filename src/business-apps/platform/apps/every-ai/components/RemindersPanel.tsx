import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Button, Badge, Card } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Bell } from '@phosphor-icons/react'
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
  onReminderDue?: () => void // Callback when a reminder becomes due
}

export const RemindersPanel: React.FC<RemindersPanelProps> = ({ accessToken, userInfo, onClose, onReminderDue }) => {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const notifiedReminders = useRef<Set<string>>(new Set())

  // Use Keycloak ID (userInfo.id) to match reminder creation in FlowBot
  const userId = useMemo(() => userInfo?.id || '', [userInfo?.id])

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

      // Query flow-engine for workflows initiated by user with reminder tag filter
      const searchParams = new URLSearchParams({
        limit: '100',
        offset: '0',
        'tag.app': 'reminder',
        'tag.userId': userId
      })

      const response = await fetch(`${baseUrl}/flow-engine/api/flows/user/${userId}/initiated?${searchParams}`, {
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
      console.log('[RemindersPanel] API response:', data)

      // Handle different response structures
      let workflows: any[] = []
      if (Array.isArray(data)) {
        workflows = data
      } else if (Array.isArray(data.data?.flows)) {
        workflows = data.data.flows
      } else if (Array.isArray(data.flows)) {
        workflows = data.flows
      } else if (data.data && Array.isArray(data.data)) {
        workflows = data.data
      } else {
        console.warn('[RemindersPanel] Unexpected response structure:', data)
        workflows = []
      }

      console.log('[RemindersPanel] Parsed workflows:', workflows.length)

      // Transform workflows to reminders
      const reminderList: Reminder[] = workflows
        .filter((wf: any) => wf.status !== 'COMPLETED') // Exclude completed reminders
        .map((wf: any) => {
          const tags = wf.tags || {}

          return {
            workflowId: wf.flowId,
            title: tags.reminderTitle || wf.flowName || 'Reminder',
            message: tags.reminderMessage || '',
            reminderDateTime: tags.reminderDateTime || '',
            reminderDateTimeFormatted: tags.reminderDateTimeFormatted || '',
            status: wf.status,
            createdAt: wf.startTime
          }
        })
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

          // Open the reminders panel to show the due reminder
          if (onReminderDue) {
            onReminderDue()
          }

          // Request notification permission if needed
          if (Notification.permission === 'granted') {
            new Notification(`Reminder: ${reminder.title}`, {
              body: reminder.message || `Time to: ${reminder.title}`,
              tag: reminder.workflowId // Prevents duplicate notifications
            })
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification(`Reminder: ${reminder.title}`, {
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
  }, [accessToken, loadReminders])

  const handleMarkAsDone = async (workflowId: string) => {
    try {
      const baseUrl = window.location.origin

      // Step 1: Get the task ID from workflow's step_0
      const stepDataResponse = await fetch(`${baseUrl}/flow-engine/api/flows/${workflowId}/steps/step_0/data?limit=1`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!stepDataResponse.ok) {
        throw new Error('Failed to get reminder task')
      }

      const stepData = await stepDataResponse.json()

      if (!stepData.data || stepData.data.length === 0) {
        throw new Error('No task found for reminder')
      }

      const taskId = stepData.data[0].taskId

      if (!taskId) {
        throw new Error('Task ID not found in reminder workflow')
      }

      // Step 2: Complete the task
      const completeResponse = await fetch(`${baseUrl}/flow-engine/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          formData: {},
          comment: 'Reminder completed from EveryAI'
        })
      })

      if (!completeResponse.ok) {
        const errorText = await completeResponse.text()
        throw new Error(`Failed to complete reminder task: ${errorText}`)
      }

      // Remove from list
      setReminders(prev => prev.filter(r => r.workflowId !== workflowId))
      notifiedReminders.current.delete(workflowId)

      console.log(`[RemindersPanel] Successfully completed reminder ${workflowId}`)
    } catch (err) {
      console.error('Failed to mark reminder as done:', err)
      alert(`Failed to mark reminder as done: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const isDue = (reminderTime: string) => {
    return dayjs(reminderTime).isBefore(dayjs())
  }

  return (
    <div className="gba:h-full gba:w-full gba:flex gba:flex-col gba:p-6" data-testid="reminders-panel">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:pb-4 gba:border-b gba:border-border gba:mb-4">
        <h2 className="gba:text-2xl gba:font-bold gba:flex gba:items-center gba:gap-3 gba:pl-2">
          <Bell
            className="gba:h-6 gba:w-6 gba:text-primary gba:flex-shrink-0"
            weight="regular"
            aria-label="bell icon"
          />
          My Reminders
          {reminders.length > 0 && (
            <Badge variant="default" className="gba:ml-2">
              {reminders.length}
            </Badge>
          )}
        </h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="reminders-panel-close">
            <svg className="gba:h-5 gba:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        )}
      </div>

      {/* Content Area - Scrollable grid of reminders */}
      <div className="gba:flex-1 gba:overflow-y-auto">
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
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4 gba:auto-rows-min">
            {reminders.map(reminder => {
              const due = isDue(reminder.reminderDateTime)
              const timeDisplay = dayjs(reminder.reminderDateTime).fromNow()

              return (
                <Card
                  key={reminder.workflowId}
                  className={`gba:border gba:p-3 gba:transition-all hover:gba:shadow-lg gba:h-full gba:flex gba:flex-col ${
                    due ? 'gba:border-destructive gba:bg-destructive/5' : 'gba:border-border'
                  }`}
                  data-testid={`reminder-item-${reminder.workflowId}`}
                >
                  <div className="gba:flex gba:flex-col gba:h-full">
                    {/* Title & Badge */}
                    <div className="gba:font-semibold gba:text-base gba:flex gba:items-center gba:justify-between gba:gap-2 gba:mb-2">
                      <span className="gba:flex-1">{reminder.title}</span>
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
                      className={`gba:text-xs gba:font-medium gba:mb-3 ${due ? 'gba:text-destructive' : 'gba:text-primary'}`}
                    >
                      {timeDisplay}
                    </div>

                    {/* Message */}
                    {reminder.message && (
                      <div className="gba:text-sm gba:text-muted-foreground gba:bg-muted/30 gba:p-2 gba:rounded gba:mb-3 gba:flex-1">
                        {reminder.message}
                      </div>
                    )}

                    {/* Action button - at the bottom */}
                    <div className="gba:flex gba:mt-auto">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleMarkAsDone(reminder.workflowId)}
                        className="gba:w-full"
                        data-testid={`mark-done-reminder-${reminder.workflowId}`}
                        title="Mark as done"
                      >
                        ✓ Done
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
