import React, { useState, useMemo } from 'react'
import {
  SalesKpis,
  RevenueTrendsChart,
  PipelineForecastChart,
  SalesVelocityCard,
  TopPerformersCard,
  TopTeamsCard,
  NeedsAttentionEmployeesCard,
  NeedsAttentionTeamsCard
} from '../../components'
import {
  useSalesPerformanceKpis,
  useRevenueTrends,
  usePipelineForecast,
  useSalesVelocity,
  useSalesAssociates,
  useTeamsWithMembers,
  useEmployeeRevenues,
  computeTeamPerformance,
  type Pipeline
} from '../../hooks'
import { type TimeFilter } from '../../types'

const DATA_TEST_ID_PREFIX = 'sales-performance-overview'

interface OverviewContentProps {
  accessToken: string
  selectedCurrencyId?: string
  selectedCurrencyCode: string
  pipelines: Pipeline[]
  pipelinesLoading: boolean
}

/**
 * Data + layout for the Sales Performance Overview tab.
 *
 * This is rendered only after currencies have resolved, so selectedCurrencyId is
 * defined on the first render and every currency-scoped hook fetches exactly once
 * (avoiding an initial unfiltered request followed by a filtered one).
 */
export const OverviewContent: React.FC<OverviewContentProps> = ({
  accessToken,
  selectedCurrencyId,
  selectedCurrencyCode,
  pipelines,
  pipelinesLoading
}) => {
  const [revenueTimeFilter, setRevenueTimeFilter] = useState<TimeFilter>('sixMonths')
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(undefined)
  const [forecastPipelineId, setForecastPipelineId] = useState<string | undefined>(undefined)

  const {
    kpis,
    isLoading: kpisLoading,
    error: kpisError,
    refetch: refetchKpis
  } = useSalesPerformanceKpis(accessToken, selectedCurrencyId)

  const {
    revenueTrends,
    isLoading: trendsLoading,
    error: trendsError,
    refetch: refetchTrends
  } = useRevenueTrends(accessToken, revenueTimeFilter, selectedPipelineId, selectedCurrencyId)

  const {
    forecastData,
    isLoading: forecastLoading,
    error: forecastError,
    refetch: refetchForecast
  } = usePipelineForecast(accessToken, forecastPipelineId, selectedCurrencyId)

  const {
    velocityData,
    isLoading: velocityLoading,
    error: velocityError,
    refetch: refetchVelocity
  } = useSalesVelocity(accessToken, selectedCurrencyId)

  // Fetch the Sales Associate list once and share it across the performer cards
  const {
    employees: salesAssociates,
    isLoading: salesAssociatesLoading,
    error: salesAssociatesError,
    refetch: refetchSalesAssociates
  } = useSalesAssociates(accessToken)

  // Fetch per-employee revenue once (aggregates) and feed every performer and team card.
  // Team members are Sales Associates, so revenueByEmployeeId also covers team roll-ups.
  const {
    employeeRevenues,
    revenueByEmployeeId,
    isLoading: employeeRevenuesLoading,
    error: employeeRevenuesError,
    refetch: refetchEmployeeRevenues
  } = useEmployeeRevenues(accessToken, salesAssociates, selectedCurrencyId)

  // Top performers: only employees with wins, ranked by revenue (highest first)
  const topPerformers = useMemo(
    () =>
      employeeRevenues
        .filter(performer => performer.opportunitiesWon > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
    [employeeRevenues]
  )

  // Needs attention: all employees (incl. zero revenue), ranked by revenue (lowest first)
  const rawBottomPerformers = useMemo(
    () => [...employeeRevenues].sort((a, b) => a.revenue - b.revenue).slice(0, 10),
    [employeeRevenues]
  )

  // Fetch the team list once and share it across the team cards
  const {
    teams: teamsWithMembers,
    isLoading: teamsWithMembersLoading,
    error: teamsWithMembersError,
    refetch: refetchTeamsWithMembers
  } = useTeamsWithMembers(accessToken)

  // Top teams: only teams with revenue, ranked by revenue (highest first)
  const topTeams = useMemo(
    () =>
      computeTeamPerformance(teamsWithMembers, revenueByEmployeeId)
        .filter(team => team.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
    [teamsWithMembers, revenueByEmployeeId]
  )

  // Needs attention: all teams with members, ranked by revenue (lowest first)
  const rawBottomTeams = useMemo(
    () =>
      computeTeamPerformance(teamsWithMembers, revenueByEmployeeId)
        .filter(team => team.memberCount > 0)
        .sort((a, b) => a.revenue - b.revenue)
        .slice(0, 10),
    [teamsWithMembers, revenueByEmployeeId]
  )

  // Combined loading/error flags. Revenue is shared, so both card groups depend on it.
  const revenueLoading = salesAssociatesLoading || employeeRevenuesLoading
  const revenueError = salesAssociatesError || employeeRevenuesError

  const performersLoading = revenueLoading
  const performersError = revenueError
  const teamsLoading = teamsWithMembersLoading || revenueLoading
  const teamsError = teamsWithMembersError || revenueError

  const refetchPerformers = () => {
    refetchSalesAssociates()
    refetchEmployeeRevenues()
  }

  const refetchTeams = () => {
    refetchTeamsWithMembers()
    refetchSalesAssociates()
    refetchEmployeeRevenues()
  }

  // Filter out top performers/teams from the "needs attention" lists
  // This ensures the same person/team doesn't appear in both sections
  const topPerformerIds = useMemo(() => new Set(topPerformers.map(p => p.id)), [topPerformers])

  const topTeamIds = useMemo(() => new Set(topTeams.map(t => t.id)), [topTeams])

  const filteredBottomPerformers = useMemo(
    () => rawBottomPerformers.filter(p => !topPerformerIds.has(p.id)).slice(0, 5),
    [rawBottomPerformers, topPerformerIds]
  )

  const filteredBottomTeams = useMemo(
    () => rawBottomTeams.filter(t => !topTeamIds.has(t.id)).slice(0, 5),
    [rawBottomTeams, topTeamIds]
  )

  return (
    <>
      {/* KPI Section */}
      <section data-testid={`${DATA_TEST_ID_PREFIX}-kpis-section`}>
        <SalesKpis kpis={kpis} isLoading={kpisLoading} error={kpisError} onRetry={refetchKpis} />
      </section>

      {/* Monthly Sales Velocity Card */}
      <section data-testid={`${DATA_TEST_ID_PREFIX}-velocity-section`}>
        <SalesVelocityCard
          velocityData={velocityData}
          currencyCode={selectedCurrencyCode}
          isLoading={velocityLoading}
          error={velocityError}
          onRetry={refetchVelocity}
        />
      </section>

      {/* Pipeline Forecast Chart */}
      <section data-testid={`${DATA_TEST_ID_PREFIX}-pipeline-forecast-section`}>
        <PipelineForecastChart
          forecastData={forecastData}
          isLoading={forecastLoading}
          error={forecastError}
          onRetry={refetchForecast}
          pipelines={pipelines}
          selectedPipelineId={forecastPipelineId}
          onPipelineChange={setForecastPipelineId}
          pipelinesLoading={pipelinesLoading}
        />
      </section>

      {/* Revenue Trends Chart */}
      <section data-testid={`${DATA_TEST_ID_PREFIX}-revenue-trends-section`}>
        <RevenueTrendsChart
          revenueTrends={revenueTrends}
          isLoading={trendsLoading}
          error={trendsError}
          onRetry={refetchTrends}
          timeFilter={revenueTimeFilter}
          onTimeFilterChange={setRevenueTimeFilter}
          pipelines={pipelines}
          selectedPipelineId={selectedPipelineId}
          onPipelineChange={setSelectedPipelineId}
          pipelinesLoading={pipelinesLoading}
        />
      </section>

      {/* Top Performers Grid - items-stretch ensures equal card heights */}
      <section
        className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6 gba:items-stretch"
        data-testid={`${DATA_TEST_ID_PREFIX}-performers-section`}
      >
        <TopPerformersCard
          topPerformers={topPerformers}
          isLoading={performersLoading}
          error={performersError}
          onRetry={refetchPerformers}
        />
        <TopTeamsCard topTeams={topTeams} isLoading={teamsLoading} error={teamsError} onRetry={refetchTeams} />
      </section>

      {/* Needs Attention Grid - employees and teams with lowest revenue */}
      {/* Excludes anyone who appears in Top Performers/Teams */}
      <section
        className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6 gba:items-stretch"
        data-testid={`${DATA_TEST_ID_PREFIX}-needs-attention-section`}
      >
        <NeedsAttentionEmployeesCard
          employees={filteredBottomPerformers}
          isLoading={performersLoading}
          error={performersError}
          onRetry={refetchPerformers}
        />
        <NeedsAttentionTeamsCard
          teams={filteredBottomTeams}
          isLoading={teamsLoading}
          error={teamsError}
          onRetry={refetchTeams}
        />
      </section>
    </>
  )
}

export default OverviewContent
