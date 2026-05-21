import React from 'react'
import type { ActionOption } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { CalendarIcon, UserIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '../../../../../../../../../common/utils/windowUtils'
import {
  getAbsenceStatusLabel,
  hasApprovedAbsenceCancellationExpired,
  isApprovedAbsenceStatus
} from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { statusVariant } from '@/business-apps/hr/absences/apps/personal-absences/utils/statusUtils'
import { AppAction } from '@/components/app-action/AppAction'
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

const getColorForAbsence = (absence: EnhancedAbsence) => {
  return absence.color || 'var(--nw-muted-foreground)'
}

const formatDateForDisplay = (dateStr: string) => {
  return formatDate(dateStr, 'date.short')
}

const renderDateWithIcon = (dateStr?: string): React.ReactNode => {
  if (!dateStr) {
    return '-'
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <CalendarIcon size={14} className="gba:text-muted-foreground" />
      <span className="gba:text-sm">{formatDateForDisplay(dateStr)}</span>
    </div>
  )
}

const getTableColumns = (
  onCancelAbsence: (absence: EnhancedAbsence) => Promise<void>,
  cancellingAbsenceId: string | null
): HubDataTableColumn<EnhancedAbsence>[] => [
  {
    key: 'employee',
    widthClassName: 'gba:w-1/5',
    sortableField: 'employeeName',
    header: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.employee', 'Employee'),
    cellClassName: 'gba:py-4 gba:px-6',
    renderCell: record => (
      <div className="gba:flex gba:items-center gba:gap-2">
        <UserIcon size={16} className="gba:text-muted-foreground" />
        <span className="gba:font-medium gba:text-sm">{getEmployeeName(record)}</span>
      </div>
    )
  },
  {
    key: 'group',
    widthClassName: 'gba:w-1/6',
    sortableField: 'groupName',
    header: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.group', 'Group'),
    cellClassName: 'gba:py-4 gba:px-6',
    renderCell: record => (
      <div className="gba:flex gba:items-center gba:gap-2">
        <span
          className="gba:h-2 gba:w-2 gba:shrink-0 gba:rounded-full"
          style={{ backgroundColor: getColorForAbsence(record) }}
        />
        <span className="gba:text-sm">{record.groupName}</span>
      </div>
    )
  },
  {
    key: 'start-date',
    widthClassName: 'gba:w-1/12',
    sortableField: 'startDate',
    header: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.start_date', 'Start Date'),
    cellClassName: 'gba:py-4 gba:px-6',
    renderCell: record => renderDateWithIcon(record.startDate)
  },
  {
    key: 'end-date',
    widthClassName: 'gba:w-1/12',
    sortableField: 'endDate',
    header: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.end_date', 'End Date'),
    cellClassName: 'gba:py-4 gba:px-6',
    renderCell: record => renderDateWithIcon(record.endDate)
  },
  {
    key: 'status',
    widthClassName: 'gba:w-1/12',
    sortableField: 'status',
    header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
    cellClassName: 'gba:py-4 gba:px-6',
    renderCell: record => (
      <Badge variant={getStatusBadgeVariant(record.status)}>{getTranslatedStatus(record.status)}</Badge>
    )
  },
  {
    key: 'days',
    widthClassName: 'gba:w-16',
    sortableField: 'effectiveDays',
    header: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.days', 'Days'),
    cellClassName: 'gba:py-4 gba:px-6',
    renderCell: record => <span className="gba:text-sm gba:font-medium">{record.effectiveDays || '-'}</span>
  },
  {
    key: 'created',
    widthClassName: 'gba:w-1/6',
    sortableField: 'createdAt',
    header: getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_plan_list.expense_plan_table.create_date',
      'Created At'
    ),
    cellClassName: 'gba:py-4 gba:px-6',
    renderCell: record => renderDateWithIcon(record.createdAt)
  },
  {
    key: 'actions',
    widthClassName: 'gba:w-16',
    headerClassName: 'gba:pl-2 gba:pr-4',
    cellClassName: 'gba:pl-2 gba:pr-4 gba:py-4 gba:text-right',
    header: tt('column_actions', 'Actions'),
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
