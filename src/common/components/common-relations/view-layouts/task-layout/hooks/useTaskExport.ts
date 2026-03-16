import { useCallback } from 'react'
import { formatExportDate } from '@/common/utils/excelExportUtils'
import { useExportBase } from '@/common/hooks/useExportBase'
import type { Task } from '@/common/data/relations/types/taskTypes'
import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'

// ─── Column definitions ───────────────────────────────────────────────────────

export const TASK_EXPORT_COLUMNS = [
  { key: 'assignedTo', title: 'Assigned To' },
  { key: 'name', title: 'Task' },
  { key: 'type', title: 'Type' },
  { key: 'priority', title: 'Priority' },
  { key: 'status', title: 'Status' },
  { key: 'reference', title: 'Reference' },
  { key: 'referenceType', title: 'Reference Type' },
  { key: 'dueDate', title: 'Due Date' },
  { key: 'createdAt', title: 'Created Date' },
  { key: 'createdBy', title: 'Created By' }
] as const

const TASK_DATE_COLUMN_KEYS = new Set(['dueDate', 'createdAt'])

// ─── Formatters ───────────────────────────────────────────────────────────────

const getAssigneeName = (task: Task): string => {
  const assignees = task.taskAssignees
  if (!assignees || assignees.length === 0) return '-'
  if (assignees.length > 1) return 'Multiple'
  const emp = assignees[0].assignedEmployee
  if (!emp) return '-'
  return emp.displayName || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || '-'
}

const getCreatorName = (task: Task): string => {
  const emp = task.creatorEmployee
  if (!emp) return '-'
  return (emp as any).displayName || [(emp as any).firstName, (emp as any).lastName].filter(Boolean).join(' ') || '-'
}

export const formatTaskForExport = (task: Task): Record<string, string> => ({
  assignedTo: getAssigneeName(task),
  name: task.name || '-',
  type: task.taskType ? getCatalogEntryValue(task.taskType as any) || '-' : '-',
  priority: task.taskPriority ? getCatalogEntryValue(task.taskPriority as any) || '-' : '-',
  status: task.taskStatus ? getCatalogEntryValue(task.taskStatus as any) || '-' : '-',
  reference: task.reference?.name || '-',
  referenceType: task.reference?.type
    ? task.reference.type.charAt(0).toUpperCase() + task.reference.type.slice(1)
    : '-',
  dueDate: formatExportDate(task.dueDate),
  createdAt: formatExportDate(task.createdAt),
  createdBy: getCreatorName(task)
})

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseTaskExportOptions {
  fetchTasks: (variables: any) => Promise<{ tasks?: Task[]; total?: number }>
  queryVariables: any
  totalCount: number
  filenamePrefix?: string
}

export function useTaskExport({
  fetchTasks,
  queryVariables,
  totalCount,
  filenamePrefix = 'tasks'
}: UseTaskExportOptions) {
  const fetchAllItems = useCallback(async (): Promise<Task[]> => {
    const result = await fetchTasks({ ...queryVariables, limit: totalCount, offset: 0 })
    return result.tasks || []
  }, [fetchTasks, queryVariables, totalCount])

  return useExportBase<Task>({
    fetchAllItems,
    formatItem: formatTaskForExport,
    columns: TASK_EXPORT_COLUMNS,
    dateColumnKeys: TASK_DATE_COLUMN_KEYS,
    sheetName: 'Tasks',
    entityLabel: 'tasks',
    totalCount,
    filenamePrefix
  })
}
