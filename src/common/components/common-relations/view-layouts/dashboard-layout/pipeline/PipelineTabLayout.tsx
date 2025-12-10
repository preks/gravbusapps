import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { PipelineStatistics, PipelineStatisticsMetrics } from './widgets/PipelineStatistics'
import { OpportunityFunnel, OpportunityFunnelData } from './widgets/OpportunityFunnel'
import { ConversionPerformance, WinRateMetrics } from './widgets/ConversionPerformance'
import { ActivityVolume, ActivityVolumeMetrics } from './widgets/ActivityVolume'
import { PerformanceLeaderboard, SalesRepPerformance } from './widgets/PerformanceLeaderboard'
import { CurrencyFilter } from '@/business-apps/irm/investments/apps/investment-management/views/analytics-view/shared/components/CurrencyFilter'

export interface PipelineTabLayoutProps {
  moduleColor?: string
  headerLeft?: React.ReactNode // Optional header content (e.g., icon/title) if needed

  // Pipeline selector ownership here
  pipelines?: Array<{ id: string; name: string }>
  selectedPipelineId?: string
  onPipelineChange?: (pipelineId: string) => void
  pipelineHeaderBadges?: { label: string; variant?: 'default' | 'secondary' | 'outline' }[]
  pipelineTitle?: string
  pipelineDescription?: string

  // Currency filter props
  availableCurrencies?: string[]
  selectedCurrency?: string
  onCurrencyChange?: (currency: string) => void

  // Data props for widgets
  pipelineId: string
  metrics: PipelineStatisticsMetrics
  funnelData: OpportunityFunnelData[]
  winRateMetrics: WinRateMetrics
  activityVolume: ActivityVolumeMetrics
  leaderboard: SalesRepPerformance[]
}

export const PipelineTabLayout: React.FC<PipelineTabLayoutProps> = ({
  moduleColor: _moduleColor = 'default',
  headerLeft,
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  pipelineHeaderBadges,
  pipelineTitle,
  pipelineDescription,
  availableCurrencies,
  selectedCurrency,
  onCurrencyChange,
  pipelineId,
  metrics,
  funnelData,
  winRateMetrics,
  activityVolume,
  leaderboard
}) => {
  // _moduleColor is available for future use in styling
  void _moduleColor
  return (
    <div className="gba:space-y-6">
      {/* Pipeline Header */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:flex-col lg:gba:flex-row gba:justify-between gba:items-start lg:gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-4">
              {headerLeft}
              <div className="gba:flex gba:items-center gba:gap-3">
                <div>
                  <CardTitle className="gba:text-gray-900">{pipelineTitle}</CardTitle>
                  {pipelineDescription && (
                    <p className="gba:text-gray-600 gba:text-sm gba:mt-1">{pipelineDescription}</p>
                  )}
                </div>
                {pipelines && pipelines.length > 1 && onPipelineChange && (
                  <Select value={selectedPipelineId} onValueChange={onPipelineChange}>
                    <SelectTrigger className="gba:w-48" data-testid="pipeline-selector">
                      <SelectValue placeholder="Select pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelines.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-blue-500" />
                            <span>{p.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-3 gba:items-center">
              {/* Currency Filter */}
              {availableCurrencies && availableCurrencies.length > 1 && onCurrencyChange && selectedCurrency && (
                <CurrencyFilter
                  value={selectedCurrency}
                  onChange={onCurrencyChange}
                  currencies={availableCurrencies}
                  dataTestId="pipeline-currency-filter"
                />
              )}
              {/* Badges */}
              {pipelineHeaderBadges &&
                pipelineHeaderBadges.length > 0 &&
                pipelineHeaderBadges.map((b, idx) => (
                  <Badge key={idx} variant={b.variant || 'secondary'} className="gba:px-3 gba:py-1">
                    {b.label}
                  </Badge>
                ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Overview Grid */}
      <PipelineStatistics pipelineId={pipelineId} metrics={metrics} currency={selectedCurrency} />

      {/* Main Components Grid */}
      <div className="gba:grid gba:grid-cols-1 gba:xl:grid-cols-2 gba:gap-6">
        {/* Left Column */}
        <div className="gba:space-y-6">
          <OpportunityFunnel funnelData={funnelData} pipelineId={pipelineId} currency={selectedCurrency} />
          <ConversionPerformance winRateMetrics={winRateMetrics} pipelineId={pipelineId} />
        </div>

        {/* Right Column */}
        <div className="gba:space-y-6">
          <ActivityVolume activityVolume={activityVolume} pipelineId={pipelineId} />
          <PerformanceLeaderboard leaderboard={leaderboard} pipelineId={pipelineId} currency={selectedCurrency} />
        </div>
      </div>
    </div>
  )
}

export default PipelineTabLayout
