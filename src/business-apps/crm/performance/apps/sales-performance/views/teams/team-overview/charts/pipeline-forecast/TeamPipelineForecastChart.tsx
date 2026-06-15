import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Spinner,
  Alert,
  Button
} from '@newwork/nw-design-system'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { TrendUpIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import { ChartEmptyOverlay } from '../shared/ChartEmptyOverlay'
import { ChartCardHeader } from '../shared/ChartCardHeader'
import { PipelineFilterControls } from '../shared/PipelineFilterControls'
import { formatAxisCurrency, formatTooltipCurrency } from '../shared/chartFormatters'
import { CHART_HEIGHT_CLASS, CHART_MARGIN, Y_AXIS_WIDTH, getYAxisDomain } from '../shared/chartLayoutConstants'
import { useTeamPipelineForecast } from './hooks/useTeamPipelineForecast'
import type { PipelineForecastChartProps } from './types'

const DATA_TEST_ID_PREFIX = 'TeamPipelineForecastChart'

export const TeamPipelineForecastChart: React.FC<PipelineForecastChartProps> = ({
  accessToken,
  teamMemberIds,
  currencyCode
}) => {
  const {
    forecastData,
    pipelines,
    pipelinesLoading,
    selectedPipelineId,
    setSelectedPipelineId,
    isLoading,
    error,
    refetch
  } = useTeamPipelineForecast({ accessToken, teamMemberIds, currencyCode })

  const chartConfig = useMemo(
    () => ({
      forecastedRevenue: { label: 'Forecasted Revenue', color: 'var(--nw-chart-3)' }
    }),
    []
  )

  const yAxisDomain = useMemo(() => getYAxisDomain(forecastData.map(point => point.forecastedRevenue)), [forecastData])
  const hasValues = forecastData.some(point => point.forecastedRevenue > 0)
  const showChart = !isLoading || forecastData.length > 0

  return (
    <Card data-testid={DATA_TEST_ID_PREFIX}>
      <CardHeader>
        <ChartCardHeader
          icon={TrendUpIcon}
          title="Pipeline Forecast"
          controls={
            <PipelineFilterControls
              pipelines={pipelines}
              selectedPipelineId={selectedPipelineId}
              onPipelineChange={setSelectedPipelineId}
              isLoading={pipelinesLoading}
              includeAllOption
              testIdPrefix={DATA_TEST_ID_PREFIX}
            />
          }
        />
      </CardHeader>
      <CardContent>
        {isLoading && forecastData.length === 0 ? (
          <div className={`gba:flex gba:items-center gba:justify-center ${CHART_HEIGHT_CLASS}`}>
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {error && (
              <div className="gba:mb-4 gba:flex gba:items-center gba:justify-between gba:gap-4">
                <Alert variant="destructive" title="Error loading pipeline forecast" description={error} />
                <Button variant="outline" size="sm" onClick={refetch} data-testid={`${DATA_TEST_ID_PREFIX}-retry`}>
                  <ArrowClockwiseIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                  Retry
                </Button>
              </div>
            )}
            {showChart && (
              <div className="gba:relative">
                <ChartContainer config={chartConfig} className={CHART_HEIGHT_CLASS}>
                  <AreaChart data={forecastData} margin={CHART_MARGIN}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      width={Y_AXIS_WIDTH}
                      tickLine={false}
                      axisLine={false}
                      domain={yAxisDomain}
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={value => formatAxisCurrency(Number(value), currencyCode)}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          className="gba:min-w-48"
                          formatter={(value, _name, item) => {
                            const count = item?.payload?.opportunityCount ?? 0
                            return `${formatTooltipCurrency(Number(value), currencyCode)} (${count} opps)`
                          }}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="forecastedRevenue"
                      fill="var(--color-forecastedRevenue)"
                      fillOpacity={hasValues ? 0.2 : 0}
                      stroke="var(--color-forecastedRevenue)"
                      strokeWidth={2}
                      name="Forecasted Revenue"
                      dot={hasValues ? { r: 3 } : false}
                      activeDot={hasValues ? { r: 5 } : false}
                    />
                  </AreaChart>
                </ChartContainer>
                {!hasValues && forecastData.length > 0 && (
                  <ChartEmptyOverlay
                    icon={TrendUpIcon}
                    title="No data available"
                    description="No open opportunities with close dates in the next 3 months."
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

export default TeamPipelineForecastChart
