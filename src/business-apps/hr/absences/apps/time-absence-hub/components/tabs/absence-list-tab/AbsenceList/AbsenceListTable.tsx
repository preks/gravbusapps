import React from 'react'
import type { ActionOption } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { CalendarIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '../../../../../../../../../common/utils/windowUtils'
import {
  getAbsenceStatusLabel,
  hasApprovedAbsenceCancellationExpired
} from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { statusVariant } from '@/business-apps/hr/absences/apps/personal-absences/utils/statusUtils'
import { EnhancedAbsence } from '../../../../types'
import {
  HubDataTable,
  type HubDataTableColumn
} from '@/business-apps/hr/absences/apps/time-absence-hub/components/views/shared/HubDataTable'
import { HubRowActionMenu } from '@/business-apps/hr/absences/apps/time-absence-hub/components/views/shared/HubRowActionMenu'

const DATA_TEST_ID_PREFIX = 'BackofficeAbsenceList'
const CANCELLABLE_STATUSES = new Set(['PENDING', 'APPROVED'])

interface AbsenceListTableProps {
  absences: EnhancedAbsence[]
  loading: boolean
  error: Error | null
  total: number
  currentPage: number
  pageSize: number
  sortField: string
  sortOrder: 'ASC' | 'DESC' | ''
  onSort: (field: string) => void
  onPaginationChange: (page: number, newPageSize?: number) => void
  cancellingAbsenceId: string | null
  onCancelAbsence: (absence: EnhancedAbsence) => Promise<void>
  onOpenEmployeeRecord?: (employeeId: string) => void
}

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.absences.${key}`, fallback)

const getEmployeeName = (absence: EnhancedAbsence) => {
  if (absence.employeeName) {
    return absence.employeeName
  }

  if (absence.employee && (absence.employee.firstName || absence.employee.lastName)) {
    return `${absence.employee.firstName || ''} ${absence.employee.lastName || ''}`.trim()
  }
  return '-'
}

const getTranslatedStatus = (status: string) => {
  return getAbsenceStatusLabel(status)
}

const getStatusBadgeVariant = (status: string) => {
  return statusVariant(status)
}

const formatDateForDisplay = (dateStr: string) => {
  return formatDate(dateStr, 'date.short')
}

const renderTruncatedText = (value?: string | null): React.ReactNode => {
  if (!value) {
    return <span className="gba:text-muted-foreground">-</span>
  }

  return (
    <span className="gba:block gba:truncate gba:text-sm" title={value}>
      {value}
    </span>
  )
}

const renderPeriod = (startDate?: string, endDate?: string): React.ReactNode => {
  if (!startDate && !endDate) {
    return <span className="gba:text-muted-foreground">-</span>
  }

  const label = [startDate, endDate]
    .filter(Boolean)
    .map(date => formatDateForDisplay(date as string))
    .join(' - ')

  return (
    <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
      <CalendarIcon size={14} className="gba:shrink-0 gba:text-muted-foreground" />
      <span className="gba:block gba:truncate gba:text-sm" title={label}>
        {label}
      </span>
    </div>
  )
}

const getTableColumns = (
  onCancelAbsence: (absence: EnhancedAbsence) => Promise<void>,
  cancellingAbsenceId: string | null
): HubDataTableColumn<EnhancedAbsence>[] => [
  {
    key: 'employee',
    widthClassName: 'gba:w-1/6',
    sortableField: 'employeeName',
    header: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.employee', 'Employee'),
    cellClassName: 'gba:py-4 gba:px-3',
    renderCell: record => (
      <div className="gba:min-w-0">
        <span className="gba:block gba:truncate gba:text-sm gba:font-medium" title={getEmployeeName(record)}>
          {getEmployeeName(record)}
        </span>
      </div>
    )
  },
  {
    key: 'type',
    widthClassName: 'gba:w-1/6',
    sortableField: 'typeName',
    header: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.type', 'Type'),
    cellClassName: 'gba:py-4 gba:px-3',
    renderCell: record => renderTruncatedText(record.typeName)
  },
  {
    key: 'period',
    widthClassName: 'gba:w-1/6',
    sortableField: 'startDate',
    header: tt('column_period', 'Period'),
    cellClassName: 'gba:py-4 gba:px-3',
    renderCell: record => renderPeriod(record.startDate, record.endDate)
  },
  {
    key: 'status',
    widthClassName: 'gba:w-1/12',
    sortableField: 'status',
    header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
    cellClassName: 'gba:py-4 gba:px-3',
    renderCell: record => (
      <Badge variant={getStatusBadgeVariant(record.status)}>{getTranslatedStatus(record.status)}</Badge>
    )
  },
  {
    key: 'days',
    widthClassName: 'gba:w-16',
    sortableField: 'effectiveDays',
    header: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.days', 'Days'),
    cellClassName: 'gba:py-4 gba:px-3',
    renderCell: record => <span className="gba:text-sm gba:font-medium">{record.effectiveDays || '-'}</span>
  },
  {
    key: 'comment',
    widthClassName: 'gba:w-1/6',
    header: tt('column_comment', 'Comment'),
    cellClassName: 'gba:py-4 gba:px-3',
    renderCell: record => renderTruncatedText(record.comment)
  },
  {
    key: 'substitute',
    widthClassName: 'gba:w-1/12',
    header: tt('column_substitute', 'Substitute'),
    cellClassName: 'gba:py-4 gba:px-3',
    renderCell: record => renderTruncatedText(record.substituteEmployeeName ?? record.substituteEmployeeId)
  },
  {
    key: 'actions',
    widthClassName: 'gba:w-10',
    headerClassName: 'gba:px-2',
    cellClassName: 'gba:px-2 gba:py-4 gba:text-right',
    header: <span className="gba:sr-only">{tt('column_actions', 'Actions')}</span>,
    renderCell: record => {
      const canCancelAbsence =
        CANCELLABLE_STATUSES.has(record.status) &&
        !hasApprovedAbsenceCancellationExpired(record.endDate) &&
        Boolean(record.cancelSnapshot.employeeId) &&
        Boolean(record.cancelSnapshot.typeRef)

      if (!canCancelAbsence) {
        return null
      }

      return (
        <HubRowActionMenu
          actions={[
            {
              category: tt('action_category', 'Actions'),
              key: `cancel-absence-${record.id}`,
              label: tt('cancel_request', 'Cancel Request'),
              disabled: cancellingAbsenceId === record.id,
              onClick: () => {
                void onCancelAbsence(record)
              }
            } satisfies ActionOption
          ]}
          ariaLabel={tt('action_menu', 'Absence actions')}
          dataTestId={`backoffice-absence-list-actions-${record.id}`}
          disabled={cancellingAbsenceId === record.id}
        />
      )
    }
  }
]

export function AbsenceListTable({
  absences,
  loading,
  error,
  total,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  onSort,
  onPaginationChange,
  cancellingAbsenceId,
  onCancelAbsence,
  onOpenEmployeeRecord
}: AbsenceListTableProps) {
  const columns = getTableColumns(onCancelAbsence, cancellingAbsenceId)

  return (
    <HubDataTable
      columns={columns}
      rows={absences}
      getRowKey={record => record.id}
      loading={loading}
      error={error}
      total={total}
      currentPage={currentPage}
      pageSize={pageSize}
      sortField={sortField}
      sortOrder={sortOrder}
      onSort={onSort}
      onPaginationChange={onPaginationChange}
      onRowClick={record => {
        if (record.employee?.id) {
          onOpenEmployeeRecord?.(record.employee.id)
        }
      }}
      dataTestIdPrefix={DATA_TEST_ID_PREFIX}
      rowLabel={getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.absences', 'absences')}
      emptyMessage={getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.absence_list.empty',
        'No absences found'
      )}
    />
  )
}
