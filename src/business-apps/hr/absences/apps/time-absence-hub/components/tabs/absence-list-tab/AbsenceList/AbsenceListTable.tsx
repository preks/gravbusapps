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
import { CalendarIcon, UserIcon, ArrowUpIcon, ArrowDownIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '../../../../../../../../../common/utils/windowUtils'
import { getAbsenceStatusLabel } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { statusVariant } from '@/business-apps/hr/absences/apps/personal-absences/utils/statusUtils'
import { EnhancedAbsence } from '../../../../types'

const DATA_TEST_ID_PREFIX = 'BackofficeAbsenceList'
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const SORTABLE_HEAD_CLASS =
  'gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted'

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
  onOpenEmployeeRecord?: (employeeId: string) => void
}

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

const renderSortIcon = (field: string, sortField: string, sortOrder: 'ASC' | 'DESC' | '') => {
  if (sortField !== field) return null
  if (sortOrder === 'ASC') return <ArrowUpIcon className="gba:inline gba:ml-1" size={12} />
  if (sortOrder === 'DESC') return <ArrowDownIcon className="gba:inline gba:ml-1" size={12} />
  return null
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

interface SortableHeaderConfig {
  id: string
  widthClass: string
  sortField: string
  translationKey: string
  fallbackLabel: string
}

const SORTABLE_HEADERS: SortableHeaderConfig[] = [
  {
    id: 'employee',
    widthClass: 'gba:w-1/5',
    sortField: 'employeeName',
    translationKey: 'lowcoder:absence_table.employee',
    fallbackLabel: 'Employee'
  },
  {
    id: 'group',
    widthClass: 'gba:w-1/6',
    sortField: 'groupName',
    translationKey: 'lowcoder:absence_table.group',
    fallbackLabel: 'Group'
  },
  {
    id: 'start-date',
    widthClass: 'gba:w-1/12',
    sortField: 'startDate',
    translationKey: 'lowcoder:absence_table.start_date',
    fallbackLabel: 'Start Date'
  },
  {
    id: 'end-date',
    widthClass: 'gba:w-1/12',
    sortField: 'endDate',
    translationKey: 'lowcoder:absence_table.end_date',
    fallbackLabel: 'End Date'
  },
  {
    id: 'status',
    widthClass: 'gba:w-1/12',
    sortField: 'status',
    translationKey: 'lowcoder:expense_request_list.expense_plan_table.status',
    fallbackLabel: 'Status'
  },
  {
    id: 'days',
    widthClass: 'gba:w-16',
    sortField: 'effectiveDays',
    translationKey: 'lowcoder:absence_table.days',
    fallbackLabel: 'Days'
  },
  {
    id: 'created-at',
    widthClass: 'gba:w-1/6',
    sortField: 'createdAt',
    translationKey: 'lowcoder:expense_plan_list.expense_plan_table.create_date',
    fallbackLabel: 'Created At'
  }
]

interface RowColumnConfig {
  id: string
  testIdSuffix: string
  cellClassName: string
  renderCell: (record: EnhancedAbsence) => React.ReactNode
}

const DEFAULT_ROW_CELL_CLASS = 'gba:py-4 gba:px-6'

const ROW_COLUMNS: RowColumnConfig[] = [
  {
    id: 'employee',
    testIdSuffix: 'employee',
    cellClassName: DEFAULT_ROW_CELL_CLASS,
    renderCell: record => (
      <div className="gba:flex gba:items-center gba:gap-2">
        <UserIcon size={16} className="gba:text-muted-foreground" />
        <span className="gba:font-medium gba:text-sm">{getEmployeeName(record)}</span>
      </div>
    )
  },
  {
    id: 'group',
    testIdSuffix: 'group',
    cellClassName: DEFAULT_ROW_CELL_CLASS,
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
    id: 'start-date',
    testIdSuffix: 'start-date',
    cellClassName: DEFAULT_ROW_CELL_CLASS,
    renderCell: record => renderDateWithIcon(record.startDate)
  },
  {
    id: 'end-date',
    testIdSuffix: 'end-date',
    cellClassName: DEFAULT_ROW_CELL_CLASS,
    renderCell: record => renderDateWithIcon(record.endDate)
  },
  {
    id: 'status',
    testIdSuffix: 'status',
    cellClassName: DEFAULT_ROW_CELL_CLASS,
    renderCell: record => (
      <Badge variant={getStatusBadgeVariant(record.status)}>{getTranslatedStatus(record.status)}</Badge>
    )
  },
  {
    id: 'days',
    testIdSuffix: 'days',
    cellClassName: DEFAULT_ROW_CELL_CLASS,
    renderCell: record => <span className="gba:text-sm gba:font-medium">{record.effectiveDays || '-'}</span>
  },
  {
    id: 'created',
    testIdSuffix: 'created',
    cellClassName: DEFAULT_ROW_CELL_CLASS,
    renderCell: record => renderDateWithIcon(record.createdAt)
  }
]

interface RowsPerPageSelectProps {
  pageSize: number
  onChange: (nextPageSize: number) => void
  testId: string
}

const RowsPerPageSelect: React.FC<RowsPerPageSelectProps> = ({ pageSize, onChange, testId }) => (
  <div className="gba:flex gba:items-center gba:space-x-2">
    <p className="gba:text-sm gba:font-medium">
      {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.rows_per_page', 'Rows per page')}
    </p>
    <select
      value={pageSize}
      onChange={event => onChange(Number(event.target.value))}
      className="gba:h-8 gba:w-20 gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
      data-testid={testId}
    >
      {PAGE_SIZE_OPTIONS.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
)

interface PaginationIconButtonProps {
  onClick: () => void
  disabled: boolean
  testId: string
  icon: string
  labelKey: string
  fallbackLabel: string
}

const PaginationIconButton: React.FC<PaginationIconButtonProps> = ({
  onClick,
  disabled,
  testId,
  icon,
  labelKey,
  fallbackLabel
}) => (
  <Button
    variant="outline"
    size="sm"
    className="gba:h-8 gba:w-8 gba:p-0"
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
  >
    <span className="gba:sr-only">{getTranslationFromI18nKeyAndLabel(labelKey, fallbackLabel)}</span>
    <span aria-hidden="true">{icon}</span>
  </Button>
)

export const AbsenceListTable: React.FC<AbsenceListTableProps> = ({
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
  onOpenEmployeeRecord
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasMultiplePages = total > pageSize
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, total)

  if (error) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <div className="gba:text-center">
            <p className="gba:text-destructive gba:mb-2">{error.message}</p>
            <Button onClick={() => globalThis.window.location.reload()}>
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
              <TableRow className="gba:border-b gba:bg-muted">
                {SORTABLE_HEADERS.map(header => (
                  <TableHead
                    key={header.id}
                    className={`${header.widthClass} ${SORTABLE_HEAD_CLASS}`}
                    onClick={() => onSort(header.sortField)}
                  >
                    <div className="gba:flex gba:items-center">
                      {getTranslationFromI18nKeyAndLabel(header.translationKey, header.fallbackLabel)}
                      {renderSortIcon(header.sortField, sortField, sortOrder)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {absences.map(record => (
                <TableRow
                  key={record.id}
                  className="gba:cursor-pointer gba:border-b gba:transition-colors gba:hover:bg-muted"
                  onClick={() => {
                    if (record.employee?.id) {
                      onOpenEmployeeRecord?.(record.employee.id)
                    }
                  }}
                  data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                >
                  {ROW_COLUMNS.map(column => (
                    <TableCell
                      key={`${column.id}-${record.id}`}
                      className={column.cellClassName}
                      data-testid={`${DATA_TEST_ID_PREFIX}-${column.testIdSuffix}-cell-${record.id}`}
                    >
                      {column.renderCell(record)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div
          className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4"
          data-testid={
            hasMultiplePages
              ? `${DATA_TEST_ID_PREFIX}-pagination`
              : `${DATA_TEST_ID_PREFIX}-pagination-info-single-page`
          }
        >
          <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info`}>
            {hasMultiplePages
              ? `${rangeStart}-${rangeEnd} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} ${total} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.absence_list_screen.title', 'absences')}`
              : `${total} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.absences', 'absences')}`}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
            <RowsPerPageSelect
              pageSize={pageSize}
              onChange={nextPageSize => onPaginationChange(1, nextPageSize)}
              testId={
                hasMultiplePages
                  ? `${DATA_TEST_ID_PREFIX}-page-size-select`
                  : `${DATA_TEST_ID_PREFIX}-page-size-select-single`
              }
            />

            {hasMultiplePages && (
              <>
                <div
                  className="gba:flex gba:w-24 gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                  data-testid={`${DATA_TEST_ID_PREFIX}-page-info`}
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.page', 'Page')} {currentPage}{' '}
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} {totalPages}
                </div>
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <PaginationIconButton
                    onClick={() => onPaginationChange(1)}
                    disabled={currentPage === 1}
                    testId={`${DATA_TEST_ID_PREFIX}-first-page-button`}
                    icon="«"
                    labelKey="lowcoder:absence_management_hub_backoffice.absence_list.go_to_first_page"
                    fallbackLabel="Go to first page"
                  />
                  <PaginationIconButton
                    onClick={() => onPaginationChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    testId={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
                    icon="‹"
                    labelKey="lowcoder:absence_management_hub_backoffice.absence_list.go_to_previous_page"
                    fallbackLabel="Go to previous page"
                  />
                  <PaginationIconButton
                    onClick={() => onPaginationChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    testId={`${DATA_TEST_ID_PREFIX}-next-page-button`}
                    icon="›"
                    labelKey="lowcoder:absence_management_hub_backoffice.absence_list.go_to_next_page"
                    fallbackLabel="Go to next page"
                  />
                  <PaginationIconButton
                    onClick={() => onPaginationChange(totalPages)}
                    disabled={currentPage >= totalPages}
                    testId={`${DATA_TEST_ID_PREFIX}-last-page-button`}
                    icon="»"
                    labelKey="lowcoder:absence_management_hub_backoffice.absence_list.go_to_last_page"
                    fallbackLabel="Go to last page"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
