import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerActivities } from '@/common/data/customer/hooks/useCustomerActivities'
import { useCustomerNotes, type CustomerNote } from '@/common/data/customer/hooks/useCustomerNotes'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import type { CustomerActivity } from '@/common/data/customer/types/customerActivityTypes'
import type { CustomerTask } from '@/common/data/customer/types/customerTaskTypes'
import { APPROVAL_TASK_TYPE_REF } from '@/common/data/customer/constants/customerConstants'
import type { AccountJournalEntry, AccountJournalEntryType } from './types'

interface UseAccountJournalResult {
  entries: AccountJournalEntry[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

interface AccountJournalSources {
  activities: CustomerActivity[]
  notes: CustomerNote[]
  tasks: CustomerTask[]
}

function employeeName(employee?: { displayName?: string; firstName?: string; lastName?: string }): string | undefined {
  if (!employee) return undefined
  const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(' ').trim()
  return employee.displayName || fullName || undefined
}

function firstTaskAssigneeName(task: CustomerTask): string | undefined {
  const firstAssignee = task.taskAssignees?.[0]?.assignedEmployee
  return employeeName(firstAssignee)
}

function catalogValue(catalog?: { code?: string; value?: string; id?: string } | null): string {
  return [catalog?.code, catalog?.value, catalog?.id].filter(Boolean).join(' ').toUpperCase()
}

export function isApprovalTask(task: CustomerTask): boolean {
  const typeRef = task.taskTypeRef || task.typeRef
  if (typeRef === APPROVAL_TASK_TYPE_REF) return true
  return catalogValue(task.taskType || task.type).includes('APPROVAL')
}

function toActivityEntry(activity: CustomerActivity): AccountJournalEntry {
  return {
    id: `activity:${activity.id}`,
    type: 'activity',
    title: activity.title || activity.activityType?.value || 'Untitled activity',
    description: activity.description,
    createdAt: activity.createdAt,
    actorName: employeeName(activity.ownerEmployee),
    source: activity
  }
}

function toNoteEntry(note: CustomerNote): AccountJournalEntry {
  return {
    id: `note:${note.id}`,
    type: 'note',
    title: note.noteTitle || 'Untitled note',
    description: note.noteText,
    createdAt: note.createdAt,
    actorName: employeeName(note.authorEmployee),
    source: note
  }
}

function toTaskEntry(task: CustomerTask): AccountJournalEntry {
  const type: AccountJournalEntryType = isApprovalTask(task) ? 'approval' : 'task'
  return {
    id: `${type}:${task.id}`,
    type,
    title: task.name || 'Untitled task',
    description: task.description,
    createdAt: task.createdAt,
    actorName: employeeName(task.creatorEmployee) || firstTaskAssigneeName(task),
    source: task
  }
}

function createdAtTime(entry: AccountJournalEntry): number {
  if (!entry.createdAt) return 0
  const time = new Date(entry.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

export function buildAccountJournalEntries(sources: AccountJournalSources): AccountJournalEntry[] {
  return [
    ...sources.activities.map(toActivityEntry),
    ...sources.notes.map(toNoteEntry),
    ...sources.tasks.map(toTaskEntry)
  ].sort((a, b) => createdAtTime(b) - createdAtTime(a))
}

export function useAccountJournal(context: BusinessAppContextProps, accountId: string): UseAccountJournalResult {
  const { fetchCustomerActivitiesByAccountId } = useCustomerActivities(context)
  const { fetchCustomerNotesByAccountId } = useCustomerNotes(context)
  const { fetchCustomerTasksByAccountId } = useCustomerTasks(context)

  const [sources, setSources] = useState<AccountJournalSources>({ activities: [], notes: [], tasks: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadJournal = useCallback(async () => {
    if (!accountId || !context.accessToken) {
      setSources({ activities: [], notes: [], tasks: [] })
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [activities, notes, tasks] = await Promise.all([
        fetchCustomerActivitiesByAccountId(accountId),
        fetchCustomerNotesByAccountId(accountId),
        fetchCustomerTasksByAccountId(accountId)
      ])

      setSources({
        activities: activities || [],
        notes: notes || [],
        tasks: tasks || []
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journal')
      setSources({ activities: [], notes: [], tasks: [] })
    } finally {
      setLoading(false)
    }
  }, [
    accountId,
    context.accessToken,
    fetchCustomerActivitiesByAccountId,
    fetchCustomerNotesByAccountId,
    fetchCustomerTasksByAccountId
  ])

  useEffect(() => {
    loadJournal().catch(() => undefined)
  }, [loadJournal])

  const entries = useMemo(() => buildAccountJournalEntries(sources), [sources])

  return { entries, loading, error, reload: loadJournal }
}
