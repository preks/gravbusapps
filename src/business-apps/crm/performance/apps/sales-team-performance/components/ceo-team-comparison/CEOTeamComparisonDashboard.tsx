import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import {
  CheckIcon,
  CaretUpDownIcon,
  TargetIcon,
  CurrencyDollarIcon,
  ChartLineIcon,
  RankingIcon,
  ArrowRightIcon,
  ListChecksIcon
} from '@phosphor-icons/react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { TeamInfo } from '../../types/userRoles'
import { useTeamPerformanceData } from '../../hooks/useTeamPerformanceData'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'

const DATA_TEST_ID_PREFIX = 'CEOTeamComparison'

interface CEOTeamComparisonDashboardProps extends BusinessAppContextProps {
  availableTeams: TeamInfo[]
  onTeamSelect?: (teamId: string, teamName: string, currency: string) => void
}

type ComparisonMetric = 'revenue' | 'winRate' | 'activities' | 'pipeline' | 'efficiency'

// Extract tooltip component to avoid inline definition
interface ComparisonChartTooltipProps {
  active?: boolean
  payload?: readonly any[]
  comparisonMetric: ComparisonMetric
  getMetricLabel: (metric: ComparisonMetric) => string
}

const ComparisonChartTooltip: React.FC<ComparisonChartTooltipProps> = ({
  active,
  payload,
  comparisonMetric,
  getMetricLabel
}) => {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  const teamKey = data.teamKey
  return (
    <div className="gba:bg-background gba:p-3 gba:border gba:border-border gba:rounded-lg gba:shadow-lg">
      <div className="gba:mb-2 gba:font-medium gba:text-foreground">{data.fullName || data.name}</div>
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
        <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: `var(--color-${teamKey})` }} />
        <span className="gba:font-medium">{getMetricLabel(comparisonMetric)}:</span>
        <span className="gba:font-semibold">{payload[0].value}</span>
      </div>
    </div>
  )
}

// Wrapper component to avoid inline function definition
const ChartTooltipWrapper: React.FC<ComparisonChartTooltipProps> = props => <ComparisonChartTooltip {...props} />

export const CEOTeamComparisonDashboard: React.FC<CEOTeamComparisonDashboardProps> = ({
  availableTeams,
  onTeamSelect,
  accessToken,
  userInfo
}) => {
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [comparisonMetric, setComparisonMetric] = useState<ComparisonMetric>('revenue')
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR')

  // Helper: Determine initial team selection
  const getInitialTeamSelection = useCallback((availableTeams: TeamInfo[], userInfo: any): string | null => {
    if (!availableTeams.length) return null

    const currentUserOrgUnitId = userInfo?.employeeDetails?.organizationalUnit?.id

    if (currentUserOrgUnitId) {
      const userTeam = availableTeams.find(team => team.id === currentUserOrgUnitId)
      return userTeam ? userTeam.id : availableTeams[0].id
    }

    console.warn('⚠️ No organizational unit found for user, defaulting to first team')
    return availableTeams[0].id
  }, [])

  // Initialize with current user's team selected by default
  useEffect(() => {
    if (availableTeams.length > 0 && selectedTeams.length === 0 && userInfo) {
      const initialTeamId = getInitialTeamSelection(availableTeams, userInfo)
      if (initialTeamId) {
        setSelectedTeams([initialTeamId])
      }
    }
  }, [availableTeams, userInfo, getInitialTeamSelection])

  // Prepare selected teams data for the hook
  const selectedTeamsData = useMemo(() => {
    return selectedTeams
      .map(teamId => {
        const team = availableTeams.find(t => t.id === teamId)
        return team // Return the full TeamInfo object since it now has memberIds
      })
      .filter(team => team?.memberIds && team.memberIds.length > 0) as TeamInfo[] // Only include teams with members
  }, [selectedTeams, availableTeams])

  // Fetch real team performance data
  const { teamsData, isLoading, error, refetch } = useTeamPerformanceData({
    accessToken,
    teams: selectedTeamsData,
    currencyCode: selectedCurrency
  })

  // Fetch all available currencies from catalog
  const [availableCurrencies, setAvailableCurrencies] = useState<Array<{ code: string; name: string }>>([])
  const catalogClient = useCatalogManagerClient(accessToken)

  // Helper: Fetch currencies from catalog
  const fetchCurrencies = useCallback(async () => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'Currency', version: 'v1' },
        { limit: 200, offset: 0, returnTotalRecords: true }
      )
      if (response?.data) {
        const currencies = response.data
          .map((entry: any) => ({
            code: entry.code || '',
            name: entry.value || ''
          }))
          .filter((c: any) => c.code)
        setAvailableCurrencies(currencies)
      }
    } catch (err) {
      console.error('Error fetching currencies:', err)
    }
  }, [catalogClient])

  useEffect(() => {
    if (accessToken) {
      void fetchCurrencies()
    }
  }, [accessToken, fetchCurrencies])

  // Dynamic chart configuration based on teams data
  const comparisonChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const team of teamsData) {
      const key = team.teamName.toLowerCase().split(/\s+/).join('')
      config[key] = { label: team.teamName }
    }
    return config
  }, [teamsData])

  // Use teams data directly without filtering
  const filteredTeamsData = teamsData

  // Handle team selection
  const handleTeamSelection = (teamId: string, checked: boolean) => {
    if (checked) {
      setSelectedTeams(prev => [...prev, teamId])
    } else {
      setSelectedTeams(prev => prev.filter(id => id !== teamId))
    }
  }

  // Create company-wide KPI widgets using latest SectionKpiCards style with 30-day comparisons
  const createCompanyKPIWidgets = (): WidgetItem[] => {
    if (teamsData.length === 0) return []

    const totalRevenue = teamsData.reduce((sum, team) => sum + team.totalRevenue, 0)
    const avgWinRate = teamsData.reduce((sum, team) => sum + team.winRate, 0) / teamsData.length
    const totalActivities = teamsData.reduce((sum, team) => sum + team.totalActivities, 0)
    const totalPipeline = teamsData.reduce((sum, team) => sum + team.pipelineValue, 0)

    // Calculate average percentage changes across all teams (30-day comparison)
    const avgRevenueChange = teamsData.reduce((sum, team) => sum + team.revenueChange, 0) / teamsData.length
    const avgWinRateChange = teamsData.reduce((sum, team) => sum + team.winRateChange, 0) / teamsData.length
    const avgActivitiesChange = teamsData.reduce((sum, team) => sum + team.activitiesChange, 0) / teamsData.length
    const avgPipelineChange = teamsData.reduce((sum, team) => sum + team.pipelineChange, 0) / teamsData.length

    // Calculate per-team averages for descriptions
    const avgRevenuePerTeam = totalRevenue / teamsData.length
    const avgPipelinePerTeam = totalPipeline / teamsData.length
    const avgActivitiesPerTeam = totalActivities / teamsData.length

    return [
      {
        key: 'company-revenue',
        title: `Total Revenue (${selectedCurrency})`,
        value: formatCurrency(totalRevenue, selectedCurrency),
        prefix: <CurrencyDollarIcon />,
        color: '#1890ff',
        description: `Avg per team: ${formatCurrency(avgRevenuePerTeam, selectedCurrency)}`,
        valueIsString: true,
        trend: {
          value: `${avgRevenueChange >= 0 ? '+' : ''}${avgRevenueChange.toFixed(1)}%`,
          positive: avgRevenueChange >= 0,
          description: 'vs. 30 days ago'
        }
      },
      {
        key: 'company-pipeline',
        title: `Pipeline Value (${selectedCurrency})`,
        value: formatCurrency(totalPipeline, selectedCurrency),
        prefix: <ChartLineIcon />,
        color: '#52c41a',
        description: `Avg per team: ${formatCurrency(avgPipelinePerTeam, selectedCurrency)}`,
        valueIsString: true,
        trend: {
          value: `${avgPipelineChange >= 0 ? '+' : ''}${avgPipelineChange.toFixed(1)}%`,
          positive: avgPipelineChange >= 0,
          description: 'vs. 30 days ago'
        }
      },
      {
        key: 'company-win-rate',
        title: 'Average Win Rate',
        value: Math.round(avgWinRate * 10) / 10,
        prefix: <TargetIcon />,
        color: '#722ed1',
        description: `Across ${teamsData.length} team${teamsData.length === 1 ? '' : 's'}`,
        precision: 1,
        suffix: '%',
        trend: {
          value: `${avgWinRateChange >= 0 ? '+' : ''}${avgWinRateChange.toFixed(1)}%`,
          positive: avgWinRateChange >= 0,
          description: 'vs. 30 days ago'
        }
      },
      {
        key: 'company-activities',
        title: 'Total Activities',
        value: totalActivities,
        prefix: <ListChecksIcon />,
        color: '#fa8c16',
        description: `Avg per team: ${Math.round(avgActivitiesPerTeam)}`,
        trend: {
          value: `${avgActivitiesChange >= 0 ? '+' : ''}${avgActivitiesChange.toFixed(1)}%`,
          positive: avgActivitiesChange >= 0,
          description: 'vs. 30 days ago'
        }
      }
    ]
  }

  // Prepare chart data using design system color variables
  const chartData = useMemo(() => {
    return teamsData.map(team => {
      const key = team.teamName.toLowerCase().split(/\s+/).join('')
      return {
        name: team.teamName.length > 15 ? team.teamName.substring(0, 12) + '...' : team.teamName,
        fullName: team.teamName,
        teamKey: key,
        revenue: team.totalRevenue / 1000,
        winRate: team.winRate,
        activities: team.totalActivities,
        pipeline: team.pipelineValue / 1000,
        efficiency: team.averageRevenuePerMember / 1000,
        fill: `var(--color-${key})`
      }
    })
  }, [teamsData])

  const getMetricLabel = (metric: ComparisonMetric): string => {
    switch (metric) {
      case 'revenue':
        return 'Revenue (K)'
      case 'winRate':
        return 'Win Rate (%)'
      case 'activities':
        return 'Activities'
      case 'pipeline':
        return 'Pipeline (K)'
      case 'efficiency':
        return 'Revenue per Member (K)'
      default:
        return 'Revenue (K)'
    }
  }

  // Enhanced activities chart data with dynamic colors
  if (error) {
    return (
      <div className="gba:p-6" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <Alert variant="destructive">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div>
              <div className="gba:font-medium">Error Loading Team Performance Data</div>
              <div className="gba:text-sm gba:mt-1">{error}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="gba:ml-2"
              data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
            >
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div
      className="gba:bg-linear-to-b gba:from-gray-50 gba:to-gray-100 gba:min-h-full gba:p-6 gba:rounded-lg"
      data-testid={DATA_TEST_ID_PREFIX}
    >
      {/* Currency Filter */}
      <div className="gba:flex gba:justify-end gba:items-center gba:mb-6" data-testid={`${DATA_TEST_ID_PREFIX}-header`}>
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:font-medium gba:text-gray-700">Currency:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                aria-haspopup="listbox"
                aria-expanded="false"
                className="gba:w-32 gba:h-8 gba:justify-between"
                data-testid={`${DATA_TEST_ID_PREFIX}-currency-filter`}
              >
                {selectedCurrency}
                <CaretUpDownIcon className="gba:ml-2 gba:h-4 gba:w-4 gba:shrink-0 gba:opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="gba:w-[280px] gba:p-0">
              <Command>
                <CommandInput placeholder="Search currency..." />
                <CommandEmpty>No currency found.</CommandEmpty>
                <CommandGroup className="gba:max-h-[200px] gba:overflow-y-auto">
                  {availableCurrencies.map(currency => (
                    <CommandItem
                      key={currency.code}
                      value={currency.code}
                      onSelect={() => {
                        setSelectedCurrency(currency.code)
                      }}
                    >
                      <CheckIcon
                        className={`gba:mr-2 gba:h-4 gba:w-4 gba:shrink-0 ${
                          selectedCurrency === currency.code ? 'gba:opacity-100' : 'gba:opacity-0'
                        }`}
                      />
                      <span className="gba:truncate">
                        {currency.code} - {currency.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Company Overview KPIs */}
      <div className="gba:mb-6" data-testid={`${DATA_TEST_ID_PREFIX}-kpi-section`}>
        <WidgetGroup
          widgets={createCompanyKPIWidgets()}
          isLoading={isLoading}
          error={error ? new Error(error) : null}
          onRetry={() => refetch()}
          skeletonCount={4}
          emptyText="No teams selected. Please select one or more teams to view performance statistics."
          data-testid={`${DATA_TEST_ID_PREFIX}-kpi-widgets`}
        />
      </div>

      {/* Team Selection & Controls */}
      <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-6">
        {/* Team Selection */}
        <Card data-testid={`${DATA_TEST_ID_PREFIX}-team-selection`}>
          <CardHeader>
            <CardTitle>Select Teams to Compare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-3 gba:max-h-48 gba:overflow-y-auto">
              {availableTeams.length > 0 ? (
                availableTeams.map(team => (
                  <div key={team.id} className="gba:flex gba:items-center gba:space-x-2">
                    <Checkbox
                      id={`team-${team.id}`}
                      checked={selectedTeams.includes(team.id)}
                      onCheckedChange={checked => handleTeamSelection(team.id, checked as boolean)}
                    />
                    <label
                      htmlFor={`team-${team.id}`}
                      className="gba:text-sm gba:font-medium gba:cursor-pointer gba:flex-1"
                    >
                      {team.name}
                      <span className="gba:text-gray-500 gba:ml-2">({team.memberCount} members)</span>
                    </label>
                  </div>
                ))
              ) : (
                <div className="gba:text-center gba:py-8">
                  <div className="gba:text-gray-500 gba:mb-2">No teams available</div>
                  <div className="gba:text-sm gba:text-gray-400">
                    Teams data integration is required to display sales teams for comparison.
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Comparison Chart */}
      {selectedTeams.length > 0 && (
        <Card className="gba:mt-6" data-testid={`${DATA_TEST_ID_PREFIX}-comparison-chart`}>
          <CardHeader>
            <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4">
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <ChartLineIcon className="gba:w-5 gba:h-5 gba:text-blue-600" />
                Team Performance Comparison - {getMetricLabel(comparisonMetric)}
              </CardTitle>
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">Metric:</span>
                <Select
                  value={comparisonMetric}
                  onValueChange={(value: ComparisonMetric) => setComparisonMetric(value)}
                >
                  <SelectTrigger className="gba:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Total Revenue</SelectItem>
                    <SelectItem value="winRate">Win Rate</SelectItem>
                    <SelectItem value="activities">Sales Activities</SelectItem>
                    <SelectItem value="pipeline">Pipeline Value</SelectItem>
                    <SelectItem value="efficiency">Revenue per Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              if (isLoading) {
                return (
                  <div className="gba:flex gba:justify-center gba:items-center" style={{ height: 400 }}>
                    <Spinner size="lg" />
                  </div>
                )
              }

              if (chartData.length === 0) {
                return (
                  <div
                    className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-12 gba:text-center"
                    style={{ height: 400 }}
                  >
                    <ChartLineIcon className="gba:w-16 gba:h-16 gba:text-muted-foreground gba:mb-4" />
                    <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-2">No Teams Selected</h3>
                    <p className="gba:text-sm gba:text-muted-foreground gba:max-w-md">
                      Select one or more teams from the selector above to view team performance comparison.
                    </p>
                  </div>
                )
              }

              return (
                <ChartContainer config={comparisonChartConfig} className="gba:h-[400px] gba:w-full">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip
                      content={
                        <ChartTooltipWrapper comparisonMetric={comparisonMetric} getMetricLabel={getMetricLabel} />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey={comparisonMetric === 'winRate' ? 'winRate' : comparisonMetric}
                      name={getMetricLabel(comparisonMetric)}
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map(entry => (
                        <Cell key={`cell-${entry.teamKey}`} fill={`var(--color-${entry.teamKey})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Team Performance Rankings Table */}
      <Card className="gba:mt-6" data-testid={`${DATA_TEST_ID_PREFIX}-performance-table`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <RankingIcon className="gba:w-5 gba:h-5 gba:text-blue-600" />
            Team Performance Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:p-0">
          {filteredTeamsData.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-12 gba:text-center">
              <RankingIcon className="gba:w-16 gba:h-16 gba:text-muted-foreground gba:mb-4" />
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-2">No Teams Selected</h3>
              <p className="gba:text-sm gba:text-muted-foreground gba:max-w-md">
                Select one or more teams from the selector above to view team performance rankings.
              </p>
            </div>
          ) : (
            <div className="gba:overflow-x-auto">
              <Table data-testid={`${DATA_TEST_ID_PREFIX}-rankings-table`}>
                <TableHeader>
                  <TableRow className="gba:border-b gba:bg-gray-50">
                    <TableHead className="gba:w-[80px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                      Rank
                    </TableHead>
                    <TableHead className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                      Team
                    </TableHead>
                    <TableHead className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                      Revenue ({selectedCurrency})
                    </TableHead>
                    <TableHead className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                      Win Rate
                    </TableHead>
                    <TableHead className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                      Activities
                    </TableHead>
                    <TableHead className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                      Pipeline ({selectedCurrency})
                    </TableHead>
                    <TableHead className="gba:w-[9%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeamsData.map(team => (
                    <TableRow
                      key={team.teamId}
                      className="gba:border-b gba:hover:bg-gray-50 gba:transition-colors"
                      data-testid={`${DATA_TEST_ID_PREFIX}-row-${team.teamId}`}
                    >
                      {/* Rank Column */}
                      <TableCell
                        className="gba:py-4 gba:px-6"
                        data-testid={`${DATA_TEST_ID_PREFIX}-rank-${team.teamId}`}
                      >
                        <div
                          className={`gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-sm gba:font-bold ${
                            team.ranking === 1
                              ? 'gba:bg-yellow-100 gba:text-yellow-800'
                              : team.ranking <= 3
                                ? 'gba:bg-blue-100 gba:text-blue-800'
                                : 'gba:bg-gray-100 gba:text-gray-600'
                          }`}
                        >
                          {team.ranking}
                        </div>
                      </TableCell>

                      {/* Team Column */}
                      <TableCell
                        className="gba:py-4 gba:px-6"
                        data-testid={`${DATA_TEST_ID_PREFIX}-team-${team.teamId}`}
                      >
                        <div>
                          <div className="gba:font-medium gba:text-gray-900">{team.teamName}</div>
                          <div className="gba:text-sm gba:text-gray-500">{team.memberCount} members</div>
                        </div>
                      </TableCell>

                      {/* Revenue Column */}
                      <TableCell
                        className="gba:py-4 gba:px-6 gba:font-medium gba:text-gray-900"
                        data-testid={`${DATA_TEST_ID_PREFIX}-revenue-${team.teamId}`}
                      >
                        {formatCurrency(team.totalRevenue, selectedCurrency)}
                      </TableCell>

                      {/* Win Rate Column */}
                      <TableCell
                        className="gba:py-4 gba:px-6 gba:text-gray-900"
                        data-testid={`${DATA_TEST_ID_PREFIX}-winrate-${team.teamId}`}
                      >
                        {team.winRate.toFixed(1)}%
                      </TableCell>

                      {/* Activities Column */}
                      <TableCell
                        className="gba:py-4 gba:px-6 gba:text-gray-900"
                        data-testid={`${DATA_TEST_ID_PREFIX}-activities-${team.teamId}`}
                      >
                        {team.totalActivities}
                      </TableCell>

                      {/* Pipeline Column */}
                      <TableCell
                        className="gba:py-4 gba:px-6 gba:text-gray-900"
                        data-testid={`${DATA_TEST_ID_PREFIX}-pipeline-${team.teamId}`}
                      >
                        {formatCurrency(team.pipelineValue, selectedCurrency)}
                      </TableCell>

                      {/* Actions Column */}
                      <TableCell
                        className="gba:py-4 gba:px-6"
                        data-testid={`${DATA_TEST_ID_PREFIX}-actions-${team.teamId}`}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onTeamSelect?.(team.teamId, team.teamName, selectedCurrency)}
                          data-testid={`${DATA_TEST_ID_PREFIX}-drill-down-${team.teamId}`}
                        >
                          View Details
                          <ArrowRightIcon className="gba:w-4 gba:h-4 gba:ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CEOTeamComparisonDashboard
