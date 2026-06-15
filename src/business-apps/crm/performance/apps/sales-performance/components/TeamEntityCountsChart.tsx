import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Spinner,
  Alert,
  AlertDescription,
  Button,
  IconAvatar
} from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartBarIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import { type TeamComparisonData, type TeamEntityCountsPoint } from '../types'
import { getComparisonChartLabels, type ComparisonChartVariant } from '../utils/comparisonChartLabels'
import { ComparisonChartLegend } from './ComparisonChartLegend'

interface TeamEntityCountsChartProps {
  teams: TeamComparisonData[]
  entityCounts: TeamEntityCountsPoint[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  variant?: ComparisonChartVariant
}

const DATA_TEST_ID_PREFIX = 'team-entity-counts-chart'

/**
 * Team Entity Counts Chart Component
 * Displays a grouped bar chart comparing entity counts (leads, opportunities, accounts, contacts)
 * across active teams
 */
export const TeamEntityCountsChart: React.FC<TeamEntityCountsChartProps> = ({
  teams,
  entityCounts,
  isLoading = false,
  error = null,
  onRetry,
  variant = 'team'
}) => {
  const labels = getComparisonChartLabels(variant)

  // Build chart config from teams
  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {}

    teams.forEach(team => {
      config[team.id] = {
        label: team.name,
        color: team.color
      }
    })

    return config
  }, [teams])

  // Loading state
  if (isLoading) {
    return (
      <Card data-testid={DATA_TEST_ID_PREFIX}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartBarIcon} variant="success" size="md" decorative />
            {labels.entityCountsTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:h-[350px]">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card data-testid={DATA_TEST_ID_PREFIX}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartBarIcon} variant="success" size="md" decorative />
            {labels.entityCountsTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-[350px] gba:gap-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <ArrowClockwiseIcon className="gba:mr-2 gba:h-4 gba:w-4" />
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={DATA_TEST_ID_PREFIX}>
      <CardHeader>
        <div className="gba:flex gba:flex-col gba:gap-2">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartBarIcon} variant="success" size="md" decorative />
            {labels.entityCountsTitle}
          </CardTitle>
          <p className="gba:text-sm gba:text-muted-foreground">{labels.entityCountsDescription}</p>
        </div>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-[350px] gba:gap-2">
            <p className="gba:text-muted-foreground gba:text-center">{labels.entityCountsEmptyMessage}</p>
            <p className="gba:text-sm gba:text-muted-foreground gba:text-center">{labels.entityCountsEmptyHint}</p>
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="gba:h-[320px] gba:w-full">
              <BarChart data={entityCounts} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="entity"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent className="gba:min-w-48" />} />
                {teams.map(team => (
                  <Bar
                    key={team.id}
                    dataKey={team.id}
                    name={team.name}
                    fill={team.color}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={teams.length > 4 ? 12 : 24}
                  />
                ))}
              </BarChart>
            </ChartContainer>
            <ComparisonChartLegend
              items={teams.map(team => ({ id: team.id, name: team.name, color: team.color }))}
              dataTestId={`${DATA_TEST_ID_PREFIX}-legend`}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default TeamEntityCountsChart
