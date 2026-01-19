'use client'

import React, { useCallback } from 'react'
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
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EnhancedAbsence } from '../types'
import { useAbsenceColors } from '../utils/absenceColors'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { getAbsenceStatusLabel, getAbsenceStatusBadgeVariant } from '../../../utils/absenceStatusUtils'

interface AbsenceTableProps extends BusinessAppContextProps {
  absences: EnhancedAbsence[]
  loading: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => void
  loadPage: (page: number, pageSize?: number) => Promise<void>
  retry: () => void
  total: number
  currentPage: number
  pageSize: number
  sortField: string
  sortOrder: 'ASC' | 'DESC' | ''
  onSelectAbsence?: (absence: EnhancedAbsence) => void
  onPaginationChange: (page: number, pageSize?: number) => void
  onSortingChange: (field: string, order: 'ASC' | 'DESC' | '') => void
  selectedAbsenceId?: string
}

const DATA_TEST_ID_PREFIX = 'AbsenceTable'

export const AbsenceTable: React.FC<AbsenceTableProps> = ({
  absences,
  loading,
  error,
  retry,
  total,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  onSelectAbsence,
  onPaginationChange,
  onSortingChange,
  selectedAbsenceId,
  ...props
}) => {
  const { getColorForAbsence } = useAbsenceColors(props)

  const getEmployeeName = (absence: EnhancedAbsence) => {
    if (absence.employee.firstName || absence.employee.lastName) {
      return `${absence.employee.firstName || ''} ${absence.employee.lastName || ''}`.trim()
    }
    return '-'
  }

  const getAbsenceGroup = (absence: EnhancedAbsence) => {
    return absence.groupName || '-'
  }

  // Get the original group name for color lookup (before translation)
  const getOriginalGroupName = (absence: EnhancedAbsence) => {
    return absence.originalGroupName || absence.groupName || '-'
  }

  // Status mapping functions now use centralized utilities
  const getTranslatedStatus = (status: string) => {
    return getAbsenceStatusLabel(status)
  }

  const getStatusBadgeVariant = (status: string) => {
    return getAbsenceStatusBadgeVariant(status)
  }

  const handleRowClick = useCallback(
    (record: EnhancedAbsence) => {
      onSelectAbsence?.(record)
    },
    [onSelectAbsence]
  )

  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <div className="gba:text-destructive gba:text-lg gba:font-medium gba:mb-2">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.error_loading_absences', 'Error Loading Absences')}
        </div>
        <div className="gba:text-muted-foreground gba:mb-4">{error.message}</div>
        <Button variant="default" onClick={retry} data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}>
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.retry', 'Retry')}
        </Button>
      </div>
    )
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'ASC') {
        onSortingChange(field, 'DESC')
      } else if (sortOrder === 'DESC') {
        onSortingChange('', '')
      } else {
        onSortingChange(field, 'ASC')
      }
    } else {
      onSortingChange(field, 'ASC')
    }
  }

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null
    if (sortOrder === 'ASC') return <PiArrowUp className="gba:inline gba:ml-1" size={12} />
    if (sortOrder === 'DESC') return <PiArrowDown className="gba:inline gba:ml-1" size={12} />
    return null
  }

  return (
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <CardContent className="gba:p-0">
        {loading && (
          <div className="gba:flex gba:justify-center gba:p-4">
            <Spinner />
          </div>
        )}

        <div className="gba:overflow-x-auto">
          <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-muted">
                <TableHead
                  className="gba:w-[20%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('employee.firstName')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-employee-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.employee', 'Employee')}
                    {renderSortIcon('employee.firstName')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('groupName')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-group-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.group', 'Group')}
                    {renderSortIcon('groupName')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[12%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('startDate')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-start-date-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.start_date', 'Start Date')}
                    {renderSortIcon('startDate')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[12%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('endDate')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-end-date-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.end_date', 'End Date')}
                    {renderSortIcon('endDate')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[10%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('status')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_request_list.expense_plan_table.status',
                      'Status'
                    )}
                    {renderSortIcon('status')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[6%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('effectiveDays')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-days-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.days', 'Days')}
                    {renderSortIcon('effectiveDays')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('createdAt')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-created-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_plan_list.expense_plan_table.create_date',
                      'Created At'
                    )}
                    {renderSortIcon('createdAt')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {absences.map(record => (
                <TableRow
                  key={record.id}
                  className={`gba:border-b gba:hover:bg-muted gba:transition-colors ${selectedAbsenceId === record.id ? 'gba:bg-info-secondary' : ''}`}
                  data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                >
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-employee-cell-${record.id}`}
                  >
                    <div
                      className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:hover:bg-muted gba:p-2 gba:rounded gba:transition-colors"
                      onClick={e => {
                        e.stopPropagation()
                        handleRowClick(record)
                      }}
                      data-testid={`${DATA_TEST_ID_PREFIX}-employee-name-${record.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiUser size={16} className="gba:text-muted-foreground" />
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
                        backgroundColor: getColorForAbsence(getOriginalGroupName(record)),
                        color: 'var(--nw-primary-foreground)',
                        borderColor: getColorForAbsence(getOriginalGroupName(record))
                      }}
                    >
                      {getAbsenceGroup(record)}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-start-date-cell-${record.id}`}
                  >
                    {record.startDate ? (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCalendar size={16} className="gba:text-muted-foreground" />
                        <span className="gba:text-sm">{formatDate(record.startDate, 'date.short') || '-'}</span>
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
                        <PiCalendar size={16} className="gba:text-muted-foreground" />
                        <span className="gba:text-sm">{formatDate(record.endDate, 'date.short') || '-'}</span>
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
                        <PiCalendar size={16} className="gba:text-muted-foreground" />
                        <span className="gba:text-sm">{formatDate(record.createdAt, 'date.short') || '-'}</span>
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
      </CardContent>

      {total > pageSize ? (
        <div
          className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4"
          data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}
        >
          <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info`}>
            {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, total)} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} ${total} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.absence_list_screen.title', 'absences')}`}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
            <div className="gba:flex gba:items-center gba:space-x-2">
              <p className="gba:text-sm gba:font-medium">
                {' '}
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
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => onPaginationChange(1)}
                disabled={currentPage === 1}
                data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
              >
                <span className="gba:sr-only">Go to first page</span>
                ⟨⟨
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => onPaginationChange(currentPage - 1)}
                disabled={currentPage === 1}
                data-testid={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
              >
                <span className="gba:sr-only">Go to previous page</span>⟨
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => onPaginationChange(currentPage + 1)}
                disabled={currentPage >= Math.ceil(total / pageSize)}
                data-testid={`${DATA_TEST_ID_PREFIX}-next-page-button`}
              >
                <span className="gba:sr-only">Go to next page</span>⟩
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => onPaginationChange(Math.ceil(total / pageSize))}
                disabled={currentPage >= Math.ceil(total / pageSize)}
                data-testid={`${DATA_TEST_ID_PREFIX}-last-page-button`}
              >
                <span className="gba:sr-only">Go to last page</span>
                ⟩⟩
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
    </Card>
  )
}
