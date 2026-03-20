import React, { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  Alert,
  AlertTitle,
  AlertDescription,
  Button,
  Card,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@newwork/nw-design-system'
import { CampaignConversionFunnel } from '../../queries/CampaignAnalyticsQueries'
import { NW_CHART_COLOR_VARS, toChartConfigKey } from '@/business-apps/crm/campaigns/utils/campaignChartTokens'

interface CampaignConversionFunnelProps {
  funnelData: CampaignConversionFunnel | null
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

const CampaignConversionFunnelComponent: React.FC<CampaignConversionFunnelProps> = ({
  funnelData,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const stagesWithKeys = useMemo(() => {
    if (!funnelData?.stages?.length) return []
    const used = new Set<string>()
    return funnelData.stages.map((stage, index) => {
      let key = toChartConfigKey(stage.stage)
      if (used.has(key)) key = `${key}-${index}`
      used.add(key)
      return { ...stage, stageKey: key, fill: `var(--color-${key})` }
    })
  }, [funnelData?.stages])

  const funnelChartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {}
    stagesWithKeys.forEach((stage, index) => {
      config[stage.stageKey] = {
        label: stage.stage,
        color: NW_CHART_COLOR_VARS[index % NW_CHART_COLOR_VARS.length]
      }
    })
    return config
  }, [stagesWithKeys])

  if (isLoading) {
    return (
      <div className="gba:p-8 gba:text-center" data-testid="funnel-loading">
        <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-primary gba:mx-auto gba:mb-4"></div>
        <p className="gba:text-muted-foreground">Loading conversion funnel...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="funnel-error-alert">
        <AlertTitle>Error Loading Conversion Funnel</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        {onRetry && (
          <Button className="gba:mt-2" size="sm" onClick={onRetry} data-testid="funnel-retry-button">
            Retry
          </Button>
        )}
      </Alert>
    )
  }

  if (!funnelData?.stages || funnelData.stages.length === 0) {
    return (
      <div className="gba:p-8 gba:text-center gba:bg-muted">
        <p className="gba:text-muted-foreground">No conversion funnel data available.</p>
      </div>
    )
  }

  return (
    <Card className="gba:p-6" data-testid="campaign-conversion-funnel-container">
      <div className="gba:mb-6">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-2 gba:text-foreground">Conversion Funnel</h3>
        <p className="gba:text-sm gba:text-muted-foreground">Lead progression through the sales funnel</p>
      </div>

      <div className="gba:h-80 gba:mb-6">
        <ChartContainer config={funnelChartConfig} className="gba:h-80 gba:w-full">
          <BarChart data={stagesWithKeys} margin={{ top: 20, right: 30, left: 20, bottom: 80 }} maxBarSize={60}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
            <XAxis
              dataKey="stage"
              tick={{ fontSize: 12 }}
              stroke="var(--color-text-secondary)"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="var(--color-text-secondary)"
              tickFormatter={value => Math.floor(value).toString()}
              domain={[0, 'dataMax']}
              allowDecimals={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]} maxBarSize={60} />
          </BarChart>
        </ChartContainer>
      </div>

      <div
        className="gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-6 gba:gap-4"
        data-testid="funnel-kpi-cards"
      >
        {stagesWithKeys.map((stage, index) => (
          <div
            key={stage.stageKey}
            className="gba:text-center gba:p-4 gba:bg-muted gba:rounded-lg gba:border gba:border-border"
            data-testid={`funnel-kpi-${index}`}
          >
            <div className="gba:flex gba:items-center gba:justify-center gba:mb-2">
              <div
                className="gba:w-3 gba:h-3 gba:rounded-full gba:mr-2"
                style={{
                  backgroundColor: NW_CHART_COLOR_VARS[index % NW_CHART_COLOR_VARS.length]
                }}
              ></div>
              <h4 className="gba:text-sm gba:font-medium gba:text-foreground">{stage.stage}</h4>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-foreground">{stage.count.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default CampaignConversionFunnelComponent
