import React, { useMemo, useState } from 'react'
import {
  Button,
  Badge,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import {
  CaretDownIcon as ChevronDown,
  CaretLeftIcon as ChevronLeft,
  CaretUpIcon as ChevronUp
} from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DirectReport } from '../hooks/useDirectReports'
import { getAbsenceStatusBadgeVariant } from '@/business-apps/hr/absences/utils/absenceStatusUtils'

export interface FilteredTeammatesViewProps {
  directReports: DirectReport[]
  unallocatedEmployeeIds: string[]
  employeeAllocations: Array<{ id: string; allocationPercent: number }>
  filterAbsentOnly: boolean
  filterUnallocatedOnly: boolean
  loadingDirectReports: boolean
  directReportsError: Error | null
  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
  onAssignProject: (employeeId: string) => void
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  jobTitle: string
  organizationalUnit: string
  profilePicture: string
  allocationPercent: number
  status?: string
  currentAbsence?: {
    type: string
    parentEntryId?: string
    startDate: string
    endDate: string
    status: string
  }
}

const StatusBadge: React.FC<{ employee: Employee }> = ({ employee }) => {
  if (employee.status === 'On Leave') {
    const absenceVariant = getAbsenceStatusBadgeVariant(employee.currentAbsence?.status)

    return (
      <Badge variant={absenceVariant}>
        {employee.currentAbsence?.type ||
          getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.on_leave', 'On Leave')}
      </Badge>
    )
  }
  if (employee.status === 'Available') {
    return (
      <Badge variant="success">
        {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.available', 'Available')}
      </Badge>
    )
  }
  return <Badge variant="secondary">{employee.status || '-'}</Badge>
}

export const FilteredTeammatesView: React.FC<FilteredTeammatesViewProps> = ({
  directReports,
  unallocatedEmployeeIds,
  employeeAllocations,
  filterAbsentOnly,
  filterUnallocatedOnly,
  loadingDirectReports,
  directReportsError,
  onNavigateBack,
  onNavigateToEmployee,
  onAssignProject
}) => {
  const [sortField, setSortField] = useState<'name' | 'allocation'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const allocationMap = useMemo(
    () => new Map(employeeAllocations.map(item => [item.id, item.allocationPercent])),
    [employeeAllocations]
  )

  // Filter direct reports based on active filter
  const getFilteredDirectReports = () => {
    if (filterAbsentOnly) {
      return directReports.filter(report => report.status === 'On Leave')
    }
    if (filterUnallocatedOnly) {
      return directReports
    }
    return directReports
  }
  const filteredDirectReports = getFilteredDirectReports()

  // Helper functions for display text
  const getHeaderTitle = () => {
    if (filterAbsentOnly) {
      return getTranslationFromI18nKeyAndLabel(
        'master-data:hr.manager_dashboard.absent_teammates',
        'Absent Team Members'
      )
    }
    if (filterUnallocatedOnly) {
      return getTranslationFromI18nKeyAndLabel(
        'master-data:hr.manager_dashboard.unallocated_teammates',
        'Unallocated Team Members'
      )
    }
    return getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.my_teammates', 'My Teammates')
  }

  const getBadgeText = (count: number) => {
    if (filterAbsentOnly) {
      return `${count} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.out_of_office', 'out of office')}`
    }
    if (filterUnallocatedOnly) {
      return `${unallocatedEmployeeIds.length} ${getTranslationFromI18nKeyAndLabel(
        'master-data:hr.manager_dashboard.not_allocated',
        'not allocated'
      )}`
    }
    return `${count} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.total_teammates', 'team members').toLowerCase()}`
  }

  const getEmptyMessage = () => {
    if (filterAbsentOnly) {
      return getTranslationFromI18nKeyAndLabel(
        'master-data:hr.manager_dashboard.no_absent_members',
        'No team members are currently out of office'
      )
    }
    if (filterUnallocatedOnly) {
      return getTranslationFromI18nKeyAndLabel(
        'master-data:hr.manager_dashboard.no_unallocated_members',
        'All team members are allocated to projects'
      )
    }
    return getTranslationFromI18nKeyAndLabel(
      'master-data:hr.manager_dashboard.no_team_members',
      'No team members found'
    )
  }

  // Transform DirectReport data to Employee interface format
  const transformedFilteredReports: Employee[] = filteredDirectReports.map(report => ({
    id: report.id,
    firstName: report.firstName,
    lastName: report.lastName,
    jobTitle: report.jobPositionName || '',
    organizationalUnit: report.organizationalUnitName || '',
    profilePicture: report.pictureThumbnail || '',
    allocationPercent: allocationMap.get(report.id) ?? 0,
    status: report.status === 'Away' ? 'On Leave' : report.status,
    currentAbsence: report.currentAbsence
      ? {
          type: report.currentAbsence.type,
          parentEntryId: report.currentAbsence.parentEntryId,
          startDate: report.currentAbsence.startDate,
          endDate: report.currentAbsence.endDate,
          status: report.currentAbsence.status
        }
      : undefined
  }))

  const sortedFilteredReports = useMemo(() => {
    const cloned = [...transformedFilteredReports]

    cloned.sort((a, b) => {
      if (sortField === 'allocation') {
        const allocationComparison = a.allocationPercent - b.allocationPercent
        return sortDirection === 'asc' ? allocationComparison : -allocationComparison
      }

      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase()
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase()
      const nameComparison = nameA.localeCompare(nameB)
      return sortDirection === 'asc' ? nameComparison : -nameComparison
    })

    return cloned
  }, [transformedFilteredReports, sortField, sortDirection])

  const handleSortChange = (field: 'name' | 'allocation') => {
    if (sortField === field) {
      setSortDirection(current => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortField(field)
    setSortDirection('asc')
  }

  const handleSelectEmployee = (employee: Employee) => {
    onNavigateToEmployee(employee.id)
  }

  const renderSortIndicator = (field: 'name' | 'allocation') => {
    if (sortField !== field) {
      return null
    }

    return sortDirection === 'asc' ? (
      <ChevronUp size={14} className="gba:text-muted-foreground" />
    ) : (
      <ChevronDown size={14} className="gba:text-muted-foreground" />
    )
  }

  const getHeaderBadgeVariant = () => {
    if (filterAbsentOnly) return 'warning' as const
    if (filterUnallocatedOnly) return 'secondary' as const
    return 'secondary' as const
  }

  return (
    <div className="gba:p-6 gba:h-full gba:flex gba:flex-col">
      {/* Header section */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
        <div className="gba:flex gba:items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack}
            className="gba:mr-4"
            data-testid="manager-dashboard-filtered-teammates-back-button"
          >
            <ChevronLeft size={16} className="gba:mr-1" />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
              'Back to Dashboard'
            )}
          </Button>
          <h1 className="gba:text-xl gba:font-semibold">{getHeaderTitle()}</h1>
          <Badge variant={getHeaderBadgeVariant()} className="gba:ml-3">
            {getBadgeText(transformedFilteredReports.length)}
          </Badge>
        </div>
      </div>

      {/* Loading State */}
      {loadingDirectReports && (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Error State */}
      {directReportsError && (
        <div className="gba:text-center gba:py-12">
          <div className="gba:text-destructive gba:mb-4">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.status.failed_load_team',
              'Failed to load team members'
            )}
          </div>
          <Button onClick={() => globalThis.location.reload()} variant="outline">
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.try_again', 'Try Again')}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loadingDirectReports && !directReportsError && transformedFilteredReports.length === 0 && (
        <div className="gba:text-center gba:py-12 gba:text-muted-foreground">{getEmptyMessage()}</div>
      )}

      {/* Team Members Table */}
      {!loadingDirectReports && !directReportsError && transformedFilteredReports.length > 0 && (
        <div className="gba:flex-1 gba:overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSortChange('name')}
                    className="gba:inline-flex gba:items-center gba:gap-1 gba:font-medium hover:gba:text-foreground"
                    data-testid="manager-dashboard-sort-by-name-header"
                  >
                    {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.team_member', 'Team Member')}
                    {renderSortIndicator('name')}
                  </button>
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.position', 'Position')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.department', 'Department')}
                </TableHead>
                <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.status', 'Status')}</TableHead>
                {filterUnallocatedOnly && (
                  <>
                    <TableHead>
                      <button
                        type="button"
                        onClick={() => handleSortChange('allocation')}
                        className="gba:inline-flex gba:items-center gba:gap-1 gba:font-medium hover:gba:text-foreground"
                        data-testid="manager-dashboard-sort-by-allocation-header"
                      >
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.manager_dashboard.total_allocation',
                          'Total Allocation'
                        )}
                        {renderSortIndicator('allocation')}
                      </button>
                    </TableHead>
                    <TableHead>{getTranslationFromI18nKeyAndLabel('master-data:allocate', 'Allocate')}</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFilteredReports.map(employee => (
                <TableRow
                  key={employee.id}
                  className="gba:cursor-pointer hover:gba:bg-muted/50"
                  onClick={() => handleSelectEmployee(employee)}
                >
                  <TableCell>
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <Avatar className="gba:h-10 gba:w-10">
                        <AvatarImage
                          src={
                            employee.profilePicture && !employee.profilePicture.startsWith('{')
                              ? `data:image/jpeg;base64,${employee.profilePicture}`
                              : undefined
                          }
                          alt={`${employee.firstName} ${employee.lastName}`}
                        />
                        <AvatarFallback>
                          {employee.firstName?.[0]}
                          {employee.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="gba:font-medium">
                          {employee.firstName} {employee.lastName}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.jobTitle || '-'}</TableCell>
                  <TableCell>{employee.organizationalUnit || '-'}</TableCell>
                  <TableCell>
                    <StatusBadge employee={employee} />
                  </TableCell>
                  {filterUnallocatedOnly && (
                    <>
                      <TableCell>{employee.allocationPercent}%</TableCell>
                      <TableCell>
                        {employee.allocationPercent !== 100 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={event => {
                              event.stopPropagation()
                              onAssignProject(employee.id)
                            }}
                            data-testid={`manager-dashboard-filtered-teammates-allocate-${employee.id}`}
                          >
                            Allocate
                          </Button>
                        )}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
