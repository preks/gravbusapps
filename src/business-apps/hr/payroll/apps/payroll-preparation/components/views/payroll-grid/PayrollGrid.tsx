import React, { useState, useMemo } from 'react'
import {
  Badge,
  Button,
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead
} from '@newwork/nw-design-system'
import { UserIcon, CaretUpIcon, CaretDownIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { formatDate as formatPlatformDate } from '@/common/utils/windowUtils'
import type { PayrollEmployee, PayrollGridFilters as FilterState, PayrollCountry } from '../../../types/payrollTypes'
import { useFilteredEmployees } from '../../../hooks/usePayrollEmployees'
import { ReadinessStatusBadge, IssueCountBadge, ChangedBadge, FieldStatusBadge } from '../../shared/StatusBadge'
import { PayrollGridFilters } from './PayrollGridFilters'
import { EmployeeDetailDrawer } from './EmployeeDetailDrawer'

interface PayrollGridViewProps {
  employees: PayrollEmployee[]
  country: PayrollCountry
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  onRefresh: () => Promise<void>
  refreshing: boolean
  t: (key: string) => string
}

type SortField = 'fullName' | 'department' | 'baseSalary' | 'readinessStatus' | 'issues'
type SortOrder = 'asc' | 'desc'

const PAGE_SIZE_OPTIONS = [20, 50, 100]

function getVariablePayDisplay(employee: PayrollEmployee): string {
  if (employee.totalVariablePay === null || employee.totalVariablePay === undefined) {
    return '-'
  }

  return `${employee.totalVariablePay.toLocaleString()} ${employee.variablePayCurrency || ''}`
}

function formatHoursOrDash(value: number | null | undefined, unitHoursShort: string = 'h'): string {
  if (value === null || value === undefined) {
    return '-'
  }

  return `${value}${unitHoursShort}`
}

function formatHoursDaysOrDash(
  hours: number | null | undefined,
  days: number | null | undefined,
  unitHoursShort: string = 'h',
  unitDaysShort: string = 'd'
): string {
  if (hours === null || hours === undefined) {
    return '-'
  }

  const safeDays = days ?? 0
  return `${hours}${unitHoursShort} (${safeDays}${unitDaysShort})`
}

function formatSalaryOrDash(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined) {
    return '-'
  }

  return `${value.toLocaleString()} ${currency}`
}

function formatDateOrDash(value: string | null | undefined): string {
  if (!value) {
    return '-'
  }

  return formatPlatformDate(value, 'date.short') || '-'
}

function hasNumberValue(value: number | null | undefined): value is number {
  return value !== null && value !== undefined
}

function getReadinessRank(status: PayrollEmployee['readinessStatus']): number {
  const rank: Record<PayrollEmployee['readinessStatus'], number> = {
    blocked: 0,
    warning: 1,
    ready: 2,
    excluded: 3
  }
  return rank[status]
}

function getOpenIssuesCount(employee: PayrollEmployee): number {
  return employee.issues.filter(issue => issue.status === 'open').length
}

function compareEmployees(a: PayrollEmployee, b: PayrollEmployee, field: SortField): number {
  switch (field) {
    case 'fullName':
      return a.fullName.localeCompare(b.fullName)
    case 'department':
      return (a.department || '').localeCompare(b.department || '')
    case 'baseSalary':
      return (a.baseSalary || 0) - (b.baseSalary || 0)
    case 'readinessStatus':
      return getReadinessRank(a.readinessStatus) - getReadinessRank(b.readinessStatus)
    case 'issues':
      return getOpenIssuesCount(a) - getOpenIssuesCount(b)
  }
}

const SortIcon: React.FC<{ field: SortField; activeField: SortField; order: SortOrder }> = ({
  field,
  activeField,
  order
}) => {
  if (activeField !== field) return <CaretUpIcon size={12} className="gba:text-muted-foreground/40" />
  return order === 'asc' ? (
    <CaretUpIcon size={12} className="gba:text-foreground" weight="bold" />
  ) : (
    <CaretDownIcon size={12} className="gba:text-foreground" weight="bold" />
  )
}

type PayrollGridSortableHeadProps = Readonly<{
  field: SortField
  label: string
  className?: string
  sticky?: boolean
  activeField: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  testId?: string
}>

const PayrollGridSortableHead: React.FC<PayrollGridSortableHeadProps> = ({
  field,
  label,
  activeField,
  sortOrder,
  onSort,
  className,
  testId
}) => (
  <TableHead
    className={`gba:cursor-pointer gba:select-none gba:whitespace-nowrap ${className || ''}`}
    onClick={() => onSort(field)}
    data-testid={testId}
  >
    <span className="gba:flex gba:items-center gba:gap-1">
      {label}
      <SortIcon field={field} activeField={activeField} order={sortOrder} />
    </span>
  </TableHead>
)

interface PayrollGridRowProps {
  employee: PayrollEmployee
  onSelectEmployee: (employee: PayrollEmployee) => void
  t: (key: string) => string
}

const PayrollGridRow: React.FC<PayrollGridRowProps> = ({ employee, onSelectEmployee, t }) => {
  const openIssues = employee.issues.filter(issue => issue.status === 'open')
  const hasBlockers = openIssues.some(i => i.severity === 'blocker')

  return (
    <TableRow
      key={employee.id}
      className="gba:cursor-pointer gba:hover:bg-muted"
      onClick={() => onSelectEmployee(employee)}
      data-testid={`payroll-prep-grid-row-${employee.id}`}
    >
      <TableCell className="gba:sticky gba:left-0 gba:z-10 gba:bg-card">
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
            {employee.pictureThumbnail ? (
              <img
                src={`data:image/jpeg;base64,${employee.pictureThumbnail}`}
                alt=""
                className="gba:w-8 gba:h-8 gba:rounded-full gba:object-cover"
              />
            ) : (
              <UserIcon size={14} className="gba:text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="gba:text-sm gba:font-medium gba:text-foreground gba:whitespace-nowrap">{employee.fullName}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="gba:text-xs gba:text-muted-foreground gba:font-mono">{employee.code || '-'}</TableCell>
      <TableCell>
        <Badge variant={employee.employmentStatus === 'terminated' ? 'destructive' : 'success'}>
          {employee.employmentStatus}
        </Badge>
      </TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground">{employee.department}</TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">
        {formatDateOrDash(employee.hireDate)}
      </TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">
        {formatDateOrDash(employee.terminationDate)}
      </TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground">{employee.costCenter}</TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground">{employee.workLocation || '-'}</TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground">{employee.contractType}</TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground">
        {employee.fte === null || employee.fte === undefined ? '-' : employee.fte.toFixed(2)}
      </TableCell>
      <TableCell className="gba:text-sm gba:font-medium gba:text-foreground gba:whitespace-nowrap">
        {formatSalaryOrDash(employee.baseSalary, employee.currency)}
      </TableCell>
      <TableCell>
        <FieldStatusBadge present={employee.bankDetailsPresent} missingLabel={t('label-missing')} />
      </TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">
        {getVariablePayDisplay(employee)}
      </TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">
        {formatHoursDaysOrDash(
          employee.paidLeaveHours,
          employee.paidLeaveDays,
          t('unit-hours-short'),
          t('unit-days-short')
        )}
      </TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">
        {formatHoursDaysOrDash(
          employee.sickLeaveHours,
          employee.sickLeaveDays,
          t('unit-hours-short'),
          t('unit-days-short')
        )}
      </TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground">{employee.unpaidLeaveDays || '-'}</TableCell>
      <TableCell>
        {employee.missingPresenceDays > 0 ? (
          <Badge variant="destructive">
            {employee.missingPresenceDays}
            {t('unit-days-short')}
          </Badge>
        ) : (
          <span className="gba:text-sm gba:text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">
        {formatHoursOrDash(employee.loggedHours, t('unit-hours-short'))}
      </TableCell>
      <TableCell className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">
        {formatHoursOrDash(employee.contractCapacityHours, t('unit-hours-short'))}
      </TableCell>
      <TableCell className="gba:whitespace-nowrap">
        {hasNumberValue(employee.balanceHours) ? (
          <Badge variant={employee.balanceHours >= 0 ? 'success' : 'destructive'}>
            {employee.balanceHours >= 0 ? '+' : ''}
            {employee.balanceHours}
            {t('unit-hours-short')}
          </Badge>
        ) : (
          '-'
        )}
      </TableCell>
      <TableCell>
        <IssueCountBadge count={getOpenIssuesCount(employee)} hasBlockers={hasBlockers} />
      </TableCell>
      <TableCell>
        <ReadinessStatusBadge status={employee.readinessStatus} t={t} />
      </TableCell>
      <TableCell>
        <ChangedBadge changed={employee.changedSinceLastPayroll} label={t('label-changed')} />
      </TableCell>
    </TableRow>
  )
}

export const PayrollGridView: React.FC<PayrollGridViewProps> = ({
  employees,
  country,
  filters,
  onFiltersChange,
  onRefresh,
  refreshing,
  t
}) => {
  const [sortField, setSortField] = useState<SortField>('fullName')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null)

  const filtered = useFilteredEmployees(employees, filters)

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      const result = compareEmployees(a, b, sortField)
      return sortOrder === 'asc' ? result : -result
    })
    return arr
  }, [filtered, sortField, sortOrder])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  return (
    <div className="gba:space-y-4" data-testid="payroll-prep-grid-view">
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
        <div className="gba:flex-1">
          <PayrollGridFilters
            filters={filters}
            onFiltersChange={f => {
              onFiltersChange(f)
              setCurrentPage(1)
            }}
            employees={employees}
            t={t}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          data-testid="payroll-prep-grid-refresh-button"
        >
          <ArrowsClockwiseIcon size={16} className={refreshing ? 'gba:animate-spin' : ''} />
          {t('refresh-data')}
        </Button>
      </div>

      <Card className="gba:overflow-hidden gba:bg-transparent gba:shadow-none gba:border-none gba:pt-2">
        <div className="gba:overflow-x-auto gba:bg-card gba:rounded-lg">
          <Table data-testid="payroll-prep-grid-table">
            <TableHeader>
              <TableRow>
                <PayrollGridSortableHead
                  field="fullName"
                  label={t('grid-employee')}
                  sticky
                  activeField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  className="gba:min-w-[200px] gba:sticky gba:left-0 gba:z-20 gba:bg-card"
                  testId="payroll-prep-grid-sort-display-name"
                />
                <TableHead className="gba:whitespace-nowrap">{t('grid-employee-code')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-status')}</TableHead>
                <PayrollGridSortableHead
                  field="department"
                  label={t('grid-department')}
                  activeField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  testId="payroll-prep-grid-sort-department"
                />
                <TableHead className="gba:whitespace-nowrap">{t('grid-hire-date')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-termination-date')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-cost-center')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-location')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-contract-type')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-fte')}</TableHead>
                <PayrollGridSortableHead
                  field="baseSalary"
                  label={t('grid-base-salary')}
                  activeField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  testId="payroll-prep-grid-sort-base-salary"
                />
                <TableHead className="gba:whitespace-nowrap">{t('grid-bank-details')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-variable-pay')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-paid-leave')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-sick-leave')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-unpaid-leave')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-missing-presence')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-logged-hours')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-capacity')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-balance')}</TableHead>
                <PayrollGridSortableHead
                  field="issues"
                  label={t('grid-issues')}
                  activeField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  testId="payroll-prep-grid-sort-issues"
                />
                <PayrollGridSortableHead
                  field="readinessStatus"
                  label={t('grid-readiness')}
                  activeField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  testId="payroll-prep-grid-sort-readiness"
                />
                <TableHead className="gba:whitespace-nowrap">{t('grid-changed')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={23}
                    className="gba:text-center gba:py-12 gba:text-muted-foreground"
                    data-testid="payroll-prep-grid-empty-state"
                  >
                    {t('no-data')}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map(employee => (
                  <PayrollGridRow key={employee.id} employee={employee} onSelectEmployee={setSelectedEmployee} t={t} />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {sorted.length > 0 && (
          <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-t gba:border-border gba:text-sm gba:text-muted-foreground">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span>
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)} of{' '}
                {sorted.length}
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(val: string) => {
                  setPageSize(Number(val))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="gba:h-8 gba:w-[100px]" data-testid="payroll-prep-grid-page-size-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <SelectItem key={size} value={String(size)}>
                      {size} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                data-testid="payroll-prep-grid-pagination-prev-button"
              >
                {t('grid-pagination-prev')}
              </Button>
              <span className="gba:px-3">
                {currentPage} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                data-testid="payroll-prep-grid-pagination-next-button"
              >
                {t('grid-pagination-next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {selectedEmployee && (
        <>
          <EmployeeDetailDrawer
            employee={selectedEmployee}
            country={country}
            onClose={() => setSelectedEmployee(null)}
            t={t}
          />
        </>
      )}
    </div>
  )
}
