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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartBarIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import { ChartEmptyOverlay } from '../shared/ChartEmptyOverlay'
import { ChartCardHeader } from '../shared/ChartCardHeader'
import { PipelineFilterControls } from '../shared/PipelineFilterControls'
import { formatAxisCurrency, formatTooltipCurrency } from '../shared/chartFormatters'
import { CHART_HEIGHT_CLASS, CHART_MARGIN, Y_AXIS_WIDTH, getYAxisDomain } from '../shared/chartLayoutConstants'
import { useOpenPipelineByStage } from './hooks/useOpenPipelineByStage'
import type { OpenPipelineByStageChartProps } from './types'

const DATA_TEST_ID_PREFIX = 'OpenPipelineByStageChart'

export const OpenPipelineByStageChart: React.FC<OpenPipelineByStageChartProps> = ({
  accessToken,
  teamMemberIds,
  currencyCode
}) => {
  const {
    stageData,
    pipelines,
    pipelinesLoading,
    selectedPipelineId,
    setSelectedPipelineId,
    isLoading,
    error,
    refetch
  } = useOpenPipelineByStage({ accessToken, teamMemberIds, currencyCode })

  const chartData = useMemo(
    () =>
      stageData.map(stage => ({
        stageKey: stage.stageId,
        stageLabel: stage.stageName,
        count: stage.count,
        value: stage.value
      })),
    [stageData]
  )

  const chartConfig = useMemo(
    () => ({
      value: { label: 'Pipeline Value', color: 'var(--nw-chart-2)' }
    }),
    []
  )

  const yAxisDomain = useMemo(() => getYAxisDomain(chartData.map(stage => stage.value)), [chartData])
  const hasValues = chartData.some(stage => stage.value > 0 || stage.count > 0)
  const showChart = !isLoading || chartData.length > 0

  return (
    <Card data-testid={DATA_TEST_ID_PREFIX}>
      <CardHeader>
        <ChartCardHeader
          icon={ChartBarIcon}
          title="Pipeline by Stage"
          controls={
            <PipelineFilterControls
              pipelines={pipelines}
              selectedPipelineId={selectedPipelineId}
              onPipelineChange={setSelectedPipelineId}
              isLoading={pipelinesLoading}
              testIdPrefix={DATA_TEST_ID_PREFIX}
            />
          }
        />
      </CardHeader>
      <CardContent>
        {isLoading && chartData.length === 0 ? (
          <div className={`gba:flex gba:items-center gba:justify-center ${CHART_HEIGHT_CLASS}`}>
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {error && (
              <div className="gba:mb-4 gba:flex gba:items-center gba:justify-between gba:gap-4">
                <Alert variant="destructive" title="Error loading pipeline by stage" description={error} />
                <Button variant="outline" size="sm" onClick={refetch} data-testid={`${DATA_TEST_ID_PREFIX}-retry`}>
                  <ArrowClockwiseIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                  Retry
                </Button>
              </div>
            )}
            {showChart && (
              <div className="gba:relative">
                <ChartContainer config={chartConfig} className={CHART_HEIGHT_CLASS}>
                  <BarChart data={chartData} layout="vertical" margin={{ ...CHART_MARGIN, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      domain={yAxisDomain}
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={value => formatAxisCurrency(Number(value), currencyCode)}
                    />
                    <YAxis
                      type="category"
                      dataKey="stageLabel"
                      width={Y_AXIS_WIDTH + 24}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, _name, item) => {
                            const count = item?.payload?.count ?? 0
                            return `${formatTooltipCurrency(Number(value), currencyCode)} (${count} open)`
                          }}
                        />
                      }
                    />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
                {!hasValues && chartData.length > 0 && (
                  <ChartEmptyOverlay
                    icon={ChartBarIcon}
                    title="No data available"
                    description="No open opportunities found in this pipeline for the team."
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

export default OpenPipelineByStageChart
