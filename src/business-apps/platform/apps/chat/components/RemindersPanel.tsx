import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Button, Badge, Card, Tooltip, TooltipContent, TooltipTrigger } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

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
  onOverdueCountChange?: (count: number) => void // Callback with count of overdue reminders
  t?: (key: string) => string // Translation function
}

/** Resolve the flow-engine base URL (env override → localhost fallback → origin). */
function resolveFlowEngineBaseUrl(): string {
  const envUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL')
  if (envUrl) return envUrl

  let baseUrl = window.location.origin
  if (baseUrl.includes('localhost')) {
    baseUrl = 'https://newwork-dev.newwork.com'
  }
  return `${baseUrl}/flow-engine`
}

export const RemindersPanel: React.FC<RemindersPanelProps> = ({
  accessToken,
  userInfo,
  onClose,
  onReminderDue,
  onOverdueCountChange,
  t
}) => {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const notifiedReminders = useRef<Set<string>>(new Set())
  const reminderTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // --- Create form state ---
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createMessage, setCreateMessage] = useState('')
  const [createDateTime, setCreateDateTime] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const createDateTimeRef = useRef(createDateTime)
  createDateTimeRef.current = createDateTime
  const createFormWasOpenRef = useRef(false)

  // Use Keycloak ID (userInfo.id) to match reminder creation in FlowBot
  const userId = useMemo(() => userInfo?.id || '', [userInfo?.id])
  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }),
    [accessToken]
  )

  // Use refs for callbacks to avoid re-creating dependent functions
  const onReminderDueRef = useRef(onReminderDue)
  const onOverdueCountChangeRef = useRef(onOverdueCountChange)

  // Keep refs up to date
  useEffect(() => {
    onReminderDueRef.current = onReminderDue
    onOverdueCountChangeRef.current = onOverdueCountChange
  }, [onReminderDue, onOverdueCountChange])

  const notifyReminder = useCallback((reminder: Reminder) => {
    // Skip if already notified
    if (notifiedReminders.current.has(reminder.workflowId)) return

    notifiedReminders.current.add(reminder.workflowId)

    // Open the reminders panel to show the due reminder
    if (onReminderDueRef.current) {
      onReminderDueRef.current()
    }

    // Send browser notification
    if (typeof Notification !== 'undefined') {
      try {
        if (Notification.permission === 'granted') {
          new Notification(`Reminder: ${reminder.title}`, {
            body: reminder.message || `Time to: ${reminder.title}`,
            tag: reminder.workflowId
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
      } catch {
        // Failed to notify for reminder
      }
    }
  }, [])

  const loadReminders = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const baseUrl = resolveFlowEngineBaseUrl()

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

      const response = await fetch(`${baseUrl}/api/flows/user/${userId}/initiated?${searchParams}`, {
        headers: authHeaders
      })

      if (!response.ok) {
        setReminders([])
        setIsLoading(false)
        return
      }

      const data = await response.json()

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
        workflows = []
      }

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

      // Set up event-based timers for each reminder
      // Clear existing timers
      reminderTimers.current.forEach(timer => clearTimeout(timer))
      reminderTimers.current.clear()

      const now = dayjs()

      reminderList.forEach(reminder => {
        if (!reminder.reminderDateTime) return

        const reminderTime = dayjs(reminder.reminderDateTime)
        const isDue = reminderTime.isBefore(now)

        if (isDue) {
          // Already overdue - notify immediately if not already notified
          if (!notifiedReminders.current.has(reminder.workflowId)) {
            notifyReminder(reminder)
          }
        } else {
          // Schedule notification for future
          const msUntilDue = reminderTime.diff(now)

          // Only set timer if it's within a reasonable timeframe (e.g., 24 hours)
          // For reminders further out, they'll be picked up on next load
          const MAX_TIMER_MS = 24 * 60 * 60 * 1000 // 24 hours
          if (msUntilDue <= MAX_TIMER_MS) {
            const timer = setTimeout(() => {
              notifyReminder(reminder)
            }, msUntilDue)

            reminderTimers.current.set(reminder.workflowId, timer)
          }
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminders')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, userId, notifyReminder, authHeaders])

  useEffect(() => {
    // Only load if we have accessToken and userId
    if (!accessToken || !userId) return

    loadReminders()

    // Poll every 5 minutes to catch new reminders created elsewhere
    // This is much less frequent since we use timers for due notifications
    const interval = setInterval(
      () => {
        loadReminders()
      },
      5 * 60 * 1000
    ) // 5 minutes

    return () => {
      clearInterval(interval)
      // Clean up all reminder timers on unmount
      reminderTimers.current.forEach(timer => clearTimeout(timer))
      reminderTimers.current.clear()
    }
  }, [accessToken, loadReminders])

  // Calculate and update overdue count whenever reminders change
  // This ensures the count is always accurate and includes newly due reminders
  useEffect(() => {
    if (!onOverdueCountChangeRef.current) return

    const overdueCount = reminders.filter(r => dayjs(r.reminderDateTime).isBefore(dayjs())).length
    onOverdueCountChangeRef.current(overdueCount)
  }, [reminders])

  // Default datetime and focus title when the create form opens (not on every datetime edit)
  useEffect(() => {
    if (showCreateForm && !createFormWasOpenRef.current) {
      createFormWasOpenRef.current = true
      if (!createDateTimeRef.current) {
        const now = dayjs()
        const rounded = now
          .add(1, 'hour')
          .minute(Math.ceil(now.minute() / 15) * 15)
          .second(0)
        setCreateDateTime(rounded.format('YYYY-MM-DDTHH:mm'))
      }
      const focusId = window.setTimeout(() => titleInputRef.current?.focus(), 50)
      return () => window.clearTimeout(focusId)
    }
    if (!showCreateForm) {
      createFormWasOpenRef.current = false
    }
  }, [showCreateForm])

  // --------- Create reminder via flow-engine execute-dynamic ---------
  const handleCreateReminder = async () => {
    setCreateError(null)

    const trimmedTitle = createTitle.trim()
    if (!trimmedTitle) {
      setCreateError(t ? t('reminders-titleRequired') : 'Please enter a title')
      return
    }
    if (!createDateTime) {
      setCreateError(t ? t('reminders-dateTimeRequired') : 'Please select a date and time')
      return
    }

    setIsCreating(true)

    try {
      const baseUrl = resolveFlowEngineBaseUrl()

      const reminderDate = dayjs(createDateTime)
      const reminderDateTimeISO = reminderDate.toISOString()
      const reminderDateTimeFormatted = reminderDate.format('LLLL') // e.g. "Monday, January 8, 2026 9:19 PM"

      // Calculate minutes from now until the reminder is due
      const minutesFromNow = Math.max(1, Math.round(reminderDate.diff(dayjs(), 'minute', true)))

      const tags: Record<string, string> = {
        app: 'reminder',
        userId,
        reminderTitle: trimmedTitle,
        reminderMessage: createMessage.trim(),
        reminderDateTime: reminderDateTimeISO,
        reminderDateTimeFormatted,
        createdAt: new Date().toISOString()
      }

      const requestPayload = {
        templateDefinition: {
          type: 'TEMPLATE' as const,
          name: `Reminder: ${trimmedTitle}`,
          description: `Reminder set for ${reminderDateTimeFormatted}`,
          version: 1,
          steps: [
            {
              type: 'TASK',
              title: trimmedTitle,
              message: createMessage.trim() || `Reminder: ${trimmedTitle}`,
              form: [],
              links: [],
              assignment: {
                assignmentMode: 'ASSIGN',
                targets: null,
                allowReassignment: false
              },
              dueInMinutes: minutesFromNow
            }
          ],
          tags
        },
        initiatorId: userId,
        stepAssignments: {
          step_0: {
            assignment: {
              assignmentMode: 'ASSIGN',
              targets: {
                users: [userId],
                capabilities: [],
                organizationalUnits: [],
                companies: [],
                siteLocations: [],
                costCenters: [],
                matrixTeams: []
              },
              allowReassignment: false
            }
          }
        }
      }

      const response = await fetch(`${baseUrl}/api/templates/execute-dynamic`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(requestPayload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || response.statusText)
      }

      // Reset form
      setCreateTitle('')
      setCreateMessage('')
      setCreateDateTime('')
      setShowCreateForm(false)

      // Refresh the list so the new reminder shows immediately
      await loadReminders()
    } catch (err) {
      setCreateError(
        (t ? t('reminders-createFailed') : 'Failed to create reminder') +
          ': ' +
          (err instanceof Error ? err.message : 'Unknown error')
      )
    } finally {
      setIsCreating(false)
    }
  }

  const handleMarkAsDone = async (workflowId: string) => {
    try {
      const baseUrl = resolveFlowEngineBaseUrl()

      // Strategy 1: Try to get task ID from the step_0 data endpoint
      let taskId: string | null = null

      try {
        const stepDataResponse = await fetch(`${baseUrl}/api/flows/${workflowId}/steps/step_0/data?limit=1`, {
          headers: authHeaders
        })

        if (stepDataResponse.ok) {
          const stepData = await stepDataResponse.json()
          if (stepData.data && stepData.data.length > 0) {
            taskId = stepData.data[0].taskId ?? null
          }
        }
      } catch {
        // Step data endpoint failed, try fallback
      }

      // Strategy 2: Fallback — look up user's assigned tasks and match by flowId
      if (!taskId) {
        try {
          const searchParams = new URLSearchParams({
            includeAssigned: 'true',
            includeClaimable: 'true',
            limit: '50',
            offset: '0',
            search: workflowId
          })

          const tasksResponse = await fetch(`${baseUrl}/api/tasks/user/${encodeURIComponent(userId)}?${searchParams}`, {
            headers: authHeaders
          })

          if (tasksResponse.ok) {
            const tasksData = await tasksResponse.json()
            const tasks = tasksData?.tasks ?? tasksData?.data?.tasks ?? (Array.isArray(tasksData) ? tasksData : [])
            const matchingTask = tasks.find(
              (t: any) =>
                String(t.flowId || '').trim() === workflowId || String(t.workflowId || '').trim() === workflowId
            )
            if (matchingTask) {
              taskId = matchingTask.id ?? matchingTask.taskId ?? null
            }
          }
        } catch {
          // Fallback task lookup failed
        }
      }

      // Strategy 3: Last resort — try to complete the flow directly via progress/complete
      if (!taskId) {
        try {
          const completeFlowResponse = await fetch(`${baseUrl}/api/flows/${workflowId}/progress/complete`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ userId })
          })

          if (completeFlowResponse.ok) {
            // Flow completed directly — skip task completion
            const timer = reminderTimers.current.get(workflowId)
            if (timer) {
              clearTimeout(timer)
              reminderTimers.current.delete(workflowId)
            }
            setReminders(prev => prev.filter(r => r.workflowId !== workflowId))
            notifiedReminders.current.delete(workflowId)
            return
          }
        } catch {
          // Direct flow completion failed
        }

        throw new Error('Could not find the task for this reminder. It may have already been completed.')
      }

      const completeResponse = await fetch(`${baseUrl}/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          userId: userId,
          action: 'COMPLETE',
          formData: {},
          comment: 'Reminder completed from EveryAI'
        })
      })

      if (!completeResponse.ok) {
        const errorText = await completeResponse.text()
        throw new Error(`Failed to complete reminder task: ${errorText}`)
      }

      // Clear timer for this reminder if it exists
      const timer = reminderTimers.current.get(workflowId)
      if (timer) {
        clearTimeout(timer)
        reminderTimers.current.delete(workflowId)
      }

      // Remove from list (overdue count will be recalculated automatically by useEffect)
      setReminders(prev => prev.filter(r => r.workflowId !== workflowId))
      notifiedReminders.current.delete(workflowId)
    } catch (err) {
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
        <h2 className="gba:text-lg gba:font-semibold gba:flex gba:items-center gba:gap-3 gba:pl-2">
          {t ? t('reminders-myReminders') : 'My Reminders'}
          {reminders.length > 0 && (
            <Badge variant="default" className="gba:ml-2">
              {reminders.length}
            </Badge>
          )}
        </h2>
        <div className="gba:flex gba:items-center gba:gap-1">
          {/* + Create Reminder button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowCreateForm(prev => !prev)
              setCreateError(null)
            }}
            data-testid="reminders-create-button"
            title={t ? t('reminders-newReminder') : 'New Reminder'}
            className={showCreateForm ? 'gba:bg-accent' : ''}
          >
            <svg
              className={`gba:h-5 gba:w-5 gba:transition-transform gba:duration-200 ${showCreateForm ? 'gba:rotate-45' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="reminders-panel-close">
              <svg className="gba:h-5 gba:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          )}
        </div>
      </div>

      {/* Inline create form */}
      {showCreateForm && (
        <div
          className="gba:mb-4 gba:rounded-xl gba:border gba:border-border gba:bg-card gba:p-4 gba:space-y-3 gba:animate-in gba:fade-in gba:slide-in-from-top-2 gba:duration-200"
          data-testid="reminders-create-form"
        >
          <div className="gba:text-sm gba:font-semibold gba:mb-1">
            {t ? t('reminders-newReminder') : 'New Reminder'}
          </div>

          {/* Title */}
          <div>
            <label className="gba:text-xs gba:text-muted-foreground gba:mb-1 gba:block">
              {t ? t('reminders-title') : 'Title'}
            </label>
            <input
              ref={titleInputRef}
              type="text"
              className="gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:placeholder:text-muted-foreground/60 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring"
              placeholder={t ? t('reminders-titlePlaceholder') : 'What should you be reminded of?'}
              value={createTitle}
              onChange={e => setCreateTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleCreateReminder()
                }
              }}
              disabled={isCreating}
              data-testid="reminders-create-title"
            />
          </div>

          {/* Message (optional) */}
          <div>
            <label className="gba:text-xs gba:text-muted-foreground gba:mb-1 gba:block">
              {t ? t('reminders-message') : 'Message (optional)'}
            </label>
            <textarea
              className="gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:placeholder:text-muted-foreground/60 gba:resize-none focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring"
              placeholder={t ? t('reminders-messagePlaceholder') : 'Additional details...'}
              rows={2}
              value={createMessage}
              onChange={e => setCreateMessage(e.target.value)}
              disabled={isCreating}
              data-testid="reminders-create-message"
            />
          </div>

          {/* Date & Time */}
          <div>
            <label className="gba:text-xs gba:text-muted-foreground gba:mb-1 gba:block">
              {t ? t('reminders-dateTime') : 'Date & Time'}
            </label>
            <input
              type="datetime-local"
              className="gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring"
              value={createDateTime}
              onChange={e => setCreateDateTime(e.target.value)}
              min={dayjs().format('YYYY-MM-DDTHH:mm')}
              disabled={isCreating}
              data-testid="reminders-create-datetime"
            />
          </div>

          {/* Error */}
          {createError && (
            <div className="gba:text-xs gba:text-destructive" data-testid="reminders-create-error">
              {createError}
            </div>
          )}

          {/* Actions */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:pt-1">
            <Button
              size="sm"
              onClick={handleCreateReminder}
              disabled={isCreating}
              data-testid="reminders-create-submit"
            >
              {isCreating
                ? t
                  ? t('reminders-creating')
                  : 'Creating...'
                : t
                  ? t('reminders-create')
                  : 'Create Reminder'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowCreateForm(false)
                setCreateError(null)
              }}
              disabled={isCreating}
              data-testid="reminders-create-cancel"
            >
              {t ? t('reminders-cancel') : 'Cancel'}
            </Button>
          </div>
        </div>
      )}

      {/* Content Area - Scrollable grid of reminders */}
      <div className="gba:flex-1 gba:overflow-y-auto">
        {isLoading ? (
          <div className="gba:text-center gba:py-8">
            <div className="gba:animate-spin gba:h-8 gba:w-8 gba:border-2 gba:border-primary gba:border-t-transparent gba:rounded-full gba:mx-auto gba:mb-3" />
            <div className="gba:text-muted-foreground gba:text-sm">
              {t ? t('reminders-loadingReminders') : 'Loading reminders...'}
            </div>
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
            <div className="gba:text-destructive gba:font-semibold gba:mb-2">
              {t ? t('reminders-failedToLoad') : 'Failed to load reminders'}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-4">{error}</div>
            <Button size="sm" onClick={loadReminders} data-testid="reminders-retry">
              {t ? t('reminders-tryAgain') : 'Try Again'}
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
            <div className="gba:text-muted-foreground gba:font-medium gba:mb-1">
              {t ? t('reminders-noUpcoming') : 'No upcoming reminders'}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">
              {t ? t('reminders-goToEveryAI') : 'Create a reminder using the + button above'}
            </div>
          </div>
        ) : (
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 lg:gba:grid-cols-4 xl:gba:grid-cols-5 gba:gap-3 gba:auto-rows-min">
            {reminders.map(reminder => {
              const due = isDue(reminder.reminderDateTime)
              const timeDisplay = dayjs(reminder.reminderDateTime).fromNow()
              const exactLocalTime = dayjs(reminder.reminderDateTime).format('LLLL') // e.g., "Monday, January 8, 2026 9:19 PM"

              return (
                <Card
                  key={reminder.workflowId}
                  className={`gba:border gba:p-3 gba:transition-all hover:gba:shadow-md gba:h-full gba:flex gba:flex-col gba:gap-2 ${
                    due ? 'gba:border-destructive gba:bg-destructive/5' : 'gba:border-border'
                  }`}
                  data-testid={`reminder-item-${reminder.workflowId}`}
                >
                  {/* Title and Done button */}
                  <div className="gba:flex gba:items-start gba:gap-2 gba:justify-between">
                    <div className="gba:font-medium gba:text-sm gba:leading-tight gba:line-clamp-2 gba:flex-1">
                      {reminder.title}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMarkAsDone(reminder.workflowId)}
                      className="gba:h-6 gba:w-6 gba:flex-shrink-0 gba:rounded-full hover:gba:bg-primary/10"
                      data-testid={`mark-done-reminder-${reminder.workflowId}`}
                      title="Mark as done"
                    >
                      <svg
                        className="gba:h-4 gba:w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </Button>
                  </div>

                  {/* Due time */}
                  <div className="gba:flex gba:items-center gba:gap-1.5">
                    <span className="gba:text-xs gba:text-muted-foreground">Due:</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={`gba:text-xs gba:font-medium ${due ? 'gba:text-destructive' : 'gba:text-foreground'}`}
                        >
                          {timeDisplay}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{exactLocalTime}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Optional message */}
                  {reminder.message && (
                    <div className="gba:text-xs gba:text-muted-foreground gba:leading-snug gba:line-clamp-3">
                      {reminder.message}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
