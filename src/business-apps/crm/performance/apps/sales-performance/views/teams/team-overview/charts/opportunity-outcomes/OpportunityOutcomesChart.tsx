import React, { useCallback, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  Spinner,
  Alert,
  Button
} from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartBarIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import type { TimeFilter } from '../../../../../types'
import { ChartEmptyOverlay } from '../shared/ChartEmptyOverlay'
import { ChartCardHeader } from '../shared/ChartCardHeader'
import { TimeFilterControls } from '../shared/TimeFilterControls'
import { formatTrendPeriodAxisLabel } from '../shared/chartPeriodFormatting'
import { CHART_HEIGHT_CLASS, CHART_MARGIN, Y_AXIS_WIDTH, getYAxisDomain } from '../shared/chartLayoutConstants'
import { useOpportunityOutcomes } from './hooks/useOpportunityOutcomes'
import type { OpportunityOutcomesChartProps } from './types'

const DATA_TEST_ID_PREFIX = 'OpportunityOutcomesChart'

export const OpportunityOutcomesChart: React.FC<OpportunityOutcomesChartProps> = ({
  accessToken,
  teamMemberIds,
  currencyCode
}) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('sixMonths')
  const { outcomesTrend, isLoading, error, refetch } = useOpportunityOutcomes({
    accessToken,
    teamMemberIds,
    currencyCode,
    timeFilter
  })

  const chartConfig = useMemo(
    () => ({
      wonCount: { label: 'Won', color: 'var(--nw-chart-1)' },
      lostCount: { label: 'Lost', color: 'var(--nw-chart-5)' }
    }),
    []
  )

  const formatTrendXAxisLabel = useCallback(
    (value: string) => formatTrendPeriodAxisLabel(value, timeFilter, outcomesTrend),
    [timeFilter, outcomesTrend]
  )

  const yAxisDomain = useMemo(
    () => getYAxisDomain(outcomesTrend.map(point => point.wonCount + point.lostCount)),
    [outcomesTrend]
  )
  const hasValues = outcomesTrend.some(point => point.wonCount > 0 || point.lostCount > 0)
  const showChart = !isLoading || outcomesTrend.length > 0

  return (
    <Card data-testid={DATA_TEST_ID_PREFIX}>
      <CardHeader>
        <ChartCardHeader
          icon={ChartBarIcon}
          title="Opportunity Outcomes"
          controls={
            <TimeFilterControls
              selectedTimeFilter={timeFilter}
              onTimeFilterChange={setTimeFilter}
              testIdPrefix={DATA_TEST_ID_PREFIX}
            />
          }
        />
      </CardHeader>
      <CardContent>
        {isLoading && outcomesTrend.length === 0 ? (
          <div className={`gba:flex gba:items-center gba:justify-center ${CHART_HEIGHT_CLASS}`}>
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {error && (
              <div className="gba:mb-4 gba:flex gba:items-center gba:justify-between gba:gap-4">
                <Alert variant="destructive" title="Error loading opportunity outcomes" description={error} />
                <Button variant="outline" size="sm" onClick={refetch} data-testid={`${DATA_TEST_ID_PREFIX}-retry`}>
                  <ArrowClockwiseIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                  Retry
                </Button>
              </div>
            )}
            {showChart && (
              <div className="gba:relative">
                <ChartContainer config={chartConfig} className={CHART_HEIGHT_CLASS}>
                  <BarChart data={outcomesTrend} margin={CHART_MARGIN}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="periodLabel"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={formatTrendXAxisLabel}
                    />
                    <YAxis
                      width={Y_AXIS_WIDTH}
                      tickLine={false}
                      axisLine={false}
                      domain={yAxisDomain}
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="wonCount"
                      stackId="outcomes"
                      fill="var(--color-wonCount)"
                      radius={[0, 0, 0, 0]}
                      name="Won"
                    />
                    <Bar
                      dataKey="lostCount"
                      stackId="outcomes"
                      fill="var(--color-lostCount)"
                      radius={[4, 4, 0, 0]}
                      name="Lost"
                    />
                  </BarChart>
                </ChartContainer>
                {!hasValues && outcomesTrend.length > 0 && (
                  <ChartEmptyOverlay
                    icon={ChartBarIcon}
                    title="No data available"
                    description="No won or lost opportunities found for the selected time period."
                    testId={`${DATA_TEST_ID_PREFIX}-empty-overlay`}
                  />
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default OpportunityOutcomesChart
