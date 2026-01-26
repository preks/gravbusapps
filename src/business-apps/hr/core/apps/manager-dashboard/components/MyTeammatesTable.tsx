import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { Users, GitFork } from 'lucide-react'
import { Employee } from '@/business-apps/hr/core/hooks/useGetEmployees'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { memo, useMemo } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface GroupedMatrixTeam {
  matrixTeamName: string
  members: Employee[]
}

const MemoizedAppActionButton = memo<{
  employeeId: string
  userId?: string
  supervisorEmployeeId?: string
  organizationalUnitId?: string
  accessToken: string
  dataTestIdPrefix: string
}>(({ employeeId, userId, supervisorEmployeeId, organizationalUnitId, accessToken, dataTestIdPrefix }) => (
  <AppActionButton
    data-testid={`${dataTestIdPrefix}-Actions-${employeeId}`}
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
  />
))

MemoizedAppActionButton.displayName = 'MemoizedAppActionButton'

interface ActionCellProps {
  employee: Employee
  accessToken: string
  dataTestIdPrefix: string
}

const ActionCell: React.FC<ActionCellProps> = ({ employee, accessToken, dataTestIdPrefix }) => {
  const handleClick = (e: React.MouseEvent) => e.stopPropagation()

  if (!accessToken) return null

  return (
    <button type="button" onClick={handleClick} className="gba:bg-transparent gba:border-0 gba:p-0">
      <MemoizedAppActionButton
        employeeId={employee.id}
        userId={employee.userId}
        supervisorEmployeeId={employee.supervisorEmployeeId}
        organizationalUnitId={employee.organizationalUnitId}
        accessToken={accessToken}
        dataTestIdPrefix={dataTestIdPrefix}
      />
    </button>
  )
}

interface StatusBadgeProps {
  employee: Employee
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ employee }) => {
  if (employee.status === 'On Leave') {
    return (
      <Badge variant="destructive" size="sm">
        {employee.currentAbsence?.type ||
          getTranslationFromI18nKeyAndLabel('master-data:manager_dashboard.on_leave', 'On Leave')}
      </Badge>
    )
  }

  return (
    <Badge variant="success" size="sm">
      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.available', 'Available')}
    </Badge>
  )
}

interface EmployeeAvatarProps {
  employee: Employee
}

const EmployeeAvatar: React.FC<EmployeeAvatarProps> = ({ employee }) => {
  const imageSrc =
    employee.profilePicture && !employee.profilePicture.startsWith('{')
      ? `data:image/jpeg;base64,${employee.profilePicture}`
      : undefined

  return (
    <div className="gba:flex gba:items-center gba:space-x-3">
      <Avatar size="sm" className="gba:h-8 gba:w-8">
        <AvatarImage src={imageSrc} alt={`${employee.firstName} ${employee.lastName}`} />
        <AvatarFallback>{`${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="gba:font-medium">
        {employee.firstName} {employee.lastName}
      </span>
    </div>
  )
}

interface EmployeeRowProps {
  employee: Employee
  accessToken: string
  dataTestIdPrefix: string
  onSelectEmployee: (employee: Employee) => void
  showDepartment?: boolean
}

const EmployeeRow: React.FC<EmployeeRowProps> = ({
  employee,
  accessToken,
  dataTestIdPrefix,
  onSelectEmployee,
  showDepartment = true
}) => {
  const handleRowClick = () => onSelectEmployee(employee)

  return (
    <TableRow className="gba:cursor-pointer hover:gba:bg-gray-50" onClick={handleRowClick}>
      <TableCell>
        <EmployeeAvatar employee={employee} />
      </TableCell>
      <TableCell>
        <div className="gba:text-sm gba:text-neutral-600">{employee.jobTitle || '-'}</div>
      </TableCell>
      {showDepartment && (
        <TableCell>
          <div className="gba:text-sm gba:text-neutral-600">{employee.organizationalUnit || '-'}</div>
        </TableCell>
      )}
      <TableCell>
        <StatusBadge employee={employee} />
      </TableCell>
      <TableCell className="gba:py-4 gba:px-6">
        <ActionCell employee={employee} accessToken={accessToken} dataTestIdPrefix={dataTestIdPrefix} />
      </TableCell>
    </TableRow>
  )
}

const LoadingState: React.FC<{ message: string }> = ({ message }) => (
  <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-6">
    <Spinner size="lg" />
    <p className="gba:text-sm gba:text-neutral-500 gba:mt-2">{message}</p>
  </div>
)

const ErrorState: React.FC<{ title: string; message: string; onRetry: () => void }> = ({ title, message, onRetry }) => (
  <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-6">
    <div className="gba:text-red-500 gba:text-lg gba:font-medium gba:mb-2">{title}</div>
    <div className="gba:text-gray-600 gba:mb-4">{message}</div>
    <button
      onClick={onRetry}
      className="gba:px-4 gba:py-2 gba:bg-primary-600 gba:text-white gba:rounded gba:hover:bg-primary-700"
    >
      {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.try_again', 'Try again')}
    </button>
  </div>
)

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description }) => (
  <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-6">
    <div className="gba:text-4xl gba:mb-4">{icon}</div>
    <h3 className="gba:text-lg gba:font-medium gba:text-neutral-900 gba:mb-2">{title}</h3>
    <p className="gba:text-neutral-500">{description}</p>
  </div>
)

const sortByName = (a: Employee, b: Employee) =>
  `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)

type MyTeammatesTableProps = {
  activeTeamTab: 'my-team' | 'my-teams'
  setActiveTeamTab: (_value: 'my-team' | 'my-teams') => void
  directReports: Employee[]
  matrixTeamMembers: Employee[]
  loadingDirectReports: boolean
  loadingMatrixTeams: boolean
  directReportsError: Error | null
  matrixTeamsError: Error | null
  onSelectEmployee: (_employee: Employee) => void
  accessToken: string
  userOrgData?: {
    organizationalUnitId?: string
    costCenterId?: string
    siteLocationId?: string
    companyId?: string
  }
}

const MyTeammatesTable = ({
  activeTeamTab,
  setActiveTeamTab,
  directReports,
  matrixTeamMembers,
  loadingDirectReports,
  loadingMatrixTeams,
  directReportsError,
  matrixTeamsError,
  onSelectEmployee,
  accessToken,
  userOrgData
}: MyTeammatesTableProps) => {
  const handleRetry = () => {
    globalThis.location.reload()
  }

  const groupedMatrixTeams = useMemo((): GroupedMatrixTeam[] => {
    const grouped: Record<string, Employee[]> = {}

    matrixTeamMembers.forEach(member => {
      const teamName = member.organizationalUnit || 'Other'
      if (!grouped[teamName]) {
        grouped[teamName] = []
      }
      grouped[teamName].push(member)
    })

    const result = Object.entries(grouped).map(([matrixTeamName, members]) => ({
      matrixTeamName,
      members: [...members].sort(sortByName)
    }))

    return [...result].sort((a, b) => a.matrixTeamName.localeCompare(b.matrixTeamName))
  }, [matrixTeamMembers])

  const renderDirectReportsContent = () => {
    if (loadingDirectReports) {
      return (
        <LoadingState
          message={getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.status.loading_direct_reports',
            'Loading direct reports...'
          )}
        />
      )
    }

    if (directReportsError) {
      return (
        <ErrorState
          title={getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.status.error_loading_direct_reports',
            'Error loading direct reports'
          )}
          message={directReportsError.message}
          onRetry={handleRetry}
        />
      )
    }

    if (directReports.length === 0) {
      return (
        <EmptyState
          icon={<Users size={36} />}
          title={getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.status.no_direct_reports',
            'No direct reports'
          )}
          description={getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.status.no_direct_right_now',
            "You don't have any direct reports at the moment."
          )}
        />
      )
    }

    return (
      <div className="gba:border gba:rounded-lg gba:overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.name.label', 'Name')}
              </TableHead>
              <TableHead>
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_list.search_employee_list.recent_employees_table.job_title',
                  'Job Title'
                )}
              </TableHead>
              <TableHead>
                {getTranslationFromI18nKeyAndLabel('master-data:forms.department.title', 'Department')}
              </TableHead>
              <TableHead>
                {getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.status.label', 'Status')}
              </TableHead>
              <TableHead>
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {directReports.map(employee => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                accessToken={accessToken}
                dataTestIdPrefix="my-team"
                onSelectEmployee={onSelectEmployee}
                showDepartment
              />
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderMatrixTeamsContent = () => {
    if (loadingMatrixTeams) {
      return (
        <LoadingState
          message={getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.status.loading_teams',
            'Loading matrix teams...'
          )}
        />
      )
    }

    if (matrixTeamsError) {
      return (
        <ErrorState
          title={getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.status.error_loading_matrix_teams',
            'Error Loading Matrix Teams'
          )}
          message={matrixTeamsError.message}
          onRetry={handleRetry}
        />
      )
    }

    if (matrixTeamMembers.length === 0) {
      return (
        <EmptyState
          icon={<GitFork size={36} />}
          title={getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.status.no_teams',
            'No matrix teams found'
          )}
          description={getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.not_part_of_any_matrix_teams',
            'You are not part of any matrix teams at the moment.'
          )}
        />
      )
    }

    return (
      <div className="gba:space-y-6">
        {groupedMatrixTeams.map(group => (
          <div key={group.matrixTeamName} className="gba:border gba:rounded-lg gba:overflow-hidden">
            <div className="gba:bg-muted/50 gba:px-4 gba:py-3 gba:border-b gba:flex gba:items-center gba:gap-2">
              <GitFork size={18} className="gba:text-primary" />
              <h3 className="gba:font-semibold gba:text-foreground">{group.matrixTeamName}</h3>
              <Badge variant="secondary" size="sm" className="gba:ml-2">
                {group.members.length}{' '}
                {group.members.length === 1
                  ? getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.member', 'member')
                  : getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.members', 'members')}
              </Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.name.label', 'Name')}
                  </TableHead>
                  <TableHead>
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_list.search_employee_list.recent_employees_table.job_title',
                      'Job Title'
                    )}
                  </TableHead>
                  <TableHead>
                    {getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.status.label', 'Status')}
                  </TableHead>
                  <TableHead>
                    {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.members.map(employee => (
                  <EmployeeRow
                    key={employee.id}
                    employee={employee}
                    accessToken={accessToken}
                    dataTestIdPrefix="my-teams"
                    onSelectEmployee={onSelectEmployee}
                    showDepartment={false}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Tabs
      value={activeTeamTab}
      onValueChange={value => setActiveTeamTab(value as 'my-team' | 'my-teams')}
      className="gba:flex-1 gba:flex gba:flex-col"
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
        <TabsList className="gba:grid gba:grid-cols-2">
          <TabsTrigger value="my-team" className="gba:flex gba:items-center gba:space-x-2">
            <div className="gba:flex gba:w-full gba:items-center gba:justify-center">
              <Users size={16} className="gba:mr-0.5" />
              <span>
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.my_direct_reports_title',
                  'My Direct Reports'
                )}
              </span>
              <Badge variant="secondary" className="gba:ml-1">
                {directReports.length}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="my-teams" className="gba:flex gba:items-center gba:space-x-2">
            <div className="gba:flex gba:w-full gba:items-center gba:justify-center">
              <GitFork size={16} className="gba:mr-0.5" />
              <span>
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.my_matrix_teams_title',
                  'My Matrix Teams'
                )}
              </span>
              <Badge variant="secondary" className="gba:ml-1">
                {matrixTeamMembers.length}
              </Badge>
            </div>
          </TabsTrigger>
        </TabsList>

        {accessToken && userOrgData && (
          <AppAction
            mode="button"
            buttonVariant="default"
            buttonSize="sm"
            contexts={[
              {
                context: FlowContextName.jobRequestSubmit,
                contextData: {
                  organizationalUnitId: userOrgData.organizationalUnitId,
                  costCenterId: userOrgData.costCenterId,
                  siteLocationId: userOrgData.siteLocationId,
                  companyId: userOrgData.companyId
                }
              }
            ]}
            variant="create-primary"
            accessToken={accessToken}
            data-testid="manager-dashboard-teammates-submit-job-request"
          >
            Submit Job Request
          </AppAction>
        )}
      </div>

      <div className="gba:flex-1 gba:overflow-hidden">
        <TabsContent value="my-team" className="gba:h-full gba:overflow-y-auto">
          {renderDirectReportsContent()}
        </TabsContent>

        <TabsContent value="my-teams" className="gba:h-full gba:overflow-y-auto">
          {renderMatrixTeamsContent()}
        </TabsContent>
      </div>
    </Tabs>
  )
}

export default MyTeammatesTable
