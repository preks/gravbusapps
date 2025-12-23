import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  Spinner,
  Alert,
  AlertDescription,
  Button,
  IconAvatar,
  type ChartConfig
} from '@newwork/nw-design-system'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'
import { TargetIcon } from '@phosphor-icons/react'
import { type TeamComparisonData, TEAM_COLORS } from '../types'

interface TeamPerformanceRadarChartProps {
  teams: TeamComparisonData[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

const DATA_TEST_ID_PREFIX = 'team-performance-radar-chart'

// Radar chart metrics
const METRICS = [
  { key: 'winRate', label: 'Win Rate', unit: '%' },
  { key: 'revenue', label: 'Revenue', unit: '' },
  { key: 'dealsPerMember', label: 'Deals/Member', unit: '' },
  { key: 'winsPerMember', label: 'Wins/Member', unit: '' },
  { key: 'teamSize', label: 'Team Size', unit: '' }
] as const

interface RadarDataPoint {
  metric: string
  fullMark: number
  [teamId: string]: number | string
}

/**
 * Normalize a value to 0-100 scale based on max value
 */
const normalizeValue = (value: number, maxValue: number): number => {
  if (maxValue === 0) return 0
  return Math.round((value / maxValue) * 100)
}

/**
 * Custom tooltip for radar chart
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const metricLabel = payload[0]?.payload?.metric || ''
    return (
      <div className="gba:bg-popover gba:border gba:rounded-lg gba:p-3 gba:shadow-lg">
        <p className="gba:font-semibold gba:text-foreground gba:mb-2">{metricLabel}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
            <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="gba:text-muted-foreground">{entry.name}:</span>
            <span className="gba:font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

/**
 * Team Performance Radar Chart
 * Shows a spider/radar chart comparing multiple team metrics:
 * - Win Rate (percentage)
 * - Revenue (normalized against highest team)
 * - Deals per Member (normalized)
 * - Wins per Member (normalized)
 * - Team Size (normalized)
 *
 * Works well with 1 to 4 teams - with 1 team shows the team's "performance shape"
 */
export const TeamPerformanceRadarChart: React.FC<TeamPerformanceRadarChartProps> = ({
  teams,
  isLoading = false,
  error = null,
  onRetry
}) => {
  // Calculate derived metrics and prepare radar data
  const { radarData, chartConfig } = useMemo(() => {
    if (teams.length === 0) {
      return { radarData: [], chartConfig: {} as ChartConfig }
    }

    // Calculate raw metrics for each team
    // Use wonDealsCount for win-based metrics, dealsCount for total deals
    const teamMetrics = teams.map(team => {
      const dealsPerMember = team.memberCount > 0 ? team.dealsCount / team.memberCount : 0
      const winsPerMember = team.memberCount > 0 ? team.wonDealsCount / team.memberCount : 0

      return {
        id: team.id,
        name: team.name,
        color: team.color,
        winRate: team.winRate,
        revenue: team.revenue,
        dealsPerMember,
        winsPerMember,
        teamSize: team.memberCount
      }
    })

    // Find max values for normalization
    const maxRevenue = Math.max(...teamMetrics.map(t => t.revenue), 1)
    const maxDealsPerMember = Math.max(...teamMetrics.map(t => t.dealsPerMember), 1)
    const maxWinsPerMember = Math.max(...teamMetrics.map(t => t.winsPerMember), 1)
    const maxTeamSize = Math.max(...teamMetrics.map(t => t.teamSize), 1)

    // Build radar data (one object per metric, with each team's normalized value)
    const data: RadarDataPoint[] = METRICS.map(metric => {
      const point: RadarDataPoint = {
        metric: metric.label,
        fullMark: 100
      }

      teamMetrics.forEach(team => {
        let value: number
        switch (metric.key) {
          case 'winRate':
            // Win rate is already 0-100
            value = Math.round(team.winRate)
            break
          case 'revenue':
            value = normalizeValue(team.revenue, maxRevenue)
            break
          case 'dealsPerMember':
            value = normalizeValue(team.dealsPerMember, maxDealsPerMember)
            break
          case 'winsPerMember':
            value = normalizeValue(team.winsPerMember, maxWinsPerMember)
            break
          case 'teamSize':
            value = normalizeValue(team.teamSize, maxTeamSize)
            break
          default:
            value = 0
        }
        point[team.id] = value
      })

      return point
    })

    // Build chart config for legend colors
    const config: ChartConfig = {}
    teamMetrics.forEach(team => {
      config[team.id] = {
        label: team.name,
        color: team.color
      }
    })

    return { radarData: data, chartConfig: config }
  }, [teams])

  if (isLoading) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-loading`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={TargetIcon} variant="default" size="md" decorative />
            Team Performance Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:h-[350px]">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={TargetIcon} variant="default" size="md" decorative />
            Team Performance Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-[350px] gba:gap-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          {onRetry && (
            <Button size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (teams.length === 0) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-empty`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={TargetIcon} variant="default" size="md" decorative />
            Team Performance Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-[350px] gba:text-muted-foreground">
          <TargetIcon className="gba:h-12 gba:w-12 gba:mb-4" />
          <h3 className="gba:text-sm gba:font-medium">No teams selected</h3>
          <p className="gba:text-sm gba:mt-1">Select teams to view their performance profile.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={DATA_TEST_ID_PREFIX}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <IconAvatar icon={TargetIcon} variant="default" size="md" decorative />
          Team Performance Profile
          <span className="gba:text-sm gba:font-normal gba:text-muted-foreground">
            ({teams.length} team{teams.length > 1 ? 's' : ''})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:mx-auto gba:h-[300px] gba:w-full">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              dy={4}
            />
            <ChartTooltip content={<CustomTooltip />} />
            {teams.map((team, index) => (
              <Radar
                key={team.id}
                name={team.name}
                dataKey={team.id}
                stroke={TEAM_COLORS[index % TEAM_COLORS.length]}
                fill={TEAM_COLORS[index % TEAM_COLORS.length]}
                fillOpacity={teams.length === 1 ? 0.4 : 0.2}
                strokeWidth={2}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} className="gba:flex-wrap gba:gap-2 gba:justify-center" />
          </RadarChart>
        </ChartContainer>

        {/* Metrics explanation */}
        <div className="gba:mt-2 gba:pt-2 gba:border-t gba:text-xs gba:text-muted-foreground gba:text-center">
          Values are normalized to 0-100 scale for comparison (except Win Rate which shows actual %)
        </div>
      </CardContent>
    </Card>
  )
}

export default TeamPerformanceRadarChart
