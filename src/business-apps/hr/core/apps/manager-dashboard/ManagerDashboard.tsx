'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTeammates } from '@/common/hooks/useTeammates'
import { useDirectReports } from './hooks/useDirectReports'
import { useMatrixTeams } from './hooks/useMatrixTeams'
import { useTeamBirthdays } from './hooks/useTeamBirthdays'
import { useTeamAnniversaries } from './hooks/useTeamAnniversaries'
import { useMissingJobProfiles } from './hooks/useMissingJobProfiles'
import {
  useRequestsToApprove,
  getPriorityVariant,
  getPriorityLabel,
  getPriorityOrder,
  getTimeAgo,
  formatCurrency
} from './hooks/useRequestsToApprove'
import {
  usePersonalDataChanges,
  getPersonalChangePriorityVariant,
  getPersonalChangePriorityLabel,
  formatChangeType
} from './hooks/usePersonalDataChanges'
import { useCurrentUserProfile } from './hooks/useCurrentUserProfile'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
// Removed useTeamAbsences import as it was replaced by useRequestsToApprove
// Removed dayjs and env imports as they're no longer needed
import { TeamBirthday } from './hooks/useTeamBirthdays'
import { TeamAnniversary } from './hooks/useTeamAnniversaries'
import { UserInfo } from './types/employee.types'
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
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@newwork/nw-design-system'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { EmployeeTable } from '@/business-apps/hr/core/apps/human-resources/components/views/employee-view/components/EmployeeTable'
import { Employee } from '@/business-apps/hr/core/hooks/useGetEmployees'
import { DirectReport } from './hooks/useDirectReports'
import { notification } from 'antd'

import {
  PiUser,
  PiUsers,
  PiCaretRight,
  PiCaretLeft,
  PiCheckCircle,
  PiCheckSquare,
  PiFile as PiFileText,
  PiUsersThree,
  PiNetwork,
  PiClock,
  PiCake,
  PiTrophy,
  PiWarning,
  PiEnvelope
} from 'react-icons/pi'
import { ManagerAssistant } from './components/ManagerAssistant'

/**
 * Manager Dashboard
 * Displays a dashboard for managers with key metrics and insights
 */
export const ManagerDashboard: React.FC<BusinessAppContextProps> = ({ userInfo, accessToken }) => {
  const employeeId = userInfo?.employeeDetails?.employeeId
  const { t } = useTranslation()

  // State for team tabs
  const [activeTeamTab, setActiveTeamTab] = useState<'my-team' | 'my-teams'>('my-team')

  // State for team insights tabs
  const [activeInsightsTab, setActiveInsightsTab] = useState<'birthdays' | 'anniversaries' | 'missing-profiles'>(
    'birthdays'
  )

  // State for approval tabs
  const [activeApprovalTab, setActiveApprovalTab] = useState<'expenses' | 'absences' | 'personal-changes'>('expenses')

  // State for current view (dashboard or detailed pages)
  const [currentView, setCurrentView] = useState<'dashboard' | 'teammates' | 'approvals'>('dashboard')

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
    loading: loadingBirthdays,
    error: birthdaysError
  } = useTeamBirthdays({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  // Fetch upcoming anniversaries for Team Insights
  const {
    upcomingAnniversaries,
    loading: loadingAnniversaries,
    error: anniversariesError
  } = useTeamAnniversaries({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  // Fetch employees with missing job profiles for Team Insights
  const {
    employeesWithMissingProfiles,
    loading: loadingMissingProfiles,
    error: missingProfilesError
  } = useMissingJobProfiles({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  // Fetch requests that need approval (replaces legacy team absences)
  const {
    approvalTasks,
    totalCount,
    expenseRequestCount,
    expensePlanCount,
    expenseCount,
    absenceCount,
    loading: loadingApprovals,
    error: approvalsError,
    refetch: refetchApprovals,
    approveRequest,
    rejectRequest,
    approving,
    rejecting
  } = useRequestsToApprove({
    accessToken: accessToken || '',
    managerId: employeeId || '',
    showAll: false // Dashboard shows limited requests
  })

  // Fetch all requests for detailed approvals view
  const {
    approvalTasks: allApprovalTasks,
    totalCount: allTotalCount,
    expenseRequestCount: allExpenseRequestCount,
    expensePlanCount: allExpensePlanCount,
    expenseCount: allExpenseCount,
    absenceCount: allAbsenceCount,
    loading: loadingAllApprovals,
    error: allApprovalsError,
    refetch: refetchAllApprovals,
    approveRequest: approveAllRequest,
    rejectRequest: rejectAllRequest,
    approving: approvingAll,
    rejecting: rejectingAll
  } = useRequestsToApprove({
    accessToken: accessToken || '',
    managerId: employeeId || '',
    showAll: true // Detailed view shows all requests
  })

  // Fetch personal data changes for dashboard
  const {
    personalChanges,
    personalChangesCount,
    loading: loadingPersonalChanges,
    error: personalChangesError,
    refetch: refetchPersonalChanges,
    approveChange,
    rejectChange,
    approving: approvingChange,
    rejecting: rejectingChange
  } = usePersonalDataChanges({
    accessToken: accessToken || '',
    managerId: employeeId || '',
    showAll: false // Dashboard shows limited changes
  })

  // Fetch all personal data changes for detailed view
  const {
    personalChanges: allPersonalChanges,
    personalChangesCount: allPersonalChangesCount,
    loading: loadingAllPersonalChanges,
    error: allPersonalChangesError,
    refetch: refetchAllPersonalChanges,
    approveChange: approveAllChange,
    rejectChange: rejectAllChange,
    approving: approvingAllChange,
    rejecting: rejectingAllChange
  } = usePersonalDataChanges({
    accessToken: accessToken || '',
    managerId: employeeId || '',
    showAll: true // Detailed view shows all changes
  })

  // Fetch current user profile to get profile picture
  const { userProfile, loading: loadingUserProfile } = useCurrentUserProfile({
    accessToken: accessToken || '',
    employeeId: employeeId || ''
  })

  // Define main content as a variable for PageLayout
  // Create the main content for the dashboard

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
              Welcome, {userInfo?.employeeDetails?.firstName || 'Manager'}!
            </h1>
            <div className="gba:flex gba:items-center">
              <p className="gba:text-sm gba:text-neutral-500 gba:mr-2">
                {userInfo?.employeeDetails?.organizationalUnit?.name || 'Department'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Card */}
      <ManagerAssistant accessToken={accessToken} userInfo={userInfo} />

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
              <PiUsers className="gba:mr-2 gba:h-5 gba:w-5 gba:text-primary-500" />
              My Teammates
            </CardTitle>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                className="gba:text-neutral-500 gba:hover:text-neutral-700"
                data-testid="manager-dashboard-teammates-view-all-button"
                onClick={handleNavigateToTeammates}
              >
                View All
                <PiCaretRight size={16} className="gba:ml-1" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="gba:flex-1 gba:min-h-0 gba:px-2">
            <Tabs
              value={activeTeamTab}
              onValueChange={value => setActiveTeamTab(value as 'my-team' | 'my-teams')}
              className="gba:h-full gba:flex gba:flex-col"
            >
              <TabsList className="gba:w-full gba:mb-3">
                <TabsTrigger value="my-team" className="gba:flex-1 gba:flex gba:items-center gba:gap-1">
                  <PiUsersThree size={16} />
                  My Directs
                </TabsTrigger>
                <TabsTrigger value="my-teams" className="gba:flex-1 gba:flex gba:items-center gba:gap-1">
                  <PiNetwork size={16} />
                  My Teams
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
                        <span className="gba:mr-2 gba:animate-spin">⏳</span> Loading direct reports...
                      </div>
                    </div>
                  )}

                  {directReportsError && (
                    <div
                      className="gba:p-4 gba:text-center gba:text-destructive-600"
                      data-testid="manager-dashboard-direct-reports-error"
                    >
                      Failed to load direct reports
                    </div>
                  )}

                  {!loadingDirectReports && !directReportsError && directReports.length === 0 && (
                    <div
                      className="gba:p-4 gba:text-center gba:text-neutral-500"
                      data-testid="manager-dashboard-no-direct-reports"
                    >
                      No direct reports found
                    </div>
                  )}

                  {!loadingDirectReports && !directReportsError && directReports.length > 0 && (
                    <div className="gba:space-y-3" data-testid="manager-dashboard-direct-reports-container">
                      {directReports.map(report => (
                        <div
                          key={report.id}
                          className="gba:flex gba:items-center gba:justify-between gba:py-2 gba:cursor-pointer gba:hover:bg-gray-50 gba:rounded-lg gba:px-2 gba:transition-colors"
                          data-testid={`manager-dashboard-direct-report-${report.id}`}
                          onClick={() => handleNavigateToEmployee(report.id)}
                          title={`View ${report.fullName}'s profile`}
                        >
                          <div className="gba:flex gba:items-center">
                            <div className="gba:mr-3">
                              <Avatar
                                size="default"
                                className="gba:h-10 gba:w-10"
                                data-testid={`manager-dashboard-direct-report-avatar-${report.id}`}
                              >
                                <AvatarImage
                                  src={
                                    report.pictureThumbnail && !report.pictureThumbnail.startsWith('{')
                                      ? `data:image/jpeg;base64,${report.pictureThumbnail}`
                                      : undefined
                                  }
                                  alt={`${report.firstName} ${report.lastName}`}
                                />
                                <AvatarFallback>
                                  {`${report.firstName[0]}${report.lastName[0]}`.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div>
                              <div
                                className="gba:font-medium gba:text-blue-600 gba:hover:underline"
                                data-testid={`manager-dashboard-direct-report-name-${report.id}`}
                              >
                                {report.fullName}
                              </div>
                              <div
                                className="gba:text-sm gba:text-neutral-500"
                                data-testid={`manager-dashboard-direct-report-title-${report.id}`}
                              >
                                {report.jobPositionName || 'Direct Report'}
                              </div>
                              {report.organizationalUnitName && (
                                <div className="gba:text-xs gba:text-neutral-400">{report.organizationalUnitName}</div>
                              )}
                              {/* Absence Information */}
                              {report.status === 'On Leave' && report.currentAbsence && (
                                <div
                                  className="gba:text-xs gba:text-orange-600 gba:mt-1"
                                  data-testid={`manager-dashboard-current-absence-${report.id}`}
                                >
                                  Until: {new Date(report.currentAbsence.endDate).toLocaleDateString()}
                                </div>
                              )}
                              {report.status === 'Available' && report.nextAbsence && (
                                <div
                                  className="gba:text-xs gba:text-blue-600 gba:mt-1"
                                  data-testid={`manager-dashboard-next-absence-${report.id}`}
                                >
                                  On leave from: {new Date(report.nextAbsence.startDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="gba:flex gba:flex-col gba:items-end">
                            <Badge
                              variant={
                                report.status === 'Available'
                                  ? 'outline'
                                  : report.status === 'On Leave'
                                    ? 'destructive'
                                    : 'warning'
                              }
                              size="sm"
                              className="gba:mb-1"
                            >
                              {report.status || 'Available'}
                            </Badge>
                          </div>
                        </div>
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
                        <span className="gba:mr-2 gba:animate-spin">⏳</span> Loading matrix teams...
                      </div>
                    </div>
                  )}

                  {matrixTeamsError && (
                    <div
                      className="gba:p-4 gba:text-center gba:text-destructive-600"
                      data-testid="manager-dashboard-matrix-teams-error"
                    >
                      Failed to load matrix teams
                    </div>
                  )}

                  {!loadingMatrixTeams && !matrixTeamsError && matrixTeamMembers.length === 0 && (
                    <div
                      className="gba:p-4 gba:text-center gba:text-neutral-500"
                      data-testid="manager-dashboard-no-matrix-teams"
                    >
                      No matrix teams found
                    </div>
                  )}

                  {!loadingMatrixTeams && !matrixTeamsError && matrixTeamMembers.length > 0 && (
                    <div className="gba:space-y-3" data-testid="manager-dashboard-matrix-teams-container">
                      {matrixTeamMembers.map(member => (
                        <div
                          key={member.id}
                          className="gba:flex gba:items-center gba:justify-between gba:py-2 gba:cursor-pointer gba:hover:bg-gray-50 gba:rounded-lg gba:px-2 gba:transition-colors"
                          data-testid={`manager-dashboard-matrix-member-${member.id}`}
                          onClick={() => handleNavigateToEmployee(member.id)}
                          title={`View ${member.fullName}'s profile`}
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
                                {member.jobPositionName || 'Matrix Team Member'}
                              </div>
                              {member.matrixUnitName && (
                                <div className="gba:text-xs gba:text-neutral-400">Team: {member.matrixUnitName}</div>
                              )}
                            </div>
                          </div>
                          <div className="gba:flex gba:flex-col gba:items-end">
                            <Badge
                              variant={
                                member.status === 'Available'
                                  ? 'outline'
                                  : member.status === 'On Leave'
                                    ? 'destructive'
                                    : 'warning'
                              }
                              size="sm"
                              className="gba:mb-1"
                            >
                              {member.status || 'Available'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Team Overview Card */}
        {/* <Card data-testid="manager-dashboard-team-card" className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden">
          <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-2">
            <CardTitle className="gba:text-lg gba:flex gba:items-center">
              <PiUsers className="gba:mr-2 gba:h-5 gba:w-5 gba:text-primary-500" />
              Team Overview
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gba:text-neutral-500 gba:hover:text-neutral-700"
              data-testid="manager-dashboard-team-view-all-button"
            >
              View All
              <PiCaretRight size={16} className="gba:ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="gba:flex-1 gba:min-h-0 gba:overflow-hidden">
            <div className="gba:space-y-4 gba:overflow-y-auto gba:pr-1 gba:h-full">
              {loadingTeam && (
                <div className="gba:flex gba:justify-center gba:py-4" data-testid="manager-dashboard-team-loading">
                  <div className="gba:flex gba:items-center gba:text-neutral-500">
                    <span className="gba:mr-2 gba:animate-spin">⏳</span> Loading team...
                  </div>
                </div>
              )}
              
              {teamError && (
                <div className="gba:p-4 gba:text-center gba:text-destructive-600" data-testid="manager-dashboard-team-error">
                  Failed to load team members
                </div>
              )}
              
              {!loadingTeam && !teamError && teamMembers.length === 0 && (
                <div className="gba:p-4 gba:text-center gba:text-neutral-500" data-testid="manager-dashboard-no-team">
                  No team members found
                </div>
              )}
              
              {!loadingTeam && !teamError && teamMembers.map(member => (
                <div key={member.id} className="gba:flex gba:items-center gba:justify-between gba:py-2" data-testid={`manager-dashboard-team-member-${member.id}`}>
                  <div className="gba:flex gba:items-center">
                    <div className="gba:mr-3">
                      <div className="gba:flex gba:items-center gba:justify-center gba:h-10 gba:w-10 gba:bg-primary-100 gba:rounded-full gba:text-primary-700 gba:font-medium">
                        {`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="gba:font-medium">{member.fullName}</div>
                      <div className="gba:text-sm gba:text-neutral-500">{member.jobTitle}</div>
                    </div>
                  </div>
                  <Badge 
                    variant={member.status === 'Online' ? 'success' : member.status === 'Away' ? 'warning' : 'default'}
                    className="gba:ml-auto"
                  >
                    {member.status}
                  </Badge>
                </div>
              ))}
              
              {!loadingTeam && !teamError && teamMembers.length > 0 && (
                <Button
                  variant="outline" 
                  className="gba:w-full"
                  data-testid="manager-dashboard-view-team-button"
                >
                  View Full Team
                </Button>
              )}
            </div>
          </CardContent>
        </Card> */}

        {/* Requests to Approve Card */}
        <Card
          data-testid="manager-dashboard-requests-card"
          className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden"
        >
          <CardHeader>
            <CardTitle className="gba:text-base gba:font-semibold gba:flex gba:items-center">
              <PiCheckSquare className="gba:mr-2 gba:h-5 gba:w-5 gba:text-primary-500" />
              Requests to Approve
              <Badge variant="info" className="gba:ml-2" data-testid="manager-dashboard-requests-badge">
                {(totalCount || 0) + (personalChangesCount || 0)}
              </Badge>
            </CardTitle>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                className="gba:text-neutral-500 gba:hover:text-neutral-700"
                data-testid="manager-dashboard-requests-view-all-button"
                onClick={handleNavigateToApprovals}
              >
                View All
                <PiCaretRight size={16} className="gba:ml-1" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="gba:flex-1 gba:min-h-0 gba:px-2">
            {loadingApprovals && (
              <div className="gba:flex gba:justify-center gba:py-4" data-testid="manager-dashboard-requests-loading">
                <div className="gba:flex gba:items-center gba:text-neutral-500">
                  <span className="gba:mr-2 gba:animate-spin">⏳</span> Loading requests...
                </div>
              </div>
            )}

            {approvalsError && (
              <div
                className="gba:p-4 gba:text-center gba:text-destructive-600"
                data-testid="manager-dashboard-requests-error"
              >
                Failed to load approval requests
              </div>
            )}

            {!loadingApprovals && !approvalsError && approvalTasks.length === 0 && (
              <div className="gba:text-center gba:py-6" data-testid="manager-dashboard-no-requests">
                <PiCheckCircle className="gba:h-12 gba:w-12 gba:text-success-300 gba:mx-auto gba:mb-3" />
                <h3 className="gba:text-lg gba:font-medium gba:text-neutral-900 gba:mb-1">All caught up!</h3>
                <p className="gba:text-neutral-500">There are no pending approval requests at the moment.</p>
              </div>
            )}

            {!loadingApprovals && !approvalsError && (approvalTasks.length > 0 || personalChanges.length > 0) && (
              <Tabs
                value={activeApprovalTab}
                onValueChange={value => setActiveApprovalTab(value as 'expenses' | 'absences' | 'personal-changes')}
                className="gba:h-full gba:flex gba:flex-col"
              >
                <TabsList className="gba:grid gba:w-full gba:grid-cols-3 gba:mb-4">
                  <TabsTrigger value="expenses" className="gba:flex gba:items-center gba:space-x-2">
                    <span>💰</span>
                    <span>Expenses</span>
                    <Badge variant="secondary" className="gba:ml-1">
                      {expenseCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="absences" className="gba:flex gba:items-center gba:space-x-2">
                    <span>🏖️</span>
                    <span>Absences</span>
                    <Badge variant="secondary" className="gba:ml-1">
                      {absenceCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="personal-changes" className="gba:flex gba:items-center gba:space-x-1">
                    <span>👤</span>
                    <span>Personal</span>
                    <Badge variant="secondary" className="gba:ml-1">
                      {personalChangesCount}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <div className="gba:flex-1 gba:min-h-0 gba:overflow-hidden">
                  <TabsContent value="expenses" className="gba:h-full gba:overflow-y-auto gba:pr-2">
                    {approvalTasks.filter(task => task.type === 'expense-request' || task.type === 'expense-plan')
                      .length === 0 ? (
                      <div className="gba:text-center gba:py-6">
                        <div className="gba:text-4xl gba:mb-3">💰</div>
                        <p className="gba:text-neutral-500">No expense requests to approve</p>
                      </div>
                    ) : (
                      <div className="gba:space-y-3" data-testid="manager-dashboard-expense-requests">
                        {approvalTasks
                          .filter(task => task.type === 'expense-request' || task.type === 'expense-plan')
                          .map(task => (
                            <div
                              key={task.id}
                              className="gba:p-3 gba:border gba:border-neutral-200 gba:rounded-lg gba:hover:border-primary-300 gba:transition-colors gba:cursor-pointer"
                              data-testid={`manager-dashboard-request-${task.id}`}
                            >
                              <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
                                <div className="gba:flex-1">
                                  <div className="gba:font-medium gba:text-neutral-900 gba:text-sm gba:mb-1">
                                    {task.title}
                                  </div>
                                  <div className="gba:text-xs gba:text-neutral-500 gba:flex gba:items-center gba:mb-1">
                                    <PiUser className="gba:mr-1" size={12} />
                                    From: {task.employee.fullName}
                                  </div>
                                  <div className="gba:text-xs gba:text-neutral-500 gba:flex gba:items-center gba:mb-1">
                                    <PiClock className="gba:mr-1" size={12} />
                                    {getTimeAgo(task.createdAt)}
                                  </div>
                                  <div className="gba:text-xs gba:font-medium gba:text-green-600">
                                    {formatCurrency(task.totalAmount)}
                                  </div>
                                  <div className="gba:text-xs gba:text-neutral-400">
                                    {task.type === 'expense-request' ? '📋 Request' : '📝 Plan'}
                                  </div>
                                </div>
                                <div className="gba:flex gba:flex-col gba:items-end gba:space-y-1">
                                  <Badge variant={getPriorityVariant(task)} size="sm">
                                    {getPriorityLabel(task)}
                                  </Badge>
                                  <Badge variant="outline" size="sm">
                                    {task.status}
                                  </Badge>
                                </div>
                              </div>

                              <div className="gba:flex gba:space-x-2 gba:mt-3">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gba:flex-1 gba:opacity-50 gba:cursor-not-allowed"
                                        disabled={true}
                                        data-testid={`manager-dashboard-reject-${task.id}-button`}
                                      >
                                        Return
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Coming soon</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        className="gba:flex-1 gba:bg-primary-600 gba:text-white gba:opacity-50 gba:cursor-not-allowed"
                                        disabled={true}
                                        data-testid={`manager-dashboard-approve-${task.id}-button`}
                                      >
                                        Approve
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Coming soon</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          ))}
                        {expenseCount >
                          approvalTasks.filter(task => task.type === 'expense-request' || task.type === 'expense-plan')
                            .length && (
                          <div className="gba:text-xs gba:text-neutral-400 gba:text-center gba:pt-2">
                            +
                            {expenseCount -
                              approvalTasks.filter(
                                task => task.type === 'expense-request' || task.type === 'expense-plan'
                              ).length}{' '}
                            more expense items
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="absences" className="gba:h-full gba:overflow-y-auto gba:pr-2">
                    {approvalTasks.filter(task => task.type === 'leave').length === 0 ? (
                      <div className="gba:text-center gba:py-6">
                        <div className="gba:text-4xl gba:mb-3">🏖️</div>
                        <p className="gba:text-neutral-500">No absence requests to approve</p>
                      </div>
                    ) : (
                      <div className="gba:space-y-3" data-testid="manager-dashboard-absence-requests">
                        {approvalTasks
                          .filter(task => task.type === 'leave')
                          .map(task => (
                            <div
                              key={task.id}
                              className="gba:p-3 gba:border gba:border-neutral-200 gba:rounded-lg gba:hover:border-primary-300 gba:transition-colors gba:cursor-pointer"
                              data-testid={`manager-dashboard-request-${task.id}`}
                            >
                              <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
                                <div className="gba:flex-1">
                                  <div className="gba:font-medium gba:text-neutral-900 gba:text-sm gba:mb-1">
                                    {task.title}
                                  </div>
                                  <div className="gba:text-xs gba:text-neutral-500 gba:flex gba:items-center gba:mb-1">
                                    <PiUser className="gba:mr-1" size={12} />
                                    From: {task.employee.fullName}
                                  </div>
                                  <div className="gba:text-xs gba:text-neutral-500 gba:flex gba:items-center gba:mb-1">
                                    <PiClock className="gba:mr-1" size={12} />
                                    {getTimeAgo(task.createdAt)}
                                  </div>
                                  <div className="gba:text-xs gba:font-medium gba:text-blue-600">
                                    {task.startDate && task.endDate
                                      ? `From ${new Date(task.startDate).toLocaleDateString()} to ${new Date(task.endDate).toLocaleDateString()}`
                                      : 'Date range not specified'}
                                  </div>
                                </div>
                                <div className="gba:flex gba:flex-col gba:items-end gba:space-y-1">
                                  <Badge variant={getPriorityVariant(task)} size="sm">
                                    {getPriorityLabel(task)}
                                  </Badge>
                                  <Badge variant="outline" size="sm">
                                    {task.status}
                                  </Badge>
                                </div>
                              </div>

                              <div className="gba:flex gba:space-x-2 gba:mt-3">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gba:flex-1 gba:opacity-50 gba:cursor-not-allowed"
                                        disabled={true}
                                        data-testid={`manager-dashboard-reject-${task.id}-button`}
                                      >
                                        Reject
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Coming soon</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        className="gba:flex-1 gba:bg-primary-600 gba:text-white gba:opacity-50 gba:cursor-not-allowed"
                                        disabled={true}
                                        data-testid={`manager-dashboard-approve-${task.id}-button`}
                                      >
                                        Approve
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Coming soon</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          ))}
                        {absenceCount > approvalTasks.filter(task => task.type === 'leave').length && (
                          <div className="gba:text-xs gba:text-neutral-400 gba:text-center gba:pt-2">
                            +{absenceCount - approvalTasks.filter(task => task.type === 'leave').length} more absence
                            requests
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="personal-changes" className="gba:h-full gba:overflow-y-auto gba:pr-2">
                    {personalChanges.length === 0 ? (
                      <div className="gba:text-center gba:py-6">
                        <div className="gba:text-4xl gba:mb-3">👤</div>
                        <p className="gba:text-neutral-500">No personal data changes to review</p>
                      </div>
                    ) : (
                      <div className="gba:space-y-3" data-testid="manager-dashboard-personal-changes">
                        {personalChanges.map(change => (
                          <div
                            key={change.id}
                            className="gba:p-3 gba:border gba:border-neutral-200 gba:rounded-lg gba:hover:border-primary-300 gba:transition-colors gba:cursor-pointer"
                            data-testid={`manager-dashboard-change-${change.id}`}
                          >
                            <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
                              <div className="gba:flex gba:items-center gba:flex-1 gba:mr-4">
                                <div className="gba:mr-3">
                                  <Avatar size="default" className="gba:h-10 gba:w-10">
                                    <AvatarImage
                                      src={
                                        change.employee?.pictureThumbnail
                                          ? `data:image/jpeg;base64,${change.employee.pictureThumbnail}`
                                          : undefined
                                      }
                                      alt={change.employee?.fullName || 'Unknown Employee'}
                                    />
                                    <AvatarFallback>
                                      {(change.employee?.fullName || 'U E')
                                        .split(' ')
                                        .map(p => p[0])
                                        .join('')
                                        .slice(0, 2)
                                        .toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                <div className="gba:flex gba:flex-col">
                                  <div className="gba:font-medium gba:text-neutral-900 gba:text-sm gba:mb-1">
                                    {change.employee?.fullName || 'Unknown Employee'}
                                  </div>
                                  <div className="gba:text-xs gba:text-neutral-500 gba:flex gba:items-center gba:mb-1">
                                    <PiClock className="gba:mr-1" size={12} />
                                    {getTimeAgo(change.created)}
                                  </div>
                                  <div className="gba:text-xs gba:font-medium gba:text-blue-600">
                                    {formatChangeType(change.processDefinitionKey)}
                                  </div>
                                  <div className="gba:text-xs gba:text-neutral-400">
                                    {change.description || change.name}
                                  </div>
                                </div>
                              </div>
                              <div className="gba:flex gba:flex-col gba:items-end gba:space-y-1">
                                <Badge variant={getPersonalChangePriorityVariant(change)} size="sm">
                                  {getPersonalChangePriorityLabel(change)}
                                </Badge>
                              </div>
                            </div>
                            <div className="gba:flex gba:space-x-2 gba:mt-3">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gba:flex-1 gba:opacity-50 gba:cursor-not-allowed"
                                      disabled={true}
                                    >
                                      Reject
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Coming soon</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      className="gba:flex-1 gba:bg-primary-600 gba:text-white gba:opacity-50 gba:cursor-not-allowed"
                                      disabled={true}
                                    >
                                      Approve
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Coming soon</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        ))}
                        {personalChangesCount > personalChanges.length && (
                          <div className="gba:text-xs gba:text-neutral-400 gba:text-center gba:pt-2">
                            +{personalChangesCount - personalChanges.length} more personal changes
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
              <PiUser className="gba:mr-2 gba:h-5 gba:w-5 gba:text-primary-500" />
              Team Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:flex-1 gba:min-h-0 gba:px-2">
            <Tabs
              value={activeInsightsTab}
              onValueChange={value => setActiveInsightsTab(value as 'birthdays' | 'anniversaries' | 'missing-profiles')}
              className="gba:h-full gba:flex gba:flex-col"
            >
              <TabsList className="gba:w-full gba:mb-3">
                <TabsTrigger value="birthdays" className="gba:flex-1 gba:flex gba:items-center gba:gap-1">
                  <PiCake size={16} />
                  Birthdays
                </TabsTrigger>
                <TabsTrigger value="anniversaries" className="gba:flex-1 gba:flex gba:items-center gba:gap-1">
                  <PiTrophy size={16} />
                  Anniversaries
                </TabsTrigger>
                <TabsTrigger value="missing-profiles" className="gba:flex-1 gba:flex gba:items-center gba:gap-1">
                  <PiWarning size={16} />
                  Profiles
                </TabsTrigger>
              </TabsList>

              <TabsContent value="birthdays" className="gba:flex-1 gba:min-h-0 gba:mt-0">
                <div className="gba:h-full gba:overflow-y-auto gba:pr-2">
                  <div className="gba:bg-neutral-50 gba:rounded-lg gba:p-3">
                    {loadingBirthdays && (
                      <div className="gba:text-center gba:text-neutral-500 gba:text-xs">
                        <span className="gba:animate-spin">⏳</span> Loading birthdays...
                      </div>
                    )}

                    {!loadingBirthdays && upcomingBirthdays.length === 0 && (
                      <div className="gba:text-center gba:text-neutral-500 gba:text-xs">
                        No upcoming birthdays in the next 30 days
                      </div>
                    )}

                    {!loadingBirthdays && upcomingBirthdays.length > 0 && (
                      <div className="gba:space-y-3">
                        <div className="gba:text-xs gba:font-medium gba:text-neutral-600 gba:mb-3">
                          🎂 Next 30 days ({upcomingBirthdays.length} birthday{upcomingBirthdays.length > 1 ? 's' : ''})
                        </div>
                        {upcomingBirthdays.map(birthday => (
                          <div
                            key={birthday.id}
                            className="gba:flex gba:items-center gba:justify-between gba:py-2 gba:cursor-pointer gba:hover:bg-gray-50 gba:rounded-lg gba:px-2 gba:transition-colors"
                            onClick={() => handleNavigateToEmployee(birthday.id)}
                            title={`View ${birthday.fullName}'s profile`}
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
                                  {birthday.daysUntilBirthday === 0
                                    ? '🎉 Today!'
                                    : birthday.daysUntilBirthday === 1
                                      ? '🎂 Tomorrow'
                                      : `🗓️ In ${birthday.daysUntilBirthday} days`}
                                </div>
                              </div>
                            </div>
                            <div className="gba:flex gba:items-center gba:ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gba:h-8 gba:w-8 gba:p-0 gba:text-neutral-500 gba:hover:text-primary-600 gba:hover:bg-primary-50"
                                onClick={e => handleSendBirthdayEmail(birthday, e)}
                                title={`Send birthday email to ${birthday.firstName}`}
                                data-testid={`birthday-email-button-${birthday.id}`}
                              >
                                <PiEnvelope size={16} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="anniversaries" className="gba:flex-1 gba:min-h-0 gba:mt-0">
                <div className="gba:h-full gba:overflow-y-auto gba:pr-2">
                  <div className="gba:bg-blue-50 gba:rounded-lg gba:p-3">
                    {loadingAnniversaries && (
                      <div className="gba:text-center gba:text-neutral-500 gba:text-xs">
                        <span className="gba:animate-spin">⏳</span> Loading anniversaries...
                      </div>
                    )}

                    {!loadingAnniversaries && upcomingAnniversaries.length === 0 && (
                      <div className="gba:text-center gba:text-neutral-500 gba:text-xs">
                        No upcoming anniversaries in the next 30 days
                      </div>
                    )}

                    {!loadingAnniversaries && upcomingAnniversaries.length > 0 && (
                      <div className="gba:space-y-3">
                        <div className="gba:text-xs gba:font-medium gba:text-blue-700 gba:mb-3">
                          🏆 Next 30 days ({upcomingAnniversaries.length} anniversary
                          {upcomingAnniversaries.length > 1 ? 's' : ''})
                        </div>
                        {upcomingAnniversaries.map(anniversary => (
                          <div
                            key={anniversary.id}
                            className="gba:flex gba:items-center gba:justify-between gba:py-2 gba:cursor-pointer gba:hover:bg-gray-50 gba:rounded-lg gba:px-2 gba:transition-colors"
                            onClick={() => handleNavigateToEmployee(anniversary.id)}
                            title={`View ${anniversary.fullName}'s profile`}
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
                                <div className="gba:text-sm gba:text-neutral-500">
                                  {anniversary.yearsOfService} year{anniversary.yearsOfService !== 1 ? 's' : ''}
                                  {anniversary.daysUntilAnniversary === 0
                                    ? ' 🎉 today!'
                                    : anniversary.daysUntilAnniversary === 1
                                      ? ' 🏆 tomorrow'
                                      : ` 📅 in ${anniversary.daysUntilAnniversary} days`}
                                </div>
                                {anniversary.anniversaryDate && (
                                  <div className="gba:text-sm gba:text-neutral-500">{anniversary.anniversaryDate}</div>
                                )}
                              </div>
                            </div>
                            <div className="gba:flex gba:items-center gba:ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gba:h-8 gba:w-8 gba:p-0 gba:text-neutral-500 gba:hover:text-primary-600 gba:hover:bg-primary-50"
                                onClick={e => handleSendAnniversaryEmail(anniversary, e)}
                                title={`Send anniversary email to ${anniversary.firstName}`}
                                data-testid={`anniversary-email-button-${anniversary.id}`}
                              >
                                <PiEnvelope size={16} />
                              </Button>
                            </div>
                          </div>
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
                        <span className="gba:animate-spin">⏳</span> Loading job profiles...
                      </div>
                    )}

                    {!loadingMissingProfiles && employeesWithMissingProfiles.length === 0 && (
                      <div className="gba:text-center gba:text-green-600 gba:text-xs">
                        ✅ All team members have complete job profiles
                      </div>
                    )}

                    {!loadingMissingProfiles && employeesWithMissingProfiles.length > 0 && (
                      <div className="gba:space-y-3">
                        <div className="gba:text-xs gba:font-medium gba:text-warning-700 gba:mb-3">
                          ⚠️ {employeesWithMissingProfiles.length} team member
                          {employeesWithMissingProfiles.length > 1 ? 's' : ''} need attention
                        </div>
                        {employeesWithMissingProfiles.map(employee => (
                          <div
                            key={employee.id}
                            className="gba:flex gba:items-center gba:justify-between gba:py-2 gba:cursor-pointer gba:hover:bg-gray-50 gba:rounded-lg gba:px-2 gba:transition-colors"
                            onClick={() => handleNavigateToEmployee(employee.id)}
                            title={`View ${employee.fullName}'s profile`}
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
                                  {employee.missingProfileReason === 'no_job_position'
                                    ? '❌ No job position'
                                    : employee.missingProfileReason === 'incomplete_profile'
                                      ? '⚠️ Incomplete profile'
                                      : '❌ Missing job profile'}
                                </div>
                              </div>
                            </div>
                          </div>
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
    </div>
  )

  // Teammates detailed view - using the same header structure as "Requests to Approve"
  if (currentView === 'teammates') {
    // Transform DirectReport data to Employee interface format with proper data mapping
    // Store status and statusWarning separately since Employee interface doesn't support them
    const directReportsMap = new Map(directReports.map(report => [report.id, report]))

    const transformedEmployees: Employee[] = directReports.map(report => ({
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

    // Pagination handlers for the EmployeeTable
    const handleLoadPage = (page: number, pageSize?: number) => {
      // Since we have all direct reports already loaded, pagination is handled by DataTable
    }

    const handleRetry = () => {
      // Could implement a refetch here if needed
      window.location.reload()
    }

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
              <PiCaretLeft size={16} className="gba:mr-1" />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.back_to_btn',
                'Back to Dashboard'
              )}
            </Button>
            <h1 className="gba:text-xl gba:font-semibold">My Direct Reports</h1>
            <Badge variant="info" className="gba:ml-3">
              {directReports.length} direct reports
            </Badge>
          </div>
        </div>

        {/* Table section - using the exact same EmployeeTable from HR */}
        <div className="gba:flex-1">
          <EmployeeTable
            employees={transformedEmployees}
            loading={loadingDirectReports}
            error={directReportsError}
            loadPage={handleLoadPage}
            retry={handleRetry}
            total={transformedEmployees.length}
            currentPage={1}
            pageSize={transformedEmployees.length}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            onSelectEmployee={handleSelectEmployee}
            accessToken={accessToken}
            sortField=""
            sortOrder=""
            onSortingChange={() => {}}
          />
        </div>
      </div>
    )
  }

  if (currentView === 'approvals') {
    // Filter all requests by type for detailed view
    const expenseRequests = allApprovalTasks.filter(
      task => task.type === 'expense-request' || task.type === 'expense-plan'
    )
    const leaveRequests = allApprovalTasks.filter(task => task.type === 'leave')

    return (
      <div className="gba:p-6 gba:h-full gba:flex gba:flex-col">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
          <div className="gba:flex gba:items-center">
            <Button variant="ghost" size="sm" onClick={handleNavigateBackToDashboard} className="gba:mr-4">
              <PiCaretLeft size={16} className="gba:mr-1" />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.back_to_btn',
                'Back to Dashboard'
              )}
            </Button>
            <h1 className="gba:text-xl gba:font-semibold">Requests to Approve</h1>
            <Badge variant="info" className="gba:ml-3">
              {(allTotalCount || 0) + (allPersonalChangesCount || 0)} total requests
            </Badge>
          </div>
        </div>

        {/* Loading State */}
        {loadingAllApprovals && (
          <div className="gba:text-center gba:py-12">
            <div className="gba:flex gba:items-center gba:justify-center gba:text-neutral-500">
              <span className="gba:mr-2 gba:animate-spin">⏳</span> Loading approval requests...
            </div>
          </div>
        )}

        {/* Error State */}
        {allApprovalsError && (
          <div className="gba:text-center gba:py-12">
            <div className="gba:text-destructive-600 gba:mb-4">Failed to load approval requests</div>
            <Button onClick={() => refetchAllApprovals()} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {expenseRequests.length === 0 && leaveRequests.length === 0 && !loadingAllApprovals && !allApprovalsError && (
          <div className="gba:text-center gba:py-12">
            <PiCheckCircle className="gba:h-12 gba:w-12 gba:text-success-300 gba:mx-auto gba:mb-4" />
            <h3 className="gba:text-lg gba:font-medium gba:text-neutral-900 gba:mb-2">All caught up!</h3>
            <p className="gba:text-neutral-500">There are no pending approval requests at the moment.</p>
          </div>
        )}

        {/* Tabs for Detailed Approval View */}
        {!loadingAllApprovals &&
          !allApprovalsError &&
          (expenseRequests.length > 0 || leaveRequests.length > 0 || allPersonalChanges.length > 0) && (
            <Tabs
              value={activeApprovalTab}
              onValueChange={value => setActiveApprovalTab(value as 'expenses' | 'absences' | 'personal-changes')}
              className="gba:flex-1 gba:flex gba:flex-col"
            >
              <TabsList className="gba:grid gba:w-full gba:grid-cols-3 gba:mb-6">
                <TabsTrigger value="expenses" className="gba:flex gba:items-center gba:space-x-2">
                  <span>💰</span>
                  <span>Expense Requests</span>
                  <Badge variant="secondary" className="gba:ml-1">
                    {allExpenseCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="absences" className="gba:flex gba:items-center gba:space-x-2">
                  <span>🏖️</span>
                  <span>Absence Requests</span>
                  <Badge variant="secondary" className="gba:ml-1">
                    {allAbsenceCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="personal-changes" className="gba:flex gba:items-center gba:space-x-1">
                  <span>👤</span>
                  <span>Personal</span>
                  <Badge variant="secondary" className="gba:ml-1">
                    {allPersonalChangesCount}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <div className="gba:flex-1 gba:overflow-hidden">
                <TabsContent value="expenses" className="gba:h-full gba:overflow-y-auto">
                  {expenseRequests.length === 0 ? (
                    <div className="gba:text-center gba:py-12">
                      <div className="gba:text-4xl gba:mb-4">💰</div>
                      <h3 className="gba:text-lg gba:font-medium gba:text-neutral-900 gba:mb-2">No expense requests</h3>
                      <p className="gba:text-neutral-500">There are no pending expense requests to approve.</p>
                    </div>
                  ) : (
                    <div className="gba:border gba:rounded-lg gba:overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenseRequests.map(request => (
                            <TableRow key={request.id}>
                              <TableCell>
                                <div className="gba:flex gba:items-center gba:space-x-3">
                                  <Avatar size="sm" className="gba:h-8 gba:w-8">
                                    <AvatarImage
                                      src={
                                        request.employee.pictureThumbnail &&
                                        !request.employee.pictureThumbnail.startsWith('{')
                                          ? `data:image/jpeg;base64,${request.employee.pictureThumbnail}`
                                          : undefined
                                      }
                                      alt={request.employee.fullName}
                                    />
                                    <AvatarFallback>
                                      {request.employee.fullName
                                        .split(' ')
                                        .map(n => n[0])
                                        .join('')
                                        .toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="gba:font-medium">{request.employee.fullName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="gba:font-medium">{request.title}</div>
                                  <div className="gba:text-xs gba:text-neutral-400 gba:mt-1">
                                    {request.type === 'expense-request' ? '📋 Request' : '📝 Plan'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="gba:text-sm gba:text-neutral-600">
                                  {request.description || 'No notes provided'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="gba:font-medium gba:text-green-600">
                                  {formatCurrency(request.totalAmount)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getPriorityVariant(request)} size="sm">
                                  {getPriorityLabel(request)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="gba:text-sm gba:text-neutral-500">{getTimeAgo(request.createdAt)}</div>
                              </TableCell>
                              <TableCell>
                                <div className="gba:flex gba:space-x-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gba:opacity-50 gba:cursor-not-allowed"
                                          disabled={true}
                                        >
                                          Return
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Coming soon</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          className="gba:bg-primary-600 gba:text-white gba:opacity-50 gba:cursor-not-allowed"
                                          disabled={true}
                                        >
                                          Approve
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Coming soon</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="absences" className="gba:h-full gba:overflow-y-auto">
                  {leaveRequests.length === 0 ? (
                    <div className="gba:text-center gba:py-12">
                      <div className="gba:text-4xl gba:mb-4">🏖️</div>
                      <h3 className="gba:text-lg gba:font-medium gba:text-neutral-900 gba:mb-2">No absence requests</h3>
                      <p className="gba:text-neutral-500">There are no pending absence requests to approve.</p>
                    </div>
                  ) : (
                    <div className="gba:border gba:rounded-lg gba:overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Leave Type</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leaveRequests.map(request => (
                            <TableRow key={request.id}>
                              <TableCell>
                                <div className="gba:flex gba:items-center gba:space-x-3">
                                  <Avatar size="sm" className="gba:h-8 gba:w-8">
                                    <AvatarImage
                                      src={
                                        request.employee.pictureThumbnail &&
                                        !request.employee.pictureThumbnail.startsWith('{')
                                          ? `data:image/jpeg;base64,${request.employee.pictureThumbnail}`
                                          : undefined
                                      }
                                      alt={request.employee.fullName}
                                    />
                                    <AvatarFallback>
                                      {request.employee.fullName
                                        .split(' ')
                                        .map(n => n[0])
                                        .join('')
                                        .toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="gba:font-medium">{request.employee.fullName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="gba:font-medium">{request.leaveType || 'Leave'}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="gba:text-sm">
                                  {request.startDate && request.endDate ? (
                                    <div className="gba:font-medium">
                                      {new Date(request.startDate).toLocaleDateString()} to{' '}
                                      {new Date(request.endDate).toLocaleDateString()}
                                    </div>
                                  ) : (
                                    <div className="gba:font-medium">
                                      {new Date(request.requestDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getPriorityVariant(request)} size="sm">
                                  {getPriorityLabel(request)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="gba:text-sm gba:text-neutral-500">{getTimeAgo(request.createdAt)}</div>
                              </TableCell>
                              <TableCell>
                                <div className="gba:flex gba:space-x-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gba:opacity-50 gba:cursor-not-allowed"
                                          disabled={true}
                                        >
                                          Reject
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Coming soon</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          className="gba:bg-primary-600 gba:text-white gba:opacity-50 gba:cursor-not-allowed"
                                          disabled={true}
                                        >
                                          Approve
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Coming soon</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="personal-changes" className="gba:h-full gba:overflow-y-auto">
                  {allPersonalChanges.length === 0 ? (
                    <div className="gba:text-center gba:py-12">
                      <div className="gba:text-4xl gba:mb-4">👤</div>
                      <h3 className="gba:text-lg gba:font-medium gba:text-neutral-900 gba:mb-2">
                        No personal data changes
                      </h3>
                      <p className="gba:text-neutral-500">There are no pending personal data changes to review.</p>
                    </div>
                  ) : (
                    <div className="gba:border gba:rounded-lg gba:overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Change Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allPersonalChanges.map(change => (
                            <TableRow key={change.id}>
                              <TableCell>
                                <div className="gba:flex gba:items-center gba:space-x-3">
                                  <Avatar size="sm" className="gba:h-8 gba:w-8">
                                    <AvatarImage
                                      src={
                                        change.employee?.pictureThumbnail &&
                                        !change.employee.pictureThumbnail.startsWith('{')
                                          ? `data:image/jpeg;base64,${change.employee.pictureThumbnail}`
                                          : undefined
                                      }
                                      alt={change.employee?.fullName || 'Unknown Employee'}
                                    />
                                    <AvatarFallback>
                                      {change.employee?.fullName
                                        ?.split(' ')
                                        .map(n => n[0])
                                        .join('')
                                        .toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="gba:font-medium">
                                    {change.employee?.fullName || 'Unknown Employee'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="gba:font-medium">{formatChangeType(change.processDefinitionKey)}</div>
                                  <div className="gba:text-xs gba:text-neutral-400 gba:mt-1">
                                    {change.processDefinitionName}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="gba:text-sm gba:text-neutral-600">
                                  {change.description || change.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getPersonalChangePriorityVariant(change)} size="sm">
                                  {getPersonalChangePriorityLabel(change)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="gba:text-sm">{getTimeAgo(change.created)}</div>
                              </TableCell>
                              <TableCell>
                                <div className="gba:flex gba:space-x-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gba:opacity-50 gba:cursor-not-allowed"
                                          disabled={true}
                                        >
                                          Reject
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Coming soon</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          className="gba:bg-primary-600 gba:text-white gba:opacity-50 gba:cursor-not-allowed"
                                          disabled={true}
                                        >
                                          Approve
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Coming soon</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          )}
      </div>
    )
  }

  return <div className="gba:flex gba:flex-col gba:h-full">{mainContent}</div>
}

export default ManagerDashboard
