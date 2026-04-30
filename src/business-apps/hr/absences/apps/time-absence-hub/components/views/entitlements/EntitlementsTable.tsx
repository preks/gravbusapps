import React from 'react'
import {
  ActionButton,
  Badge,
  Card,
  CardContent,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import type { ActionOption } from '@newwork/nw-design-system'
import { WarningCircleIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { statusVariant } from '@/business-apps/hr/absences/apps/personal-absences/utils/statusUtils'
import { OrgEntitlementRow } from '../../../queries/OrgEntitlementQueries'

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.entitlements.${key}`, fallback)

const HEADER_CELL_CLASS = 'gba:px-3 gba:py-3 gba:text-xs'
const TEXT_CELL_CLASS = 'gba:px-3 gba:py-3 gba:text-sm gba:text-muted-foreground'
const NUMBER_CELL_CLASS = 'gba:px-2 gba:py-3 gba:text-right gba:text-sm'

interface EntitlementsTableProps {
  rows: OrgEntitlementRow[]
  isLoading: boolean
  error: string | null
  onUpdateEntitlement: (employeeId: string) => void
  onOpenEmployee: (employeeId: string) => void
}

const formatNumber = (value?: number | null): string => {
  if (value === null || value === undefined) {
    return '-'
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

const formatDate = (value?: string | null): string => {
  if (!value) {
    return '-'
  }
  return value.slice(0, 10)
}

const isExpiringSoon = (validTo?: string | null, todayIso?: string): boolean => {
  if (!validTo || !todayIso) {
    return false
  }
  const today = new Date(todayIso)
  const end = new Date(validTo)
  const diffDays = (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= 30
}

const getEmployeeName = (row: OrgEntitlementRow): string => {
  const displayName = row.employee?.displayName?.trim()

  if (displayName) {
    return displayName
  }

  const name = `${row.employee?.firstName ?? ''} ${row.employee?.lastName ?? ''}`.trim()

  return name || tt('unknown_employee', 'Unknown employee')
}

export const EntitlementsTable: React.FC<EntitlementsTableProps> = ({
  rows,
  isLoading,
  error,
  onUpdateEntitlement,
  onOpenEmployee
}) => {
  const todayIso = new Date().toISOString().slice(0, 10)

  if (error) {
    return (
      <Card>
        <CardContent className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:py-8 gba:text-center">
          <WarningCircleIcon size={32} className="gba:text-destructive" />
          <p className="gba:text-sm gba:text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:py-8">
          <Spinner />
          <span className="gba:text-sm gba:text-muted-foreground">
            {tt('table_loading', 'Loading entitlements...')}
          </span>
        </CardContent>
      </Card>
    )
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="gba:py-8 gba:text-center gba:text-sm gba:text-muted-foreground">
          {tt('table_empty', 'No entitlements match the current filters.')}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="gba:p-0">
        <div className="gba:w-full gba:overflow-hidden">
          <Table className="gba:w-full gba:table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-36`}>{tt('column_employee', 'Employee')}</TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-36`}>
                  {tt('column_department', 'Department')}
                </TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-28`}>{tt('column_location', 'Location')}</TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-24`}>{tt('column_type', 'Type')}</TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-14 gba:text-right`}>
                  {tt('column_total', 'Total')}
                </TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-16 gba:text-right`}>
                  {tt('column_approved', 'Approved')}
                </TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-16 gba:text-right`}>
                  {tt('column_pending', 'Pending')}
                </TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-16 gba:text-right`}>
                  {tt('column_available', 'Available')}
                </TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-32`}>{tt('column_valid', 'Valid')}</TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-20`}>{tt('column_flags', 'Flags')}</TableHead>
                <TableHead className={`${HEADER_CELL_CLASS} gba:w-16 gba:text-right`}>
                  {tt('column_actions', 'Actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <EntitlementsTableRow
                  key={row.id}
                  row={row}
                  todayIso={todayIso}
                  onUpdateEntitlement={onUpdateEntitlement}
                  onOpenEmployee={onOpenEmployee}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

interface EntitlementsTableRowProps {
  row: OrgEntitlementRow
  todayIso: string
  onUpdateEntitlement: (employeeId: string) => void
  onOpenEmployee: (employeeId: string) => void
}

const EntitlementsTableRow: React.FC<EntitlementsTableRowProps> = ({
  row,
  todayIso,
  onUpdateEntitlement,
  onOpenEmployee
}) => {
  const employeeName = getEmployeeName(row)
  const department = row.employee?.employeePosition?.organizationalUnit?.name ?? '-'
  const location = row.employee?.employeePosition?.siteLocation?.name ?? '-'
  const typeLabel = row.type?.value ?? '-'
  const isNegative = (row.available ?? 0) < 0
  const expired = Boolean(row.validTo && row.validTo < todayIso)
  const expiring = isExpiringSoon(row.validTo, todayIso)
  const rowActions = React.useMemo<ActionOption[]>(
    () => [
      {
        key: 'update-entitlement',
        label: tt('action_update', 'Update entitlements'),
        disabled: !row.employeeId,
        onSelect: () => {
          if (row.employeeId) {
            onUpdateEntitlement(row.employeeId)
          }
        }
      },
      {
        key: 'open-employee-record',
        label: tt('action_open_employee', 'Open employee record'),
        disabled: !row.employeeId,
        onSelect: () => {
          if (row.employeeId) {
            onOpenEmployee(row.employeeId)
          }
        }
      }
    ],
    [onOpenEmployee, onUpdateEntitlement, row.employeeId]
  )

  return (
    <TableRow data-testid={`entitlements-row-${row.id}`}>
      <TableCell className="gba:px-3 gba:py-3">
        <span className="gba:block gba:truncate gba:text-sm gba:font-medium" title={employeeName}>
          {employeeName}
        </span>
      </TableCell>
      <TableCell className={TEXT_CELL_CLASS}>
        <span className="gba:block gba:truncate" title={department}>
          {department}
        </span>
      </TableCell>
      <TableCell className={TEXT_CELL_CLASS}>
        <span className="gba:block gba:truncate" title={location}>
          {location}
        </span>
      </TableCell>
      <TableCell className="gba:px-3 gba:py-3 gba:text-sm">
        <span className="gba:block gba:truncate" title={typeLabel}>
          {typeLabel}
        </span>
      </TableCell>
      <TableCell className={NUMBER_CELL_CLASS}>{formatNumber(row.total)}</TableCell>
      <TableCell className={NUMBER_CELL_CLASS}>{formatNumber(row.approved)}</TableCell>
      <TableCell className={NUMBER_CELL_CLASS}>{formatNumber(row.pending)}</TableCell>
      <TableCell className={NUMBER_CELL_CLASS}>
        <span className={isNegative ? 'gba:text-destructive gba:font-medium' : ''}>{formatNumber(row.available)}</span>
      </TableCell>
      <TableCell className="gba:px-3 gba:py-3 gba:text-xs gba:text-muted-foreground">
        <span className="gba:block gba:truncate" title={`${formatDate(row.validFrom)} - ${formatDate(row.validTo)}`}>
          {formatDate(row.validFrom)} - {formatDate(row.validTo)}
        </span>
      </TableCell>
      <TableCell className="gba:px-3 gba:py-3">
        <div className="gba:flex gba:flex-wrap gba:gap-1">
          {isNegative && <Badge variant={statusVariant('REJECTED')}>{tt('flag_negative', 'Negative')}</Badge>}
          {expired && <Badge variant={statusVariant('REJECTED')}>{tt('flag_expired', 'Expired')}</Badge>}
          {expiring && !expired && <Badge variant={statusVariant('PENDING')}>{tt('flag_expiring', 'Expiring')}</Badge>}
        </div>
      </TableCell>
      <TableCell className="gba:px-1 gba:py-3 gba:text-right">
        <div onClick={event => event.stopPropagation()}>
          <ActionButton
            actions={rowActions}
            size="icon"
            emptyStateBehavior="enable"
            data-testid={`entitlements-actions-${row.id}`}
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

export default EntitlementsTable
