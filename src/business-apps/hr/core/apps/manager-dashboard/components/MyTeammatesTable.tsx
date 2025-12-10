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
import { UsersThreeIcon, TreeStructureIcon } from '@phosphor-icons/react'
import { Employee } from '@/business-apps/hr/core/hooks/useGetEmployees'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { memo } from 'react'
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
  accessToken
}: MyTeammatesTableProps) => {
  // Helper function to handle retry
  const handleRetry = () => {
    globalThis.location.reload()
  }

  // Helper function to render direct reports content
  const renderDirectReportsContent = () => {
    if (loadingDirectReports) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-6">
          <Spinner size="lg" />
          <p className="gba:text-sm gba:text-neutral-500 gba:mt-2">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.status.loading_direct_reports',
              'Loading direct reports...'
            )}
          </p>
        </div>
      )
    }
    if (directReportsError) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-6">
          <div className="gba:text-red-500 gba:text-lg gba:font-medium gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.status.error_loading_direct_reports',
              'Error loading direct reports'
            )}
          </div>
          <div className="gba:text-gray-600 gba:mb-4">{directReportsError.message}</div>
          <button
            onClick={handleRetry}
            className="gba:px-4 gba:py-2 gba:bg-primary-600 gba:text-white gba:rounded gba:hover:bg-primary-700"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.try_again', 'Try again')}
          </button>
        </div>
      )
    }
    if (directReports.length === 0) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-6">
          <div className="gba:text-4xl gba:mb-4">
            <UsersThreeIcon size={36} />
          </div>
          <h3 className="gba:text-lg gba:font-medium gba:text-neutral-900 gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.status.no_direct_reports',
              'No direct reports'
            )}
          </h3>
          <p className="gba:text-neutral-500">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.status.no_direct_right_now',
              "You don't have any direct reports at the moment."
            )}
          </p>
        </div>
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
              <TableRow
                key={employee.id}
                className="gba:cursor-pointer hover:gba:bg-gray-50"
                onClick={() => onSelectEmployee(employee)}
              >
                <TableCell>
                  <div className="gba:flex gba:items-center gba:space-x-3">
                    <Avatar size="sm" className="gba:h-8 gba:w-8">
                      <AvatarImage
                        src={
                          employee.profilePicture && !employee.profilePicture.startsWith('{')
                            ? `data:image/jpeg;base64,${employee.profilePicture}`
                            : undefined
                        }
                        alt={`${employee.firstName} ${employee.lastName}`}
                      />
                      <AvatarFallback>{`${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="gba:font-medium">
                      {employee.firstName} {employee.lastName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="gba:text-sm gba:text-neutral-600">{employee.jobTitle || '-'}</div>
                </TableCell>
                <TableCell>
                  <div className="gba:text-sm gba:text-neutral-600">{employee.organizationalUnit || '-'}</div>
                </TableCell>
                <TableCell>
                  {employee.status === 'On Leave' ? (
                    <Badge variant="destructive" size="sm">
                      {employee.currentAbsence?.type ||
                        getTranslationFromI18nKeyAndLabel('master-data:manager_dashboard.on_leave', 'On Leave')}
                    </Badge>
                  ) : (
                    <Badge variant="success" size="sm">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.available', 'Available')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="gba:py-4 gba:px-6">
                  {accessToken ? (
                    <button
                      type="button"
                      onClick={e => e.stopPropagation()}
                      className="gba:bg-transparent gba:border-0 gba:p-0"
                    >
                      <MemoizedAppActionButton
                        employeeId={employee.id}
                        userId={employee.userId}
                        supervisorEmployeeId={employee.supervisorEmployeeId}
                        organizationalUnitId={employee.organizationalUnitId}
                        accessToken={accessToken}
                        dataTestIdPrefix="my-team"
                      />
                    </button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // Helper function to render matrix teams content
  const renderMatrixTeamsContent = () => {
    if (loadingMatrixTeams) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-6">
          <Spinner size="lg" />
          <p className="gba:text-sm gba:text-neutral-500 gba:mt-2">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.status.loading_teams',
              'Loading matrix teams...'
            )}
          </p>
        </div>
      )
    }
    if (matrixTeamsError) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-6">
          <div className="gba:text-red-500 gba:text-lg gba:font-medium gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.status.error_loading_matrix_teams',
              'Error Loading Matrix Teams'
            )}
          </div>
          <div className="gba:text-gray-600 gba:mb-4">{matrixTeamsError.message}</div>
          <button
            onClick={handleRetry}
            className="gba:px-4 gba:py-2 gba:bg-primary-600 gba:text-white gba:rounded gba:hover:bg-primary-700"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.try_again', 'Try again')}
          </button>
        </div>
      )
    }
    if (matrixTeamMembers.length === 0) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-6">
          <div className="gba:text-4xl gba:mb-4">
            <TreeStructureIcon size={36} />
          </div>
          <h3 className="gba:text-lg gba:font-medium gba:text-neutral-900 gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.status.no_teams',
              'No matrix teams found'
            )}
          </h3>
          <p className="gba:text-neutral-500">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.manager_dashboard.not_part_of_any_matrix_teams',
              'You are not part of any matrix teams at the moment.'
            )}
          </p>
        </div>
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
                {getTranslationFromI18nKeyAndLabel('orgchart:overview.fields.matrix_team', 'Matrix Team')}
              </TableHead>
              <TableHead>
                {' '}
                {getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.status.label', 'Status')}
              </TableHead>
              <TableHead>
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrixTeamMembers.map(employee => (
              <TableRow
                key={employee.id}
                className="gba:cursor-pointer hover:gba:bg-gray-50"
                onClick={() => onSelectEmployee(employee)}
              >
                <TableCell>
                  <div className="gba:flex gba:items-center gba:space-x-3">
                    <Avatar size="sm" className="gba:h-8 gba:w-8">
                      <AvatarImage
                        src={
                          employee.profilePicture && !employee.profilePicture.startsWith('{')
                            ? `data:image/jpeg;base64,${employee.profilePicture}`
                            : undefined
                        }
                        alt={`${employee.firstName} ${employee.lastName}`}
                      />
                      <AvatarFallback>{`${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="gba:font-medium">
                      {employee.firstName} {employee.lastName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="gba:text-sm gba:text-neutral-600">{employee.jobTitle || '-'}</div>
                </TableCell>
                <TableCell>
                  <div className="gba:text-sm gba:text-neutral-600">{employee.organizationalUnit || '-'}</div>
                </TableCell>
                <TableCell>
                  {employee.status === 'On Leave' ? (
                    <Badge variant="destructive" size="sm">
                      {employee.currentAbsence?.type ||
                        getTranslationFromI18nKeyAndLabel('master-data:manager_dashboard.on_leave', 'On Leave')}
                    </Badge>
                  ) : (
                    <Badge variant="success" size="sm">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.available', 'Available')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="gba:py-4 gba:px-6">
                  {accessToken ? (
                    <button
                      type="button"
                      onClick={e => e.stopPropagation()}
                      className="gba:bg-transparent gba:border-0 gba:p-0"
                    >
                      <MemoizedAppActionButton
                        employeeId={employee.id}
                        userId={employee.userId}
                        supervisorEmployeeId={employee.supervisorEmployeeId}
                        organizationalUnitId={employee.organizationalUnitId}
                        accessToken={accessToken}
                        dataTestIdPrefix="my-teams"
                      />
                    </button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <Tabs
      value={activeTeamTab}
      onValueChange={value => setActiveTeamTab(value as 'my-team' | 'my-teams')}
      className="gba:flex-1 gba:flex gba:flex-col"
    >
      <TabsList className="gba:grid gba:w-full gba:grid-cols-2 gba:mb-6">
        <TabsTrigger value="my-team" className="gba:flex gba:items-center gba:space-x-2">
          <div className="gba:flex gba:w-full gba:items-center gba:justify-center">
            <UsersThreeIcon size={16} className="gba:mr-0.5" />
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
            <TreeStructureIcon size={16} className="gba:mr-0.5" />
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
