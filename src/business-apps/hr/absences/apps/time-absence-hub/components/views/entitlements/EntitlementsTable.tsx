import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import type { ActionOption } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { statusVariant } from '@/business-apps/hr/absences/apps/personal-absences/utils/statusUtils'
import {
  EntitlementsOverviewSortField,
  EntitlementsOverviewSortOrder
} from '../../../hooks/useEntitlementsOverviewData'
import { OrgEntitlementRow } from '../../../queries/OrgEntitlementQueries'
import {
  formatEntitlementNumber,
  getEntitlementEmployeeName,
  getEntitlementRemaining,
  isEntitlementExpiringSoon
} from './entitlementUtils'
import { HubDataTable, type HubDataTableColumn } from '../shared/HubDataTable'
import { HubRowActionMenu } from '../shared/HubRowActionMenu'
import { HubEmployeeCell } from '../shared/HubEmployeeCell'

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.entitlements.${key}`, fallback)

export interface EntitlementsTableProps {
  rows: OrgEntitlementRow[]
  total: number
  currentPage: number
  pageSize: number
  isLoading: boolean
  error: string | null
  sortField: EntitlementsOverviewSortField
  sortOrder: EntitlementsOverviewSortOrder
  onSort: (field: string) => void
  onPaginationChange: (page: number, newPageSize?: number) => void
  onUpdateEntitlement: (employeeId: string) => void
  onOpenEmployee: (row: OrgEntitlementRow) => void
}

const formatDate = (value?: string | null): string => {
  if (!value) {
    return '-'
  }
  return value.slice(0, 10)
}

export const EntitlementsTable: React.FC<EntitlementsTableProps> = ({
  rows,
  total,
  currentPage,
  pageSize,
  isLoading,
  error,
  sortField,
  sortOrder,
  onSort,
  onPaginationChange,
  onUpdateEntitlement,
  onOpenEmployee
}) => {
  const todayIso = new Date().toISOString().slice(0, 10)
  const columns = getColumns(todayIso, onUpdateEntitlement)

  return (
    <HubDataTable
      columns={columns}
      rows={rows}
      getRowKey={row => row.id}
      loading={isLoading}
      error={error}
      total={total}
      currentPage={currentPage}
      pageSize={pageSize}
      sortField={sortField}
      sortOrder={sortOrder}
      onSort={onSort}
      onPaginationChange={onPaginationChange}
      onRowClick={row => {
        if (row.employeeId) {
          onOpenEmployee(row)
        }
      }}
      dataTestIdPrefix="entitlements-grid"
      rowLabel={tt('row_label_entitlements', 'entitlements')}
      emptyMessage={tt('table_empty', 'No entitlements match the current filters.')}
    />
  )
}

const getColumns = (
  todayIso: string,
  onUpdateEntitlement: (employeeId: string) => void
): HubDataTableColumn<OrgEntitlementRow>[] => [
  {
    key: 'employee',
    header: tt('column_employee', 'Employee'),
    widthClassName: 'gba:w-32',
    headerClassName: 'gba:px-3',
    cellClassName: 'gba:px-2 gba:py-3',
    renderCell: row => {
      const employeeName = getEntitlementEmployeeName(row, tt('unknown_employee', 'Unknown employee'))
      return (
        <HubEmployeeCell
          name={employeeName}
          pictureThumbnail={row.employee?.pictureThumbnail}
          subtitle={row.employee?.employeePosition?.organizationalUnit?.name}
        />
      )
    }
  },
  {
    key: 'department',
    header: tt('column_department', 'Department'),
    widthClassName: 'gba:w-32',
    headerClassName: 'gba:px-3',
    cellClassName: 'gba:px-2 gba:py-3 gba:text-sm',
    renderCell: row => {
      const department = row.employee?.employeePosition?.organizationalUnit?.name ?? '-'
      return (
        <span className="gba:block gba:truncate" title={department}>
          {department}
        </span>
      )
    }
  },
  {
    key: 'location',
    header: tt('column_location', 'Location'),
    widthClassName: 'gba:w-24',
    headerClassName: 'gba:px-2',
    cellClassName: 'gba:px-2 gba:py-3 gba:text-sm',
    renderCell: row => {
      const location = row.employee?.employeePosition?.siteLocation?.name ?? '-'
      return (
        <span className="gba:block gba:truncate" title={location}>
          {location}
        </span>
      )
    }
  },
  {
    key: 'type',
    header: tt('column_type', 'Type'),
    widthClassName: 'gba:w-20',
    headerClassName: 'gba:px-2',
    cellClassName: 'gba:px-2 gba:py-3 gba:text-sm',
    renderCell: row => {
      const typeLabel = row.type?.value ?? '-'
      return (
        <span className="gba:block gba:truncate" title={typeLabel}>
          {typeLabel}
        </span>
      )
    }
  },
  {
    key: 'total',
    header: tt('column_total', 'Total'),
    sortableField: 'total',
    widthClassName: 'gba:w-18',
    headerClassName: 'gba:px-2',
    cellClassName: 'gba:px-1 gba:py-3 gba:text-right gba:text-sm',
    renderCell: row => formatEntitlementNumber(row.total)
  },
  {
    key: 'approved',
    header: tt('column_approved', 'Approved'),
    sortableField: 'approved',
    widthClassName: 'gba:w-20',
    headerClassName: 'gba:px-2',
    cellClassName: 'gba:px-1 gba:py-3 gba:text-right gba:text-sm',
    renderCell: row => formatEntitlementNumber(row.approved)
  },
  {
    key: 'pending',
    header: tt('column_pending', 'Pending'),
    sortableField: 'pending',
    widthClassName: 'gba:w-20',
    headerClassName: 'gba:px-2',
    cellClassName: 'gba:px-1 gba:py-3 gba:text-right gba:text-sm',
    renderCell: row => formatEntitlementNumber(row.pending)
  },
  {
    key: 'available',
    header: tt('column_remaining', 'Remaining'),
    sortableField: 'available',
    widthClassName: 'gba:w-20',
    headerClassName: 'gba:px-2',
    cellClassName: 'gba:px-1 gba:py-3 gba:text-right gba:text-sm',
    renderCell: row => {
      const remaining = getEntitlementRemaining(row)
      const isNegative = (remaining ?? 0) < 0
      return (
        <span className={isNegative ? 'gba:text-destructive gba:font-medium' : ''}>
          {formatEntitlementNumber(remaining)}
        </span>
      )
    }
  },
  {
    key: 'valid',
    header: tt('column_valid', 'Valid'),
    sortableField: 'validFrom',
    widthClassName: 'gba:w-36',
    headerClassName: 'gba:px-2',
    cellClassName: 'gba:px-2 gba:py-3 gba:text-xs',
    renderCell: row => (
      <span className="gba:block gba:truncate" title={`${formatDate(row.validFrom)} - ${formatDate(row.validTo)}`}>
        {formatDate(row.validFrom)} - {formatDate(row.validTo)}
      </span>
    )
  },
  {
    key: 'flags',
    header: tt('column_flags', 'Flags'),
    widthClassName: 'gba:w-18',
    headerClassName: 'gba:px-2',
    cellClassName: 'gba:px-2 gba:py-3',
    renderCell: row => {
      const isNegative = (getEntitlementRemaining(row) ?? 0) < 0
      const expired = Boolean(row.validTo && row.validTo < todayIso)
      const expiring = isEntitlementExpiringSoon(row.validTo, todayIso)
      return (
        <div className="gba:flex gba:flex-wrap gba:gap-1">
          {isNegative && <Badge variant={statusVariant('REJECTED')}>{tt('flag_negative', 'Negative')}</Badge>}
          {expired && <Badge variant={statusVariant('REJECTED')}>{tt('flag_expired', 'Expired')}</Badge>}
          {expiring && !expired && <Badge variant={statusVariant('PENDING')}>{tt('flag_expiring', 'Expiring')}</Badge>}
        </div>
      )
    }
  },
  {
    key: 'actions',
    header: tt('column_actions', 'Actions'),
    widthClassName: 'gba:w-16',
    headerClassName: 'gba:pl-2 gba:pr-4',
    cellClassName: 'gba:pl-2 gba:pr-4 gba:py-3 gba:text-right',
    renderCell: row => (
      <HubRowActionMenu
        actions={[
          {
            key: 'update-entitlement',
            label: tt('action_update', 'Update entitlements'),
            disabled: !row.employeeId,
            onClick: () => {
              if (row.employeeId) {
                onUpdateEntitlement(row.employeeId)
              }
            }
          } satisfies ActionOption
        ]}
        ariaLabel={tt('action_menu', 'Entitlement actions')}
        dataTestId={`entitlements-actions-${row.id}`}
      />
    )
  }
]

export default EntitlementsTable
