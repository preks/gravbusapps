import React, { useCallback, useState } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Spinner,
  Button
} from '@newwork/nw-design-system'
import { UserIcon, ArrowUpIcon, ArrowDownIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import { Employee } from '../hooks/useGetEmployeesReport'
import { SortConfig } from '../utils/sortUtils'
import { getTranslationFromI18nKeyAndLabel, formatDate, getCatalogValue } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

dayjs.extend(weekday)
dayjs.extend(localeData)

interface TeamReportTableProps extends BusinessAppContextProps {
  employees: Employee[]
  loading: boolean
  error: Error | null
  loadPage: (page: number, pageSize?: number) => void
  retry: () => void
  total: number
  onSelectEmployee?: (employee: Employee) => void
  selectedEmployeeId?: string
  sortConfig: SortConfig | null
  onSort: (key: keyof Employee) => void
}

const DATA_TEST_ID_PREFIX = 'TeamReportTable'

export const TeamReportTable: React.FC<TeamReportTableProps> = ({
  employees,
  loading,
  error,
  loadPage,
  retry,
  total,
  onSelectEmployee,
  selectedEmployeeId,
  sortConfig,
  onSort
}) => {
  const [pageSize, setPageSize] = useState(20)

  const handleRowClick = useCallback(
    (employee: Employee) => {
      if (onSelectEmployee) {
        onSelectEmployee(employee)
      }
    },
    [onSelectEmployee]
  )

  const handleSort = (field: keyof Employee) => {
    onSort(field)
  }

  const renderSortIcon = (field: keyof Employee) => {
    if (sortConfig?.key !== field) return null
    if (sortConfig.direction === 'asc') return <ArrowUpIcon className="gba:inline gba:ml-1" size={12} />
    if (sortConfig.direction === 'desc') return <ArrowDownIcon className="gba:inline gba:ml-1" size={12} />
    return null
  }

  const formatDateWithLocale = (dateString: string | undefined) => {
    if (!dateString) return '-'

    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'

    return formatDate(date, 'date.short') || '-'
  }

  const formatYearString = (years: number) => {
    if (years <= 0) return ''
    const yearLabel =
      years === 1
        ? getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.profile_icon_list.year', 'year')
        : getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.profile_icon_list.years', 'years')
    return `${years} ${yearLabel}`
  }

  const formatMonthString = (months: number) => {
    if (months <= 0) return ''
    const monthLabel =
      months === 1
        ? getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.profile_icon_list.month', 'month')
        : getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.profile_icon_list.months', 'months')
    return `${months} ${monthLabel}`
  }

  const formatTenure = (startDate: string | undefined, exitDate: string | null | undefined) => {
    if (!startDate) return '-'

    const endDate = exitDate ? dayjs(exitDate) : dayjs()
    const start = dayjs(startDate)

    if (!start.isValid() || !endDate.isValid()) return '-'

    const totalMonths = endDate.diff(start, 'month')
    const years = Math.floor(totalMonths / 12)
    const months = totalMonths % 12

    const yearString = formatYearString(years)
    const monthString = formatMonthString(months)

    if (yearString && monthString) {
      return `${yearString} ${getTranslationFromI18nKeyAndLabel('lowcoder:expense_summary_request.and', 'and')} ${monthString}`
    }

    return (
      yearString ||
      monthString ||
      '0 ' + getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.profile_icon_list.months', 'months')
    )
  }

  const handlePaginationChange = (page: number, newPageSize?: number) => {
    const targetPageSize = newPageSize ?? pageSize
    setPageSize(targetPageSize)
    loadPage(page, targetPageSize)
  }

  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <div className="gba:text-destructive gba:text-lg gba:font-medium gba:mb-2">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_report_table.error_loading_employees',
            'Error Loading Team Members'
          )}
        </div>
        <div className="gba:text-muted-foreground gba:mb-4">{error.message}</div>
        <Button variant="default" onClick={retry} data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}>
          {getTranslationFromI18nKeyAndLabel('lowcoder:team_report_table.retry', 'Retry')}
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:p-4">
        <Spinner />
      </div>
    )
  }

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <div className="gba:overflow-x-auto">
        <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
          <TableHeader>
            <TableRow className="gba:border-b">
              <TableHead
                className="gba:w-[20%] gba:font-medium gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none"
                onClick={() => handleSort('firstName')}
                data-testid={`${DATA_TEST_ID_PREFIX}-name-header`}
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.employee', 'Employee')}
                  {renderSortIcon('firstName')}
                </div>
              </TableHead>
              <TableHead
                className="gba:w-[18%] gba:font-medium gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none"
                onClick={() => handleSort('jobPosition')}
                data-testid={`${DATA_TEST_ID_PREFIX}-job-position-header`}
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.summary_layout.public_profile_container.job_position',
                    'Job Position'
                  )}
                  {renderSortIcon('jobPosition')}
                </div>
              </TableHead>
              <TableHead
                className="gba:w-[15%] gba:font-medium gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none"
                onClick={() => handleSort('location')}
                data-testid={`${DATA_TEST_ID_PREFIX}-location-header`}
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.profile_icon_list.location_title',
                    'Location'
                  )}
                  {renderSortIcon('location')}
                </div>
              </TableHead>
              <TableHead
                className="gba:w-[15%] gba:font-medium gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none"
                onClick={() => handleSort('employmentType')}
                data-testid={`${DATA_TEST_ID_PREFIX}-employment-type-header`}
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.employement_layout.working_conditions_container.employment_type_input',
                    'Employment Type'
                  )}
                  {renderSortIcon('employmentType')}
                </div>
              </TableHead>
              <TableHead
                className="gba:w-[15%] gba:font-medium gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none"
                onClick={() => handleSort('contractType')}
                data-testid={`${DATA_TEST_ID_PREFIX}-contract-type-header`}
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.employement_layout.working_conditions_container.contract_type_input',
                    'Contract Type'
                  )}
                  {renderSortIcon('contractType')}
                </div>
              </TableHead>
              <TableHead
                className="gba:w-[12%] gba:font-medium gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none"
                onClick={() => handleSort('startDate')}
                data-testid={`${DATA_TEST_ID_PREFIX}-start-date-header`}
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.employement_layout.working_conditions_container.hire_date_input',
                    'Start Date'
                  )}
                  {renderSortIcon('startDate')}
                </div>
              </TableHead>
              <TableHead
                className="gba:w-[15%] gba:font-medium gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none"
                onClick={() => handleSort('tenure')}
                data-testid={`${DATA_TEST_ID_PREFIX}-tenure-header`}
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.employement_layout.working_conditions_container.tenure_header',
                    'Tenure'
                  )}
                  {renderSortIcon('tenure')}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map(record => (
              <TableRow
                key={record.id}
                className={`gba:border-b ${selectedEmployeeId === record.id ? 'gba:bg-info-secondary' : ''}`}
                data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
              >
                <TableCell className="gba:py-8 gba:px-6" data-testid={`${DATA_TEST_ID_PREFIX}-name-cell-${record.id}`}>
                  <div
                    className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                    onClick={e => {
                      e.stopPropagation()
                      handleRowClick(record)
                    }}
                    data-testid={`${DATA_TEST_ID_PREFIX}-employee-name-${record.id}`}
                  >
                    <UserIcon size={16} className="gba:text-muted-foreground" />
                    <span className="gba:text-sm">
                      {record.firstName} {record.lastName}
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  className="gba:py-8 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-job-position-cell-${record.id}`}
                >
                  <span className="gba:text-sm">{record.jobPosition || '-'}</span>
                </TableCell>
                <TableCell
                  className="gba:py-8 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-location-cell-${record.id}`}
                >
                  <span className="gba:text-sm">{record.location || '-'}</span>
                </TableCell>
                <TableCell
                  className="gba:py-8 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-employment-type-cell-${record.id}`}
                >
                  <span className="gba:text-sm">
                    {record.employmentType ? getCatalogValue(record.employmentType) : '-'}
                  </span>
                </TableCell>
                <TableCell
                  className="gba:py-8 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-contract-type-cell-${record.id}`}
                >
                  <span className="gba:text-sm">
                    {record.contractType ? getCatalogValue(record.contractType) : '-'}
                  </span>
                </TableCell>
                <TableCell
                  className="gba:py-8 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-start-date-cell-${record.id}`}
                >
                  {record.startDate ? (
                    <span className="gba:text-sm">{formatDateWithLocale(record.startDate)}</span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell
                  className="gba:py-8 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-tenure-cell-${record.id}`}
                >
                  <span className="gba:text-sm">{formatTenure(record.startDate, record.exitDate)}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div
        className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-8"
        data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}
      >
        <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info`}>
          {`${total} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.statistics_tab.members', 'members')}`}
        </div>
        <div className="gba:flex gba:items-center gba:space-x-2">
          <p className="gba:text-sm gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.rows_per_page', 'Rows per page')}
          </p>
          <select
            value={pageSize}
            onChange={e => handlePaginationChange(1, Number(e.target.value))}
            className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
            data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select`}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  )
}
