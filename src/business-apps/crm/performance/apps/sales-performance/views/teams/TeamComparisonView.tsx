import React, { useState, useMemo, useEffect, useRef } from 'react'
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
import { ArrowClockwiseIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  TeamSelectionCard,
  TeamComparisonChart,
  TeamEntityCountsChart,
  TeamPerformanceRadarChart
} from '../../components'
import { useTeamComparison, usePipelines, useTeamEntityCounts, type CurrencyOption } from '../../hooks'
import { type TimeFilter, TEAM_COLORS } from '../../types'

interface TeamComparisonViewProps extends BusinessAppContextProps {
  currencies: CurrencyOption[]
  currenciesLoading: boolean
  selectedTeamIds: string[]
  onTeamSelectionChange: (teamIds: string[]) => void
  activeTeamIds: Set<string>
  onActiveTeamIdsChange: (activeIds: Set<string>) => void
  userTeamId?: string
}

const DATA_TEST_ID_PREFIX = 'sales-performance-teams-comparison'
const DEFAULT_CURRENCY = 'EUR'
const MAX_TEAMS = 4

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
  const selectableTeams = availableTeams.filter(team => !selectedTeamIds.includes(team.id))
  const isMaxReached = selectedTeamIds.length >= maxTeams

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap gba:flex gba:items-center gba:gap-2">
        <UsersThreeIcon className="gba:h-4 gba:w-4" />
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

export const TeamComparisonView: React.FC<TeamComparisonViewProps> = ({
  accessToken,
  currencies,
  currenciesLoading,
  selectedTeamIds,
  onTeamSelectionChange,
  activeTeamIds,
  onActiveTeamIdsChange,
  userTeamId
}) => {
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(DEFAULT_CURRENCY)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('sixMonths')
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(undefined)

  const { pipelines, isLoading: pipelinesLoading } = usePipelines(accessToken)

  const selectedCurrencyId = useMemo(() => {
    const currency = currencies.find(c => c.code === selectedCurrencyCode)
    if (currency) return currency.id

    const eurCurrency = currencies.find(c => c.code === DEFAULT_CURRENCY)
    if (eurCurrency) return eurCurrency.id

    return currencies[0]?.id
  }, [selectedCurrencyCode, currencies])

  const {
    availableTeams,
    selectedTeams,
    revenueTrends,
    isLoading,
    isLoadingTrends,
    error,
    selectTeam,
    deselectTeam,
    refetch,
    teamsData
  } = useTeamComparison(
    accessToken,
    timeFilter,
    selectedCurrencyId,
    selectedCurrencyCode,
    selectedPipelineId,
    MAX_TEAMS,
    selectedTeamIds,
    onTeamSelectionChange,
    userTeamId
  )

  const teamsDataForEntityCounts = useMemo(() => {
    return selectedTeamIds.map((teamId, index) => {
      const team = teamsData.find(t => t.id === teamId)
      return {
        id: teamId,
        name: team?.name || 'Unknown Team',
        memberIds: team?.organizationalUnitEmployee.filter(e => e.employee).map(e => e.employeeId) || [],
        color: TEAM_COLORS[index % TEAM_COLORS.length]
      }
    })
  }, [selectedTeamIds, teamsData])

  const {
    entityCounts,
    isLoading: isLoadingEntityCounts,
    error: entityCountsError,
    refetch: refetchEntityCounts
  } = useTeamEntityCounts(accessToken, teamsDataForEntityCounts)

  const prevSelectedTeamIdsRef = useRef<string[]>([])

  useEffect(() => {
    const prevIds = prevSelectedTeamIdsRef.current
    const currentIds = selectedTeamIds

    const addedTeams = currentIds.filter(id => !prevIds.includes(id))
    const removedTeams = prevIds.filter(id => !currentIds.includes(id))

    if (addedTeams.length > 0 || removedTeams.length > 0) {
      const newSet = new Set(activeTeamIds)

      addedTeams.forEach(id => newSet.add(id))
      removedTeams.forEach(id => newSet.delete(id))

      onActiveTeamIdsChange(newSet)
    }

    prevSelectedTeamIdsRef.current = currentIds
  }, [selectedTeamIds, activeTeamIds, onActiveTeamIdsChange])

  const handleToggleTeamActive = (teamId: string) => {
    const newSet = new Set(activeTeamIds)
    if (newSet.has(teamId)) {
      newSet.delete(teamId)
    } else {
      newSet.add(teamId)
    }
    onActiveTeamIdsChange(newSet)
  }

  const handleRemoveTeam = (teamId: string) => {
    deselectTeam(teamId)
    const newSet = new Set(activeTeamIds)
    newSet.delete(teamId)
    onActiveTeamIdsChange(newSet)
  }

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

  if (isLoading && availableTeams.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error && availableTeams.length === 0) {
    return (
      <Alert
        variant="destructive"
        title="Error loading teams"
        description={error}
        action={
          <Button variant="outline" size="sm" onClick={refetch}>
            <ArrowClockwiseIcon className="gba:mr-2 gba:h-4 gba:w-4" />
            Retry
          </Button>
        }
      />
    )
  }

  return (
    <div className="gba:space-y-6" data-testid={DATA_TEST_ID_PREFIX}>
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

      <section
        className="gba:grid gba:grid-cols-1 gba:xl:grid-cols-2 gba:gap-6"
        data-testid={`${DATA_TEST_ID_PREFIX}-metrics-section`}
      >
        <TeamPerformanceRadarChart teams={activeTeams} isLoading={isLoadingTrends} error={error} onRetry={refetch} />
        <TeamEntityCountsChart
          teams={activeTeams}
          entityCounts={entityCounts}
          isLoading={isLoadingEntityCounts}
          error={entityCountsError}
          onRetry={refetchEntityCounts}
        />
      </section>
    </div>
  )
}

export default TeamComparisonView
