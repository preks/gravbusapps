'use client'

import React, { useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDirectReports } from './hooks/useDirectReports'
import { useMatrixTeams } from './hooks/useMatrixTeams'
import { useTeamBirthdays } from './hooks/useTeamBirthdays'
import { useTeamAnniversaries } from './hooks/useTeamAnniversaries'
import { useOpenJobPositions } from './hooks/useOpenJobPositions'
import { useCurrentUserProfile } from './hooks/useCurrentUserProfile'
import { useExpensesApprovals } from './hooks/useExpensesApprovals'
import { useAbsencesApprovals } from './hooks/useAbsencesApprovals'
import { usePersonalDataApprovals } from './hooks/usePersonalDataApprovals'
import { useTeamAvailability } from './hooks/useTeamAvailability'
import { useTeamProjectAllocation } from './hooks/useTeamProjectAllocation'
import { useAIInsights } from './hooks/useAIInsights'
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
  Toaster,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Spinner,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Separator
} from '@newwork/nw-design-system'
import { OpenJobPosition } from './hooks/useOpenJobPositions'
import { PiBriefcase, PiTag, PiUser, PiBuilding, PiCalendar } from 'react-icons/pi'
import dayjs from 'dayjs'
import { Employee } from '@/business-apps/hr/core/hooks/useGetEmployees'
import {
  UsersIcon,
  CaretRightIcon,
  CaretLeftIcon,
  CheckCircleIcon,
  CakeIcon,
  TrophyIcon,
  EnvelopeSimpleOpenIcon,
  SmileyIcon
} from '@phosphor-icons/react'
import RequestsToApproveTable from './components/RequestsToApproveTable'
import MyTeammatesTable from './components/MyTeammatesTable'

type ApprovalTab = 'expenses' | 'absences' | 'personal-changes'
type TeamTab = 'my-team' | 'my-teams'
type InsightsTab = 'birthdays' | 'anniversaries' | 'open-positions'
type CurrentView = 'dashboard' | 'teammates' | 'approvals' | 'insights'

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

  // State for job position detail sheet
  const [selectedPosition, setSelectedPosition] = useState<OpenJobPosition | null>(null)
  const [isPositionSheetOpen, setIsPositionSheetOpen] = useState(false)

  // Get the current structure ID for matrix team queries
  const structureId = getCurrentActiveStructureId()

  // Navigation handlers
  const handleNavigateToTeammates = () => {
    setCurrentView('teammates')
  }

  const handleNavigateToApprovals = () => {
    setCurrentView('approvals')
  }

  const handleNavigateToInsights = (tab?: InsightsTab) => {
    if (tab) {
      setActiveInsightsTab(tab)
    }
    setCurrentView('insights')
  }

  const handleNavigateBackToDashboard = () => {
    setCurrentView('dashboard')
  }

  // Handler to open position detail sheet
  const handleOpenPositionSheet = (position: OpenJobPosition) => {
    setSelectedPosition(position)
    setIsPositionSheetOpen(true)
  }

  // Handler to close position detail sheet
  const handleClosePositionSheet = () => {
    setIsPositionSheetOpen(false)
    setSelectedPosition(null)
  }

  // Navigation handler for employee records
  const handleNavigateToEmployee = (employeeId: string) => {
    const profileUrl = buildPlatformUrl('/platform/employee-record', {
      employeeId,
      tab: 'summary'
    })
    navigateTo(profileUrl)
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
    openPositions,
    loading: loadingOpenPositions
    // error: openPositionsError,
  } = useOpenJobPositions({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  // Fetch team availability
  const { loading: loadingAvailability } = useTeamAvailability({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  // Fetch team project allocation
  const {
    averageAllocationPercentage,
    unallocatedCount,
    loading: loadingProjectAllocation
  } = useTeamProjectAllocation({
    accessToken: accessToken || '',
    managerId: employeeId || ''
  })

  // Fetch AI insights
  const { insight: aiInsight, isLoading: loadingAI } = useAIInsights({
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

  // Calculate sick leaves and on-leave stats from directReports
  // Sick leave is detected by parentEntryId containing 'HEALTH' (e.g., 'AbsenceGroup:v1:HEALTH')
  // or by type name containing 'sick' (fallback)
  const sickLeavesCount = useMemo(() => {
    return directReports.filter(report => {
      if (!report.currentAbsence) return false
      // Check parentEntryId for HEALTH group (more reliable)
      if (report.currentAbsence.parentEntryId?.includes('HEALTH')) return true
      // Fallback: check if type contains 'sick'
      if (report.currentAbsence.type?.toLowerCase().includes('sick')) return true
      return false
    }).length
  }, [directReports])

  const onLeaveCount = useMemo(() => {
    return directReports.filter(report => report.status === 'On Leave').length
  }, [directReports])

  // Parse AI insights into bullet points
  const aiInsightItems = useMemo(() => {
    if (!aiInsight) return []

    // Split by newlines or bullet points and create items
    const lines = aiInsight
      .split(/[\n•\-]/)
      .map(line => line.trim())
      .filter(line => line.length > 10)
      .slice(0, 3)

    return lines.map((line, index) => ({
      id: index,
      text: line,
      type: index === 0 ? 'warning' : index === 1 ? 'success' : 'info'
    }))
  }, [aiInsight])

  // Fetch current user profile to get profile picture
  const { userProfile } = useCurrentUserProfile({
    accessToken: accessToken || '',
    employeeId: employeeId || ''
  })

  const mainContent = (
    <div className="gba:p-6 gba:h-full gba:flex gba:flex-col" data-testid="manager-dashboard-content">
      {/* Header Section with Title and Welcome Message */}
      <div className="gba:mb-6" data-testid="manager-dashboard-header-section">
        <div className="gba:flex gba:items-start gba:justify-between">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-foreground" data-testid="manager-dashboard-title">
              {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.title', 'Manager Workboard')}
            </h1>
            <p className="gba:text-muted-foreground" data-testid="manager-dashboard-subtitle">
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.subtitle',
                'AI insights at a glance'
              )}
            </p>
          </div>
          <div className="gba:flex gba:items-center gba:gap-3" data-testid="manager-dashboard-welcome-section">
            <div className="gba:text-right">
              <p
                className="gba:text-sm gba:font-medium gba:text-foreground"
                data-testid="manager-dashboard-welcome-title"
              >
                {getTranslationFromI18nKeyAndLabel('setup:welcome.title', 'Welcome')},{' '}
                {userInfo?.employeeDetails?.firstName ||
                  getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.profile_icon_list.manager_title',
                    'Manager'
                  )}
                !
              </p>
              <p className="gba:text-xs gba:text-muted-foreground">
                {userInfo?.employeeDetails?.organizationalUnit?.name ||
                  getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_list.search_employee_list.recent_employees_table.department',
                    'Department'
                  )}
              </p>
            </div>
            <div data-testid="manager-dashboard-user-avatar">
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
          </div>
        </div>
      </div>

      {/* AI Insights + My Team Row */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-6 gba:mb-6">
        {/* AI Insights - EveryAI Assistant Style */}
        <Card
          className="gba:lg:col-span-2 gba:bg-gradient-to-r gba:from-primary/5 gba:to-info/5"
          data-testid="manager-dashboard-ai-says-card"
        >
          <CardContent className="gba:p-5">
            <div className="gba:flex gba:items-start gba:gap-4">
              <div className="gba:flex-shrink-0 gba:h-10 gba:w-10 gba:bg-primary gba:rounded-full gba:flex gba:items-center gba:justify-center">
                <SmileyIcon size={24} className="gba:text-primary-foreground" weight="fill" />
              </div>
              <div className="gba:flex-1">
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                  <span className="gba:text-xs gba:font-semibold gba:text-primary gba:uppercase gba:tracking-wide">
                    NEWWORK
                  </span>
                  <span className="gba:text-sm gba:font-semibold gba:text-foreground">
                    {getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.manager_dashboard.every_ai_noticed',
                      'EveryAI Assistant noticed ...'
                    )}
                  </span>
                </div>

                {loadingAI ? (
                  <div className="gba:space-y-2">
                    <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse gba:w-3/4" />
                    <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse gba:w-2/3" />
                  </div>
                ) : aiInsightItems.length > 0 ? (
                  <ul className="gba:space-y-1.5">
                    {aiInsightItems.map(item => (
                      <li key={item.id} className="gba:flex gba:items-start gba:gap-2">
                        <span
                          className={`gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 ${
                            item.type === 'warning'
                              ? 'gba:bg-destructive'
                              : item.type === 'success'
                                ? 'gba:bg-success'
                                : 'gba:bg-primary'
                          }`}
                        />
                        <span className="gba:text-sm gba:text-foreground">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="gba:space-y-1.5">
                    {absenceApprovalsCount > 0 && (
                      <li className="gba:flex gba:items-start gba:gap-2">
                        <span className="gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 gba:bg-destructive" />
                        <button
                          type="button"
                          onClick={() => {
                            setActiveApprovalTab('absences')
                            handleNavigateToApprovals()
                          }}
                          className="gba:text-sm gba:text-primary gba:underline gba:hover:text-primary/80 gba:cursor-pointer gba:bg-transparent gba:border-0 gba:p-0 gba:text-left"
                        >
                          {`${absenceApprovalsCount} absence ${absenceApprovalsCount === 1 ? 'request' : 'requests'} pending approval`}
                        </button>
                      </li>
                    )}
                    {combinedExpenseCount > 0 && (
                      <li className="gba:flex gba:items-start gba:gap-2">
                        <span className="gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 gba:bg-warning" />
                        <button
                          type="button"
                          onClick={() => {
                            setActiveApprovalTab('expenses')
                            handleNavigateToApprovals()
                          }}
                          className="gba:text-sm gba:text-primary gba:underline gba:hover:text-primary/80 gba:cursor-pointer gba:bg-transparent gba:border-0 gba:p-0 gba:text-left"
                        >
                          {`${combinedExpenseCount} expense ${combinedExpenseCount === 1 ? 'request' : 'requests'} pending approval`}
                        </button>
                      </li>
                    )}
                    <li className="gba:flex gba:items-start gba:gap-2">
                      <span
                        className={`gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 ${onLeaveCount > 0 ? 'gba:bg-warning' : 'gba:bg-success'}`}
                      />
                      <span className="gba:text-sm gba:text-foreground">
                        {onLeaveCount > 0
                          ? `${onLeaveCount} team ${onLeaveCount === 1 ? 'member is' : 'members are'} out of office today (${directReports.length - onLeaveCount}/${directReports.length} available)`
                          : `Your team is 100% available today (${directReports.length}/${directReports.length})`}
                      </span>
                    </li>
                    {sickLeavesCount > 0 && (
                      <li className="gba:flex gba:items-start gba:gap-2">
                        <span className="gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 gba:bg-destructive" />
                        <span className="gba:text-sm gba:text-foreground">
                          {`${sickLeavesCount} team ${sickLeavesCount === 1 ? 'member is' : 'members are'} on sick leave`}
                        </span>
                      </li>
                    )}
                    {unallocatedCount > 0 && (
                      <li className="gba:flex gba:items-start gba:gap-2">
                        <span className="gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 gba:bg-warning" />
                        <span className="gba:text-sm gba:text-foreground">
                          {`${unallocatedCount} team ${unallocatedCount === 1 ? 'member is' : 'members are'} not allocated to projects`}
                        </span>
                      </li>
                    )}
                    {upcomingAnniversaries.length > 0 && (
                      <li className="gba:flex gba:items-start gba:gap-2">
                        <span className="gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 gba:bg-primary" />
                        <button
                          type="button"
                          onClick={() => handleNavigateToInsights('anniversaries')}
                          className="gba:text-sm gba:text-primary gba:underline gba:hover:text-primary/80 gba:cursor-pointer gba:bg-transparent gba:border-0 gba:p-0 gba:text-left"
                        >
                          {`${upcomingAnniversaries.length} ${upcomingAnniversaries.length === 1 ? 'anniversary' : 'anniversaries'} coming up this month`}
                        </button>
                      </li>
                    )}
                    {absenceApprovalsCount === 0 &&
                      combinedExpenseCount === 0 &&
                      upcomingAnniversaries.length === 0 && (
                        <li className="gba:flex gba:items-start gba:gap-2">
                          <span className="gba:mt-1.5 gba:h-2 gba:w-2 gba:rounded-full gba:flex-shrink-0 gba:bg-success" />
                          <span className="gba:text-sm gba:text-foreground">
                            {getTranslationFromI18nKeyAndLabel(
                              'master-data:hr.manager_dashboard.all_caught_up',
                              'All caught up! No pending approvals.'
                            )}
                          </span>
                        </li>
                      )}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Team Card - Avatar Grid (Same row as AI) */}
        <Card data-testid="manager-dashboard-my-team-card">
          <CardHeader className="gba:pb-2">
            <CardTitle className="gba:text-base gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.my_team', 'My Team')}
            </CardTitle>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                className="gba:text-muted-foreground gba:hover:text-foreground"
                onClick={handleNavigateToTeammates}
                data-testid="manager-dashboard-my-team-view-all-button"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.view_all', 'View All')}
                <CaretRightIcon size={16} className="gba:ml-1" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="gba:pt-2">
            {loadingDirectReports || loadingAvailability ? (
              <div className="gba:flex gba:gap-2 gba:flex-wrap">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="gba:h-10 gba:w-10 gba:bg-muted gba:rounded-full gba:animate-pulse" />
                ))}
              </div>
            ) : directReports.length === 0 ? (
              <p className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.status.no_direct_reports',
                  'No direct reports found'
                )}
              </p>
            ) : (
              <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="manager-dashboard-team-avatars">
                {directReports.slice(0, 8).map(report => {
                  // Use status directly from directReports which includes current absence data
                  const isAvailable = report.status === 'Available'
                  const absenceType = report.currentAbsence?.type || ''
                  return (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => handleNavigateToEmployee(report.id)}
                      className="gba:relative gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:transition-transform gba:hover:scale-110"
                      title={`${report.firstName} ${report.lastName}${!isAvailable ? ` - ${absenceType || getTranslationFromI18nKeyAndLabel('master-data:manager_dashboard.on_leave', 'On Leave')}` : ''}`}
                      data-testid={`manager-dashboard-team-avatar-${report.id}`}
                    >
                      <Avatar size="default" className={`gba:h-10 gba:w-10 ${!isAvailable ? 'gba:opacity-50' : ''}`}>
                        <AvatarImage
                          src={
                            report.pictureThumbnail && !report.pictureThumbnail.startsWith('{')
                              ? `data:image/jpeg;base64,${report.pictureThumbnail}`
                              : undefined
                          }
                          alt={`${report.firstName} ${report.lastName}`}
                        />
                        <AvatarFallback>{`${report.firstName[0]}${report.lastName[0]}`.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span
                        className={`gba:absolute gba:bottom-0 gba:right-0 gba:h-3 gba:w-3 gba:rounded-full gba:border-2 gba:border-background ${isAvailable ? 'gba:bg-success' : 'gba:bg-destructive'}`}
                      />
                    </button>
                  )
                })}
                {directReports.length > 8 && (
                  <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:text-xs gba:text-muted-foreground gba:font-medium">
                    +{directReports.length - 8}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div
        className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-6 gba:flex-1 gba:min-h-0"
        data-testid="manager-dashboard-cards-grid"
      >
        {/* Left Column - 2/3 width */}
        <div className="gba:lg:col-span-2 gba:space-y-6">
          {/* Requests Card - Summary View */}
          <Card data-testid="manager-dashboard-requests-summary-card">
            <CardHeader>
              <CardTitle className="gba:text-base gba:font-semibold">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.pending_requests',
                  'Pending Requests'
                )}
              </CardTitle>
              <CardAction>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleNavigateToApprovals}
                  data-testid="manager-dashboard-review-all-button"
                >
                  {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.review_all', 'Review All')}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {isLoadingApprovals ? (
                <div className="gba:h-6 gba:bg-muted gba:rounded gba:animate-pulse" />
              ) : (
                <div className="gba:space-y-2">
                  <p className="gba:text-sm gba:text-foreground">
                    {combinedExpenseCount + absenceApprovalsCount + personalChangesCount > 0
                      ? `${combinedExpenseCount + absenceApprovalsCount + personalChangesCount} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.approvals_pending', 'approvals pending')}`
                      : getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.manager_dashboard.no_pending_approvals',
                          'No pending approvals'
                        )}
                  </p>
                  {combinedExpenseCount > 0 && (
                    <p className="gba:text-xs gba:text-muted-foreground">
                      • {combinedExpenseCount}{' '}
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:modify_expense_request.expense_items_sum',
                        'expense'
                      )}{' '}
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.manager_dashboard.requests',
                        'requests'
                      ).toLowerCase()}
                    </p>
                  )}
                  {absenceApprovalsCount > 0 && (
                    <p className="gba:text-xs gba:text-muted-foreground">
                      • {absenceApprovalsCount}{' '}
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_management_hub_manager.absence_list_screen.title',
                        'absence'
                      )}{' '}
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.manager_dashboard.requests',
                        'requests'
                      ).toLowerCase()}
                    </p>
                  )}
                  {personalChangesCount > 0 && (
                    <p className="gba:text-xs gba:text-muted-foreground">
                      • {personalChangesCount}{' '}
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.manager_dashboard.personal_changes',
                        'personal'
                      )}{' '}
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.manager_dashboard.requests',
                        'requests'
                      ).toLowerCase()}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Availability & Project Allocation Row */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
            {/* Team Availability Card */}
            <Card data-testid="manager-dashboard-team-availability-card">
              <CardHeader className="gba:pb-3">
                <CardTitle className="gba:text-base gba:font-semibold">
                  {getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.manager_dashboard.team_availability',
                    'Team Availability'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAvailability ? (
                  <div className="gba:space-y-2">
                    <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse" />
                    <div className="gba:h-3 gba:bg-muted gba:rounded gba:animate-pulse gba:w-1/2" />
                  </div>
                ) : (
                  <>
                    {(() => {
                      const totalMembers = directReports.length || 1
                      const availablePercent = Math.round(((totalMembers - onLeaveCount) / totalMembers) * 100)
                      const onLeavePercent = Math.round((onLeaveCount / totalMembers) * 100)
                      return (
                        <>
                          <div className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">
                            {availablePercent}%
                            <span className="gba:text-sm gba:font-normal gba:text-muted-foreground gba:ml-1">
                              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.available', 'available')}
                            </span>
                          </div>
                          <div className="gba:relative gba:mb-2">
                            <div className="gba:h-3 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                              <div
                                className="gba:h-full gba:bg-success gba:rounded-full gba:transition-all gba:duration-500"
                                style={{ width: `${availablePercent}%` }}
                              />
                            </div>
                          </div>
                          <div className="gba:flex gba:justify-between gba:text-xs gba:text-muted-foreground">
                            <span>0%</span>
                            <span>
                              {onLeavePercent}%{' '}
                              {getTranslationFromI18nKeyAndLabel('master-data:manager_dashboard.on_leave', 'on leave')}
                            </span>
                            <span>100%</span>
                          </div>
                        </>
                      )
                    })()}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Team Project Allocation Card */}
            <Card data-testid="manager-dashboard-project-allocation-card">
              <CardHeader className="gba:pb-3">
                <CardTitle className="gba:text-base gba:font-semibold">
                  {getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.manager_dashboard.project_allocation',
                    'Team Project Allocation'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingProjectAllocation ? (
                  <div className="gba:space-y-2">
                    <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse" />
                    <div className="gba:h-3 gba:bg-muted gba:rounded gba:animate-pulse gba:w-1/2" />
                  </div>
                ) : (
                  <>
                    <div className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">
                      {averageAllocationPercentage}%
                      <span className="gba:text-sm gba:font-normal gba:text-muted-foreground gba:ml-1">
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.manager_dashboard.avg_allocation',
                          'avg. allocation'
                        )}
                      </span>
                    </div>
                    <div className="gba:relative gba:mb-2">
                      <div className="gba:h-3 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                        <div
                          className="gba:h-full gba:bg-primary gba:rounded-full gba:transition-all gba:duration-500"
                          style={{ width: `${averageAllocationPercentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="gba:flex gba:justify-between gba:text-xs gba:text-muted-foreground">
                      <span>0%</span>
                      <span>{unallocatedCount > 0 ? `${unallocatedCount} not allocated` : 'all allocated'}</span>
                      <span>100%</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="gba:space-y-6">
          {/* Team Insights Card - Summary */}
          <Card data-testid="manager-dashboard-team-insights-summary-card">
            <CardHeader>
              <CardTitle className="gba:text-base gba:font-semibold">
                {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.team_insights', 'Team Insights')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-3">
                {/* Birthdays */}
                <button
                  type="button"
                  onClick={() => handleNavigateToInsights('birthdays')}
                  className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:text-left gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:hover:opacity-80"
                  data-testid="manager-dashboard-insights-birthdays"
                >
                  <CakeIcon size={20} className="gba:text-muted-foreground" />
                  <span className="gba:text-sm gba:text-foreground">
                    {loadingBirthdays
                      ? '...'
                      : `${upcomingBirthdays.length} ${getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthday', 'birthday')}${upcomingBirthdays.length !== 1 ? 's' : ''} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.this_month', 'this month')}`}
                  </span>
                </button>

                {/* Anniversaries */}
                <button
                  type="button"
                  onClick={() => handleNavigateToInsights('anniversaries')}
                  className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:text-left gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:hover:opacity-80"
                  data-testid="manager-dashboard-insights-anniversaries"
                >
                  <TrophyIcon size={20} className="gba:text-muted-foreground" />
                  <span className="gba:text-sm gba:text-foreground">
                    {loadingAnniversaries
                      ? '...'
                      : `${upcomingAnniversaries.length} ${getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversary_date', 'anniversary')}${upcomingAnniversaries.length !== 1 ? 'ies' : ''} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.this_month', 'this month')}`}
                  </span>
                </button>

                {/* Open Positions */}
                <button
                  type="button"
                  onClick={() => handleNavigateToInsights('open-positions')}
                  className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:text-left gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer gba:hover:opacity-80"
                  data-testid="manager-dashboard-insights-open-positions"
                >
                  <UsersIcon size={20} className="gba:text-muted-foreground" />
                  <span className="gba:text-sm gba:text-foreground">
                    {loadingOpenPositions
                      ? '...'
                      : `${openPositions.length} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.open_position', 'open position')}${openPositions.length !== 1 ? 's' : ''}`}
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
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
      matrixTeams: [], // DirectReport doesn't have matrix teams
      // Include availability status
      status: report.status,
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

  // Team Insights detailed view - Birthdays, Anniversaries, Profiles
  if (currentView === 'insights') {
    return (
      <>
        <div className="gba:p-6 gba:h-full gba:flex gba:flex-col">
          {/* Header section */}
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
            <div className="gba:flex gba:items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNavigateBackToDashboard}
                className="gba:mr-4"
                data-testid="manager-dashboard-insights-back-button"
              >
                <CaretLeftIcon size={16} className="gba:mr-1" />
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
                  'Back to Dashboard'
                )}
              </Button>
              <h1 className="gba:text-xl gba:font-semibold">
                {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.team_insights', 'Team Insights')}
              </h1>
            </div>
          </div>

          {/* Tabs for Insights */}
          <Card className="gba:flex-1 gba:flex gba:flex-col">
            <CardContent className="gba:flex-1 gba:p-0">
              <Tabs
                value={activeInsightsTab}
                onValueChange={value => setActiveInsightsTab(value as InsightsTab)}
                className="gba:flex-1 gba:flex gba:flex-col gba:h-full"
              >
                <TabsList className="gba:grid gba:w-full gba:grid-cols-3 gba:m-4 gba:max-w-md">
                  <TabsTrigger value="birthdays" className="gba:flex gba:items-center gba:gap-2">
                    <CakeIcon size={16} />
                    <span>{getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthday', 'Birthdays')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="anniversaries" className="gba:flex gba:items-center gba:gap-2">
                    <TrophyIcon size={16} />
                    <span>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.anniversary_date', 'Anniversaries')}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="open-positions" className="gba:flex gba:items-center gba:gap-2">
                    <UsersIcon size={16} />
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        'master-data:hr.manager_dashboard.open_positions',
                        'Open Positions'
                      )}
                    </span>
                  </TabsTrigger>
                </TabsList>

                {/* Birthdays Tab */}
                <TabsContent value="birthdays" className="gba:flex-1 gba:overflow-y-auto gba:p-4">
                  {loadingBirthdays ? (
                    <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                      <Spinner size="lg" />
                    </div>
                  ) : upcomingBirthdays.length === 0 ? (
                    <div className="gba:text-center gba:py-8 gba:bg-muted/30 gba:rounded-lg">
                      <p className="gba:text-sm gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.manager_dashboard.no_upcoming_birthdays',
                          'No upcoming birthdays in the next 30 days'
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="gba:border gba:rounded-lg gba:overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              {getTranslationFromI18nKeyAndLabel(
                                'master-data:forms.capability.fields.name.label',
                                'Name'
                              )}
                            </TableHead>
                            <TableHead>
                              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.birthday', 'Birthday')}
                            </TableHead>
                            <TableHead>
                              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {upcomingBirthdays.map(person => (
                            <TableRow
                              key={person.id}
                              className="gba:cursor-pointer hover:gba:bg-gray-50"
                              onClick={() => handleNavigateToEmployee(person.id)}
                            >
                              <TableCell>
                                <div className="gba:flex gba:items-center gba:space-x-3">
                                  <Avatar size="sm" className="gba:h-8 gba:w-8">
                                    <AvatarImage
                                      src={
                                        person.pictureThumbnail && !person.pictureThumbnail.startsWith('{')
                                          ? `data:image/jpeg;base64,${person.pictureThumbnail}`
                                          : undefined
                                      }
                                      alt={person.fullName}
                                    />
                                    <AvatarFallback>
                                      {`${person.firstName[0]}${person.lastName[0]}`.toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="gba:font-medium">{person.fullName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="gba:text-sm gba:text-neutral-600">
                                  {person.birthDate ? dayjs(person.birthDate).format('MMMM D') : '-'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={e => {
                                    e.stopPropagation()
                                    // TODO: Implement send message functionality
                                    console.log('Send birthday message to', person.fullName)
                                  }}
                                >
                                  <EnvelopeSimpleOpenIcon size={16} className="gba:mr-1" />
                                  {getTranslationFromI18nKeyAndLabel(
                                    'master-data:hr.manager_dashboard.send_message',
                                    'Send Message'
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* Anniversaries Tab */}
                <TabsContent value="anniversaries" className="gba:flex-1 gba:overflow-y-auto gba:p-4">
                  {loadingAnniversaries ? (
                    <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                      <Spinner size="lg" />
                    </div>
                  ) : upcomingAnniversaries.length === 0 ? (
                    <div className="gba:text-center gba:py-8 gba:bg-muted/30 gba:rounded-lg">
                      <p className="gba:text-sm gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.manager_dashboard.no_upcoming_anniversaries',
                          'No upcoming work anniversaries in the next 30 days'
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="gba:border gba:rounded-lg gba:overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              {getTranslationFromI18nKeyAndLabel(
                                'master-data:forms.capability.fields.name.label',
                                'Name'
                              )}
                            </TableHead>
                            <TableHead>
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:hr_insights.anniversary_date',
                                'Anniversary'
                              )}
                            </TableHead>
                            <TableHead>
                              {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.years', 'Years')}
                            </TableHead>
                            <TableHead>
                              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {upcomingAnniversaries.map(person => (
                            <TableRow
                              key={person.id}
                              className="gba:cursor-pointer hover:gba:bg-gray-50"
                              onClick={() => handleNavigateToEmployee(person.id)}
                            >
                              <TableCell>
                                <div className="gba:flex gba:items-center gba:space-x-3">
                                  <Avatar size="sm" className="gba:h-8 gba:w-8">
                                    <AvatarImage
                                      src={
                                        person.pictureThumbnail && !person.pictureThumbnail.startsWith('{')
                                          ? `data:image/jpeg;base64,${person.pictureThumbnail}`
                                          : undefined
                                      }
                                      alt={person.fullName}
                                    />
                                    <AvatarFallback>
                                      {`${person.firstName[0]}${person.lastName[0]}`.toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="gba:font-medium">{person.fullName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="gba:text-sm gba:text-neutral-600">
                                  {person.hireDate ? dayjs(person.hireDate).format('MMMM D') : '-'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="info" size="sm">
                                  {person.yearsOfService} {person.yearsOfService === 1 ? 'year' : 'years'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={e => {
                                    e.stopPropagation()
                                    // TODO: Implement send message functionality
                                    console.log('Send anniversary message to', person.fullName)
                                  }}
                                >
                                  <EnvelopeSimpleOpenIcon size={16} className="gba:mr-1" />
                                  {getTranslationFromI18nKeyAndLabel(
                                    'master-data:hr.manager_dashboard.send_message',
                                    'Send Message'
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* Open Positions Tab */}
                <TabsContent value="open-positions" className="gba:flex-1 gba:overflow-y-auto gba:p-4">
                  {loadingOpenPositions ? (
                    <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                      <Spinner size="lg" />
                    </div>
                  ) : openPositions.length === 0 ? (
                    <div className="gba:text-center gba:py-8 gba:bg-muted/30 gba:rounded-lg">
                      <p className="gba:text-sm gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'master-data:hr.manager_dashboard.no_open_positions',
                          'No open positions in your team'
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="gba:border gba:rounded-lg gba:overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:human_resources_page.job_positions_section.position',
                                'Position'
                              )}
                            </TableHead>
                            <TableHead>
                              {getTranslationFromI18nKeyAndLabel('master-data:forms.department.title', 'Department')}
                            </TableHead>
                            <TableHead>
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:human_resources_page.job_function',
                                'Job Function'
                              )}
                            </TableHead>
                            <TableHead>
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:human_resources_page.employee_table.status_column',
                                'Status'
                              )}
                            </TableHead>
                            <TableHead>
                              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {openPositions.map(position => (
                            <TableRow
                              key={position.id}
                              className="gba:cursor-pointer hover:gba:bg-gray-50"
                              onClick={() => handleOpenPositionSheet(position)}
                            >
                              <TableCell>
                                <div className="gba:flex gba:flex-col">
                                  <span className="gba:font-medium">{position.name}</span>
                                  {position.jobLevelName && (
                                    <span className="gba:text-sm gba:text-muted-foreground">
                                      {position.jobLevelName}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="gba:text-sm gba:text-neutral-600">
                                  {position.organizationalUnitName || '-'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="gba:text-sm gba:text-neutral-600">
                                  {position.jobFunctionName || '-'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="warning" size="sm">
                                  {getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:human_resources_page.job_positions_section.vacant',
                                    'Vacant'
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleOpenPositionSheet(position)
                                  }}
                                >
                                  {getTranslationFromI18nKeyAndLabel(
                                    'master-data:hr.manager_dashboard.view_details',
                                    'View Details'
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Job Position Detail Sheet - Also in insights view */}
        <Sheet open={isPositionSheetOpen} onOpenChange={setIsPositionSheetOpen} title="">
          <SheetContent className="gba:w-full sm:gba:max-w-xl gba:overflow-y-auto gba:p-6">
            {selectedPosition && (
              <div className="gba:space-y-6">
                {/* Header */}
                <SheetHeader>
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <PiBriefcase className="gba:text-primary gba:text-xl" />
                    <div>
                      <SheetTitle className="gba:text-lg gba:font-semibold">{selectedPosition.name}</SheetTitle>
                      <SheetDescription>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:human_resources_page.job_positions_section.position_details',
                          'Position Details'
                        )}
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                <Separator />

                {/* Status */}
                <div className="gba:space-y-4">
                  <Badge variant="warning" size="sm">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.job_positions_section.vacant',
                      'Vacant'
                    )}
                  </Badge>
                </div>

                {/* Job Information */}
                <div className="gba:space-y-4">
                  <h3 className="gba:text-md gba:font-medium gba:text-foreground">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.job_positions_section.job_information',
                      'Job Information'
                    )}
                  </h3>

                  <div className="gba:space-y-3">
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <PiTag className="gba:text-muted-foreground gba:mt-1" />
                      <div>
                        <p className="gba:text-sm gba:font-medium gba:text-foreground">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:human_resources_page.job_positions_section.job_function',
                            'Job Function'
                          )}
                        </p>
                        <p className="gba:text-sm gba:text-foreground">
                          {selectedPosition.jobFunctionName ||
                            getTranslationFromI18nKeyAndLabel(
                              'lowcoder:human_resources_page.job_positions_section.not_specified',
                              'Not specified'
                            )}
                        </p>
                      </div>
                    </div>

                    <div className="gba:flex gba:items-start gba:gap-3">
                      <PiTag className="gba:text-muted-foreground gba:mt-1" />
                      <div>
                        <p className="gba:text-sm gba:font-medium gba:text-foreground">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:human_resources_page.job_positions_section.job_level',
                            'Job Level'
                          )}
                        </p>
                        <p className="gba:text-sm gba:text-foreground">
                          {selectedPosition.jobLevelName ||
                            getTranslationFromI18nKeyAndLabel(
                              'lowcoder:human_resources_page.job_positions_section.not_specified',
                              'Not specified'
                            )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organizational Information */}
                <div className="gba:space-y-4">
                  <h3 className="gba:text-md gba:font-medium gba:text-foreground">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.job_positions_section.organizational_information',
                      'Organizational Information'
                    )}
                  </h3>

                  <div className="gba:space-y-3">
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <PiBuilding className="gba:text-muted-foreground gba:mt-1" />
                      <div>
                        <p className="gba:text-sm gba:font-medium gba:text-foreground">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:human_resources_page.job_positions_section.department',
                            'Department'
                          )}
                        </p>
                        <p className="gba:text-sm gba:text-foreground">
                          {selectedPosition.organizationalUnitName ||
                            getTranslationFromI18nKeyAndLabel(
                              'lowcoder:human_resources_page.job_positions_section.not_specified',
                              'Not specified'
                            )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Employee */}
                <div className="gba:space-y-4">
                  <h3 className="gba:text-md gba:font-medium gba:text-foreground">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.job_positions_section.current_employee',
                      'Current Employee'
                    )}
                  </h3>

                  <div className="gba:space-y-3">
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <PiUser className="gba:text-muted-foreground gba:mt-1" />
                      <div>
                        <p className="gba:text-sm gba:font-medium gba:text-foreground">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:human_resources_page.job_positions_section.employee',
                            'Employee'
                          )}
                        </p>
                        <p className="gba:text-sm gba:text-foreground">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:human_resources_page.job_positions_section.vacant',
                            'Vacant'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="gba:flex gba:gap-2 gba:pt-4">
                  <Button
                    variant="default"
                    className="gba:flex-1"
                    onClick={() => {
                      handleClosePositionSheet()
                      navigateTo(buildPlatformUrl('/platform/hr/human-resources', { view: 'positions' }))
                    }}
                  >
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.job_positions_section.view_in_hr',
                      'View in HR Management'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <>
      <div className="gba:flex gba:flex-col gba:h-full">{mainContent}</div>

      {/* Job Position Detail Sheet */}
      <Sheet open={isPositionSheetOpen} onOpenChange={setIsPositionSheetOpen} title="">
        <SheetContent className="gba:w-full sm:gba:max-w-xl gba:overflow-y-auto gba:p-6">
          {selectedPosition && (
            <div className="gba:space-y-6">
              {/* Header */}
              <SheetHeader>
                <div className="gba:flex gba:items-center gba:gap-3">
                  <PiBriefcase className="gba:text-primary gba:text-xl" />
                  <div>
                    <SheetTitle className="gba:text-lg gba:font-semibold">{selectedPosition.name}</SheetTitle>
                    <SheetDescription>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:human_resources_page.job_positions_section.position_details',
                        'Position Details'
                      )}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <Separator />

              {/* Status */}
              <div className="gba:space-y-4">
                <Badge variant="warning" size="sm">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.job_positions_section.vacant',
                    'Vacant'
                  )}
                </Badge>
              </div>

              {/* Job Information */}
              <div className="gba:space-y-4">
                <h3 className="gba:text-md gba:font-medium gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.job_positions_section.job_information',
                    'Job Information'
                  )}
                </h3>

                <div className="gba:space-y-3">
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <PiTag className="gba:text-muted-foreground gba:mt-1" />
                    <div>
                      <p className="gba:text-sm gba:font-medium gba:text-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:human_resources_page.job_positions_section.job_function',
                          'Job Function'
                        )}
                      </p>
                      <p className="gba:text-sm gba:text-foreground">
                        {selectedPosition.jobFunctionName ||
                          getTranslationFromI18nKeyAndLabel(
                            'lowcoder:human_resources_page.job_positions_section.not_specified',
                            'Not specified'
                          )}
                      </p>
                    </div>
                  </div>

                  <div className="gba:flex gba:items-start gba:gap-3">
                    <PiTag className="gba:text-muted-foreground gba:mt-1" />
                    <div>
                      <p className="gba:text-sm gba:font-medium gba:text-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:human_resources_page.job_positions_section.job_level',
                          'Job Level'
                        )}
                      </p>
                      <p className="gba:text-sm gba:text-foreground">
                        {selectedPosition.jobLevelName ||
                          getTranslationFromI18nKeyAndLabel(
                            'lowcoder:human_resources_page.job_positions_section.not_specified',
                            'Not specified'
                          )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="gba:space-y-4">
                <h3 className="gba:text-md gba:font-medium gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.job_positions_section.employment_information',
                    'Employment Information'
                  )}
                </h3>

                <div className="gba:space-y-3">
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <PiCalendar className="gba:text-muted-foreground gba:mt-1" />
                    <div>
                      <p className="gba:text-sm gba:font-medium gba:text-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:human_resources_page.employees_section.employment_type',
                          'Employment Type'
                        )}
                      </p>
                      <p className="gba:text-sm gba:text-foreground">
                        {selectedPosition.employmentType ||
                          getTranslationFromI18nKeyAndLabel(
                            'lowcoder:human_resources_page.job_positions_section.not_specified',
                            'Not specified'
                          )}
                      </p>
                    </div>
                  </div>

                  <div className="gba:flex gba:items-start gba:gap-3">
                    <PiCalendar className="gba:text-muted-foreground gba:mt-1" />
                    <div>
                      <p className="gba:text-sm gba:font-medium gba:text-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:human_resources_page.employees_section.contract_type',
                          'Contract Type'
                        )}
                      </p>
                      <p className="gba:text-sm gba:text-foreground">
                        {selectedPosition.contractType ||
                          getTranslationFromI18nKeyAndLabel(
                            'lowcoder:human_resources_page.job_positions_section.not_specified',
                            'Not specified'
                          )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Organizational Information */}
              <div className="gba:space-y-4">
                <h3 className="gba:text-md gba:font-medium gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.job_positions_section.organizational_information',
                    'Organizational Information'
                  )}
                </h3>

                <div className="gba:space-y-3">
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <PiBuilding className="gba:text-muted-foreground gba:mt-1" />
                    <div>
                      <p className="gba:text-sm gba:font-medium gba:text-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:human_resources_page.job_positions_section.department',
                          'Department'
                        )}
                      </p>
                      <p className="gba:text-sm gba:text-foreground">
                        {selectedPosition.organizationalUnitName ||
                          getTranslationFromI18nKeyAndLabel(
                            'lowcoder:human_resources_page.job_positions_section.not_specified',
                            'Not specified'
                          )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Employee */}
              <div className="gba:space-y-4">
                <h3 className="gba:text-md gba:font-medium gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.job_positions_section.current_employee',
                    'Current Employee'
                  )}
                </h3>

                <div className="gba:space-y-3">
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <PiUser className="gba:text-muted-foreground gba:mt-1" />
                    <div>
                      <p className="gba:text-sm gba:font-medium gba:text-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:human_resources_page.job_positions_section.employee',
                          'Employee'
                        )}
                      </p>
                      <p className="gba:text-sm gba:text-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:human_resources_page.job_positions_section.vacant',
                          'Vacant'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="gba:flex gba:gap-2 gba:pt-4">
                <Button
                  variant="default"
                  className="gba:flex-1"
                  onClick={() => {
                    handleClosePositionSheet()
                    navigateTo(buildPlatformUrl('/platform/hr/human-resources', { view: 'positions' }))
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:human_resources_page.job_positions_section.view_in_hr',
                    'View in HR Management'
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

export default ManagerDashboard
