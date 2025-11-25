'use client'

import React, { useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDirectReports } from './hooks/useDirectReports'
import { useMatrixTeams } from './hooks/useMatrixTeams'
import { useTeamBirthdays, TeamBirthday } from './hooks/useTeamBirthdays'
import { useTeamAnniversaries, TeamAnniversary } from './hooks/useTeamAnniversaries'
import { useMissingJobProfiles } from './hooks/useMissingJobProfiles'
import { useCurrentUserProfile } from './hooks/useCurrentUserProfile'
import { useExpensesApprovals, ExpenseApproval } from './hooks/useExpensesApprovals'
import { useAbsencesApprovals, AbsenceApproval } from './hooks/useAbsencesApprovals'
import { usePersonalDataApprovals, PersonalDataApproval } from './hooks/usePersonalDataApprovals'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Toaster
} from '@newwork/nw-design-system'
import { Employee } from '@/business-apps/hr/core/hooks/useGetEmployees'
import { notification } from 'antd'
import DirectMember from './components/DirectMember'
import {
  UsersIcon,
  UserIcon,
  CaretRightIcon,
  CaretLeftIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  UsersThreeIcon,
  TreeStructureIcon,
  CakeIcon,
  TrophyIcon,
  WarningIcon,
  EnvelopeSimpleOpenIcon,
  ConfettiIcon,
  CalendarDotsIcon,
  XCircleIcon,
  WalletIcon,
  AirplaneTiltIcon
} from '@phosphor-icons/react'
import { AbsenceItem } from './components/AbsenceItem'
import { ExpenseItem } from './components/ExpenseItem'
import { PersonalChangeItem } from './components/PersonalChangeItem'
import RequestsToApproveTable from './components/RequestsToApproveTable'
import MyTeammatesTable from './components/MyTeammatesTable'

type ApprovalTab = 'expenses' | 'absences' | 'personal-changes'
type TeamTab = 'my-team' | 'my-teams'
type InsightsTab = 'birthdays' | 'anniversaries' | 'missing-profiles'
type CurrentView = 'dashboard' | 'teammates' | 'approvals'

/**
 * Manager Dashboard
 * Displays a dashboard for managers with key metrics and insights
 */
export const ManagerDashboard: React.FC<BusinessAppContextProps> = ({ userInfo, accessToken }) => {
  const employeeId = userInfo?.employeeDetails?.employeeId

  // State for team tabs
  const [activeTeamTab, setActiveTeamTab] = useState<TeamTab>('my-team')

  // State for team insights tabs
  const [activeInsightsTab, setActiveInsightsTab] = useState<InsightsTab>('birthdays')

  // State for approval tabs
  const [activeApprovalTab, setActiveApprovalTab] = useState<ApprovalTab>('expenses')

  // State for current view (dashboard or detailed pages)
  const [currentView, setCurrentView] = useState<CurrentView>('dashboard')

  // Get the current structure ID for matrix team queries
  const structureId = getCurrentActiveStructureId()

  // Navigation handlers
  const handleNavigateToTeammates = () => {
    setCurrentView('teammates')
  }

  const handleNavigateToApprovals = () => {
    setCurrentView('approvals')
  }

  const handleNavigateBackToDashboard = () => {
    setCurrentView('dashboard')
  }

  // Navigation handler for employee records
  const handleNavigateToEmployee = (employeeId: string) => {
    const profileUrl = buildPlatformUrl('/platform/employee-record', {
      employeeId,
      tab: 'summary'
    })
    navigateTo(profileUrl)
  }

  // Email template functions
  const generateBirthdayEmail = (employeeName: string, managerName: string = 'Your Manager') => {
    const subject = `🎉 Happy Birthday, ${employeeName}!`
    const body = `Hi ${employeeName},

Happy Birthday! 🎂

I hope you have a wonderful day celebrating with family and friends. Thank you for being such a valuable member of our team. Your dedication and positive attitude make our workplace better every day.

Wishing you all the best in the year ahead!

Best regards,
${managerName}`

    return { subject, body }
  }

  const generateAnniversaryEmail = (
    employeeName: string,
    yearsOfService: number,
    managerName: string = 'Your Manager'
  ) => {
    const subject = `🎊 Congratulations on Your ${yearsOfService}-Year Anniversary!`
    const body = `Hi ${employeeName},

Congratulations on reaching your ${yearsOfService}-year anniversary with us! 🎊

Your contributions over the years have been invaluable to our team's success. Thank you for your hard work, dedication, and the positive impact you've made. Here's to many more years of growth and achievement together!

Best regards,
${managerName}`

    return { subject, body }
  }

  const openEmailClient = (to: string, subject: string, body: string) => {
    try {
      const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.open(mailtoUrl, '_self')
    } catch (error) {
      console.error('Error opening email client:', error)
      // Fallback: show non-blocking notification instead of alert()
      notification.error({
        message: 'Unable to open email client',
        description: 'Please check that a default email application is configured on your device.',
        placement: 'bottomRight'
      })
    }
  }

  const handleSendBirthdayEmail = (birthday: TeamBirthday, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigation to employee profile

    if (!birthday.email) {
      notification.warning({
        message: 'Email address unavailable',
        description: `We could not find a work email for ${birthday.firstName}. Please check their profile or contact them directly.`,
        placement: 'bottomRight'
      })
      return
    }

    const managerName =
      userProfile?.firstName && userProfile?.lastName
        ? `${userProfile.firstName} ${userProfile.lastName}`
        : 'Your Manager'

    const emailTemplate = generateBirthdayEmail(birthday.firstName, managerName)
    openEmailClient(birthday.email, emailTemplate.subject, emailTemplate.body)
  }

  const handleSendAnniversaryEmail = (anniversary: TeamAnniversary, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigation to employee profile

    if (!anniversary.email) {
      notification.warning({
        message: 'Email address unavailable',
        description: `We could not find a work email for ${anniversary.firstName}. Please check their profile or contact them directly.`,
        placement: 'bottomRight'
      })
      return
    }

    const managerName =
      userProfile?.firstName && userProfile?.lastName
        ? `${userProfile.firstName} ${userProfile.lastName}`
        : 'Your Manager'

    const emailTemplate = generateAnniversaryEmail(anniversary.firstName, anniversary.yearsOfService, managerName)
    openEmailClient(anniversary.email, emailTemplate.subject, emailTemplate.body)
  }

  // Note: Removed useUserAvatar hook as it queries non-existent 'User' entity
  // We now use useCurrentUserProfile which works correctly with Employee entity

  // Helper function to render birthday days until text
  const renderBirthdayDaysUntil = (daysUntilBirthday: number) => {
    if (daysUntilBirthday === 0) {
      return (
        <div className="gba:flex gba:items-center gba:justify-start gba:gap-1 gba:w-full">
          <ConfettiIcon size={16} /> {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.today', 'Today')}
        </div>
      )
    }
    if (daysUntilBirthday === 1) {
      return (
        <div className="gba:flex gba:items-center gba:justify-start gba:gap-1 gba:w-full">
          <CakeIcon size={16} /> {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.tomorrow', 'Tomorrow')}
        </div>
      )
    }
    return (
      <div className="gba:flex gba:items-center gba:justify-start gba:gap-1 gba:w-full">
        <CalendarDotsIcon size={16} />
        {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.in_days', `In ${daysUntilBirthday} days`, {
          days: daysUntilBirthday
        })}
      </div>
    )
  }

  // Helper function to render anniversary days until text
  const renderAnniversaryDaysUntil = (daysUntilAnniversary: number) => {
    if (daysUntilAnniversary === 0) {
      return (
        <div className="gba:flex gba:items-center gba:justify-start gba:gap-1">
          <ConfettiIcon size={16} />
          {`${getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.today', 'today').toLowerCase()}!`}
        </div>
      )
    }
    if (daysUntilAnniversary === 1) {
      return (
        <div className="gba:flex gba:items-center gba:justify-start gba:gap-1">
          <TrophyIcon size={16} />
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.tomorrow', 'tomorrow').toLowerCase()}
        </div>
      )
    }
    return (
      <div className="gba:flex gba:items-center gba:justify-start gba:gap-1">
        <CalendarDotsIcon size={16} />
        {getTranslationFromI18nKeyAndLabel(
          'master-data:hr.manager_dashboard.in_days',
          `In ${daysUntilAnniversary} days`,
          { days: daysUntilAnniversary }
        )}
      </div>
    )
  }

  // Helper function to render missing profile reason
  const renderMissingProfileReason = (reason: string | undefined) => {
    if (reason === 'no_job_position') {
      return (
        <div className="gba:flex gba:items-center gba:justify-start gba:gap-1">
          <XCircleIcon size={16} />
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.status.no_job_position',
            'No job position'
          )}
        </div>
      )
    }
    if (reason === 'incomplete_profile') {
      return (
        <div className="gba:flex gba:items-center gba:justify-start gba:gap-1">
          <WarningIcon size={16} />
          {getTranslationFromI18nKeyAndLabel(
            'master-data:hr.manager_dashboard.status.incomplete_profile',
            'Incomplete profile'
          )}
        </div>
      )
    }
    return (
      <div className="gba:flex gba:items-center gba:justify-start gba:gap-1">
        <XCircleIcon size={16} />
        {getTranslationFromI18nKeyAndLabel(
          'master-data:hr.manager_dashboard.status.missing_job_profile',
          'Missing job profile'
        )}
      </div>
    )
  }

  // Fetch direct reports for "My Team" tab (subordinates)
  const {
    directReports,
    loading: loadingDirectReports,
    error: directReportsError
  } = useDirectReports({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  // Fetch matrix team members for "My Teams" tab using enhanced hook
  const {
    matrixTeamMembers,
    loading: loadingMatrixTeams,
    error: matrixTeamsError
  } = useMatrixTeams({
    accessToken: accessToken || '',
    employeeId: employeeId || '',
    structureId: structureId || undefined
  })

  // Fetch upcoming birthdays for Team Insights
  const {
    upcomingBirthdays,
    loading: loadingBirthdays
    // error: birthdaysError,
  } = useTeamBirthdays({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  // Fetch upcoming anniversaries for Team Insights
  const {
    upcomingAnniversaries,
    loading: loadingAnniversaries
    // error: anniversariesError,
  } = useTeamAnniversaries({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  // Fetch employees with missing job profiles for Team Insights
  const {
    employeesWithMissingProfiles,
    loading: loadingMissingProfiles
    // error: missingProfilesError,
  } = useMissingJobProfiles({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  // Memoize directReports to prevent infinite loops
  const memoizedDirectReports = useMemo(() => {
    return (directReports || []).map(employee => ({
      userId: employee.userId,
      displayName: employee.displayName,
      pictureThumbnail: employee.pictureThumbnail
    }))
  }, [directReports])

  // Fetch all requests (we'll slice them in the component based on showAll)
  // New hooks for each tab
  const {
    expenseApprovals,
    totalCount: expenseApprovalsCount,
    isLoading: loadingExpenseApprovals,
    error: expenseApprovalsError,
    refetch: refetchExpenseApprovals
  } = useExpensesApprovals({
    accessToken: accessToken || '',
    directReports: memoizedDirectReports
  })

  const {
    absenceApprovals,
    totalCount: absenceApprovalsCount,
    isLoading: loadingAbsenceApprovals,
    error: absenceApprovalsError,
    refetch: refetchAbsenceApprovals
  } = useAbsencesApprovals({
    accessToken: accessToken || '',
    directReports: memoizedDirectReports
  })

  // Simple tab change handler
  const handleApprovalTabChange = (tab: ApprovalTab) => {
    setActiveApprovalTab(tab)
  }

  const {
    personalDataApprovals,
    totalCount: personalDataApprovalsCount,
    isLoading: loadingPersonalDataApprovals,
    error: personalDataApprovalsError,
    refetch: refetchPersonalDataApprovals
  } = usePersonalDataApprovals({
    accessToken: accessToken || '',
    directReports: memoizedDirectReports
  })

  // Create dashboard-limited versions using useMemo
  const approvalTasks = useMemo(() => {
    // Combine all approval types based on active tab
    let combinedTasks: (ExpenseApproval | AbsenceApproval | PersonalDataApproval)[] = []
    if (activeApprovalTab === 'expenses') {
      combinedTasks = [...expenseApprovals]
    } else if (activeApprovalTab === 'absences') {
      combinedTasks = [...absenceApprovals]
    } else if (activeApprovalTab === 'personal-changes') {
      combinedTasks = [...personalDataApprovals]
    }

    // Sort by creation date (newest first)
    const sortedTasks = [...combinedTasks].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return sortedTasks.slice(0, 5) // Limit to 5 for dashboard
  }, [activeApprovalTab, expenseApprovals, absenceApprovals, personalDataApprovals])

  // Create dashboard-limited versions using useMemo
  const personalChanges = useMemo(() => {
    return personalDataApprovals.slice(0, 5) // Limit to 5 for dashboard
  }, [personalDataApprovals])

  const personalChangesCount = useMemo(() => {
    return personalDataApprovalsCount // Show actual total count
  }, [personalDataApprovalsCount])

  // Combined loading and error states - only show loading for active tab
  const isLoadingApprovals = useMemo(() => {
    if (activeApprovalTab === 'expenses') {
      return loadingExpenseApprovals
    } else if (activeApprovalTab === 'absences') {
      return loadingAbsenceApprovals
    } else if (activeApprovalTab === 'personal-changes') {
      return loadingPersonalDataApprovals
    }
    return false
  }, [activeApprovalTab, loadingExpenseApprovals, loadingAbsenceApprovals, loadingPersonalDataApprovals])

  const hasApprovalsError = useMemo(() => {
    if (activeApprovalTab === 'expenses') {
      return expenseApprovalsError
    } else if (activeApprovalTab === 'absences') {
      return absenceApprovalsError
    } else if (activeApprovalTab === 'personal-changes') {
      return personalDataApprovalsError
    }
    return false
  }, [activeApprovalTab, expenseApprovalsError, absenceApprovalsError, personalDataApprovalsError])

  // Combined expense count (requests + plans)
  const combinedExpenseCount = expenseApprovalsCount

  // Fetch current user profile to get profile picture
  const { userProfile } = useCurrentUserProfile({
    accessToken: accessToken || '',
    employeeId: employeeId || ''
  })

  const mainContent = (
    <div className="gba:p-6 gba:h-full gba:flex gba:flex-col" data-testid="manager-dashboard-content">
      <div className="gba:mb-8" data-testid="manager-dashboard-welcome-section">
        <div className="gba:flex gba:items-center gba:mb-2">
          <div className="gba:mr-3" data-testid="manager-dashboard-user-avatar">
            <Avatar size="lg" className="gba:h-12 gba:w-12" data-testid="manager-dashboard-user-avatar-image">
              <AvatarImage
                src={
                  userProfile?.pictureThumbnail && !userProfile.pictureThumbnail.startsWith('{')
                    ? `data:image/jpeg;base64,${userProfile.pictureThumbnail}`
                    : undefined
                }
                alt={`${userProfile?.firstName || userInfo?.employeeDetails?.firstName || ''} ${userProfile?.lastName || userInfo?.employeeDetails?.lastName || ''}`}
              />
              <AvatarFallback>
                {`${userProfile?.firstName?.[0] || userInfo?.employeeDetails?.firstName?.[0] || ''}${userProfile?.lastName?.[0] || userInfo?.employeeDetails?.lastName?.[0] || ''}`.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h1 className="gba:text-xl gba:font-semibold" data-testid="manager-dashboard-welcome-title">
              {getTranslationFromI18nKeyAndLabel('setup:welcome.title', 'Welcome')},{' '}
              {userInfo?.employeeDetails?.firstName ||
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.profile_icon_list.manager_title',
                  'Manager'
                )}
              !
            </h1>
            <div className="gba:flex gba:items-center">
              <p className="gba:text-sm gba:text-neutral-500 gba:mr-2">
                {userInfo?.employeeDetails?.organizationalUnit?.name ||
                  getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_list.search_employee_list.recent_employees_table.department',
                    'Department'
                  )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div
        className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6 gba:flex-1 gba:min-h-0"
        style={{ maxHeight: '550px' }}
        data-testid="manager-dashboard-cards-grid"
      >
        {/* My Teammates Card with Tabs */}
        <Card
          data-testid="manager-dashboard-teammates-card"
          className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden"
        >
          <CardHeader>
            <CardTitle className="gba:text-base gba:font-semibold gba:flex gba:items-center">
              <UsersIcon className="gba:mr-2 gba:h-5 gba:w-5 gba:text-primary-500" />
              {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.my_teammates', 'My Teammates')}
            </CardTitle>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                className="gba:text-muted-foreground gba:hover:text-foreground"
                data-testid="manager-dashboard-teammates-view-all-button"
                onClick={handleNavigateToTeammates}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.view_all', 'View All')}
                <CaretRightIcon size={16} className="gba:ml-1" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="gba:flex-1 gba:min-h-0 gba:px-2">
            <Tabs
              value={activeTeamTab}
              onValueChange={value => setActiveTeamTab(value as TeamTab)}
              className="gba:h-full gba:flex gba:flex-col"
            >
              <TabsList className="gba:w-full gba:mb-3">
                <TabsTrigger value="my-team">
                  <div className="gba:flex gba:items-center gba:gap-1 gba:!w-full">
                    <UsersThreeIcon size={16} />
                    {getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.manager_dashboard.my_direct_reports',
                      'My Directs'
                    )}
                  </div>
                </TabsTrigger>
                <TabsTrigger value="my-teams">
                  <div className="gba:flex gba:items-center gba:gap-1 gba:!w-full">
                    <TreeStructureIcon size={16} />
                    {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.my_teams', 'My Teams')}
                  </div>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="my-team" className="gba:flex-1 gba:min-h-0 gba:mt-0">
                <div className="gba:h-full gba:overflow-y-auto gba:pr-2">
                  {loadingDirectReports && (
                    <div
                      className="gba:flex gba:justify-center gba:py-4"
                      data-testid="manager-dashboard-direct-reports-loading"
                    >
                      <div className="gba:flex gba:items-center gba:text-neutral-500">
                        <span className="gba:mr-2 gba:animate-spin">⏳</span>{' '}
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.manager_dashboard.status.loading_direct_reports',
                          'Loading direct reports...'
                        )}
                      </div>
                    </div>
                  )}

                  {directReportsError && (
                    <div
                      className="gba:p-4 gba:text-center gba:text-destructive-600"
                      data-testid="manager-dashboard-direct-reports-error"
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.manager_dashboard.status.failed_load_direct_reports',
                        'Failed to load direct reports'
                      )}
                    </div>
                  )}

                  {!loadingDirectReports && !directReportsError && directReports.length === 0 && (
                    <div
                      className="gba:text-center gba:bg-blue-50 gba:p-3 gba:text-neutral-500 gba:text-xs"
                      data-testid="manager-dashboard-no-direct-reports"
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.manager_dashboard.status.no_direct_reports',
                        'No direct reports found'
                      )}
                    </div>
                  )}

                  {!loadingDirectReports && !directReportsError && directReports.length > 0 && (
                    <div className="gba:space-y-3" data-testid="manager-dashboard-direct-reports-container">
                      {directReports.map(report => (
                        <DirectMember
                          report={report}
                          handleNavigateToEmployee={handleNavigateToEmployee}
                          key={report.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="my-teams" className="gba:flex-1 gba:min-h-0 gba:mt-0">
                <div className="gba:h-full gba:overflow-y-auto gba:pr-2">
                  {loadingMatrixTeams && (
                    <div
                      className="gba:flex gba:justify-center gba:py-4"
                      data-testid="manager-dashboard-matrix-teams-loading"
                    >
                      <div className="gba:flex gba:items-center gba:text-neutral-500">
                        <span className="gba:mr-2 gba:animate-spin">⏳</span>{' '}
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.manager_dashboard.status.loading_teams',
                          'Loading matrix teams...'
                        )}
                      </div>
                    </div>
                  )}

                  {matrixTeamsError && (
                    <div
                      className="gba:p-4 gba:text-center gba:text-destructive-600"
                      data-testid="manager-dashboard-matrix-teams-error"
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.manager_dashboard.status.failed_load_teams',
                        'Failed to load matrix teams'
                      )}
                    </div>
                  )}

                  {!loadingMatrixTeams && !matrixTeamsError && matrixTeamMembers.length === 0 && (
                    <div
                      className="gba:text-center gba:bg-blue-50 gba:p-3 gba:text-neutral-500 gba:text-xs"
                      data-testid="manager-dashboard-no-matrix-teams"
                    >
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.manager_dashboard.status.no_teams',
                        'No matrix teams found'
                      )}
                    </div>
                  )}

                  {!loadingMatrixTeams && !matrixTeamsError && matrixTeamMembers.length > 0 && (
                    <div className="gba:space-y-3" data-testid="manager-dashboard-matrix-teams-container">
                      {matrixTeamMembers.map(member => (
                        <button
                          key={member.id}
                          type="button"
                          className="gba:flex gba:items-center gba:justify-between gba:py-2 gba:cursor-pointer gba:hover:bg-gray-50 gba:rounded-lg gba:px-2 gba:transition-colors gba:w-full gba:text-left gba:bg-transparent gba:border-0"
                          data-testid={`manager-dashboard-matrix-member-${member.id}`}
                          onClick={() => handleNavigateToEmployee(member.id)}
                          title={getTranslationFromI18nKeyAndLabel(
                            'master-data:hr.manager_dashboard.view_profile',
                            `View ${member.fullName}'s profile`,
                            { name: member.fullName }
                          )}
                        >
                          <div className="gba:flex gba:items-center">
                            <div className="gba:mr-3">
                              <Avatar
                                size="default"
                                className="gba:h-10 gba:w-10"
                                data-testid={`manager-dashboard-matrix-member-avatar-${member.id}`}
                              >
                                <AvatarImage
                                  src={
                                    member.pictureThumbnail && !member.pictureThumbnail.startsWith('{')
                                      ? `data:image/jpeg;base64,${member.pictureThumbnail}`
                                      : undefined
                                  }
                                  alt={`${member.firstName} ${member.lastName}`}
                                />
                                <AvatarFallback>
                                  {`${member.firstName[0]}${member.lastName[0]}`.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div>
                              <div
                                className="gba:font-medium gba:text-blue-600 gba:hover:underline"
                                data-testid={`manager-dashboard-matrix-member-name-${member.id}`}
                              >
                                {member.fullName}
                              </div>
                              <div
                                className="gba:text-sm gba:text-neutral-500"
                                data-testid={`manager-dashboard-matrix-member-title-${member.id}`}
                              >
                                {member.jobPositionName ||
                                  getTranslationFromI18nKeyAndLabel(
                                    'master-data:hr.manager_dashboard.matrix_team_member',
                                    'Matrix Team Member'
                                  )}
                              </div>
                              {member.matrixUnitName && (
                                <div className="gba:text-xs gba:text-neutral-400">
                                  {getTranslationFromI18nKeyAndLabel('master-data:forms.team.title', 'Team')}:{' '}
                                  {member.matrixUnitName}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="gba:flex gba:flex-col gba:items-end">
                            <Badge
                              variant={member.status === 'On Leave' ? 'destructive' : 'outline'}
                              size="sm"
                              className="gba:mb-1"
                            >
                              {member.status === 'On Leave'
                                ? getTranslationFromI18nKeyAndLabel(
                                    'master-data:manager_dashboard.on_leave',
                                    'On Leave'
                                  )
                                : getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.available', 'Available')}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Requests to Approve Card */}
        <Card
          data-testid="manager-dashboard-requests-card"
          className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden"
        >
          <CardHeader>
            <CardTitle className="gba:text-base gba:font-semibold gba:flex gba:items-center">
              <CheckSquareIcon className="gba:mr-2 gba:h-5 gba:w-5 gba:text-primary-500" />
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.requests_to_approve',
                'Requests to Approve'
              )}
            </CardTitle>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                className="gba:text-muted-foreground gba:hover:text-foreground"
                data-testid="manager-dashboard-requests-view-all-button"
                onClick={handleNavigateToApprovals}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.view_all', 'View All')}
                <CaretRightIcon size={16} className="gba:ml-1" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="gba:flex-1 gba:min-h-0 gba:px-2">
            {isLoadingApprovals && (
              <div className="gba:flex gba:justify-center gba:py-4" data-testid="manager-dashboard-requests-loading">
                <div className="gba:flex gba:items-center gba:text-neutral-500">
                  <span className="gba:mr-2 gba:animate-spin">⏳</span>{' '}
                  {getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.manager_dashboard.status.loading_requests',
                    'Loading requests...'
                  )}
                </div>
              </div>
            )}

            {hasApprovalsError && (
              <div
                className="gba:p-4 gba:text-center gba:text-destructive-600"
                data-testid="manager-dashboard-requests-error"
              >
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.status.failed_load_requests',
                  'Failed to load approval requests'
                )}
              </div>
            )}

            {!isLoadingApprovals &&
              !hasApprovalsError &&
              expenseApprovals.length === 0 &&
              absenceApprovals.length === 0 &&
              personalDataApprovals.length === 0 && (
                <div className="gba:text-center gba:py-6" data-testid="manager-dashboard-no-requests">
                  <CheckCircleIcon className="gba:h-12 gba:w-12 gba:text-success-300 gba:mx-auto gba:mb-3" />
                  <h3 className="gba:text-lg gba:font-medium gba:text-neutral-900 gba:mb-1">
                    {getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.manager_dashboard.status.all_caught_up',
                      'All caught up!'
                    )}
                  </h3>
                  <p className="gba:text-neutral-500">
                    {getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.manager_dashboard.status.no_pending_requests',
                      'There are no pending approval requests at the moment.'
                    )}
                  </p>
                </div>
              )}

            {!isLoadingApprovals &&
              !hasApprovalsError &&
              (expenseApprovals.length > 0 || absenceApprovals.length > 0 || personalDataApprovals.length > 0) && (
                <Tabs
                  value={activeApprovalTab}
                  onValueChange={value => handleApprovalTabChange(value as ApprovalTab)}
                  className="gba:h-full gba:flex gba:flex-col"
                >
                  <TabsList className="gba:grid gba:w-full gba:grid-cols-3 gba:mb-4">
                    <TabsTrigger value="expenses" className="gba:flex gba:items-center gba:space-x-2">
                      <div className="gba:flex gba:w-full gba:items-center">
                        <WalletIcon size={16} className="gba:mr-0.5" />
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:modify_expense_request.expense_items_sum',
                            'Expenses'
                          )}
                        </span>
                        <Badge variant="secondary" className="gba:ml-1">
                          {combinedExpenseCount}
                        </Badge>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="absences" className="gba:flex gba:items-center gba:space-x-2">
                      <div className="gba:flex gba:w-full gba:items-center gba:justify-center">
                        <AirplaneTiltIcon size={16} className="gba:mr-0.5" />
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_management_hub_manager.absence_list_screen.title',
                            'Absences'
                          )}
                        </span>
                        <Badge variant="secondary" className="gba:ml-1">
                          {absenceApprovalsCount}
                        </Badge>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="personal-changes" className="gba:flex gba:items-center gba:space-x-1">
                      <div className="gba:flex gba:w-full gba:items-center">
                        <UserIcon size={16} className="gba:mr-0.5" />
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'master-data:hr.manager_dashboard.personal_changes',
                            'Personal'
                          )}
                        </span>
                        <Badge variant="secondary" className="gba:ml-1">
                          {personalChangesCount}
                        </Badge>
                      </div>
                    </TabsTrigger>
                  </TabsList>

                  <div className="gba:flex-1 gba:min-h-0 gba:overflow-hidden">
                    <TabsContent value="expenses" className="gba:h-full gba:overflow-y-auto gba:pr-2">
                      {approvalTasks.filter(task => task.type === 'expense-request' || task.type === 'expense-plan')
                        .length === 0 ? (
                        <div className="gba:text-center gba:bg-blue-50 gba:p-3 gba:text-neutral-500 gba:text-xs">
                          <p className="gba:text-neutral-500">
                            {getTranslationFromI18nKeyAndLabel(
                              'master-data:hr.manager_dashboard.status.no_pending_requests',
                              'There are no pending approval requests at the moment.'
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="gba:space-y-3" data-testid="manager-dashboard-expense-requests">
                          {expenseApprovals.slice(0, 5).map(task => (
                            <ExpenseItem
                              key={task.id}
                              task={task}
                              employeeId={employeeId}
                              refetchExpenses={refetchExpenseApprovals}
                              accessToken={accessToken}
                              userId={userInfo?.id}
                            />
                          ))}
                          {combinedExpenseCount > 5 && (
                            <div className="gba:text-xs gba:text-neutral-400 gba:text-center gba:pt-2">
                              +{combinedExpenseCount - 5}{' '}
                              {getTranslationFromI18nKeyAndLabel(
                                'master-data:hr.manager_dashboard.more_expense_items',
                                'more expense items'
                              ).toLowerCase()}
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="absences" className="gba:h-full gba:overflow-y-auto gba:pr-3">
                      {absenceApprovals.length === 0 ? (
                        <div className="gba:text-center gba:bg-blue-50 gba:p-3 gba:text-neutral-500 gba:text-xs">
                          <p className="gba:text-neutral-500">
                            {getTranslationFromI18nKeyAndLabel(
                              'master-data:hr.manager_dashboard.status.no_expense_items',
                              'No absence requests to approve'
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="gba:space-y-3" data-testid="manager-dashboard-absence-requests">
                          {absenceApprovals.slice(0, 5).map(task => (
                            <AbsenceItem
                              key={task.id}
                              task={task}
                              userId={userInfo?.id}
                              accessToken={accessToken}
                              refetchAbsences={refetchAbsenceApprovals}
                            />
                          ))}
                          {absenceApprovalsCount > 5 && (
                            <div className="gba:text-xs gba:text-neutral-400 gba:text-center gba:pt-2">
                              +{absenceApprovalsCount - 5} more absence requests
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="personal-changes" className="gba:h-full gba:overflow-y-auto gba:pr-3">
                      {personalChanges.length === 0 ? (
                        <div className="gba:text-center gba:bg-blue-50 gba:p-3 gba:text-neutral-500 gba:text-xs">
                          <p className="gba:text-neutral-500">
                            {getTranslationFromI18nKeyAndLabel(
                              'master-data:hr.manager_dashboard.status.no_personal_changes',
                              'No personal data changes to review'
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="gba:space-y-3" data-testid="manager-dashboard-personal-changes">
                          {personalChanges.map(change => (
                            <PersonalChangeItem
                              key={change.id}
                              change={change}
                              userId={userInfo?.id}
                              accessToken={accessToken}
                              refetchPersonalData={refetchPersonalDataApprovals}
                            />
                          ))}
                          {personalChangesCount > 5 && (
                            <div className="gba:text-xs gba:text-neutral-400 gba:text-center gba:pt-2">
                              +{personalChangesCount - 5} more personal changes
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              )}
          </CardContent>
        </Card>

        {/* Team Insights Card */}
        <Card
          data-testid="manager-dashboard-team-insights-card"
          className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden"
        >
          <CardHeader>
            <CardTitle className="gba:text-base gba:font-semibold gba:flex gba:items-center">
              <UserIcon className="gba:mr-2 gba:h-5 gba:w-5 gba:text-primary-500" />
              {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.team_insights', 'Team Insights')}
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:flex-1 gba:min-h-0 gba:px-2">
            <Tabs
              value={activeInsightsTab}
              onValueChange={value => setActiveInsightsTab(value as InsightsTab)}
              className="gba:h-full gba:flex gba:flex-col"
            >
              <TabsList className="gba:w-full gba:mb-3">
                <TabsTrigger value="birthdays">
                  <div className="gba:flex-1 gba:flex gba:items-center gba:gap-1">
                    <CakeIcon size={16} />
                    {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthdays', 'Birthdays')}
                  </div>
                </TabsTrigger>
                <TabsTrigger value="anniversaries">
                  <div className="gba:flex-1 gba:flex gba:items-center gba:gap-1">
                    <TrophyIcon size={16} />
                    {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversaries', 'Anniversaries')}
                  </div>
                </TabsTrigger>
                <TabsTrigger value="missing-profiles">
                  <div className="gba:flex-1 gba:flex gba:items-center gba:gap-1">
                    <WarningIcon size={16} />
                    {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.profiles', 'Profiles')}
                  </div>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="birthdays" className="gba:flex-1 gba:min-h-0 gba:mt-0">
                <div className="gba:h-full gba:overflow-y-auto gba:pr-2">
                  <div className="gba:rounded-lg gba:p-3">
                    {loadingBirthdays && (
                      <div className="gba:text-center gba:text-neutral-500 gba:text-xs">
                        <span className="gba:animate-spin">⏳</span>
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.manager_dashboard.status.loading_birthdays',
                          'Loading birthdays...'
                        )}
                      </div>
                    )}

                    {!loadingBirthdays && upcomingBirthdays.length === 0 && (
                      <div className="gba:text-center gba:bg-blue-50 gba:p-3 gba:text-neutral-500 gba:text-xs">
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.manager_dashboard.status.no_birthdays_in_next_30_days',
                          'No upcoming birthdays in the next 30 days'
                        )}
                      </div>
                    )}

                    {!loadingBirthdays && upcomingBirthdays.length > 0 && (
                      <div className="gba:space-y-3">
                        <div className="gba:text-xs gba:font-medium gba:text-neutral-600 gba:mb-3 gba:flex gba:items-center gba:justify-center gba:gap-1">
                          <CakeIcon size={16} />
                          <span>{`${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.next_30_days', 'Next 30 days')} (${upcomingBirthdays.length} ${upcomingBirthdays.length > 1 ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthdays', 'Birthdays') : getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.profile_icon_list.birthday', 'Birthday')})`}</span>
                        </div>
                        {upcomingBirthdays.map(birthday => (
                          <button
                            key={birthday.id}
                            type="button"
                            className="gba:flex gba:items-center gba:justify-between gba:py-2 gba:cursor-pointer gba:hover:bg-gray-50 gba:rounded-lg gba:px-2 gba:transition-colors gba:w-full gba:text-left gba:bg-transparent gba:border-0"
                            onClick={() => handleNavigateToEmployee(birthday.id)}
                            title={getTranslationFromI18nKeyAndLabel(
                              'master-data:hr.manager_dashboard.view_profile',
                              `View ${birthday.fullName}'s profile`,
                              { name: birthday.fullName }
                            )}
                          >
                            <div className="gba:flex gba:items-center gba:flex-1">
                              <div className="gba:mr-3">
                                <Avatar size="default" className="gba:h-10 gba:w-10">
                                  <AvatarImage
                                    src={
                                      birthday.pictureThumbnail && !birthday.pictureThumbnail.startsWith('{')
                                        ? `data:image/jpeg;base64,${birthday.pictureThumbnail}`
                                        : undefined
                                    }
                                    alt={`${birthday.firstName} ${birthday.lastName}`}
                                  />
                                  <AvatarFallback>
                                    {`${birthday.firstName[0]}${birthday.lastName[0]}`.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <div>
                                <div className="gba:font-medium gba:text-blue-600 gba:hover:underline">
                                  {birthday.fullName}
                                </div>

                                <div className="gba:text-sm gba:text-neutral-500">
                                  {renderBirthdayDaysUntil(birthday.daysUntilBirthday)}
                                </div>
                              </div>
                            </div>
                            <div className="gba:flex gba:items-center gba:ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gba:h-8 gba:w-8 gba:p-0 gba:text-neutral-500 gba:hover:text-primary-600 gba:hover:bg-primary-50"
                                onClick={e => handleSendBirthdayEmail(birthday, e)}
                                title={getTranslationFromI18nKeyAndLabel(
                                  'master-data:hr.manager_dashboard.send_birthday_email',
                                  `Send birthday email to ${birthday.firstName}`,
                                  { name: birthday.firstName }
                                )}
                                data-testid={`birthday-email-button-${birthday.id}`}
                              >
                                <EnvelopeSimpleOpenIcon size={16} />
                              </Button>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="anniversaries" className="gba:flex-1 gba:min-h-0 gba:mt-0">
                <div className="gba:h-full gba:overflow-y-auto gba:pr-2">
                  <div className="gba:rounded-lg gba:p-3">
                    {loadingAnniversaries && (
                      <div className="gba:text-center gba:text-neutral-500 gba:text-xs">
                        <span className="gba:animate-spin">⏳</span>{' '}
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.manager_dashboard.status.loading_anniversaries',
                          'Loading anniversaries...'
                        )}
                      </div>
                    )}

                    {!loadingAnniversaries && upcomingAnniversaries.length === 0 && (
                      <div className="gba:text-center gba:bg-blue-50 gba:p-3 gba:text-neutral-500 gba:text-xs">
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.manager_dashboard.status.no_anniversaries_in_next_30_days',
                          'No upcoming anniversaries in the next 30 days'
                        )}
                      </div>
                    )}

                    {!loadingAnniversaries && upcomingAnniversaries.length > 0 && (
                      <div className="gba:space-y-3">
                        <div className="gba:text-xs gba:font-medium gba:text-neutral-600 gba:mb-3 gba:flex gba:items-center gba:justify-center gba:gap-1">
                          <TrophyIcon size={16} />
                          <span>{`${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.next_30_days', 'Next 30 days')} (${upcomingAnniversaries.length} ${upcomingAnniversaries.length > 1 ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversaries', 'Anniversaries') : getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversary_date', 'Anniversary')})`}</span>
                        </div>
                        {upcomingAnniversaries.map(anniversary => (
                          <button
                            key={anniversary.id}
                            type="button"
                            className="gba:flex gba:items-center gba:justify-between gba:py-2 gba:cursor-pointer gba:hover:bg-gray-50 gba:rounded-lg gba:px-2 gba:transition-colors gba:w-full gba:text-left gba:bg-transparent gba:border-0"
                            onClick={() => handleNavigateToEmployee(anniversary.id)}
                            title={getTranslationFromI18nKeyAndLabel(
                              'master-data:hr.manager_dashboard.view_profile',
                              `View ${anniversary.fullName}'s profile`,
                              { name: anniversary.fullName }
                            )}
                          >
                            <div className="gba:flex gba:items-center gba:flex-1">
                              <div className="gba:mr-3">
                                <Avatar size="default" className="gba:h-10 gba:w-10">
                                  <AvatarImage
                                    src={
                                      anniversary.pictureThumbnail && !anniversary.pictureThumbnail.startsWith('{')
                                        ? `data:image/jpeg;base64,${anniversary.pictureThumbnail}`
                                        : undefined
                                    }
                                    alt={`${anniversary.firstName} ${anniversary.lastName}`}
                                  />
                                  <AvatarFallback>
                                    {`${anniversary.firstName[0]}${anniversary.lastName[0]}`.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <div>
                                <div className="gba:font-medium gba:text-blue-600 gba:hover:underline">
                                  {anniversary.fullName}
                                </div>

                                <div className="gba:text-sm gba:text-neutral-500 gba:flex gba:items-center gba:justify-start gba:gap-1">
                                  <span>{`${anniversary.yearsOfService} ${anniversary.yearsOfService === 1 ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.year', 'year') : getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.years', 'years')}`}</span>
                                  {renderAnniversaryDaysUntil(anniversary.daysUntilAnniversary)}
                                </div>
                                {anniversary.anniversaryDate && (
                                  <div className="gba:text-sm gba:text-muted-foreground">
                                    {anniversary.anniversaryDate}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="gba:flex gba:items-center gba:ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gba:h-8 gba:w-8 gba:p-0 gba:text-neutral-500 gba:hover:text-primary-600 gba:hover:bg-primary-50"
                                onClick={e => handleSendAnniversaryEmail(anniversary, e)}
                                title={getTranslationFromI18nKeyAndLabel(
                                  'master-data:hr.manager_dashboard.sent_anniversary_email',
                                  `Send anniversary email to ${anniversary.firstName}`,
                                  { name: anniversary.firstName }
                                )}
                                data-testid={`anniversary-email-button-${anniversary.id}`}
                              >
                                <EnvelopeSimpleOpenIcon size={16} />
                              </Button>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="missing-profiles" className="gba:flex-1 gba:min-h-0 gba:mt-0">
                <div className="gba:h-full gba:overflow-y-auto gba:pr-2">
                  <div className="gba:bg-warning-50 gba:rounded-lg gba:p-3">
                    {loadingMissingProfiles && (
                      <div className="gba:text-center gba:text-neutral-500 gba:text-xs">
                        <span className="gba:animate-spin">⏳</span>{' '}
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.manager_dashboard.status.loading_job_profiles',
                          'Loading job profiles...'
                        )}
                      </div>
                    )}

                    {!loadingMissingProfiles && employeesWithMissingProfiles.length === 0 && (
                      <div className="gba:text-center gba:bg-blue-50 gba:p-3 gba:text-neutral-500 gba:text-xs gba:flex gba:items-center gba:justify-center gba:gap-1">
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.manager_dashboard.status.all_job_profiles_completed',
                          'All team members have complete job profiles'
                        )}
                      </div>
                    )}

                    {!loadingMissingProfiles && employeesWithMissingProfiles.length > 0 && (
                      <div className="gba:space-y-3">
                        <div className="gba:text-xs gba:font-medium gba:text-warning-700 gba:mb-3 gba:flex gba:items-center gba:justify-center gba:gap-1">
                          <WarningIcon size={16} />
                          {employeesWithMissingProfiles.length > 1
                            ? getTranslationFromI18nKeyAndLabel(
                                'master-data:hr.manager_dashboard.team_members_need_attention',
                                `${employeesWithMissingProfiles.length} team members need attention`,
                                { count: employeesWithMissingProfiles.length }
                              )
                            : getTranslationFromI18nKeyAndLabel(
                                'master-data:hr.manager_dashboard.team_member_needs_attention',
                                '1 team member needs attention'
                              )}
                        </div>
                        {employeesWithMissingProfiles.map(employee => (
                          <button
                            key={employee.id}
                            type="button"
                            className="gba:flex gba:items-center gba:justify-between gba:py-2 gba:cursor-pointer gba:hover:bg-gray-50 gba:rounded-lg gba:px-2 gba:transition-colors gba:w-full gba:text-left gba:bg-transparent gba:border-0"
                            onClick={() => handleNavigateToEmployee(employee.id)}
                            title={getTranslationFromI18nKeyAndLabel(
                              'master-data:hr.manager_dashboard.view_profile',
                              `View ${employee.fullName}'s profile`,
                              { name: employee.fullName }
                            )}
                          >
                            <div className="gba:flex gba:items-center">
                              <div className="gba:mr-3">
                                <Avatar size="default" className="gba:h-10 gba:w-10">
                                  <AvatarImage
                                    src={
                                      employee.pictureThumbnail && !employee.pictureThumbnail.startsWith('{')
                                        ? `data:image/jpeg;base64,${employee.pictureThumbnail}`
                                        : undefined
                                    }
                                    alt={`${employee.firstName} ${employee.lastName}`}
                                  />
                                  <AvatarFallback>
                                    {`${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <div>
                                <div className="gba:font-medium gba:text-blue-600 gba:hover:underline">
                                  {employee.fullName}
                                </div>
                                <div className="gba:text-sm gba:text-neutral-500">
                                  {renderMissingProfileReason(employee.missingProfileReason)}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  )

  // Teammates detailed view - using the same header structure as "Requests to Approve"
  if (currentView === 'teammates') {
    // Transform DirectReport data to Employee interface format with proper data mapping
    const transformedDirectReports: Employee[] = directReports.map(report => ({
      id: report.id,
      userId: undefined, // DirectReport doesn't have userId
      supervisorEmployeeId: employeeId, // Current user is the supervisor
      firstName: report.firstName,
      lastName: report.lastName,
      jobTitle: report.jobPositionName || '', // Use actual job title
      organizationalUnit: report.organizationalUnitName || '', // Use actual org unit
      email: '', // DirectReport doesn't have email - leave empty
      profilePicture: report.pictureThumbnail || '',
      employmentType: '', // DirectReport doesn't have employment type - leave empty
      contractType: '', // DirectReport doesn't have contract type - leave empty
      matrixTeams: [] // DirectReport doesn't have matrix teams
    }))

    // Transform MatrixTeamMember data to Employee interface format
    const transformedMatrixTeamMembers: Employee[] = matrixTeamMembers.map(member => ({
      id: member.id,
      userId: undefined, // MatrixTeamMember doesn't have userId
      supervisorEmployeeId: employeeId, // Current user is the supervisor
      firstName: member.firstName,
      lastName: member.lastName,
      jobTitle: member.jobPositionName || '', // Use actual job title
      organizationalUnit: member.matrixUnitName || '', // Use matrix unit name
      email: '', // MatrixTeamMember doesn't have email - leave empty
      profilePicture: member.pictureThumbnail || '',
      employmentType: '', // MatrixTeamMember doesn't have employment type - leave empty
      contractType: '', // MatrixTeamMember doesn't have contract type - leave empty
      matrixTeams: [] // MatrixTeamMember doesn't have matrix teams
    }))

    const handleSelectEmployee = (employee: Employee) => {
      handleNavigateToEmployee(employee.id)
    }

    return (
      <div className="gba:p-6 gba:h-full gba:flex gba:flex-col">
        {/* Header section - identical to "Requests to Approve" */}
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
          <div className="gba:flex gba:items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNavigateBackToDashboard}
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
              {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.my_teammates', 'My Teammates')}
            </h1>
            <Badge variant="info" className="gba:ml-3">
              {`${directReports.length + matrixTeamMembers.length} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.total_teammates', 'total teammates').toLowerCase()}`}
            </Badge>
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
            accessToken={accessToken || ''}
          />
        </div>
      </div>
    )
  }

  if (currentView === 'approvals') {
    // Use data from new hooks based on active tab
    const expenseRequests = activeApprovalTab === 'expenses' ? expenseApprovals : []
    const leaveRequests = activeApprovalTab === 'absences' ? absenceApprovals : []
    const personalChanges = activeApprovalTab === 'personal-changes' ? personalDataApprovals : []

    return (
      <div className="gba:p-6 gba:h-full gba:flex gba:flex-col">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
          <div className="gba:flex gba:items-center">
            <Button variant="ghost" size="sm" onClick={handleNavigateBackToDashboard} className="gba:mr-4">
              <CaretLeftIcon size={16} className="gba:mr-1" />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
                'Back to Dashboard'
              )}
            </Button>
            <h1 className="gba:text-xl gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.requests_to_approve',
                'Requests to Approve'
              )}
            </h1>
            <Badge variant="info" className="gba:ml-3">
              {`${expenseApprovalsCount + absenceApprovalsCount + personalDataApprovalsCount} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.total_requests', 'total requests').toLowerCase()}`}
            </Badge>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingApprovals && (
          <div className="gba:text-center gba:py-12">
            <div className="gba:flex gba:items-center gba:justify-center gba:text-neutral-500">
              <span className="gba:mr-2 gba:animate-spin">⏳</span>{' '}
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.status.loading_approval_requests',
                'Loading approval requests...'
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {hasApprovalsError && (
          <div className="gba:text-center gba:py-12">
            <div className="gba:text-destructive-600 gba:mb-4">
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.status.failed_load_requests',
                'Failed to load approval requests'
              )}
            </div>
            <Button onClick={() => globalThis.location.reload()} variant="outline">
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.try_again', 'Try Again')}
            </Button>
          </div>
        )}

        {/* Empty State */}
        {expenseApprovals.length === 0 &&
          absenceApprovals.length === 0 &&
          personalDataApprovals.length === 0 &&
          !isLoadingApprovals &&
          !hasApprovalsError && (
            <div className="gba:text-center gba:py-12">
              <CheckCircleIcon className="gba:h-12 gba:w-12 gba:text-success-300 gba:mx-auto gba:mb-4" />
              <h3 className="gba:text-lg gba:font-medium gba:text-neutral-900 gba:mb-2">
                {`${getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.status.all_caught_up',
                  'All caught up'
                )}!`}
              </h3>
              <p className="gba:text-neutral-500">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.status.no_pending_requests',
                  'There are no pending approval requests at the moment.'
                )}
              </p>
            </div>
          )}

        {/* Tabs for Detailed Approval View */}
        {!isLoadingApprovals &&
          !hasApprovalsError &&
          (expenseApprovals.length > 0 || absenceApprovals.length > 0 || personalDataApprovals.length > 0) && (
            <RequestsToApproveTable
              activeApprovalTab={activeApprovalTab}
              setActiveApprovalTab={handleApprovalTabChange}
              allExpenseCount={combinedExpenseCount}
              allAbsenceCount={absenceApprovalsCount}
              allPersonalChangesCount={personalChangesCount}
              expenseRequests={expenseRequests}
              leaveRequests={leaveRequests}
              allPersonalChanges={personalChanges}
              accessToken={accessToken || ''}
              userId={userInfo?.id}
              refetchAbsences={refetchAbsenceApprovals}
              refetchPersonalData={refetchPersonalDataApprovals}
              refetchExpenses={refetchExpenseApprovals}
              employeeId={employeeId}
            />
          )}
      </div>
    )
  }

  return <div className="gba:flex gba:flex-col gba:h-full">{mainContent}</div>
}

export default ManagerDashboard
