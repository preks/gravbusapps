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

type SortField = 'displayName' | 'department' | 'baseSalary' | 'readinessStatus' | 'issues'
type SortOrder = 'asc' | 'desc'

const PAGE_SIZE_OPTIONS = [20, 50, 100]

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

const SortableHead: React.FC<{
  field: SortField
  label: string
  activeField: SortField
  order: SortOrder
  onSort: (field: SortField) => void
  className?: string
}> = ({ field, label, activeField, order, onSort, className }) => (
  <TableHead
    className={`gba:cursor-pointer gba:select-none gba:whitespace-nowrap ${className || ''}`}
    onClick={() => onSort(field)}
  >
    <span className="gba:flex gba:items-center gba:gap-1">
      {label}
      <SortIcon field={field} activeField={activeField} order={order} />
    </span>
  </TableHead>
)

export const PayrollGridView: React.FC<PayrollGridViewProps> = ({
  employees,
  country,
  filters,
  onFiltersChange,
  onRefresh,
  refreshing,
  t
}) => {
  const [sortField, setSortField] = useState<SortField>('displayName')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null)

  const filtered = useFilteredEmployees(employees, filters)

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'displayName':
          cmp = a.displayName.localeCompare(b.displayName)
          break
        case 'department':
          cmp = (a.department || '').localeCompare(b.department || '')
          break
        case 'baseSalary':
          cmp = (a.baseSalary || 0) - (b.baseSalary || 0)
          break
        case 'readinessStatus': {
          const order: Record<string, number> = { blocked: 0, warning: 1, ready: 2, excluded: 3 }
          cmp = (order[a.readinessStatus] || 0) - (order[b.readinessStatus] || 0)
          break
        }
        case 'issues':
          cmp = a.issues.filter(i => i.status === 'open').length - b.issues.filter(i => i.status === 'open').length
          break
      }
      return sortOrder === 'asc' ? cmp : -cmp
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
    <div className="gba:space-y-4">
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
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
          <ArrowsClockwiseIcon size={16} className={refreshing ? 'gba:animate-spin' : ''} />
          {t('refresh-data')}
        </Button>
      </div>

      <Card className="gba:overflow-hidden gba:bg-transparent gba:shadow-none gba:border-none gba:pt-2">
        <div className="gba:overflow-x-auto gba:bg-card gba:rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  field="displayName"
                  label={t('grid-employee')}
                  activeField={sortField}
                  order={sortOrder}
                  onSort={handleSort}
                  className="gba:min-w-[200px] gba:sticky gba:left-0 gba:z-20 gba:bg-card"
                />
                <TableHead className="gba:whitespace-nowrap">{t('grid-employee-id')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-status')}</TableHead>
                <SortableHead
                  field="department"
                  label={t('grid-department')}
                  activeField={sortField}
                  order={sortOrder}
                  onSort={handleSort}
                />
                <TableHead className="gba:whitespace-nowrap">{t('grid-hire-date')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-termination-date')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-cost-center')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-location')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-contract-type')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-fte')}</TableHead>
                <SortableHead
                  field="baseSalary"
                  label={t('grid-base-salary')}
                  activeField={sortField}
                  order={sortOrder}
                  onSort={handleSort}
                />
                <TableHead className="gba:whitespace-nowrap">{t('grid-bank-details')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-variable-pay')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-paid-leave')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-sick-leave')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-unpaid-leave')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-logged-hours')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-capacity')}</TableHead>
                <TableHead className="gba:whitespace-nowrap">{t('grid-balance')}</TableHead>
                <SortableHead
                  field="issues"
                  label={t('grid-issues')}
                  activeField={sortField}
                  order={sortOrder}
                  onSort={handleSort}
                />
                <SortableHead
                  field="readinessStatus"
                  label={t('grid-readiness')}
                  activeField={sortField}
                  order={sortOrder}
                  onSort={handleSort}
                />
                <TableHead className="gba:whitespace-nowrap">{t('grid-changed')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={22} className="gba:text-center gba:py-12 gba:text-muted-foreground">
                    {t('no-data')}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map(emp => {
                  const openIssues = emp.issues.filter(i => i.status === 'open')
                  const hasBlockers = openIssues.some(i => i.severity === 'blocker')

                  return (
                    <TableRow
                      key={emp.id}
                      className="gba:cursor-pointer gba:hover:bg-muted"
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      <TableCell className="gba:sticky gba:left-0 gba:z-10 gba:bg-card">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                            {emp.pictureThumbnail ? (
                              <img
                                src={`data:image/jpeg;base64,${emp.pictureThumbnail}`}
                                alt=""
                                className="gba:w-8 gba:h-8 gba:rounded-full gba:object-cover"
                              />
                            ) : (
                              <UserIcon size={14} className="gba:text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="gba:text-sm gba:font-medium gba:text-foreground gba:whitespace-nowrap">
                              {emp.displayName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="gba:text-xs gba:text-muted-foreground gba:font-mono">{emp.code}</TableCell>
                      <TableCell>
                        <Badge variant={emp.employmentStatus === 'terminated' ? 'destructive' : 'success'}>
                          {emp.employmentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="gba:text-sm gba:text-muted-foreground">{emp.department}</TableCell>
                      <TableCell className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">
                        {emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">
                        {emp.terminationDate ? new Date(emp.terminationDate).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="gba:text-sm gba:text-muted-foreground">{emp.costCenter}</TableCell>
                      <TableCell className="gba:text-sm gba:text-muted-foreground">{emp.workLocation || '—'}</TableCell>
                      <TableCell className="gba:text-sm gba:text-muted-foreground">{emp.contractType}</TableCell>
                      <TableCell className="gba:text-sm gba:text-muted-foreground">
                        {emp.fte != null ? emp.fte.toFixed(2) : '—'}
                      </TableCell>
                      <TableCell className="gba:text-sm gba:font-medium gba:text-foreground gba:whitespace-nowrap">
                        {emp.baseSalary != null ? `${emp.baseSalary.toLocaleString()} ${emp.currency}` : '—'}
                      </TableCell>
                      <TableCell>
                        <FieldStatusBadge present={emp.bankDetailsPresent} />
                      </TableCell>
                      <TableCell className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">
                        {emp.totalVariablePay != null
                          ? `${emp.totalVariablePay.toLocaleString()} ${emp.variablePayCurrency || ''}`
                          : '—'}
                      </TableCell>
                      <TableCell className="gba:text-sm gba:text-muted-foreground">
                        {emp.paidLeaveDays || '—'}
                      </TableCell>
                      <TableCell className="gba:text-sm gba:text-muted-foreground">
                        {emp.sickLeaveDays || '—'}
                      </TableCell>
                      <TableCell className="gba:text-sm gba:text-muted-foreground">
                        {emp.unpaidLeaveDays || '—'}
                      </TableCell>
                      <TableCell className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">
                        {emp.loggedHours != null ? `${emp.loggedHours}h` : '—'}
                      </TableCell>
                      <TableCell className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">
                        {emp.contractCapacityHours != null ? `${emp.contractCapacityHours}h` : '—'}
                      </TableCell>
                      <TableCell className="gba:whitespace-nowrap">
                        {emp.balanceHours != null ? (
                          <Badge variant={emp.balanceHours >= 0 ? 'success' : 'destructive'}>
                            {emp.balanceHours >= 0 ? '+' : ''}
                            {emp.balanceHours}h
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <IssueCountBadge count={openIssues.length} hasBlockers={hasBlockers} />
                      </TableCell>
                      <TableCell>
                        <ReadinessStatusBadge status={emp.readinessStatus} />
                      </TableCell>
                      <TableCell>
                        <ChangedBadge changed={emp.changedSinceLastPayroll} />
                      </TableCell>
                    </TableRow>
                  )
                })
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
                <SelectTrigger className="gba:h-8 gba:w-[100px]">
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
              >
                Prev
              </Button>
              <span className="gba:px-3">
                {currentPage} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {selectedEmployee && (
        <>
          <div
            className="gba:fixed gba:inset-0 gba:bg-foreground/20 gba:z-40"
            onClick={() => setSelectedEmployee(null)}
          />
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
