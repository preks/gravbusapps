import { useEffect, useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerActivities } from '@/common/data/customer/hooks/useCustomerActivities'
import { useCustomerNotes } from '@/common/data/customer/hooks/useCustomerNotes'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import type { Customer360Subject, CustomerJournalEntry, DomainHookResult } from '../../types'
import { byTimestampDesc } from '../../../utils/format'

const MAX_ENTRIES = 100

function activityTimestamp(activity: Record<string, any>): string | undefined {
  return activity.occurredAt || activity.completedAt || activity.createdAt
}

function mapActivities(activities: Record<string, any>[]): CustomerJournalEntry[] {
  return activities.map(activity => ({
    id: `activity-${activity.id}`,
    type: 'activity',
    title: activity.title || activity.activityType?.value || 'Activity',
    summary: activity.description,
    timestamp: activityTimestamp(activity),
    source: 'activity'
  }))
}

function mapNotes(notes: Record<string, any>[]): CustomerJournalEntry[] {
  return notes.map(note => ({
    id: `note-${note.id}`,
    type: 'note',
    title: note.noteTitle || note.title || 'Note',
    summary: note.noteText || note.text,
    timestamp: note.createdAt,
    source: 'note'
  }))
}

function mapTasks(tasks: Record<string, any>[]): CustomerJournalEntry[] {
  return tasks.map(task => ({
    id: `task-${task.id}`,
    type: 'task',
    title: task.name || 'Task',
    summary: task.description,
    timestamp: task.createdAt || task.dueDate,
    source: 'task'
  }))
}

export function useCustomerJournal(
  accessToken: string,
  subject: Customer360Subject | null
): DomainHookResult<CustomerJournalEntry[]> {
  const context = useMemo<BusinessAppContextProps>(() => ({ accessToken }), [accessToken])
  const { fetchCustomerActivitiesByAccountId } = useCustomerActivities(context)
  const { fetchCustomerTasksByAccountId } = useCustomerTasks(context)
  const { fetchCustomerNotesByAccountId } = useCustomerNotes(context)

  const [data, setData] = useState<CustomerJournalEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subjectId = subject?.id

  useEffect(() => {
    if (!subjectId || !accessToken) {
      setData([])
      return
    }

    let cancelled = false

    const loadJournal = async () => {
      setLoading(true)
      setError(null)
      try {
        const [activities, notes, tasks] = await Promise.all([
          fetchCustomerActivitiesByAccountId(subjectId),
          fetchCustomerNotesByAccountId(subjectId),
          fetchCustomerTasksByAccountId(subjectId)
        ])

        if (cancelled) return

        const entries = [...mapActivities(activities), ...mapNotes(notes), ...mapTasks(tasks)]
          .sort((a, b) => byTimestampDesc(a.timestamp, b.timestamp))
          .slice(0, MAX_ENTRIES)

        setData(entries)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load journal')
        setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadJournal()
    return () => {
      cancelled = true
    }
  }, [
    accessToken,
    subjectId,
    fetchCustomerActivitiesByAccountId,
    fetchCustomerNotesByAccountId,
    fetchCustomerTasksByAccountId
  ])

  return { data, loading, error }
}
