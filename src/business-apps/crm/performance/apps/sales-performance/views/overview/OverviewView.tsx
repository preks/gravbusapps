import React, { useState, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
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
  useTopPerformers,
  useTopTeams,
  useBottomPerformers,
  useBottomTeams,
  usePipelines,
  useCurrencies
} from '../../hooks'
import { type TimeFilter } from '../../types'

type OverviewViewProps = BusinessAppContextProps

const DATA_TEST_ID_PREFIX = 'sales-performance-overview'
const DEFAULT_CURRENCY = 'EUR'

/**
 * Currency filter component
 */
interface CurrencyFilterProps {
  selectedCurrency: string
  currencies: Array<{ code: string; label: string; id: string }>
  onCurrencyChange: (currencyCode: string) => void
  isLoading?: boolean
}

const CurrencyFilter: React.FC<CurrencyFilterProps> = ({
  selectedCurrency,
  currencies,
  onCurrencyChange,
  isLoading = false
}) => {
  if (currencies.length === 0 && !isLoading) return null

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency:</Label>
      <Select value={selectedCurrency} onValueChange={onCurrencyChange} disabled={isLoading}>
        <SelectTrigger className="gba:w-32" data-testid={`${DATA_TEST_ID_PREFIX}-currency-selector`}>
          <SelectValue placeholder="Select currency">{selectedCurrency}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {currencies.map(currency => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * Overview View for Sales Performance
 * Displays:
 * - Currency selector filter (EUR by default)
 * - 4 KPI cards (Total Revenue, Opportunities Won, Average Deal Size, Win Rate)
 * - Revenue Trends Chart with pipeline selector
 * - Top 5 Individual Performers
 * - Top 5 Teams by Revenue
 */
export const OverviewView: React.FC<OverviewViewProps> = ({ accessToken }) => {
  const [revenueTimeFilter, setRevenueTimeFilter] = useState<TimeFilter>('sixMonths')
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(undefined)
  const [forecastPipelineId, setForecastPipelineId] = useState<string | undefined>(undefined)
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(DEFAULT_CURRENCY)

  // Fetch pipelines for the selector
  const { pipelines, isLoading: pipelinesLoading } = usePipelines(accessToken)

  // Fetch currencies for the selector
  const { currencies, isLoading: currenciesLoading } = useCurrencies(accessToken)

  // Convert currency code to full ID for filtering
  // Always returns a currency ID (defaults to finding EUR or first available)
  const selectedCurrencyId = useMemo(() => {
    const currency = currencies.find(c => c.code === selectedCurrencyCode)
    if (currency) return currency.id

    // If selected currency not found, try EUR
    const eurCurrency = currencies.find(c => c.code === DEFAULT_CURRENCY)
    if (eurCurrency) return eurCurrency.id

    // Fallback to first available currency
    return currencies[0]?.id
  }, [selectedCurrencyCode, currencies])

  // Fetch all data with currency filter
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

  const {
    topPerformers,
    isLoading: performersLoading,
    error: performersError,
    refetch: refetchPerformers
  } = useTopPerformers(accessToken, 5, selectedCurrencyId)

  const {
    topTeams,
    isLoading: teamsLoading,
    error: teamsError,
    refetch: refetchTeams
  } = useTopTeams(accessToken, 5, selectedCurrencyId)

  // Fetch bottom performers (needs attention) - fetch more to account for filtering
  const {
    bottomPerformers: rawBottomPerformers,
    isLoading: bottomPerformersLoading,
    error: bottomPerformersError,
    refetch: refetchBottomPerformers
  } = useBottomPerformers(accessToken, 10, selectedCurrencyId)

  const {
    bottomTeams: rawBottomTeams,
    isLoading: bottomTeamsLoading,
    error: bottomTeamsError,
    refetch: refetchBottomTeams
  } = useBottomTeams(accessToken, 10, selectedCurrencyId)

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
    <div className="gba:space-y-6" data-testid={DATA_TEST_ID_PREFIX}>
      {/* Currency Filter */}
      <section className="gba:flex gba:justify-end" data-testid={`${DATA_TEST_ID_PREFIX}-filters-section`}>
        <CurrencyFilter
          selectedCurrency={selectedCurrencyCode}
          currencies={currencies}
          onCurrencyChange={setSelectedCurrencyCode}
          isLoading={currenciesLoading}
        />
      </section>

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
          isLoading={bottomPerformersLoading}
          error={bottomPerformersError}
          onRetry={refetchBottomPerformers}
        />
        <NeedsAttentionTeamsCard
          teams={filteredBottomTeams}
          isLoading={bottomTeamsLoading}
          error={bottomTeamsError}
          onRetry={refetchBottomTeams}
        />
      </section>
    </div>
  )
}

export default OverviewView
