import React from 'react'
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
import { ChevronLeft } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DirectReport } from '../hooks/useDirectReports'

export interface FilteredTeammatesViewProps {
  directReports: DirectReport[]
  unallocatedEmployeeIds: string[]
  filterAbsentOnly: boolean
  filterUnallocatedOnly: boolean
  loadingDirectReports: boolean
  directReportsError: Error | null
  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  jobTitle: string
  organizationalUnit: string
  profilePicture: string
  status?: string
  currentAbsence?: {
    type: string
    parentEntryId?: string
    startDate: string
    endDate: string
    status: string
  }
}

export const FilteredTeammatesView: React.FC<FilteredTeammatesViewProps> = ({
  directReports,
  unallocatedEmployeeIds,
  filterAbsentOnly,
  filterUnallocatedOnly,
  loadingDirectReports,
  directReportsError,
  onNavigateBack,
  onNavigateToEmployee
}) => {
  // Filter direct reports based on active filter
  const filteredDirectReports = filterAbsentOnly
    ? directReports.filter(report => report.status === 'On Leave')
    : filterUnallocatedOnly
      ? directReports.filter(report => unallocatedEmployeeIds.includes(report.id))
      : directReports

  // Transform DirectReport data to Employee interface format
  const transformedFilteredReports: Employee[] = filteredDirectReports.map(report => ({
    id: report.id,
    firstName: report.firstName,
    lastName: report.lastName,
    jobTitle: report.jobPositionName || '',
    organizationalUnit: report.organizationalUnitName || '',
    profilePicture: report.pictureThumbnail || '',
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

  const handleSelectEmployee = (employee: Employee) => {
    onNavigateToEmployee(employee.id)
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
          <h1 className="gba:text-xl gba:font-semibold">
            {filterAbsentOnly
              ? getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.absent_teammates',
                  'Absent Team Members'
                )
              : filterUnallocatedOnly
                ? getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.manager_dashboard.unallocated_teammates',
                    'Unallocated Team Members'
                  )
                : getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.my_teammates', 'My Teammates')}
          </h1>
          <Badge variant={filterAbsentOnly ? 'warning' : 'info'} className="gba:ml-3">
            {filterAbsentOnly
              ? `${transformedFilteredReports.length} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.out_of_office', 'out of office')}`
              : filterUnallocatedOnly
                ? `${transformedFilteredReports.length} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.not_allocated', 'not allocated')}`
                : `${transformedFilteredReports.length} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.total_teammates', 'team members').toLowerCase()}`}
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
        <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
          {filterAbsentOnly
            ? getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.no_absent_members',
                'No team members are currently out of office'
              )
            : filterUnallocatedOnly
              ? getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.no_unallocated_members',
                  'All team members are allocated to projects'
                )
              : getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.no_team_members',
                  'No team members found'
                )}
        </div>
      )}

      {/* Team Members Table */}
      {!loadingDirectReports && !directReportsError && transformedFilteredReports.length > 0 && (
        <div className="gba:flex-1 gba:overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.team_member', 'Team Member')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.position', 'Position')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.department', 'Department')}
                </TableHead>
                <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.status', 'Status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transformedFilteredReports.map(employee => (
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
                    {employee.status === 'On Leave' ? (
                      <Badge variant="warning">
                        {employee.currentAbsence?.type ||
                          getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.on_leave', 'On Leave')}
                      </Badge>
                    ) : employee.status === 'Available' ? (
                      <Badge variant="success">
                        {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.available', 'Available')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{employee.status || '-'}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
