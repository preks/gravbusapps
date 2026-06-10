import { useState, useEffect, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'

dayjs.extend(localizedFormat)

export interface Reminder {
  workflowId: string
  title: string
  message?: string
  reminderDateTime: string
  status: string
  createdAt: string
}

export interface UseRemindersResult {
  reminders: Reminder[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  createReminder: (input: { title: string; message?: string; dateTime: string }) => Promise<void>
  completeReminder: (workflowId: string) => Promise<void>
}

const POLL_INTERVAL_MS = 5 * 60 * 1000

function reminderKey(reminder: Pick<Reminder, 'title' | 'reminderDateTime'>): string {
  return `${reminder.title.trim()}__${reminder.reminderDateTime}`
}

function extractWorkflows(data: unknown): any[] {
  if (Array.isArray(data)) return data
  const obj = data as Record<string, any>
  if (Array.isArray(obj?.data?.flows)) return obj.data.flows
  if (Array.isArray(obj?.flows)) return obj.flows
  if (Array.isArray(obj?.data)) return obj.data
  return []
}

type AuthHeaders = Record<string, string>

/** Resolve the task id for a reminder flow from the step_0 data endpoint. */
async function taskIdFromStepData(baseUrl: string, workflowId: string, headers: AuthHeaders): Promise<string | null> {
  try {
    const response = await fetch(`${baseUrl}/flows/${workflowId}/steps/step_0/data?limit=1`, { headers })
    if (!response.ok) return null
    const json = await response.json()
    return json.data?.[0]?.taskId ?? null
  } catch {
    return null
  }
}

/** Fallback: find the assigned task whose flow id matches the reminder workflow. */
async function taskIdFromUserTasks(
  baseUrl: string,
  workflowId: string,
  userId: string,
  headers: AuthHeaders
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      includeAssigned: 'true',
      includeClaimable: 'true',
      limit: '50',
      offset: '0',
      search: workflowId
    })
    const response = await fetch(`${baseUrl}/tasks/user/${encodeURIComponent(userId)}?${params}`, { headers })
    if (!response.ok) return null
    const data = await response.json()
    const tasks: any[] = data?.tasks ?? data?.data?.tasks ?? (Array.isArray(data) ? data : [])
    const match = tasks.find(
      (task: any) =>
        String(task.flowId || '').trim() === workflowId || String(task.workflowId || '').trim() === workflowId
    )
    return match?.id ?? match?.taskId ?? null
  } catch {
    return null
  }
}

/**
 * Reminders backed by the flow engine (workflows tagged `app=reminder`).
 * Distilled list/create/complete logic from the chat RemindersPanel so the
 * Digital Workplace can manage reminders inline without the full chat shell.
 */
export function useReminders(context: Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'>): UseRemindersResult {
  const { accessToken } = context
  const userId = context.userInfo?.id || ''
  const [serverReminders, setServerReminders] = useState<Reminder[]>([])
  // Locally created reminders shown instantly while the flow engine catches up.
  const [optimisticReminders, setOptimisticReminders] = useState<Reminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }),
    [accessToken]
  )

  const refetch = useCallback(async () => {
    if (!accessToken || !userId) {
      setServerReminders([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: '100',
        offset: '0',
        'tag.app': 'reminder',
        'tag.userId': userId
      })
      const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/flows/user/${userId}/initiated?${params}`, {
        headers: authHeaders
      })
      if (!response.ok) {
        setServerReminders([])
        return
      }
      const data = await response.json()
      const list: Reminder[] = extractWorkflows(data)
        .filter((wf: any) => wf.status !== 'COMPLETED')
        .map((wf: any) => {
          const tags = wf.tags || {}
          return {
            workflowId: wf.flowId,
            title: tags.reminderTitle || wf.flowName || 'Reminder',
            message: tags.reminderMessage || '',
            reminderDateTime: tags.reminderDateTime || '',
            status: wf.status,
            createdAt: wf.startTime
          }
        })
        .filter((r: Reminder) => r.reminderDateTime)
        .sort((a: Reminder, b: Reminder) => dayjs(a.reminderDateTime).valueOf() - dayjs(b.reminderDateTime).valueOf())
      setServerReminders(list)
      // Drop optimistic entries that the flow engine now returns.
      const serverKeys = new Set(list.map(reminderKey))
      setOptimisticReminders(prev => prev.filter(r => !serverKeys.has(reminderKey(r))))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminders')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, userId, authHeaders])

  useEffect(() => {
    if (!accessToken || !userId) {
      setIsLoading(false)
      return
    }
    refetch()
    const interval = setInterval(refetch, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [accessToken, userId, refetch])

  const createReminder = useCallback(
    async ({ title, message, dateTime }: { title: string; message?: string; dateTime: string }) => {
      const reminderDate = dayjs(dateTime)
      const reminderDateTimeISO = reminderDate.toISOString()
      const reminderDateTimeFormatted = reminderDate.format('LLLL')
      const minutesFromNow = Math.max(1, Math.round(reminderDate.diff(dayjs(), 'minute', true)))
      const trimmedTitle = title.trim()
      const trimmedMessage = (message || '').trim()

      // Show the reminder instantly while the flow engine provisions the workflow.
      const optimistic: Reminder = {
        workflowId: `optimistic-${Date.now()}`,
        title: trimmedTitle,
        message: trimmedMessage,
        reminderDateTime: reminderDateTimeISO,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      }
      setOptimisticReminders(prev => [...prev, optimistic])

      const payload = {
        templateDefinition: {
          type: 'TEMPLATE' as const,
          name: `Reminder: ${trimmedTitle}`,
          description: `Reminder set for ${reminderDateTimeFormatted}`,
          version: 1,
          steps: [
            {
              type: 'TASK',
              title: trimmedTitle,
              message: trimmedMessage || `Reminder: ${trimmedTitle}`,
              form: [],
              links: [],
              assignment: { assignmentMode: 'ASSIGN', targets: null, allowReassignment: false },
              dueInMinutes: minutesFromNow
            }
          ],
          tags: {
            app: 'reminder',
            userId,
            reminderTitle: trimmedTitle,
            reminderMessage: trimmedMessage,
            reminderDateTime: reminderDateTimeISO,
            reminderDateTimeFormatted,
            createdAt: new Date().toISOString()
          }
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

      try {
        const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/templates/execute-dynamic`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload)
        })
        if (!response.ok) {
          throw new Error((await response.text()) || response.statusText)
        }
      } catch (err) {
        // Roll back the optimistic entry if creation failed.
        setOptimisticReminders(prev => prev.filter(r => r.workflowId !== optimistic.workflowId))
        throw err
      }
      // Reconcile with the server in the background; the optimistic entry keeps
      // the reminder visible until the flow engine returns it.
      refetch()
    },
    [authHeaders, userId, refetch]
  )

  const dropReminder = useCallback((workflowId: string) => {
    setServerReminders(prev => prev.filter(r => r.workflowId !== workflowId))
    setOptimisticReminders(prev => prev.filter(r => r.workflowId !== workflowId))
  }, [])

  const completeReminder = useCallback(
    async (workflowId: string) => {
      const baseUrl = CUSTOM_FLOW_ENGINE_API_URL

      // Resolve the underlying task: prefer the flow's step data, then fall back
      // to the user's assigned tasks (matches the chat reminders behaviour).
      const taskId =
        (await taskIdFromStepData(baseUrl, workflowId, authHeaders)) ??
        (await taskIdFromUserTasks(baseUrl, workflowId, userId, authHeaders))

      if (taskId) {
        const complete = await fetch(`${baseUrl}/tasks/${taskId}/complete`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            userId,
            action: 'COMPLETE',
            formData: {},
            comment: 'Completed from Digital Workplace'
          })
        })
        if (!complete.ok) {
          throw new Error((await complete.text()) || 'Failed to complete reminder')
        }
        dropReminder(workflowId)
        return
      }

      // Last resort: complete the flow directly.
      const completeFlow = await fetch(`${baseUrl}/flows/${workflowId}/progress/complete`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ userId })
      })
      if (!completeFlow.ok) {
        throw new Error('Could not find the task for this reminder. It may have already been completed.')
      }
      dropReminder(workflowId)
    },
    [authHeaders, userId, dropReminder]
  )

  // Merge server-backed reminders with not-yet-indexed optimistic ones.
  const reminders = useMemo(() => {
    const serverKeys = new Set(serverReminders.map(reminderKey))
    const pending = optimisticReminders.filter(r => !serverKeys.has(reminderKey(r)))
    return [...serverReminders, ...pending].sort(
      (a, b) => dayjs(a.reminderDateTime).valueOf() - dayjs(b.reminderDateTime).valueOf()
    )
  }, [serverReminders, optimisticReminders])

  return { reminders, isLoading, error, refetch, createReminder, completeReminder }
}
