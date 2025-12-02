import React, { useState, useMemo, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Spinner,
  Alert,
  Button,
  Badge
} from '@newwork/nw-design-system'
import { RefreshCwIcon, UsersIcon } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TeamSelectionCard, TeamComparisonChart } from '../../components'
import { useTeamComparison, useCurrencies, usePipelines } from '../../hooks'
import { type TimeFilter } from '../../types'

type TeamsViewProps = BusinessAppContextProps

const DATA_TEST_ID_PREFIX = 'sales-performance-teams'
const DEFAULT_CURRENCY = 'EUR'
const MAX_TEAMS = 4

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
 * Team Selector Dropdown Component
 */
interface TeamSelectorProps {
  availableTeams: Array<{ id: string; name: string; memberCount: number }>
  selectedTeamIds: string[]
  onSelectTeam: (teamId: string) => void
  isLoading?: boolean
  maxTeams?: number
}

const TeamSelector: React.FC<TeamSelectorProps> = ({
  availableTeams,
  selectedTeamIds,
  onSelectTeam,
  isLoading = false,
  maxTeams = MAX_TEAMS
}) => {
  // Filter out already selected teams
  const selectableTeams = availableTeams.filter(team => !selectedTeamIds.includes(team.id))
  const isMaxReached = selectedTeamIds.length >= maxTeams

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap gba:flex gba:items-center gba:gap-2">
        <UsersIcon className="gba:h-4 gba:w-4" />
        Select Team:
      </Label>
      <Select
        value=""
        onValueChange={onSelectTeam}
        disabled={isLoading || isMaxReached || selectableTeams.length === 0}
      >
        <SelectTrigger className="gba:w-56" data-testid={`${DATA_TEST_ID_PREFIX}-team-selector`}>
          <SelectValue placeholder={isMaxReached ? `Max ${maxTeams} teams` : 'Add team to compare'} />
        </SelectTrigger>
        <SelectContent>
          {selectableTeams.map(team => (
            <SelectItem key={team.id} value={team.id}>
              {team.name} ({team.memberCount} members)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Badge variant="secondary" className="gba:ml-2">
        {selectedTeamIds.length}/{maxTeams}
      </Badge>
    </div>
  )
}

/**
 * Teams View for Sales Performance
 * Displays:
 * - Team selector (max 4 teams)
 * - Team cards with performance metrics (click to toggle chart visibility)
 * - Revenue comparison chart with pipeline and time filters
 */
export const TeamsView: React.FC<TeamsViewProps> = ({ accessToken }) => {
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(DEFAULT_CURRENCY)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('sixMonths')
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(undefined)
  // Track which teams are active (visible in chart) - all selected teams are active by default
  const [activeTeamIds, setActiveTeamIds] = useState<Set<string>>(new Set())

  // Fetch currencies for the selector
  const { currencies, isLoading: currenciesLoading } = useCurrencies(accessToken)

  // Fetch pipelines for the selector
  const { pipelines, isLoading: pipelinesLoading } = usePipelines(accessToken)

  // Convert currency code to full ID for filtering
  const selectedCurrencyId = useMemo(() => {
    const currency = currencies.find(c => c.code === selectedCurrencyCode)
    if (currency) return currency.id

    const eurCurrency = currencies.find(c => c.code === DEFAULT_CURRENCY)
    if (eurCurrency) return eurCurrency.id

    return currencies[0]?.id
  }, [selectedCurrencyCode, currencies])

  // Fetch team comparison data with filters
  const {
    availableTeams,
    selectedTeams,
    revenueTrends,
    isLoading,
    isLoadingTrends,
    error,
    selectTeam,
    deselectTeam,
    selectedTeamIds,
    refetch
  } = useTeamComparison(
    accessToken,
    timeFilter,
    selectedCurrencyId,
    selectedCurrencyCode,
    selectedPipelineId,
    MAX_TEAMS
  )

  // When a new team is selected, automatically make it active
  useEffect(() => {
    setActiveTeamIds(prev => {
      const newSet = new Set(prev)
      // Add any newly selected teams
      selectedTeamIds.forEach(id => newSet.add(id))
      // Remove any teams that are no longer selected
      prev.forEach(id => {
        if (!selectedTeamIds.includes(id)) {
          newSet.delete(id)
        }
      })
      return newSet
    })
  }, [selectedTeamIds])

  // Toggle team visibility in chart
  const handleToggleTeamActive = (teamId: string) => {
    setActiveTeamIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(teamId)) {
        newSet.delete(teamId)
      } else {
        newSet.add(teamId)
      }
      return newSet
    })
  }

  // Handle removing a team completely
  const handleRemoveTeam = (teamId: string) => {
    deselectTeam(teamId)
    setActiveTeamIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(teamId)
      return newSet
    })
  }

  // Filter teams and trends for chart based on active teams
  const activeTeams = useMemo(() => {
    return selectedTeams.filter(team => activeTeamIds.has(team.id))
  }, [selectedTeams, activeTeamIds])

  const filteredRevenueTrends = useMemo(() => {
    if (activeTeamIds.size === 0) return []

    return revenueTrends.map(point => {
      const filtered: typeof point = { month: point.month }
      activeTeamIds.forEach(teamId => {
        if (point[teamId] !== undefined) {
          filtered[teamId] = point[teamId]
        }
      })
      return filtered
    })
  }, [revenueTrends, activeTeamIds])

  // Loading state for initial load
  if (isLoading && availableTeams.length === 0) {
    return (
      <div className="gba:space-y-6" data-testid={DATA_TEST_ID_PREFIX}>
        <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  // Error state
  if (error && availableTeams.length === 0) {
    return (
      <div className="gba:space-y-6" data-testid={DATA_TEST_ID_PREFIX}>
        <Alert
          variant="destructive"
          title="Error loading teams"
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCwIcon className="gba:mr-2 gba:h-4 gba:w-4" />
              Retry
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid={DATA_TEST_ID_PREFIX}>
      {/* Filters Section */}
      <section
        className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4"
        data-testid={`${DATA_TEST_ID_PREFIX}-filters-section`}
      >
        <TeamSelector
          availableTeams={availableTeams}
          selectedTeamIds={selectedTeamIds}
          onSelectTeam={selectTeam}
          isLoading={isLoading}
          maxTeams={MAX_TEAMS}
        />
        <CurrencyFilter
          selectedCurrency={selectedCurrencyCode}
          currencies={currencies}
          onCurrencyChange={setSelectedCurrencyCode}
          isLoading={currenciesLoading}
        />
      </section>

      {/* Team Cards Section */}
      {selectedTeams.length > 0 && (
        <section data-testid={`${DATA_TEST_ID_PREFIX}-cards-section`}>
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:xl:grid-cols-4 gba:gap-4">
            {selectedTeams.map(team => (
              <TeamSelectionCard
                key={team.id}
                team={team}
                isActive={activeTeamIds.has(team.id)}
                onToggleActive={handleToggleTeamActive}
                onRemove={handleRemoveTeam}
              />
            ))}
          </div>
        </section>
      )}

      {/* Chart Section */}
      <section data-testid={`${DATA_TEST_ID_PREFIX}-chart-section`}>
        <TeamComparisonChart
          teams={activeTeams}
          revenueTrends={filteredRevenueTrends}
          isLoading={isLoadingTrends}
          error={error}
          onRetry={refetch}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          pipelines={pipelines}
          selectedPipelineId={selectedPipelineId}
          onPipelineChange={setSelectedPipelineId}
          pipelinesLoading={pipelinesLoading}
        />
      </section>
    </div>
  )
}

export default TeamsView
