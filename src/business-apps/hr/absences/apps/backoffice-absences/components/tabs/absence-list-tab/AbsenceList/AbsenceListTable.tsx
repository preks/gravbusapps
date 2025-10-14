import React from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Card,
  CardContent,
  Spinner,
  Button,
  Badge
} from '@newwork/nw-design-system'
import { PiCalendar, PiUser, PiArrowUp, PiArrowDown } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '../../../../../../../../../common/utils/windowUtils'
import {
  getAbsenceStatusLabel,
  getAbsenceStatusBadgeVariant
} from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { EnhancedAbsence } from '../../../../types'

const DATA_TEST_ID_PREFIX = 'BackofficeAbsenceList'

interface AbsenceListTableProps {
  absences: EnhancedAbsence[]
  loading: boolean
  error: Error | null
  total: number
  currentPage: number
  pageSize: number
  sortField: string
  sortOrder: 'ASC' | 'DESC' | ''
  selectedAbsence: EnhancedAbsence | null
  onRowClick: (record: EnhancedAbsence) => void
  onSort: (field: string) => void
  onPaginationChange: (page: number, newPageSize?: number) => void
}

// Helper functions
const getColorForAbsence = (absence: EnhancedAbsence) => {
  // First try to use the color from GraphQL
  if (absence.color) {
    return absence.color
  }

  // Fallback to hardcoded colors based on group name
  const groupColors: Record<string, string> = {
    Vacation: '#10b981',
    'Sick Leave': '#ef4444',
    'Personal Leave': '#8b5cf6',
    'Maternity Leave': '#f59e0b',
    'Paternity Leave': '#06b6d4',
    Bereavement: '#6b7280',
    'Jury Duty': '#84cc16',
    'Military Leave': '#f97316'
  }

  return groupColors[absence.groupName] || '#6b7280'
}

const getEmployeeName = (absence: EnhancedAbsence) => {
  if (absence.employee && (absence.employee.firstName || absence.employee.lastName)) {
    return `${absence.employee.firstName || ''} ${absence.employee.lastName || ''}`.trim()
  }
  return '-'
}

// Status mapping functions now use centralized utilities
const getTranslatedStatus = (status: string) => {
  return getAbsenceStatusLabel(status)
}

const getStatusBadgeVariant = (status: string) => {
  return getAbsenceStatusBadgeVariant(status)
}

const renderSortIcon = (field: string, sortField: string, sortOrder: 'ASC' | 'DESC' | '') => {
  if (sortField !== field) return null
  if (sortOrder === 'ASC') return <PiArrowUp className="gba:inline gba:ml-1" size={12} />
  if (sortOrder === 'DESC') return <PiArrowDown className="gba:inline gba:ml-1" size={12} />
  return null
}

const formatDateForDisplay = (dateStr: string) => {
  return formatDate(dateStr, 'date.short')
}

export const AbsenceListTable: React.FC<AbsenceListTableProps> = ({
  absences,
  loading,
  error,
  total,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  selectedAbsence,
  onRowClick,
  onSort,
  onPaginationChange
}) => {
  if (error) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <div className="gba:text-center">
            <p className="gba:text-red-600 gba:mb-2">{error.message}</p>
            <Button onClick={() => window.location.reload()}>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.absence_list.retry',
                'Retry'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
        <CardContent className="gba:flex gba:justify-center gba:p-4">
          <Spinner />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <CardContent className="gba:p-0">
        <div className="gba:overflow-x-auto">
          <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                <TableHead
                  className="gba:w-[20%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => onSort('employeeName')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.employee', 'Employee')}
                    {renderSortIcon('employeeName', sortField, sortOrder)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => onSort('groupName')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.group', 'Group')}
                    {renderSortIcon('groupName', sortField, sortOrder)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => onSort('startDate')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.start_date', 'Start Date')}
                    {renderSortIcon('startDate', sortField, sortOrder)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => onSort('endDate')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.end_date', 'End Date')}
                    {renderSortIcon('endDate', sortField, sortOrder)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => onSort('status')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_request_list.expense_plan_table.status',
                      'Status'
                    )}
                    {renderSortIcon('status', sortField, sortOrder)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[6%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => onSort('effectiveDays')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.days', 'Days')}
                    {renderSortIcon('effectiveDays', sortField, sortOrder)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                  onClick={() => onSort('createdAt')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_plan_list.expense_plan_table.create_date',
                      'Created At'
                    )}
                    {renderSortIcon('createdAt', sortField, sortOrder)}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {absences.map(record => (
                <TableRow
                  key={record.id}
                  className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors ${selectedAbsence?.id === record.id ? 'gba:bg-blue-50' : ''}`}
                  data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                >
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-employee-cell-${record.id}`}
                  >
                    <div
                      className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                      onClick={() => onRowClick(record)}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiUser size={16} className="gba:text-gray-400" />
                        <span className="gba:font-medium gba:text-sm">{getEmployeeName(record)}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-group-cell-${record.id}`}
                  >
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: getColorForAbsence(record),
                        color: 'white',
                        borderColor: getColorForAbsence(record)
                      }}
                    >
                      {record.groupName}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-start-date-cell-${record.id}`}
                  >
                    {record.startDate ? (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCalendar size={14} className="gba:text-gray-400" />
                        <span className="gba:text-sm">{formatDateForDisplay(record.startDate)}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-end-date-cell-${record.id}`}
                  >
                    {record.endDate ? (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCalendar size={14} className="gba:text-gray-400" />
                        <span className="gba:text-sm">{formatDateForDisplay(record.endDate)}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-status-cell-${record.id}`}
                  >
                    <Badge variant={getStatusBadgeVariant(record.status)}>{getTranslatedStatus(record.status)}</Badge>
                  </TableCell>
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-days-cell-${record.id}`}
                  >
                    <span className="gba:text-sm gba:font-medium">{record.effectiveDays || '-'}</span>
                  </TableCell>
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-created-cell-${record.id}`}
                  >
                    {record.createdAt ? (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCalendar size={14} className="gba:text-gray-400" />
                        <span className="gba:text-sm">{formatDateForDisplay(record.createdAt)}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer - match manager absences design */}
        {total > pageSize ? (
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4"
            data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}
          >
            <div
              className="gba:text-sm gba:text-muted-foreground"
              data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info`}
            >
              {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, total)} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} ${total} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.absence_list_screen.title', 'absences')}`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.rows_per_page', 'Rows per page')}
                </p>
                <select
                  value={pageSize}
                  onChange={e => onPaginationChange(1, Number(e.target.value))}
                  className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                  data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select`}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div
                className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                data-testid={`${DATA_TEST_ID_PREFIX}-page-info`}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.page', 'Page')} {currentPage}{' '}
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} {Math.ceil(total / pageSize)}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => onPaginationChange(1)}
                  disabled={currentPage === 1}
                  data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
                >
                  <span className="gba:sr-only">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.absence_list.go_to_first_page',
                      'Go to first page'
                    )}
                  </span>
                  «
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => onPaginationChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
                >
                  <span className="gba:sr-only">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.absence_list.go_to_previous_page',
                      'Go to previous page'
                    )}
                  </span>
                  ‹
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => onPaginationChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(total / pageSize)}
                  data-testid={`${DATA_TEST_ID_PREFIX}-next-page-button`}
                >
                  <span className="gba:sr-only">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.absence_list.go_to_next_page',
                      'Go to next page'
                    )}
                  </span>
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => onPaginationChange(Math.ceil(total / pageSize))}
                  disabled={currentPage >= Math.ceil(total / pageSize)}
                  data-testid={`${DATA_TEST_ID_PREFIX}-last-page-button`}
                >
                  <span className="gba:sr-only">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.absence_list.go_to_last_page',
                      'Go to last page'
                    )}
                  </span>
                  »
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4"
            data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info-single-page`}
          >
            <div className="gba:text-sm gba:text-muted-foreground">
              {`${total} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.absences', 'absences')}`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <p className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.rows_per_page', 'Rows per page')}
              </p>
              <select
                value={pageSize}
                onChange={e => onPaginationChange(1, Number(e.target.value))}
                className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select-single`}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
