import { useState, useCallback } from 'react'
import { toast } from '@newwork/nw-design-system'
import {
  buildFilename,
  formatCellValue,
  triggerDownload,
  buildExcelWorkbook,
  downloadExcelWorkbook
} from '@/common/utils/excelExportUtils'
import type { Task } from '@/common/data/relations/types/taskTypes'
import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'
import dayjs from 'dayjs'

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

// ─── Formatters ───────────────────────────────────────────────────────────────

const formatDate = (value?: string | null): string => {
  if (!value) return '-'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('DD-MMM-YYYY') : '-'
}

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
  dueDate: formatDate(task.dueDate),
  createdAt: formatDate(task.createdAt),
  createdBy: getCreatorName(task)
})

// ─── CSV helpers ──────────────────────────────────────────────────────────────

const sanitizeText = (value: string): string => value.replace(/[\r\n]+/g, ' ').trim()

const escapeCsv = (value: string): string => {
  const sanitized = sanitizeText(value)
  const needsQuotes = /[",]/.test(sanitized)
  const out = sanitized.replace(/"/g, '""')
  return needsQuotes ? `"${out}"` : out
}

// Date columns use ="value" formula syntax so Excel treats them as plain text
const DATE_COLUMN_KEYS = new Set(['dueDate', 'createdAt'])

const escapeCsvCell = (key: string, value: string): string => {
  if (DATE_COLUMN_KEYS.has(key) && value !== '-') {
    return `="${value}"`
  }
  return escapeCsv(value)
}

const downloadCsv = (
  data: Record<string, string>[],
  columns: readonly { key: string; title: string }[],
  filename: string
) => {
  const header = columns.map(c => escapeCsv(c.title))
  const rows = data.map(row => columns.map(c => escapeCsvCell(c.key, formatCellValue(row[c.key]))))
  const csvContent = '\uFEFF' + [header.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename)
}

const downloadExcel = async (
  data: Record<string, string>[],
  columns: readonly { key: string; title: string }[],
  filename: string
): Promise<void> => {
  const excelColumns = columns.map(col => ({ header: col.title, key: col.key }))
  const workbook = buildExcelWorkbook('Tasks', excelColumns, data, 'NEWWORK Task Export')
  await downloadExcelWorkbook(workbook, filename)
}

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
  const [isExporting, setIsExporting] = useState(false)

  const fetchAllForExport = useCallback(async (): Promise<Task[]> => {
    const result = await fetchTasks({
      ...queryVariables,
      limit: totalCount,
      offset: 0
    })
    return result.tasks || []
  }, [fetchTasks, queryVariables, totalCount])

  const handleExport = useCallback(
    async (format: 'csv' | 'excel') => {
      if (isExporting) return

      if (totalCount === 0) {
        toast.error('No data to export', { description: 'Apply different filters or wait for data to load.' })
        return
      }

      setIsExporting(true)
      const formatLabel = format === 'csv' ? 'CSV' : 'Excel'

      try {
        const tasks = await fetchAllForExport()

        if (!tasks || tasks.length === 0) {
          toast.error('No data to export', { description: 'No tasks were found for the current filters.' })
          return
        }

        const rows = tasks.map(formatTaskForExport)
        const filename = buildFilename(filenamePrefix, format === 'csv' ? 'csv' : 'xlsx')

        if (format === 'csv') {
          downloadCsv(rows, TASK_EXPORT_COLUMNS, filename)
        } else {
          await downloadExcel(rows, TASK_EXPORT_COLUMNS, filename)
        }

        toast.success(`${formatLabel} exported successfully`, {
          description: `${rows.length} tasks exported.`
        })
      } catch (err) {
        console.error(`[EXPORT ${formatLabel}] Error:`, err)
        toast.error(`Export failed`, {
          description: err instanceof Error ? err.message : String(err)
        })
      } finally {
        setIsExporting(false)
      }
    },
    [isExporting, totalCount, fetchAllForExport, filenamePrefix]
  )

  const handleExportCsv = useCallback(() => handleExport('csv'), [handleExport])
  const handleExportExcel = useCallback(() => handleExport('excel'), [handleExport])

  return { isExporting, handleExportCsv, handleExportExcel }
}
