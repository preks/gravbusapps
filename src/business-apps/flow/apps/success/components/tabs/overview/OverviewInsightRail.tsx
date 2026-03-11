import React from 'react'
import { Card, CardContent, CardDescription, CardTitle, useTranslation } from '@newwork/nw-design-system'
import { TrendingUp } from 'lucide-react'
import translations from '../../../_i18n'
import { SystemTaskReliabilityPanel, SuccessEmptyState, SuccessSectionCardHeader } from '../../shared'
import { formatHoursDuration } from '../../../utils/formatters'
import type { SystemTaskReliabilityData } from '../../../hooks/useSystemTaskReliability'

interface OverviewHotspotItem {
  flow_id?: string
  flow_name: string
  step_name?: string
  cycle_time_hours?: number
  avg_cycle_hours?: number
}

interface OverviewInsightRailProps {
  hotspots: OverviewHotspotItem[]
  systemReliability: SystemTaskReliabilityData | null
  isReliabilityLoading?: boolean
  'data-testid'?: string
}

export const OverviewInsightRail: React.FC<OverviewInsightRailProps> = ({
  hotspots,
  systemReliability,
  isReliabilityLoading = false,
  'data-testid': testId = 'flow-success-overview-insight-rail'
}) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:flex gba:flex-col gba:gap-6" data-testid={testId}>
      <Card className="gba:border-border gba:bg-card" id="optimization-hotspots">
        <SuccessSectionCardHeader>
          <CardTitle>{t('overview-hotspots-title')}</CardTitle>
          <CardDescription>{t('overview-hotspots-description')}</CardDescription>
        </SuccessSectionCardHeader>
        <CardContent className="gba:flex gba:flex-col gba:gap-3 gba:p-5">
          {hotspots.length ? (
            hotspots.map(flow => (
              <div
                key={`${flow.flow_id || flow.flow_name}-${flow.step_name || 'step'}`}
                className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4"
              >
                <div className="gba:flex gba:flex-col gba:gap-1">
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">{flow.flow_name}</span>
                  <span className="gba:text-xs gba:text-muted-foreground">{flow.step_name || flow.flow_id}</span>
                </div>
                <span className="gba:text-sm gba:font-medium gba:text-foreground">
                  {formatHoursDuration(flow.cycle_time_hours ?? flow.avg_cycle_hours)}
                </span>
              </div>
            ))
          ) : (
            <SuccessEmptyState
              title={t('state-empty')}
              description={t('overview-hotspots-description')}
              icon={<TrendingUp className="gba:h-8 gba:w-8" />}
            />
          )}
        </CardContent>
      </Card>

      <div id="overview-system-reliability">
        <SystemTaskReliabilityPanel
          title={t('system-reliability-title')}
          description={t('system-reliability-overview-description')}
          data={systemReliability}
          isLoading={isReliabilityLoading}
          maxRows={4}
          data-testid={`${testId}-system-reliability`}
        />
      </div>
    </div>
  )
}
