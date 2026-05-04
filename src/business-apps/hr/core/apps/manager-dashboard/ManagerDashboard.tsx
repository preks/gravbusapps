import { useMemo, useState } from 'react'
import { format, differenceInYears } from 'date-fns'
import { Search, Clock, UserCheck, Users, ChevronLeft, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronRight, AlertCircle, CalendarDays, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLocalSearchParams, useNavigate } from '@/hooks/useNavigate'
import { ManagerAssistant } from '@/business-apps/assistant'
import { AnimatedPageContainer } from '@/components/layout/AnimatedPageContainer'
import { MyTeam } from './apps/my-team'
import { EmployeeActivitiesOverview } from './apps/employee-activities-overview'
import { useTeamAnniversaries } from './hooks/useTeamAnniversaries'
import { useTeamAbsences } from './hooks/useTeamAbsences'
import { usePersonalDataChanges } from './hooks/usePersonalDataChanges'
import { useRequestsToApprove } from './hooks/useRequestsToApprove'
import { useBudgetOverruns } from './hooks/useBudgetOverruns'
import { useDirectReports } from './hooks/useDirectReports'
import { useCurrentUserProfile } from './hooks/useCurrentUserProfile'
import { useEmployeeActivities } from './hooks/useEmployeeActivities'
import { ManagerDashboardEmployeeDetails } from './components/ManagerDashboardEmployeeDetails'
import { PendingPersonalDataChanges } from './components/PendingPersonalDataChanges'
import { BirthdayList } from './components/BirthdayList'
import { BudgetOverrunList } from './components/BudgetOverrunList'
import { AbsenceCalendar } from './components/AbsenceCalendar'
import { EmployeeList } from './components/EmployeeList'
import { ManagerDashboardFilters } from './components/ManagerDashboardFilters'
import { cn } from '@/lib/utils'

const tabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'my-team', label: 'My Team' },
  { value: 'requests-to-approve', label: 'Requests to Approve' },
  { value: 'team-insights', label: 'Team Insights' },
  { value: 'team-absences', label: 'Team Absences' },
  { value: 'pending-changes', label: 'Pending Changes' },
  { value: 'employee-activities', label: 'Employee Activities' },
]

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const { activeTab = 'overview', employeeId } = useLocalSearchParams<{ activeTab: string; employeeId: string }>()
  const [currentView, setCurrentView] = useState<'dashboard' | 'teammates' | 'approvals' | 'activities'>('dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAbsenceType, setFilterAbsenceType] = useState('all')
  const [filterAbsenceStatus, setFilterAbsenceStatus] = useState('all')
  const [showAbsencesFilters, setShowAbsencesFilters] = useState(false)
  const [showOnlyPendingChanges, setShowOnlyPendingChanges] = useState(false)
  const [directReportSearchTerm, setDirectReportSearchTerm] = useState('')

  const { directReports } = useDirectReports()
  const { userProfile } = useCurrentUserProfile()
  const { absences, absencesLoading } = useTeamAbsences(directReportSearchTerm)
  const { personalChanges: pendingChanges, loading: changesLoading } = usePersonalDataChanges({
    accessToken: '',
    managerId: userProfile?.id || '',
    showAll: false,
  })
  const { requests, requestsLoading } = useRequestsToApprove()
  const { anniversaries } = useTeamAnniversaries()
  const { budgetOverruns } = useBudgetOverruns()

  const { activities, loading: activitiesLoading } = useEmployeeActivities({
    absences,
    personalDataChanges: pendingChanges,
    approvalTasks: requests,
    loadingAbsences: absencesLoading,
    loadingDataChanges: changesLoading,
    loadingApprovals: requestsLoading,
  })

  const activeTabFromUrl = activeTab
  const isOverviewTab = activeTabFromUrl === 'overview'

  const handleNavigateToEmployee = (id: string) => {
    navigate(`/manager-dashboard?activeTab=overview&employeeId=${id}`)
  }

  const handleNavigateToBirthday = (id: string) => {
    navigate(`/manager-dashboard?activeTab=overview&employeeId=${id}`)
  }

  const handleNavigateToAnniversary = (id: string) => {
    navigate(`/manager-dashboard?activeTab=overview&employeeId=${id}`)
  }

  const handleNavigateToTeammates = () => {
    navigate('/manager-dashboard?activeTab=my-team')
  }

  const handleNavigateToApprovals = () => {
    navigate('/manager-dashboard?activeTab=requests-to-approve')
  }

  const handleNavigateToActivities = () => {
    navigate('/manager-dashboard?activeTab=employee-activities')
  }

  const handleNavigateBackToDashboard = () => {
    navigate('/manager-dashboard')
  }

  const getViewTitle = () => {
    if (currentView === 'dashboard') {
      return 'Dashboard'
    } else if (currentView === 'activities') {
      return 'Employee Activities'
    } else if (currentView === 'teammates') {
      return 'Team Insights'
    } else if (currentView === 'approvals') {
      return 'Requests to Approve'
    }
    return 'Dashboard'
  }

  const activeTabConfig = tabs.find(tab => tab.value === activeTabFromUrl)

  const filteredAbsences = useMemo(() => {
    return absences.filter(absence => {
      const matchesType = filterAbsenceType === 'all' || absence.type.value === filterAbsenceType
      const matchesStatus = filterAbsenceStatus === 'all' || absence.status === filterAbsenceStatus
      return matchesType && matchesStatus
    })
  }, [absences, filterAbsenceType, filterAbsenceStatus])

  const getAbsenceTypes = useMemo(() => {
    const types = new Set(absences.map(a => a.type.value))
    return Array.from(types)
  }, [absences])

  const getAbsenceStatuses = useMemo(() => {
    const statuses = new Set(absences.map(a => a.status))
    return Array.from(statuses)
  }, [absences])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          {currentView !== 'dashboard' && (
            <Button variant="ghost" size="sm" onClick={handleNavigateBackToDashboard} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-xl font-semibold">{getViewTitle()}</h1>
            <p className="text-sm text-muted-foreground">
              {currentView === 'dashboard' ? 'Overview of your team and pending requests' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {currentView === 'dashboard' && (
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          <ManagerAssistant />
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTabFromUrl} className="px-6 pt-4" onValueChange={(value) => navigate(`/manager-dashboard?activeTab=${value}`)}>
        <TabsList className="bg-muted">
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isOverviewTab && !employeeId && currentView === 'dashboard' && (
          <div className="p-6 space-y-6">
            {/* Dashboard Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div
                className="bg-muted rounded-lg p-6 flex flex-col justify-between hover:bg-muted/80 transition-colors cursor-pointer"
                onClick={handleNavigateToTeammates}
              >
                <div>
                  <h3 className="text-lg font-medium">My Team</h3>
                  <p className="text-sm text-muted-foreground">
                    {directReports.length > 0
                      ? `You have ${directReports.length} direct report${directReports.length > 1 ? 's' : ''}`
                      : 'No direct reports'}
                  </p>
                </div>
                {directReports.length > 0 && (
                  <div className="flex items-center gap-2 mt-4">
                    <Users className="h-5 w-5 text-blue-600" />
                    <Badge variant="outline" className="text-blue-700">
                      {directReports.length} employees
                    </Badge>
                  </div>
                )}
              </div>

              <div
                className="bg-muted rounded-lg p-6 flex flex-col justify-between hover:bg-muted/80 transition-colors cursor-pointer"
                onClick={handleNavigateToApprovals}
              >
                <div>
                  <h3 className="text-lg font-medium">Requests to Approve</h3>
                  <p className="text-sm text-muted-foreground">
                    {requests.length > 0
                      ? `You have ${requests.length} pending request${requests.length > 1 ? 's' : ''} to review`
                      : 'No pending requests'}
                  </p>
                </div>
                {requests.length > 0 && (
                  <div className="flex items-center gap-2 mt-4">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <Badge variant="outline" className="text-yellow-700">
                      {requests.length} pending
                    </Badge>
                  </div>
                )}
              </div>

              <div
                className="bg-muted rounded-lg p-6 flex flex-col justify-between hover:bg-muted/80 transition-colors cursor-pointer"
                onClick={handleNavigateToActivities}
              >
                <div>
                  <h3 className="text-lg font-medium">Employee Activities</h3>
                  <p className="text-sm text-muted-foreground">
                    {activities.length > 0
                      ? `Track ${activities.length} recent ${activities.length > 1 ? 'activities' : 'activity'} across your team`
                      : 'No recent activities'}
                  </p>
                </div>
                {activities.length > 0 && (
                  <div className="flex items-center gap-2 mt-4">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <Badge variant="outline" className="text-blue-700">
                      {activities.length} recent
                    </Badge>
                  </div>
                )}
              </div>

              <div className="bg-muted rounded-lg p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-medium">Team Overview</h3>
                  <p className="text-sm text-muted-foreground">
                    {anniversaries.length > 0
                      ? `${anniversaries.length} upcoming anniversaries`
                      : 'No upcoming anniversaries'}
                  </p>
                </div>
                {anniversaries.length > 0 && (
                  <div className="flex items-center gap-2 mt-4">
                    <CalendarDays className="h-5 w-5 text-green-600" />
                    <Badge variant="outline" className="text-green-700">
                      {anniversaries.length} upcoming
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Anniversaries and Birthdays */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium px-6">Upcoming Anniversaries</h3>
              <div className="px-6 grid grid-cols-2 gap-4">
                {anniversaries.map(anniversary => (
                  <div
                    key={anniversary.employee.id}
                    className="bg-muted rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleNavigateToAnniversary(anniversary.employee.id)}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{anniversary.employee.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {differenceInYears(new Date(), new Date(anniversary.startDate))} years on {format(new Date(anniversary.startDate), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget Overruns */}
            {budgetOverruns.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium px-6">Budget Overruns</h3>
                <div className="px-6">
                  <BudgetOverrunList overruns={budgetOverruns} />
                </div>
              </div>
            )}
          </div>
        )}

        {isOverviewTab && employeeId && (
          <ManagerDashboardEmployeeDetails
            employeeId={employeeId}
            onBack={handleNavigateBackToDashboard}
          />
        )}

        {activeTabFromUrl === 'my-team' && (
          <MyTeam
            onNavigateToEmployee={handleNavigateToEmployee}
            onNavigateToBirthday={handleNavigateToBirthday}
          />
        )}

        {activeTabFromUrl === 'requests-to-approve' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Pending Requests</h2>
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No pending requests</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  All requests have been reviewed
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(request => (
                  <div key={request.id} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{request.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.employee.fullName} · {format(new Date(request.requestDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-yellow-700">Pending</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTabFromUrl === 'team-insights' && (
          <div className="p-6 space-y-6">
            <h2 className="text-xl font-semibold">Team Insights</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-lg font-medium mb-2">Direct Reports</h3>
                <EmployeeList employees={directReports} onSelect={handleNavigateToEmployee} />
              </div>
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-lg font-medium mb-2">Birthdays</h3>
                <BirthdayList employees={directReports} onSelect={handleNavigateToBirthday} />
              </div>
            </div>
          </div>
        )}

        {activeTabFromUrl === 'team-absences' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Team Absences</h2>
              <Button variant="outline" size="sm" onClick={() => setShowAbsencesFilters(!showAbsencesFilters)}>
                <ChevronDown className={cn('h-4 w-4 transition-transform', showAbsencesFilters && 'rotate-180')} />
                Filters
              </Button>
            </div>

            {showAbsencesFilters && (
              <ManagerDashboardFilters
                filterAbsenceType={filterAbsenceType}
                filterAbsenceStatus={filterAbsenceStatus}
                onFilterAbsenceTypeChange={setFilterAbsenceType}
                onFilterAbsenceStatusChange={setFilterAbsenceStatus}
                absenceTypes={getAbsenceTypes}
                absenceStatuses={getAbsenceStatuses}
              />
            )}

            {absencesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredAbsences.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No absences found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {absences.length === 0 ? 'No absences recorded for your team' : 'No absences match the selected filters'}
                </p>
              </div>
            ) : (
              <AbsenceCalendar absences={filteredAbsences} onSelectEmployee={handleNavigateToEmployee} />
            )}
          </div>
        )}

        {activeTabFromUrl === 'pending-changes' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Pending Personal Data Changes</h2>
              <Button variant="outline" size="sm" onClick={() => setShowOnlyPendingChanges(!showOnlyPendingChanges)}>
                {showOnlyPendingChanges ? 'Show All' : 'Show Only Pending'}
              </Button>
            </div>

            {changesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <PendingPersonalDataChanges
                changes={pendingChanges}
                showOnlyPending={showOnlyPendingChanges}
                onSelectEmployee={handleNavigateToEmployee}
              />
            )}
          </div>
        )}

        {activeTabFromUrl === 'employee-activities' && (
          <EmployeeActivitiesOverview
            activities={activities}
            loading={activitiesLoading}
            onSelectEmployee={handleNavigateToEmployee}
          />
        )}
      </div>
    </div>
  )
}
