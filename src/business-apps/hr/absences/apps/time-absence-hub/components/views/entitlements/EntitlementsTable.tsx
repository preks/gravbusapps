import React from 'react'
import {
  Badge,
  Button,
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
import { ArrowSquareOutIcon, PencilSimpleIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { OrgEntitlementRow } from '../../../queries/OrgEntitlementQueries'

const tt = (key: string, fallback: string) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.entitlements.${key}`, fallback)

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
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tt('column_employee', 'Employee')}</TableHead>
                <TableHead>{tt('column_department', 'Department')}</TableHead>
                <TableHead>{tt('column_location', 'Location')}</TableHead>
                <TableHead>{tt('column_type', 'Type')}</TableHead>
                <TableHead className="gba:text-right">{tt('column_total', 'Total')}</TableHead>
                <TableHead className="gba:text-right">{tt('column_approved', 'Approved')}</TableHead>
                <TableHead className="gba:text-right">{tt('column_pending', 'Pending')}</TableHead>
                <TableHead className="gba:text-right">{tt('column_available', 'Available')}</TableHead>
                <TableHead>{tt('column_valid', 'Valid')}</TableHead>
                <TableHead>{tt('column_flags', 'Flags')}</TableHead>
                <TableHead className="gba:text-right">{tt('column_actions', 'Actions')}</TableHead>
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
  const employeeName = row.employee
    ? `${row.employee.firstName ?? ''} ${row.employee.lastName ?? ''}`.trim()
    : (row.employeeId ?? '-')
  const department = row.employee?.employeePosition?.organizationalUnit?.name ?? '-'
  const location = row.employee?.employeePosition?.siteLocation?.name ?? '-'
  const typeLabel = row.type?.value ?? '-'
  const isNegative = (row.available ?? 0) < 0
  const expired = Boolean(row.validTo && row.validTo < todayIso)
  const expiring = isExpiringSoon(row.validTo, todayIso)

  return (
    <TableRow data-testid={`entitlements-row-${row.id}`}>
      <TableCell>
        <span className="gba:font-medium gba:text-sm">{employeeName || '-'}</span>
      </TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground">{department}</TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground">{location}</TableCell>
      <TableCell className="gba:text-sm">{typeLabel}</TableCell>
      <TableCell className="gba:text-right gba:text-sm">{formatNumber(row.total)}</TableCell>
      <TableCell className="gba:text-right gba:text-sm">{formatNumber(row.approved)}</TableCell>
      <TableCell className="gba:text-right gba:text-sm">{formatNumber(row.pending)}</TableCell>
      <TableCell className="gba:text-right gba:text-sm">
        <span className={isNegative ? 'gba:text-destructive gba:font-medium' : ''}>{formatNumber(row.available)}</span>
      </TableCell>
      <TableCell className="gba:text-xs gba:text-muted-foreground">
        {formatDate(row.validFrom)} – {formatDate(row.validTo)}
      </TableCell>
      <TableCell>
        <div className="gba:flex gba:flex-wrap gba:gap-1">
          {isNegative && (
            <Badge variant="outline" className="gba:border-destructive gba:text-destructive">
              {tt('flag_negative', 'Negative')}
            </Badge>
          )}
          {expired && (
            <Badge variant="outline" className="gba:border-muted gba:text-muted-foreground">
              {tt('flag_expired', 'Expired')}
            </Badge>
          )}
          {expiring && !expired && (
            <Badge variant="outline" className="gba:border-warning gba:text-warning">
              {tt('flag_expiring', 'Expiring')}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="gba:text-right">
        <div className="gba:flex gba:items-center gba:justify-end gba:gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => row.employeeId && onUpdateEntitlement(row.employeeId)}
            disabled={!row.employeeId}
            data-testid={`entitlements-update-${row.id}`}
            aria-label={tt('action_update_aria', 'Update entitlements')}
          >
            <PencilSimpleIcon size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => row.employeeId && onOpenEmployee(row.employeeId)}
            disabled={!row.employeeId}
            data-testid={`entitlements-open-employee-${row.id}`}
            aria-label={tt('action_open_employee_aria', 'Open employee record')}
          >
            <ArrowSquareOutIcon size={14} />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default EntitlementsTable
