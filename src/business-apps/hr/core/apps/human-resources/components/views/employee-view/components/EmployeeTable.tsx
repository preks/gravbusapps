'use client'

import React, { useCallback, memo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Spinner,
  Card,
  CardContent
} from '@newwork/nw-design-system'
import { PiArrowUp, PiArrowDown } from 'react-icons/pi'
import { Employee } from '@/business-apps/hr/core/hooks/useGetEmployees'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// Memoized AppActionButton to prevent unnecessary re-renders and API calls
const MemoizedAppActionButton = memo<{
  employeeId: string
  userId?: string
  supervisorEmployeeId?: string
  organizationalUnitId?: string
  accessToken: string
  dataTestIdPrefix: string
}>(({ employeeId, userId, supervisorEmployeeId, organizationalUnitId, accessToken, dataTestIdPrefix }) => (
  <AppActionButton
    data-testid={formatDataTestId(dataTestIdPrefix, `Actions-${employeeId}`)}
    size="icon"
    contextsArray={[FlowContextName.employeeEntity]}
    externalContextData={{
      employeeId: employeeId,
      keycloakUserId: userId,
      managerId: supervisorEmployeeId,
      organizationalUnitId: organizationalUnitId
    }}
    prefixDataTestId={`${dataTestIdPrefix}-action-${employeeId}`}
    accessToken={accessToken}
    emptyStateBehavior="enable"
    deferMainContextRequestsUntilClick
  ></AppActionButton>
))

MemoizedAppActionButton.displayName = 'MemoizedAppActionButton'

interface EmployeeTableProps {
  employees: Employee[]
  loading: boolean
  error: Error | null
  loadPage: (page: number, pageSize?: number) => void
  retry: () => void
  total: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSelectEmployee?: (employee: Employee) => void
  selectedEmployeeId?: string
  accessToken?: string
  sortField: string
  sortOrder: 'ASC' | 'DESC' | ''
  onSortingChange: (field: string, order: 'ASC' | 'DESC' | '') => void
}

const DATA_TEST_ID_PREFIX = 'EmployeeTable'

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  loading,
  error,
  retry,
  total,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSelectEmployee,
  selectedEmployeeId,
  accessToken,
  sortField,
  sortOrder,
  onSortingChange
}) => {
  // Calculate pagination values
  const totalPages = Math.ceil(total / pageSize)

  // Handle page navigation
  const handleFirstPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(1)
    }
  }, [currentPage, onPageChange])

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }, [currentPage, onPageChange])

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }, [currentPage, totalPages, onPageChange])

  const handleLastPage = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(totalPages)
    }
  }, [currentPage, totalPages, onPageChange])

  // Handle page size change
  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      onPageSizeChange(newPageSize)
      onPageChange(1) // Reset to first page when changing page size
    },
    [onPageChange, onPageSizeChange]
  )

  // Helper function to handle column sorting
  const handleSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        // Cycle through: ASC -> DESC -> clear
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
    },
    [sortField, sortOrder, onSortingChange]
  )

  // Helper function to render sort icon
  const renderSortIcon = useCallback(
    (field: string) => {
      if (sortField !== field) return null
      if (sortOrder === 'ASC') return <PiArrowUp className="gba:inline gba:ml-1" size={12} />
      if (sortOrder === 'DESC') return <PiArrowDown className="gba:inline gba:ml-1" size={12} />
      return null
    },
    [sortField, sortOrder]
  )

  // Handle row click to select employee
  const handleRowClick = useCallback(
    (employee: Employee) => {
      if (onSelectEmployee) {
        onSelectEmployee(employee)
      }
    },
    [onSelectEmployee]
  )

  // Render employee cell with name and avatar
  const renderEmployeeNameCell = (employee: Employee) => {
    const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase()
    const avatarSrc = employee.profilePicture ? `data:image/gif;base64,${employee.profilePicture}` : undefined

    return (
      <div
        className="gba:flex gba:items-center gba:gap-3"
        data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'employee-info')}
      >
        <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
          {avatarSrc && <AvatarImage src={avatarSrc} alt={`${employee.firstName} ${employee.lastName}`} />}
          <AvatarFallback className="gba:text-xs gba:font-medium">{initials}</AvatarFallback>
        </Avatar>
        <span className="gba:text-sm gba:font-medium gba:truncate">
          {employee.firstName} {employee.lastName}
        </span>
      </div>
    )
  }

  // Show loading spinner if loading
  if (loading && employees.length === 0) {
    return (
      <div className="layout-content gap-md items-center justify-center" style={{ padding: 'var(--nw-spacing-8)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  // Show error message if there's an error
  if (error) {
    return (
      <Card data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'container')}>
        <CardContent className="gba:p-0">
          <div
            className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
            data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'error-state')}
          >
            <div className="gba:text-destructive gba:text-lg gba:font-medium gba:mb-2">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:human_resources_page.employees_section.error_loading_employees',
                'Error Loading Employees'
              )}
            </div>
            <div className="gba:text-muted-foreground gba:mb-4">{error.message}</div>
            <Button
              variant="default"
              onClick={retry}
              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'retry-button')}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.employees_section.retry', 'Retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render the Table with nw-design-system components
  return (
    <Card data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'container')}>
      <CardContent className="gba:p-0">
        <div className="gba:overflow-x-auto">
          <Table data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'table')}>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-muted">
                <TableHead
                  className="gba:w-[30%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('name')}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'name-header')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.employees_section.name', 'Name')}
                    {renderSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('jobTitle')}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'job-title-header')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.employees_section.job_title',
                      'Job Title'
                    )}
                    {renderSortIcon('jobTitle')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[20%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('organizationalUnit')}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'organizational-unit-header')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.employees_section.organizational_unit',
                      'Department'
                    )}
                    {renderSortIcon('organizationalUnit')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('employmentType')}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'employment-type-header')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.employees_section.employment_type',
                      'Employment Type'
                    )}
                    {renderSortIcon('employmentType')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('contractType')}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'contract-type-header')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.employees_section.contract_type',
                      'Contract Type'
                    )}
                    {renderSortIcon('contractType')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[5%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6"
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'actions-header')}
                >
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.employees_section.actions',
                    'Actions'
                  )}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(employee => (
                <TableRow
                  key={employee.id}
                  onClick={() => handleRowClick(employee)}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `row-${employee.id}`)}
                  className={`gba:cursor-pointer hover:gba:bg-muted ${
                    selectedEmployeeId === employee.id ? 'gba:bg-muted' : ''
                  }`}
                >
                  {/* Employee Name with Avatar */}
                  <TableCell
                    className="gba:py-4 gba:px-6 gba:font-medium"
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `name-${employee.id}`)}
                  >
                    {renderEmployeeNameCell(employee)}
                  </TableCell>

                  {/* Job Title */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `job-title-${employee.id}`)}
                  >
                    {employee.jobTitle || '-'}
                  </TableCell>

                  {/* Organizational Unit */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `org-unit-${employee.id}`)}
                  >
                    {employee.organizationalUnit || '-'}
                  </TableCell>

                  {/* Employment Type */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `employment-type-${employee.id}`)}
                  >
                    {employee.employmentType || '-'}
                  </TableCell>

                  {/* Contract Type */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `contract-type-${employee.id}`)}
                  >
                    {employee.contractType || '-'}
                  </TableCell>

                  {/* Actions Column - Last */}
                  <TableCell className="gba:py-4 gba:px-6">
                    {accessToken ? (
                      <div onClick={e => e.stopPropagation()}>
                        <MemoizedAppActionButton
                          employeeId={employee.id}
                          userId={employee.userId}
                          supervisorEmployeeId={employee.supervisorEmployeeId}
                          organizationalUnitId={employee.organizationalUnitId}
                          accessToken={accessToken}
                          dataTestIdPrefix={DATA_TEST_ID_PREFIX}
                        />
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}

              {employees.length === 0 && !loading && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                    style={{ padding: 'var(--nw-spacing-8)' }}
                  >
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.employees_section.no_employees_found',
                      'No employees found'
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls - Outside scrolling area */}
        {/* Pagination */}
        <div
          className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4"
          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'pagination')}
        >
          <div
            className="gba:text-sm gba:text-muted-foreground"
            data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'pagination-info')}
          >
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:human_resources_page.employees_section.pagination_range_of_total',
              `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, total)} of ${total} employees`,
              {
                from: (currentPage - 1) * pageSize + 1,
                to: Math.min(currentPage * pageSize, total),
                total,
                interpolation: { escapeValue: false }
              }
            )}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
            <div className="gba:flex gba:items-center gba:space-x-2">
              <p className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:human_resources_page.employees_section.rows_per_page',
                  'Rows per page'
                )}
              </p>
              <select
                value={pageSize}
                onChange={e => handlePageSizeChange(Number(e.target.value))}
                className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'page-size-select')}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div
              className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'page-info')}
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:human_resources_page.pagination.page_of',
                `Page ${currentPage} of ${Math.ceil(total / pageSize)}`,
                {
                  current: currentPage,
                  totalPages: Math.ceil(total / pageSize),
                  interpolation: { escapeValue: false }
                }
              )}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={handleFirstPage}
                disabled={currentPage === 1 || loading}
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'first-page-button')}
              >
                <span className="gba:sr-only">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.pagination.first_page_sr',
                    'Go to first page'
                  )}
                </span>
                ⟨⟨
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || loading}
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'previous-page-button')}
              >
                <span className="gba:sr-only">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.pagination.prev_page_sr',
                    'Go to previous page'
                  )}
                </span>
                ⟨
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={handleNextPage}
                disabled={currentPage === totalPages || loading}
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'next-page-button')}
              >
                <span className="gba:sr-only">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.pagination.next_page_sr',
                    'Go to next page'
                  )}
                </span>
                ⟩
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={handleLastPage}
                disabled={currentPage === totalPages || loading}
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'last-page-button')}
              >
                <span className="gba:sr-only">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.pagination.last_page_sr',
                    'Go to last page'
                  )}
                </span>
                ⟩⟩
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
