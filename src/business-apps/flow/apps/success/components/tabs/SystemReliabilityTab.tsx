import React, { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardTitle, useTranslation } from '@newwork/nw-design-system'
import { AlertTriangle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from '../../_i18n'
import { useSystemTaskReliability } from '../../hooks/useSystemTaskReliability'
import { type FlowSuccessDrilldownTarget } from '../../shellState'
import { type SuccessTimeframe, getSuccessTimeframeOptions } from '../../utils/timeframe'
import {
  SuccessEmptyState,
  SuccessErrorState,
  SuccessSectionCardHeader,
  SuccessTabPage,
  SuccessTimeframeSelect,
  SystemTaskReliabilityPanel
} from '../shared'
import { TrendsReliabilityCharts } from './trends/TrendsReliabilityCharts'

interface SystemReliabilityTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  timeframe?: SuccessTimeframe
  onTimeframeChange?: (timeframe: SuccessTimeframe) => void
  templateId?: string
  showControls?: boolean
  section?: string
  onDrilldown?: (target: FlowSuccessDrilldownTarget) => void
  headerActions?: React.ReactNode
}

export const SystemReliabilityTab: React.FC<SystemReliabilityTabProps> = ({
  prefixDataTestId = 'system-reliability-tab',
  accessToken,
  timeframe = 'mtd',
  onTimeframeChange,
  templateId,
  showControls = true,
  section,
  headerActions
}) => {
  const { t } = useTranslation(translations)
  const { data, isLoading, error, refetch } = useSystemTaskReliability({
    accessToken,
    timeframe,
    templateId: templateId && templateId !== 'ALL' ? templateId : undefined
  })

  useEffect(() => {
    if (!section) return
    const element = document.getElementById(section)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [section])

  return (
    <SuccessTabPage
      title={t('operations-subview-reliability')}
      description={t('system-reliability-workspace-description')}
      actions={
        showControls || headerActions ? (
          <>
            {showControls ? (
              <SuccessTimeframeSelect
                value={timeframe}
                onChange={value => onTimeframeChange?.(value)}
                options={getSuccessTimeframeOptions(t)}
                data-testid={`${prefixDataTestId}-timeframe-select`}
              />
            ) : null}
            {headerActions}
          </>
        ) : undefined
      }
      data-testid={prefixDataTestId}
    >
      {error ? (
        <SuccessErrorState
          title={t('state-error-title')}
          message={error.message}
          onRetry={refetch}
          retryLabel={t('action-retry')}
          data-testid={`${prefixDataTestId}-error`}
        />
      ) : null}

      <div id="system-summary">
        <SystemTaskReliabilityPanel
          title={t('system-reliability-title')}
          description={t('system-reliability-tasks-description')}
          data={data}
          isLoading={isLoading}
          data-testid={`${prefixDataTestId}-summary`}
        />
      </div>

      <Card className="gba:border-border gba:bg-card" id="system-timeseries">
        <SuccessSectionCardHeader>
          <CardTitle>{t('system-reliability-trend-title')}</CardTitle>
          <CardDescription>{t('system-reliability-trend-description')}</CardDescription>
        </SuccessSectionCardHeader>
        <CardContent className="gba:p-5">
          <TrendsReliabilityCharts
            data={data?.timeSeries || []}
            emptyTitle={t('state-empty')}
            emptyDescription={t('system-reliability-trend-description')}
            successRateLabel={t('system-reliability-success-rate')}
            failuresLabel={t('system-reliability-failures')}
            timeoutsLabel={t('system-reliability-timeouts')}
            data-testid={`${prefixDataTestId}-timeseries-chart`}
          />
        </CardContent>
      </Card>

      <Card className="gba:border-border gba:bg-card" id="system-errors">
        <SuccessSectionCardHeader>
          <CardTitle>{t('system-reliability-top-errors-title')}</CardTitle>
          <CardDescription>{t('system-reliability-top-errors-description')}</CardDescription>
        </SuccessSectionCardHeader>
        <CardContent className="gba:p-5">
          {!data?.topErrors?.length ? (
            <SuccessEmptyState
              title={t('state-empty')}
              description={t('system-reliability-top-errors-description')}
              icon={<AlertTriangle className="gba:h-8 gba:w-8" />}
            />
          ) : (
            <div className="gba:flex gba:flex-col gba:gap-3">
              {data.topErrors.slice(0, 6).map(errorItem => (
                <div
                  key={`${errorItem.taskType}-${errorItem.stepReference}-${errorItem.errorMessage}`}
                  className="gba:flex gba:flex-col gba:gap-1 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4"
                >
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">
                    {errorItem.stepTitle || errorItem.stepReference}
                  </span>
                  <span className="gba:text-xs gba:text-muted-foreground">
                    {errorItem.taskType} · {errorItem.totalOccurrences} {t('system-reliability-failures-short')}
                  </span>
                  <span className="gba:text-sm gba:text-muted-foreground">{errorItem.errorMessage}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </SuccessTabPage>
  )
}
