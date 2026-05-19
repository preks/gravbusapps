import type { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@newwork/nw-design-system'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient'
import { ApprovalRequest } from '../types'
import {
  createDateColumn,
  createEmployeeColumn,
  createStatusBadgeColumn,
  createFormatCurrency
} from '../../../common/columns/expenseColumnHelpers'
import { getExpenseRequestStatusDisplayT } from '../utils'
import { getApprovalTaskGroupDisplayT } from '../utils/taskValidation'

const sortOff = { enableSorting: false as const }

function formatRequestDateForApproval(value: string | null | undefined): string {
  if (value == null || !String(value).trim()) {
    return '-'
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    return '-'
  }
  return new Intl.DateTimeFormat(getCurrentActiveUserLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d)
}

export type ApprovalTableRow = {
  id: string
  approval: ApprovalRequest
  flowTask: FlowExecutionTask
}

export interface ApprovalTableColumnChrome {
  dataTestIdPrefix: string
  allRequests: ApprovalRequest[]
  selectedTasks: ApprovalRequest[]
  onSelectAll: (checked: boolean) => void
  onToggleRow: (request: ApprovalRequest) => void
}

export function createApprovalTableColumns(
  chrome: ApprovalTableColumnChrome,
  t: (key: string) => string
): ColumnDef<ApprovalTableRow>[] {
  const formatCurrency = createFormatCurrency(null)
  const requestDateId = 'requestDate'
  const requestDateLabel = t('approvals-column-date')
  const titleHeader = t('approvals-column-title')
  const taskGroupHeader = t('approvals-column-task-group')
  const amountHeader = t('approvals-column-amount')
  const employeeHeader = t('expense-requests-column-employee')
  const statusHeader = t('expense-requests-column-status')

  const selectColumn: ColumnDef<ApprovalTableRow> = {
    id: 'select',
    header: () => {
      if (chrome.allRequests.length === 0) {
        return null
      }
      const allSelected = chrome.selectedTasks.length > 0 && chrome.selectedTasks.length === chrome.allRequests.length
      return (
        <div className="gba:flex gba:items-center gba:justify-center" data-testid="approval-select-all-wrap">
          <Checkbox
            checked={allSelected}
            onCheckedChange={value => chrome.onSelectAll(value === true)}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            data-testid={`${chrome.dataTestIdPrefix}-select-all-checkbox`}
            className="gba:cursor-pointer"
          />
        </div>
      )
    },
    ...sortOff,
    size: 50,
    minSize: 48,
    maxSize: 56,
    meta: { className: 'gba:w-12' },
    cell: ({ row }) => {
      const request = row.original.approval
      const isSelected = chrome.selectedTasks.some(s => s.id === request.id)
      return (
        <div
          className="gba:flex gba:items-center gba:justify-center"
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
          data-testid="approval-select-cell-wrap"
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => chrome.onToggleRow(request)}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            data-testid={`${chrome.dataTestIdPrefix}-select-checkbox-${request.id}`}
            className="gba:cursor-pointer"
          />
        </div>
      )
    }
  }

  const titleColumn: ColumnDef<ApprovalTableRow> = {
    id: 'title',
    accessorFn: row => row.approval.title,
    header: titleHeader,
    ...sortOff,
    minSize: 160,
    size: 200,
    maxSize: 320,
    meta: { className: 'gba:min-w-0' },
    cell: ({ row }) => {
      const text = row.original.approval.title?.trim() || ''
      return (
        <span
          className="gba:font-medium gba:text-sm gba:min-w-0 gba:truncate gba:block"
          data-testid={`${chrome.dataTestIdPrefix}-title-${row.original.id}`}
          title={text || undefined}
        >
          {text || '—'}
        </span>
      )
    }
  }

  const taskGroupColumn: ColumnDef<ApprovalTableRow> = {
    id: 'taskGroup',
    accessorFn: row => row.approval.taskGroup,
    header: taskGroupHeader,
    ...sortOff,
    minSize: 120,
    size: 160,
    maxSize: 200,
    meta: { className: 'gba:min-w-0' },
    cell: ({ row }) => {
      const taskGroupLabel = getApprovalTaskGroupDisplayT(t, row.original.approval.taskGroup)
      return (
        <div
          className="gba:text-sm gba:text-muted-foreground gba:min-w-0 gba:truncate gba:max-w-full"
          data-testid={`${chrome.dataTestIdPrefix}-task-group-${row.original.id}`}
          title={taskGroupLabel}
        >
          {taskGroupLabel}
        </div>
      )
    }
  }

  const amountColumn: ColumnDef<ApprovalTableRow> = {
    id: 'totalAmount',
    header: amountHeader,
    ...sortOff,
    accessorFn: row => row.approval.totalAmount,
    minSize: 100,
    size: 130,
    maxSize: 180,
    meta: { className: 'gba:min-w-0' },
    cell: ({ row }) => {
      const { totalAmount, currency } = row.original.approval
      if (totalAmount <= 0) {
        return <span className="gba:font-medium gba:text-sm gba:text-right gba:block gba:tabular-nums">-</span>
      }
      return (
        <span
          className="gba:font-medium gba:text-sm gba:text-right gba:block gba:tabular-nums"
          data-testid={`${chrome.dataTestIdPrefix}-amount-${row.original.id}`}
        >
          {formatCurrency(totalAmount, currency || 'EUR')}
        </span>
      )
    }
  }

  return [
    selectColumn,
    createDateColumn<ApprovalTableRow>(requestDateId, requestDateLabel, row => row.approval.requestDate, {
      formatDate: formatRequestDateForApproval,
      ...sortOff
    }),
    titleColumn,
    taskGroupColumn,
    amountColumn,
    createEmployeeColumn<ApprovalTableRow>('employee', employeeHeader, row => row.approval.employee ?? null, {
      showEmployeeAvatar: false,
      ...sortOff
    }),
    createStatusBadgeColumn<ApprovalTableRow>(
      'status',
      statusHeader,
      (row: ApprovalTableRow) => getExpenseRequestStatusDisplayT(t, row.approval.status),
      {
        ...sortOff,
        getRowTestId: row =>
          `${chrome.dataTestIdPrefix}-status-pill-${String(row.approval.status ?? '').toLowerCase() || 'unknown'}`,
        cellWrapperClassName: 'gba:pr-2 gba:min-w-0'
      }
    )
  ]
}
