import React from 'react'
import { Button, Badge } from '@newwork/nw-design-system'
import { CaretLeftIcon as ChevronLeft } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DirectReport } from '../hooks/useDirectReports'
import { MatrixTeamMember } from '../hooks/useMatrixTeams'
import { Employee } from '@/business-apps/hr/core/hooks/useGetEmployees'
import { TeamMemberPerformance } from '../hooks/useTeamPerformance'
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
  teamPerformance: TeamMemberPerformance[]
  employeeAllocations: Array<{ id: string; allocationPercent: number }>
  lastFeedbackByEmployeeId: Record<string, string | null>
  onNavigateBack: () => void
  onOpenMemberPanel: (employeeId: string) => void
  userOrgData?: {
    organizationalUnitId?: string
    costCenterId?: string
    siteLocationId?: string
    companyId?: string
  }
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
  teamPerformance,
  employeeAllocations,
  lastFeedbackByEmployeeId,
  onNavigateBack,
  onOpenMemberPanel,
  userOrgData
}) => {
  // Filter direct reports based on active filter
  const getFilteredDirectReports = () => {
    if (filterAbsentOnly) {
      return directReports.filter(report => report.status === 'On Leave')
    }
    if (filterUnallocatedOnly) {
      return directReports.filter(report => unallocatedEmployeeIds.includes(report.id))
    }
    return directReports
  }
  const filteredDirectReports = getFilteredDirectReports()
  const goalProgressByEmployeeId = new Map(teamPerformance.map(member => [member.employeeId, member.averageProgress]))
  const allocationByEmployeeId = new Map(employeeAllocations.map(item => [item.id, item.allocationPercent]))

  // Helper functions for header display
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

  const getBadgeVariant = (): 'warning' | 'info' | 'secondary' => {
    if (filterAbsentOnly) return 'warning'
    if (filterUnallocatedOnly) return 'info'
    return 'secondary'
  }

  const getBadgeText = () => {
    if (filterAbsentOnly) {
      return `${filteredDirectReports.length} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.out_of_office', 'out of office')}`
    }
    if (filterUnallocatedOnly) {
      return `${filteredDirectReports.length} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.not_allocated', 'not allocated')}`
    }
    return `${directReports.length + matrixTeamMembers.length} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.total_teammates', 'total teammates').toLowerCase()}`
  }

  // Transform DirectReport data to Employee interface format with proper data mapping
  const transformedDirectReports: Employee[] = filteredDirectReports.map(report => ({
    id: report.id,
    userId: report.userId,
    supervisorEmployeeId: employeeId,
    firstName: report.firstName,
    lastName: report.lastName,
    jobTitle: report.jobPositionName || '',
    employmentType: report.employmentType || '',
    organizationalUnit: report.organizationalUnitName || '',
    email: '',
    profilePicture: report.pictureThumbnail || '',
    contractType: '',
    matrixTeams: [],
    status: report.status === 'Away' ? 'On Leave' : report.status,
    currentGoalProgress: goalProgressByEmployeeId.get(report.id) ?? 0,
    projectAllocationPercent: allocationByEmployeeId.get(report.id) ?? 0,
    lastManagerFeedbackDate: lastFeedbackByEmployeeId[report.id] ?? null,
    nextVacation: (() => {
      const absence = report.currentAbsence ?? report.nextAbsence
      if (!absence) return undefined
      return { type: absence.type, startDate: absence.startDate, endDate: absence.endDate, status: absence.status }
    })(),
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
    onOpenMemberPanel(employee.id)
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
            <ChevronLeft size={16} className="gba:mr-1" />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
              'Back to Dashboard'
            )}
          </Button>
          <h1 className="gba:text-xl gba:font-semibold">{getHeaderTitle()}</h1>
          <Badge variant={getBadgeVariant()} className="gba:ml-3">
            {getBadgeText()}
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
          onAvatarClick={onOpenMemberPanel}
          accessToken={accessToken}
          userOrgData={userOrgData}
        />
      </div>
    </div>
  )
}
