'use client'

import React, { useCallback, useState } from 'react'
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
  Badge,
  Spinner,
  Card,
  CardContent,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { ArrowUpIcon, ArrowDownIcon, InfoIcon, LightningIcon } from '@phosphor-icons/react'
import { JobPosition } from '../hooks/useJobPositionListData'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface JobPositionTableProps {
  jobPositions: JobPosition[]
  loading: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => void
  loadPage: (page: number, pageSize?: number) => void
  retry: () => void
  total: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSelectJobPosition?: (jobPosition: JobPosition) => void
  selectedJobPositionId?: string
  sortField: string
  sortOrder: 'ASC' | 'DESC' | ''
  onSortingChange: (field: string, order: 'ASC' | 'DESC' | '') => void
  onEditJobPosition: (jobPosition: JobPosition) => void
  onRequestTerminateJobPosition: (jobPosition: JobPosition) => void
  terminateMutationLoading?: boolean
  terminatingJobPositionId?: string | null
}

const DATA_TEST_ID_PREFIX = 'JobPositionTable'

/**
 * Table component for displaying job positions with vacancy status and pagination
 * Updated to use nw-design-system components and design tokens
 */
export const JobPositionTable: React.FC<JobPositionTableProps> = ({
  jobPositions,
  loading,
  error,
  retry,
  total,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSelectJobPosition,
  selectedJobPositionId,
  sortField,
  sortOrder,
  onSortingChange,
  onEditJobPosition,
  onRequestTerminateJobPosition,
  terminateMutationLoading = false,
  terminatingJobPositionId = null
}) => {
  const { t } = useTranslation(hrTranslations)
  const [openActionsRowId, setOpenActionsRowId] = useState<string | null>(null)

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
      // Let parent reset page and load with the new size to avoid race conditions
      onPageSizeChange(newPageSize)
    },
    [onPageSizeChange]
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
      if (sortOrder === 'ASC') return <ArrowUpIcon className="gba:inline gba:ml-1" size={12} />
      if (sortOrder === 'DESC') return <ArrowDownIcon className="gba:inline gba:ml-1" size={12} />
      return null
    },
    [sortField, sortOrder]
  )

  // Get organizational unit display value
  const getOrganizationalUnitDisplay = (jobPosition: JobPosition) => {
    if (!jobPosition.organizationalUnitEmployees.length) return '-'

    return jobPosition.organizationalUnitEmployees.map(ou => ou.organizationalUnit.name).join(', ')
  }

  // Get job function display value
  const getJobFunctionDisplay = (jobPosition: JobPosition) => {
    return jobPosition.jobFunction?.name || '-'
  }

  // Render employee cell with vacancy status
  const renderEmployeeCell = (jobPosition: JobPosition) => {
    const assignedEmployeePosition = jobPosition.employeePositions.find(employeePosition =>
      Boolean(employeePosition?.employeeId)
    )
    const isVacant = !assignedEmployeePosition

    if (isVacant) {
      // Show vacant status using design system Badge
      return (
        <div className="flex items-center justify-start">
          <Badge
            variant="secondary"
            data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'vacant-badge')}
            style={{
              backgroundColor: 'var(--nw-color-warning-secondary)',
              color: 'var(--nw-color-warning-secondary-foreground)',
              borderColor: 'var(--nw-color-warning)'
            }}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.job_positions_section.vacant', 'Vacant')}
          </Badge>
        </div>
      )
    }

    // Show employee information when someone is assigned
    const employeePosition = assignedEmployeePosition
    const { firstName, lastName, employee } = employeePosition

    // Generate initials and avatar props like in employee-directory
    const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
    const avatarSrc = employee?.pictureThumbnail ? `data:image/gif;base64,${employee.pictureThumbnail}` : undefined

    return (
      <div
        className="gba:flex gba:items-center gba:gap-3"
        data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'employee-info')}
      >
        <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
          {avatarSrc && <AvatarImage src={avatarSrc} alt={`${firstName} ${lastName}`} />}
          <AvatarFallback className="gba:text-xs gba:font-medium">{initials}</AvatarFallback>
        </Avatar>
        <span className="gba:text-sm gba:font-medium gba:truncate">
          {firstName} {lastName}
        </span>
      </div>
    )
  }

  // Render manager cell using supervisor from employeePositions
  const renderManagerCell = (jobPosition: JobPosition) => {
    const supervisor = jobPosition.employeePositions?.[0]?.supervisor
    if (!supervisor) {
      return <span className="gba:text-sm">-</span>
    }
    const initials = `${supervisor.firstName?.[0] || ''}${supervisor.lastName?.[0] || ''}`.toUpperCase()
    const avatarSrc = supervisor.pictureThumbnail ? `data:image/gif;base64,${supervisor.pictureThumbnail}` : undefined
    return (
      <div
        className="gba:flex gba:items-center gba:gap-3"
        data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'manager-info')}
      >
        <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
          {avatarSrc && <AvatarImage src={avatarSrc} alt={`${supervisor.firstName} ${supervisor.lastName}`} />}
          <AvatarFallback className="gba:text-xs gba:font-medium">{initials}</AvatarFallback>
        </Avatar>
        <span className="gba:text-sm gba:font-medium gba:truncate">
          {supervisor.firstName} {supervisor.lastName}
        </span>
      </div>
    )
  }

  // If there's an error, show a message with retry button
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
                'lowcoder:human_resources_page.job_positions_section.error_loading',
                'Error Loading Job Positions'
              )}
            </div>
            <div className="gba:text-muted-foreground gba:mb-4">{error.message}</div>
            <Button
              variant="default"
              onClick={retry}
              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'retry-button')}
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.analytics_section.retry', 'Retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Handle row click for selection
  const handleRowClick = useCallback(
    (record: JobPosition) => {
      if (onSelectJobPosition) {
        onSelectJobPosition(record)
      }
    },
    [onSelectJobPosition]
  )

  // Show loading spinner if loading
  if (loading && jobPositions.length === 0) {
    return (
      <Card data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'container')}>
        <CardContent className="gba:p-0">
          <div className="gba:flex gba:justify-center gba:p-8">
            <Spinner size="lg" />
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
                  className="gba:w-[25%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted/80"
                  onClick={() => handleSort('name')}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'name-header')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:human_resources_page.employees_section.name', 'Name')}
                    {renderSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6"
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'department-header')}
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.job_positions_section.department',
                      'Department'
                    )}
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="gba:inline-flex gba:items-center gba:cursor-help gba:rounded gba:p-1 hover:gba:bg-muted/80">
                            <InfoIcon className="gba:text-muted-foreground" size={14} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={5}>
                          <p>
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:human_resources_page.job_positions_section.department_sorting_not_supported',
                              'Department sorting currently not supported'
                            )}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                {/* Manager */}
                <TableHead className="gba:w-[25%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.job_positions_section.manager',
                    'Manager'
                  )}
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted/80"
                  onClick={() => handleSort('jobFunction')}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'job-function-header')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.job_positions_section.job_function',
                      'Job Function'
                    )}
                    {renderSortIcon('jobFunction')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted/80"
                  onClick={() => handleSort('profile')}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'profile-header')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.job_positions_section.profile',
                      'Profile'
                    )}
                    {renderSortIcon('profile')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[25%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted/80"
                  onClick={() => handleSort('employee')}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'employee-header')}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.job_positions_section.employee',
                      'Employee'
                    )}
                    {renderSortIcon('employee')}
                  </div>
                </TableHead>
                {/* Marked for termination */}
                <TableHead
                  className="gba:w-[15%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                  onClick={() => handleSort('markedForTermination')}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'marked-for-termination-header')}
                >
                  <div className="gba:flex gba:items-center">
                    {t('hr-positions-marked-for-termination-title')}
                    {renderSortIcon('markedForTermination')}
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
              {jobPositions.map(jobPosition => (
                <TableRow
                  key={jobPosition.id}
                  onClick={() => handleRowClick(jobPosition)}
                  data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `row-${jobPosition.id}`)}
                  className={`gba:cursor-pointer hover:gba:bg-muted ${
                    selectedJobPositionId === jobPosition.id ? 'gba:bg-muted' : ''
                  }`}
                >
                  {/* Name */}
                  <TableCell
                    className="gba:py-4 gba:px-6 gba:font-medium"
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `name-${jobPosition.id}`)}
                  >
                    {jobPosition.name}
                  </TableCell>

                  {/* Department */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `department-${jobPosition.id}`)}
                  >
                    {getOrganizationalUnitDisplay(jobPosition)}
                  </TableCell>

                  {/* Manager */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `manager-${jobPosition.id}`)}
                  >
                    {renderManagerCell(jobPosition)}
                  </TableCell>

                  {/* Job Function */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `job-function-${jobPosition.id}`)}
                  >
                    {getJobFunctionDisplay(jobPosition)}
                  </TableCell>

                  {/* Profile */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `profile-${jobPosition.id}`)}
                  >
                    {jobPosition.jobProfile?.name || '-'}
                  </TableCell>

                  {/* Employee / Vacancy Status */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `employee-${jobPosition.id}`)}
                  >
                    {renderEmployeeCell(jobPosition)}
                  </TableCell>
                  {/* Marked for termination */}
                  <TableCell
                    className="gba:py-4 gba:px-6"
                    data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `termination-${jobPosition.id}`)}
                  >
                    {jobPosition.activeTo ? formatDate(jobPosition.activeTo, 'date.long') : '-'}
                  </TableCell>

                  {/* Actions Column - Last */}
                  <TableCell className="gba:py-4 gba:px-6">
                    <div onClick={e => e.stopPropagation()}>
                      {terminatingJobPositionId === jobPosition.id && terminateMutationLoading ? (
                        <div
                          className="gba:flex gba:h-9 gba:w-9 gba:items-center gba:justify-center"
                          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `actions-loading-${jobPosition.id}`)}
                        >
                          <Spinner size="sm" />
                        </div>
                      ) : (
                        <DropdownMenu
                          open={openActionsRowId === jobPosition.id}
                          onOpenChange={open => {
                            if (open) {
                              setOpenActionsRowId(jobPosition.id)
                            } else {
                              setOpenActionsRowId(prev => (prev === jobPosition.id ? null : prev))
                            }
                          }}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              type="button"
                              className="gba:h-9 gba:w-9 gba:border-info/50 gba:text-info gba:hover:bg-info-secondary/10 gba:hover:text-info gba:hover:border-info"
                              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `Actions-${jobPosition.id}`)}
                              aria-label={getTranslationFromI18nKeyAndLabel(
                                'lowcoder:human_resources_page.employees_section.actions',
                                'Actions'
                              )}
                            >
                              <LightningIcon className="gba:h-4 gba:w-4" weight="regular" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="gba:min-w-40">
                            <DropdownMenuItem
                              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `action-update-${jobPosition.id}`)}
                              onSelect={() => {
                                setOpenActionsRowId(null)
                                onEditJobPosition(jobPosition)
                              }}
                            >
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:human_resources_page.job_positions_section.update_position',
                                'Update'
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, `action-terminate-${jobPosition.id}`)}
                              disabled={Boolean(jobPosition.activeTo)}
                              onSelect={() => {
                                if (!jobPosition.activeTo) {
                                  setOpenActionsRowId(null)
                                  onRequestTerminateJobPosition(jobPosition)
                                }
                              }}
                            >
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:human_resources_page.job_positions_section.terminate',
                                'Terminate'
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {jobPositions.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} className="gba:text-center gba:text-muted-foreground gba:p-8">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.job_positions_section.no_job_positions_found',
                      'No job positions found'
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
            {t('hr-pagination-page-of', { current: currentPage, totalPages: Math.ceil(total / pageSize) })}
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
                <span className="gba:sr-only">{t('hr-pagination-first-page-sr')}</span>
                ⟨⟨
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || loading}
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'previous-page-button')}
              >
                <span className="gba:sr-only">{t('hr-pagination-prev-page-sr')}</span>⟨
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={handleNextPage}
                disabled={currentPage === totalPages || loading}
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'next-page-button')}
              >
                <span className="gba:sr-only">{t('hr-pagination-next-page-sr')}</span>⟩
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={handleLastPage}
                disabled={currentPage === totalPages || loading}
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'last-page-button')}
              >
                <span className="gba:sr-only">{t('hr-pagination-last-page-sr')}</span>
                ⟩⟩
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
