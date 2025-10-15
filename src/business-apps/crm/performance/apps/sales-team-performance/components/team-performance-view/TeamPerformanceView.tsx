import React, { useState, useEffect } from 'react'
import { Button, Alert, Spinner } from '@newwork/nw-design-system'
import {
  PiUsers,
  PiTrendUp,
  PiCurrencyDollar,
  PiTarget,
  PiArrowLeft,
  PiCalendar,
  PiTable,
  PiListChecks
} from 'react-icons/pi'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SalesTeamMembersList } from '../sales-members-list'
import { SalesMemberPerformance } from '../sales-member-performance'
import TeamActivitiesCalendar from './components/TeamActivitiesCalendar'
import TeamActivitiesTable from './components/TeamActivitiesTable'
import TeamActivitiesStatistics from './components/TeamActivitiesStatistics'
import TeamOverviewCharts from './components/TeamOverviewCharts'
import { useSalesTeamDataIntegration } from '../sales-members-list/hooks/useSalesTeamDataIntegration'
import { useSalesTeamTrendData } from '../sales-members-list/hooks/useSalesTeamTrendData'
import { SalesTeamMember } from '../sales-members-list/types'
import { formatCurrency } from '@/business-apps/crm/common/utils/currencyUtils'
import { DataContainer } from '@/components/layout/dataContainer'

const DATA_TEST_ID_PREFIX = 'TeamPerformanceView'

interface TeamPerformanceViewProps extends BusinessAppContextProps {
  teamId: string
  teamName: string
  onBack?: () => void
  onMemberSelect?: (member: SalesTeamMember) => void
}

type ViewMode = 'overview' | 'calendar' | 'activities' | 'individual'

export const TeamPerformanceView: React.FC<TeamPerformanceViewProps> = ({
  teamId,
  teamName,
  onBack,
  onMemberSelect,
  accessToken,
  userInfo
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [selectedMember, setSelectedMember] = useState<SalesTeamMember | null>(null)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Create context object from individual props
  const context = React.useMemo(
    () => ({
      accessToken,
      userInfo
    }),
    [accessToken, userInfo]
  )

  // Use existing hooks but filter for specific team
  const { members, total, isLoading, error: dataError, loadPage, refetch } = useSalesTeamDataIntegration(context)

  // Trigger initial data load (same pattern as main component)
  useEffect(() => {
    if (context.accessToken) {
      console.log('TeamPerformanceView: Triggering initial data load via refetch...')
      refetch()
    }
  }, [context.accessToken, refetch])

  // Debug: Check if sales team data integration hook is working
  useEffect(() => {
    console.log('TeamPerformanceView: useSalesTeamDataIntegration hook result', {
      membersCount: members?.length || 0,
      total,
      isLoading,
      dataError: dataError || 'NO_ERROR',
      hasAccessToken: !!context.accessToken,
      accessTokenLength: context.accessToken?.length || 0
    })
  }, [members, isLoading, dataError, context.accessToken, total])

  const { trends, refetch: refetchTrends } = useSalesTeamTrendData(accessToken)

  // Log loading state for debugging
  useEffect(() => {
    console.log('TeamPerformanceView loading state:', {
      isLoading,
      hasData: members.length > 0,
      trendsLoading: trends.isLoading,
      teamId,
      teamName,
      membersCount: members.length,
      salesDataError: dataError,
      accessToken: !!context.accessToken
    })
  }, [isLoading, trends.isLoading, teamId, teamName, members.length, dataError, context.accessToken])

  // Filter members for current team based on organizational structure
  const teamMembers = React.useMemo(() => {
    if (!teamId || members.length === 0) {
      console.log('TeamPerformanceView: Early return from teamMembers filtering', {
        teamId: teamId || 'NO_TEAM_ID',
        membersLength: members.length,
        reason: !teamId ? 'No team ID' : 'No members available'
      })
      return members // Show all if no team selected or no members available
    }

    // Extract supervisor ID from composite team ID (format: "orgunitId-supervisorId")
    // Since both IDs are UUIDs (36 chars), extract the supervisor ID from the end
    const supervisorId = teamId.length > 36 ? teamId.substring(teamId.length - 36) : teamId

    console.log('TeamPerformanceView: Parsing team ID', {
      teamId,
      extractedSupervisorId: supervisorId,
      totalMembers: members.length,
      sampleMemberManagerIds: members.slice(0, 3).map(m => ({ name: m.name, managerId: m.manager?.id }))
    })

    return members.filter(member => {
      // Match members whose manager ID equals the team's supervisor ID
      return member.manager?.id === supervisorId
    })
  }, [members, teamId])

  // Calculate team-specific KPIs from real data
  const teamKPIs = React.useMemo(() => {
    if (!teamMembers.length) {
      return null
    }

    const teamTotalRevenue = teamMembers.reduce((sum, member) => sum + member.totalRevenue, 0)
    const teamAvgActivity = teamMembers.reduce((sum, member) => sum + member.activityScore, 0) / teamMembers.length

    // Company averages (in real implementation, fetch from API)
    const companyAvgRevenue = trends.totalRevenue?.currentValue ? trends.totalRevenue.currentValue / 10 : 0
    const companyAvgActivity = 75 // This should come from API in real implementation

    return {
      totalRevenue: teamTotalRevenue,
      avgActivityScore: teamAvgActivity,
      memberCount: teamMembers.length,
      revenueVsCompany: companyAvgRevenue ? ((teamTotalRevenue - companyAvgRevenue) / companyAvgRevenue) * 100 : 0,
      activityVsCompany: ((teamAvgActivity - companyAvgActivity) / companyAvgActivity) * 100
    }
  }, [teamMembers, trends])

  const handleMemberClick = (member: SalesTeamMember) => {
    setSelectedMember(member)
    setViewMode('individual')
    if (onMemberSelect) {
      onMemberSelect(member)
    }
  }

  const handleBackToTeam = () => {
    setSelectedMember(null)
    setViewMode('overview')
  }

  // Create team KPI widgets with company comparison
  const createTeamKPIWidgets = (): WidgetItem[] => {
    if (!teamKPIs) return []

    return [
      {
        key: 'team-revenue',
        title: 'Team Revenue',
        value: formatCurrency(teamKPIs.totalRevenue),
        prefix: <PiCurrencyDollar />,
        color: '#10b981',
        description: `${teamKPIs.revenueVsCompany >= 0 ? '+' : ''}${teamKPIs.revenueVsCompany.toFixed(1)}% vs company average`,
        valueIsString: true,
        trend: {
          value: `${Math.abs(teamKPIs.revenueVsCompany).toFixed(1)}%`,
          positive: teamKPIs.revenueVsCompany >= 0,
          description: 'vs company average'
        }
      },
      {
        key: 'team-activity',
        title: 'Team Activity Score',
        value: teamKPIs.avgActivityScore,
        prefix: <PiTarget />,
        color: '#1677ff',
        description: `${teamKPIs.activityVsCompany >= 0 ? '+' : ''}${teamKPIs.activityVsCompany.toFixed(1)}% vs company average`,
        precision: 1,
        suffix: '%',
        trend: {
          value: `${Math.abs(teamKPIs.activityVsCompany).toFixed(1)}%`,
          positive: teamKPIs.activityVsCompany >= 0,
          description: 'vs company average'
        }
      },
      {
        key: 'team-size',
        title: 'Team Members',
        value: teamKPIs.memberCount,
        prefix: <PiUsers />,
        color: '#722ed1',
        description: 'Active team members',
        precision: 0
      },
      {
        key: 'avg-per-member',
        title: 'Avg Revenue per Member',
        value: formatCurrency(teamKPIs.totalRevenue / teamKPIs.memberCount),
        prefix: <PiTrendUp />,
        color: '#ff9500',
        description: 'Average revenue contribution',
        valueIsString: true
      }
    ]
  }

  // Only show loading spinner if we have no data at all
  const showLoadingSpinner = isLoading && !teamKPIs && teamMembers.length === 0

  console.log('TeamPerformanceView render states:', {
    isLoading,
    trendsLoading: trends.isLoading,
    teamMembersCount: teamMembers.length,
    teamKPIsAvailable: !!teamKPIs,
    showLoadingSpinner
  })

  if (showLoadingSpinner) {
    console.log('TeamPerformanceView showing loading spinner')
    return (
      <div
        className="gba:flex gba:flex-col gba:justify-center gba:items-center gba:h-screen"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        <Spinner size="lg" />
        <p className="gba:text-gray-600 gba:mt-4">Loading team data for {teamName}...</p>
        <p className="gba:text-xs gba:text-gray-400 gba:mt-2">This should only take a moment</p>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="gba:p-6" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <Alert variant="destructive">
          <span>Error loading team performance data</span>
          <Button variant="outline" size="sm" onClick={refetch} className="gba:ml-2">
            Retry
          </Button>
        </Alert>
      </div>
    )
  }

  // Show individual performance if member selected
  if (viewMode === 'individual' && selectedMember) {
    return (
      <SalesMemberPerformance
        memberId={selectedMember.employeeId || selectedMember.id}
        accessToken={accessToken}
        userInfo={userInfo}
        onBack={handleBackToTeam}
        initialTab="performance"
      />
    )
  }

  return (
    <div className="gba:bg-white gba:min-h-screen gba:p-6 gba:space-y-6" data-testid={DATA_TEST_ID_PREFIX}>
      {/* Header Section */}
      <div
        className="gba:bg-gradient-to-r gba:from-blue-50 gba:to-indigo-50 gba:rounded-lg gba:p-6"
        data-testid={`${DATA_TEST_ID_PREFIX}-header`}
      >
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} data-testid={`${DATA_TEST_ID_PREFIX}-back-button`}>
                <PiArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
                Back to Overview
              </Button>
            )}
            <div>
              <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:mb-2">Team Performance: {teamName}</h1>
              <p className="gba:text-gray-600">
                Monitor your team's performance with benchmarks and individual insights
              </p>
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:space-x-2 gba:text-sm gba:text-gray-500">
            <PiUsers className="gba:w-4 gba:h-4" />
            <span>{teamMembers.length} Team Members</span>
          </div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="gba:flex gba:gap-2 gba:mb-6">
        <Button
          variant={viewMode === 'overview' ? 'default' : 'outline'}
          onClick={() => setViewMode('overview')}
          data-testid={`${DATA_TEST_ID_PREFIX}-overview-tab`}
        >
          <PiTable className="gba:w-4 gba:h-4 gba:mr-2" />
          Team Overview
        </Button>
        <Button
          variant={viewMode === 'activities' ? 'default' : 'outline'}
          onClick={() => setViewMode('activities')}
          data-testid={`${DATA_TEST_ID_PREFIX}-activities-tab`}
        >
          <PiListChecks className="gba:w-4 gba:h-4 gba:mr-2" />
          Activities List
        </Button>
        <Button
          variant={viewMode === 'calendar' ? 'default' : 'outline'}
          onClick={() => setViewMode('calendar')}
          data-testid={`${DATA_TEST_ID_PREFIX}-calendar-tab`}
        >
          <PiCalendar className="gba:w-4 gba:h-4 gba:mr-2" />
          Team Calendar
        </Button>
      </div>

      {/* Team KPI Statistics */}
      <div className="gba:mb-8" data-testid={`${DATA_TEST_ID_PREFIX}-kpi-section`}>
        <WidgetGroup
          widgets={createTeamKPIWidgets()}
          isLoading={isLoading}
          error={dataError ? new Error(dataError) : null}
          onRetry={refetch}
          skeletonCount={4}
          emptyText="No team performance statistics available."
          data-testid={`${DATA_TEST_ID_PREFIX}-kpi-widgets`}
        />
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <div data-testid={`${DATA_TEST_ID_PREFIX}-overview-content`} className="gba:space-y-8">
          {/* Team Members List */}
          <DataContainer
            contentBackground="white"
            dataControllerProps={{
              search,
              setSearch,
              listTitle: (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <PiUsers className="gba:text-blue-600" />
                  <span className="gba:text-lg gba:font-semibold">Team Members</span>
                  <span className="gba:text-gray-500">({teamMembers.length})</span>
                </div>
              )
            }}
            dataBody={
              <SalesTeamMembersList
                members={teamMembers}
                loading={isLoading}
                error={dataError ? new Error(dataError) : null}
                onRetry={refetch}
                onMemberClick={handleMemberClick}
                accessToken={accessToken}
                total={teamMembers.length}
                currentPage={currentPage}
                pageSize={pageSize}
                search={search}
                onSearchChange={setSearch}
                onPaginationChange={(page, size) => {
                  setCurrentPage(page)
                  setPageSize(size || pageSize)
                }}
              />
            }
          />

          {/* Team Analytics Charts */}
          <TeamOverviewCharts teamMembers={teamMembers} accessToken={accessToken} userInfo={userInfo} />
        </div>
      )}

      {viewMode === 'activities' && (
        <div data-testid={`${DATA_TEST_ID_PREFIX}-activities-content`}>
          <div className="gba:flex gba:flex-col gba:gap-6">
            {/* Activities Statistics Section */}
            <TeamActivitiesStatistics teamMembers={teamMembers} accessToken={accessToken} userInfo={userInfo} />

            {/* Activities Table Section */}
            <TeamActivitiesTable teamMembers={teamMembers} accessToken={accessToken} userInfo={userInfo} />
          </div>
        </div>
      )}

      {viewMode === 'calendar' && (
        <div data-testid={`${DATA_TEST_ID_PREFIX}-calendar-content`}>
          <TeamActivitiesCalendar
            teamId={teamId}
            teamMembers={teamMembers}
            accessToken={accessToken}
            userInfo={userInfo}
          />
        </div>
      )}
    </div>
  )
}

export default TeamPerformanceView
