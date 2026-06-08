import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Spinner,
  DataTable,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Input,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { ColumnDef } from '@tanstack/react-table'
import { GitFork, UsersThree } from '@phosphor-icons/react'
import { Employee } from '@/business-apps/hr/core/hooks/useGetEmployees'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { memo, useCallback, useMemo, useState } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  getAbsenceStatusBadgeVariant,
  getAbsenceStatusLabel
} from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import dayjs from 'dayjs'
import { formatLastFeedback } from '../utils/peopleMomentsHelpers'
import { avatarSrc } from '../utils/heatmapHelpers'

interface GroupedMatrixTeam {
  matrixTeamName: string
  members: Employee[]
}

interface ActionCellProps {
  employee: Employee
  accessToken: string
  dataTestIdPrefix: string
}

const ActionCell: React.FC<ActionCellProps> = memo(({ employee, accessToken, dataTestIdPrefix }) => {
  if (!accessToken) return null

  return (
    <AppAction
      mode="button"
      variant="table-row"
      contexts={[
        {
          context: FlowContextName.employeeEntity,
          contextData: {
            employeeId: employee.id,
            keycloakUserId: employee.userId,
            managerId: employee.supervisorEmployeeId,
            organizationalUnitId: employee.organizationalUnitId
          }
        }
      ]}
      accessToken={accessToken}
      data-testid={`${dataTestIdPrefix}-Actions-${employee.id}`}
      prefixDataTestId={`${dataTestIdPrefix}-action-${employee.id}`}
    />
  )
})

ActionCell.displayName = 'ActionCell'

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

const formatVacationDateRange = (nextVacation?: Employee['nextVacation']): string | null => {
  if (!nextVacation?.startDate) return null

  const start = dayjs(nextVacation.startDate)
  if (!start.isValid()) return null

  const end = nextVacation.endDate ? dayjs(nextVacation.endDate) : null
  if (end?.isValid() && !end.isSame(start, 'day')) {
    return `${start.format('DD.MM')} – ${end.format('DD.MM')}`
  }
  return start.format('DD.MM')
}

const FiltersBar: React.FC<{
  searchTerm: string
  onSearchChange: (value: string) => void
  selectedJobTitle: string
  onJobTitleChange: (value: string) => void
  selectedEmploymentType: string
  onEmploymentTypeChange: (value: string) => void
  jobTitleOptions: string[]
  employmentTypeOptions: string[]
}> = ({
  searchTerm,
  onSearchChange,
  selectedJobTitle,
  onJobTitleChange,
  selectedEmploymentType,
  onEmploymentTypeChange,
  jobTitleOptions,
  employmentTypeOptions
}) => (
  <div className="gba:mb-4 gba:flex gba:flex-wrap gba:items-end gba:gap-3">
    <div className="gba:min-w-[220px] gba:flex-1">
      <label
        htmlFor="manager-dashboard-team-search-input"
        className="gba:mb-1 gba:block gba:text-xs gba:text-muted-foreground"
      >
        Search team members
      </label>
      <Input
        id="manager-dashboard-team-search-input"
        value={searchTerm}
        onChange={event => onSearchChange(event.target.value)}
        placeholder="Search by name"
        data-testid="manager-dashboard-team-search"
      />
    </div>
    <div className="gba:min-w-[220px]">
      <label
        htmlFor="manager-dashboard-job-title-filter-trigger"
        className="gba:mb-1 gba:block gba:text-xs gba:text-muted-foreground"
      >
        Job title
      </label>
      <Select value={selectedJobTitle} onValueChange={onJobTitleChange}>
        <SelectTrigger id="manager-dashboard-job-title-filter-trigger" data-testid="manager-dashboard-job-title-filter">
          <SelectValue placeholder="All job titles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All job titles</SelectItem>
          {jobTitleOptions.map(option => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="gba:min-w-[220px]">
      <label
        htmlFor="manager-dashboard-employment-type-filter-trigger"
        className="gba:mb-1 gba:block gba:text-xs gba:text-muted-foreground"
      >
        Employment type
      </label>
      <Select value={selectedEmploymentType} onValueChange={onEmploymentTypeChange}>
        <SelectTrigger
          id="manager-dashboard-employment-type-filter-trigger"
          data-testid="manager-dashboard-employment-type-filter"
        >
          <SelectValue placeholder="All employment types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All employment types</SelectItem>
          {employmentTypeOptions.map(option => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
)

const LoadingState: React.FC<{ message: string }> = ({ message }) => (
  <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-6">
    <Spinner size="lg" />
    <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">{message}</p>
  </div>
)

const ErrorState: React.FC<{ title: string; message: string; onRetry: () => void }> = ({ title, message, onRetry }) => (
  <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-6">
    <div className="gba:mb-2 gba:text-lg gba:font-medium gba:text-destructive">{title}</div>
    <div className="gba:mb-4 gba:text-muted-foreground">{message}</div>
    <button
      onClick={onRetry}
      className="gba:rounded gba:bg-primary gba:px-4 gba:py-2 gba:text-primary-foreground gba:hover:gba:bg-primary/90"
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
    <h3 className="gba:mb-2 gba:text-lg gba:font-medium gba:text-foreground">{title}</h3>
    <p className="gba:text-muted-foreground">{description}</p>
  </div>
)

const sortByName = (a: Employee, b: Employee) =>
  `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)

const createEmployeeNameColumn = (onAvatarClick: (employeeId: string) => void): ColumnDef<Employee> => ({
  id: 'name',
  header: getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.name.label', 'Name'),
  cell: ({ row }) => {
    const employee = row.original
    const imageSrc = avatarSrc(employee.profilePicture)
    return (
      <button
        type="button"
        onClick={e => {
          e.stopPropagation()
          onAvatarClick(employee.id)
        }}
        className="gba:flex gba:items-center gba:gap-3 gba:rounded gba:p-0.5 hover:gba:bg-muted/40"
      >
        <Avatar size="sm" className="gba:h-8 gba:w-8">
          <AvatarImage src={imageSrc} alt={`${employee.firstName} ${employee.lastName}`} />
          <AvatarFallback>{`${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="gba:font-medium">
          {employee.firstName} {employee.lastName}
        </span>
      </button>
    )
  }
})

const GoalProgressCell: React.FC<{ value: number }> = ({ value }) => {
  const rounded = Math.round(value)
  return (
    <div className="gba:min-w-[110px]">
      <span className="gba:text-xs gba:text-muted-foreground">{rounded}%</span>
      <Progress value={Math.max(0, Math.min(100, rounded))} className="gba:mt-1 gba:h-1.5" />
    </div>
  )
}

const LastFeedbackCell: React.FC<{ date?: string | null }> = ({ date }) => (
  <div className="gba:text-sm gba:text-muted-foreground">{formatLastFeedback(date)}</div>
)

const AllocationCell: React.FC<{ percent: number }> = ({ percent }) => (
  <Badge variant={percent > 0 ? 'info' : 'secondary'} size="sm">
    {percent}%
  </Badge>
)

const VacationCell: React.FC<{ employee: Employee }> = ({ employee }) => {
  const vacation = employee.nextVacation
  const dateRange = formatVacationDateRange(vacation)
  const isOngoing = employee.status === 'On Leave' && vacation && employee.currentAbsence

  if (!dateRange) {
    return <div className="gba:text-sm gba:text-muted-foreground">No vacation planned</div>
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-1">
      <div className="gba:flex gba:items-center gba:gap-1.5">
        <span className="gba:text-sm">{dateRange}</span>
        {isOngoing && <span className="gba:text-[10px] gba:font-semibold gba:text-destructive gba:uppercase">Now</span>}
      </div>
      <div className="gba:flex gba:items-center gba:gap-1.5">
        {vacation?.type && <span className="gba:text-xs gba:text-muted-foreground">{vacation.type}</span>}
        {vacation?.status && (
          <Badge variant={getAbsenceStatusBadgeVariant(vacation.status)} size="sm">
            {getAbsenceStatusLabel(vacation.status)}
          </Badge>
        )}
      </div>
    </div>
  )
}

const DepartmentCell: React.FC<{ value?: string }> = ({ value }) => (
  <div className="gba:text-sm gba:text-muted-foreground">{value || '-'}</div>
)

const jobTitleColumn: ColumnDef<Employee> = {
  accessorKey: 'jobTitle',
  header: getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_list.search_employee_list.recent_employees_table.job_title',
    'Job Title'
  ),
  cell: ({ row }) => <div className="gba:text-sm gba:text-muted-foreground">{row.original.jobTitle || '-'}</div>
}

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
  onAvatarClick: (_employeeId: string) => void
  accessToken: string
  userOrgData?: {
    organizationalUnitId?: string
    costCenterId?: string
    siteLocationId?: string
    companyId?: string
  }
}

export const MyTeammatesTable = ({
  activeTeamTab,
  setActiveTeamTab,
  directReports,
  matrixTeamMembers,
  loadingDirectReports,
  loadingMatrixTeams,
  directReportsError,
  matrixTeamsError,
  onSelectEmployee,
  onAvatarClick,
  accessToken,
  userOrgData
}: MyTeammatesTableProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedJobTitle, setSelectedJobTitle] = useState('all')
  const [selectedEmploymentType, setSelectedEmploymentType] = useState('all')

  const handleRetry = () => {
    globalThis.location.reload()
  }

  const renderMyTeamActions = useCallback(
    (row: { original: Employee }) => (
      <ActionCell employee={row.original} accessToken={accessToken} dataTestIdPrefix="my-team" />
    ),
    [accessToken]
  )

  const renderMatrixTeamActions = useCallback(
    (row: { original: Employee }) => (
      <ActionCell employee={row.original} accessToken={accessToken} dataTestIdPrefix="my-teams" />
    ),
    [accessToken]
  )

  const jobTitleOptions = useMemo(
    () =>
      [
        ...new Set(directReports.map(employee => employee.jobTitle).filter((title): title is string => Boolean(title)))
      ].sort((a, b) => a.localeCompare(b)),
    [directReports]
  )

  const employmentTypeOptions = useMemo(
    () =>
      [
        ...new Set(
          directReports
            .map(employee => employee.employmentType)
            .filter((employmentType): employmentType is string => Boolean(employmentType))
        )
      ].sort((a, b) => a.localeCompare(b)),
    [directReports]
  )

  const filteredDirectReports = useMemo(() => {
    return directReports.filter(employee => {
      const normalizedName = `${employee.firstName} ${employee.lastName}`.toLowerCase()
      const matchesSearch = searchTerm.trim().length === 0 || normalizedName.includes(searchTerm.trim().toLowerCase())
      const matchesJobTitle = selectedJobTitle === 'all' || employee.jobTitle === selectedJobTitle
      const matchesEmploymentType =
        selectedEmploymentType === 'all' || employee.employmentType === selectedEmploymentType

      return matchesSearch && matchesJobTitle && matchesEmploymentType
    })
  }, [directReports, searchTerm, selectedJobTitle, selectedEmploymentType])

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

  const directReportsColumns: ColumnDef<Employee>[] = useMemo(
    () => [
      createEmployeeNameColumn(onAvatarClick),
      jobTitleColumn,
      {
        id: 'goalProgress',
        header: 'Current goal progress',
        cell: ({ row }) => <GoalProgressCell value={row.original.currentGoalProgress ?? 0} />
      },
      {
        id: 'lastFeedback',
        header: 'Manager last feedback',
        cell: ({ row }) => <LastFeedbackCell date={row.original.lastManagerFeedbackDate} />
      },
      {
        id: 'allocation',
        header: 'Project allocation',
        cell: ({ row }) => <AllocationCell percent={row.original.projectAllocationPercent ?? 0} />
      },
      {
        id: 'nextVacation',
        header: 'Vacation',
        size: 190,
        cell: ({ row }) => <VacationCell employee={row.original} />
      }
    ],
    [onAvatarClick]
  )

  const matrixColumns: ColumnDef<Employee>[] = useMemo(
    () => [
      createEmployeeNameColumn(onAvatarClick),
      jobTitleColumn,
      {
        accessorKey: 'organizationalUnit',
        header: getTranslationFromI18nKeyAndLabel('master-data:forms.department.title', 'Department'),
        cell: ({ row }) => <DepartmentCell value={row.original.organizationalUnit} />
      },
      {
        id: 'status',
        header: getTranslationFromI18nKeyAndLabel('master-data:forms.capability.fields.status.label', 'Status'),
        cell: ({ row }) => <StatusBadge employee={row.original} />
      }
    ],
    [onAvatarClick]
  )

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
          icon={<UsersThree size={36} />}
          title={getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.status.no_direct_reports',
            'No direct reports'
          )}
          description={getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.status.no_direct_right_now',
            "You don't have any direct reports at the moment. Check matrix teams or update org assignments."
          )}
        />
      )
    }

    return (
      <div>
        <FiltersBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedJobTitle={selectedJobTitle}
          onJobTitleChange={setSelectedJobTitle}
          selectedEmploymentType={selectedEmploymentType}
          onEmploymentTypeChange={setSelectedEmploymentType}
          jobTitleOptions={jobTitleOptions}
          employmentTypeOptions={employmentTypeOptions}
        />

        {filteredDirectReports.length === 0 ? (
          <EmptyState
            icon={<UsersThree size={36} />}
            title="No team members match the current filters"
            description="Try adjusting search or filters."
          />
        ) : (
          <DataTable
            data={filteredDirectReports}
            columns={directReportsColumns}
            enableSorting
            onRowClick={employee => onSelectEmployee(employee)}
            actions={renderMyTeamActions}
          />
        )}
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
            'You are not part of any matrix teams at the moment. Coordinate with HR to update project assignments.'
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

            <DataTable
              data={group.members}
              columns={matrixColumns}
              enableSorting
              onRowClick={employee => onSelectEmployee(employee)}
              actions={renderMatrixTeamActions}
            />
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
              <UsersThree size={16} className="gba:mr-0.5" />
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
