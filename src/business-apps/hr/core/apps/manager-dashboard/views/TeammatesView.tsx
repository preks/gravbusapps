import React from 'react'
import { Button, Badge } from '@newwork/nw-design-system'
import { CaretLeft as CaretLeftIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DirectReport } from '../hooks/useDirectReports'
import { MatrixTeamMember } from '../hooks/useMatrixTeams'
import { Employee } from '@/business-apps/hr/core/hooks/useGetEmployees'
import MyTeammatesTable from '../components/MyTeammatesTable'

type TeamTab = 'my-team' | 'my-teams'

export interface TeammatesViewProps {
  directReports: DirectReport[]
  matrixTeamMembers: MatrixTeamMember[]
  unallocatedEmployeeIds: string[]
  filterAbsentOnly: boolean
  filterUnallocatedOnly: boolean
  setFilterAbsentOnly: (value: boolean) => void
  setFilterUnallocatedOnly: (value: boolean) => void
  loadingDirectReports: boolean
  loadingMatrixTeams: boolean
  directReportsError: Error | null
  matrixTeamsError: Error | null
  activeTeamTab: TeamTab
  setActiveTeamTab: (tab: TeamTab) => void
  employeeId: string
  accessToken: string
  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
}

export const TeammatesView: React.FC<TeammatesViewProps> = ({
  directReports,
  matrixTeamMembers,
  unallocatedEmployeeIds,
  filterAbsentOnly,
  filterUnallocatedOnly,
  setFilterAbsentOnly,
  setFilterUnallocatedOnly,
  loadingDirectReports,
  loadingMatrixTeams,
  directReportsError,
  matrixTeamsError,
  activeTeamTab,
  setActiveTeamTab,
  employeeId,
  accessToken,
  onNavigateBack,
  onNavigateToEmployee
}) => {
  // Filter direct reports based on active filter
  const filteredDirectReports = filterAbsentOnly
    ? directReports.filter(report => report.status === 'On Leave')
    : filterUnallocatedOnly
      ? directReports.filter(report => unallocatedEmployeeIds.includes(report.id))
      : directReports

  // Transform DirectReport data to Employee interface format with proper data mapping
  const transformedDirectReports: Employee[] = filteredDirectReports.map(report => ({
    id: report.id,
    userId: undefined,
    supervisorEmployeeId: employeeId,
    firstName: report.firstName,
    lastName: report.lastName,
    jobTitle: report.jobPositionName || '',
    organizationalUnit: report.organizationalUnitName || '',
    email: '',
    profilePicture: report.pictureThumbnail || '',
    employmentType: '',
    contractType: '',
    matrixTeams: [],
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

  // Transform MatrixTeamMember data to Employee interface format
  const transformedMatrixTeamMembers: Employee[] = matrixTeamMembers.map(member => ({
    id: member.id,
    userId: undefined,
    supervisorEmployeeId: employeeId,
    firstName: member.firstName,
    lastName: member.lastName,
    jobTitle: member.jobPositionName || '',
    organizationalUnit: member.matrixUnitName || '',
    email: '',
    profilePicture: member.pictureThumbnail || '',
    employmentType: '',
    contractType: '',
    matrixTeams: []
  }))

  const handleSelectEmployee = (employee: Employee) => {
    onNavigateToEmployee(employee.id)
  }

  return (
    <div className="gba:p-6 gba:h-full gba:flex gba:flex-col">
      {/* Header section - identical to "Requests to Approve" */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
        <div className="gba:flex gba:items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack}
            className="gba:mr-4"
            data-testid="manager-dashboard-teammates-back-button"
          >
            <CaretLeftIcon size={16} className="gba:mr-1" />
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
          <Badge variant={filterAbsentOnly ? 'warning' : filterUnallocatedOnly ? 'info' : 'info'} className="gba:ml-3">
            {filterAbsentOnly
              ? `${filteredDirectReports.length} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.out_of_office', 'out of office')}`
              : filterUnallocatedOnly
                ? `${filteredDirectReports.length} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.not_allocated', 'not allocated')}`
                : `${directReports.length + matrixTeamMembers.length} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.total_teammates', 'total teammates').toLowerCase()}`}
          </Badge>
          {(filterAbsentOnly || filterUnallocatedOnly) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterAbsentOnly(false)
                setFilterUnallocatedOnly(false)
              }}
              className="gba:ml-2"
              data-testid="manager-dashboard-clear-filter"
            >
              {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.show_all', 'Show All')}
            </Button>
          )}
        </div>
      </div>

      {/* MyTeammatesTable component */}
      <div className="gba:flex-1">
        <MyTeammatesTable
          activeTeamTab={activeTeamTab}
          setActiveTeamTab={setActiveTeamTab}
          directReports={transformedDirectReports}
          matrixTeamMembers={transformedMatrixTeamMembers}
          loadingDirectReports={loadingDirectReports}
          loadingMatrixTeams={loadingMatrixTeams}
          directReportsError={directReportsError}
          matrixTeamsError={matrixTeamsError}
          onSelectEmployee={handleSelectEmployee}
          accessToken={accessToken}
        />
      </div>
    </div>
  )
}
