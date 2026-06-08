import React, { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis } from 'recharts'
import {
  Alert,
  AlertTitle,
  AlertDescription,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  Spinner,
  type ChartConfig
} from '@newwork/nw-design-system'
import { ChartBarIcon } from '@phosphor-icons/react'
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
  const chartCanvasClassName = 'gba:w-full gba:h-full gba:bg-muted gba:rounded-md gba:p-2'

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

  const kpiGridClassName = 'gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-6 gba:gap-4'

  const renderFunnelContent = () => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-80" data-testid="funnel-loading">
          <Spinner size="lg" />
        </div>
      )
    }

    if (!funnelData?.stages || funnelData.stages.length === 0) {
      return (
        <div className="gba:h-80 gba:flex gba:items-center gba:justify-center">
          <p className="gba:text-muted-foreground">No conversion funnel data available.</p>
        </div>
      )
    }

    return (
      <>
        <div className="gba:h-56 gba:mb-8">
          <h4 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-2">Lead progression by stage</h4>
          <ChartContainer config={funnelChartConfig} className={chartCanvasClassName}>
            <BarChart data={stagesWithKeys} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} maxBarSize={50}>
              <XAxis dataKey="stage" tick={{ fontSize: 10 }} height={40} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={value => Math.floor(value).toString()}
                domain={[0, 'dataMax']}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]} maxBarSize={60} />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className={`gba:mt-2 ${kpiGridClassName}`} data-testid="funnel-kpi-cards">
          {stagesWithKeys.map((stage, index) => (
            <div
              key={stage.stageKey}
              className="gba:text-center gba:p-4 gba:bg-secondary gba:rounded-lg gba:border gba:border-border gba:shadow-sm"
              data-testid={`funnel-kpi-${index}`}
            >
              <h4 className="gba:text-sm gba:font-medium gba:text-foreground">{stage.stage}</h4>
              <div className="gba:mt-2 gba:text-2xl gba:font-bold gba:text-foreground">
                {stage.count.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </>
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

  return (
    <Card className="gba:bg-muted" data-testid="campaign-conversion-funnel-container">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartBarIcon} variant="default" size="md" iconWeight="regular" decorative />
        <div>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Lead progression through the sales funnel</CardDescription>
        </div>
      </CardHeader>
      <CardContent>{renderFunnelContent()}</CardContent>
    </Card>
  )
}

export default CampaignConversionFunnelComponent
