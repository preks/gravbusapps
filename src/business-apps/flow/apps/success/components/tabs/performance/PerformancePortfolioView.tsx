import React from 'react'
import { CardDescription, CardTitle, useTranslation } from '@newwork/nw-design-system'
import { Layers3 } from 'lucide-react'
import translations from '../../../_i18n'
import { SuccessEmptyState, SuccessErrorState, SuccessKpiGrid, type SuccessKpiItem } from '../../shared'
import { formatHoursDuration, formatPercent } from '../../../utils/formatters'

interface PerformancePortfolioRow {
  templateId: string
  templateName: string
  totalWorkflows: number
  completionRate: number
  avgCycleTime: number
}

interface PerformancePortfolioViewProps {
  kpiItems: SuccessKpiItem[]
  isPortfolioLoading?: boolean
  portfolioError?: Error | null
  onRetryPortfolio?: () => void
  isTemplatesLoading?: boolean
  templates: PerformancePortfolioRow[]
  templatesError?: Error | null
  onRetryTemplates?: () => void
  'data-testid'?: string
}

const FLOWS_PER_TILE = 5

const getRankedTemplates = (
  templates: PerformancePortfolioRow[],
  getMetric: (item: PerformancePortfolioRow) => number,
  sortOrder: 'asc' | 'desc'
) =>
  [...templates]
    .filter(item => Number.isFinite(getMetric(item)))
    .sort((left, right) => {
      const metricDelta = sortOrder === 'asc' ? getMetric(left) - getMetric(right) : getMetric(right) - getMetric(left)
      if (metricDelta !== 0) return metricDelta

      const workflowDelta = right.totalWorkflows - left.totalWorkflows
      if (workflowDelta !== 0) return workflowDelta

      return left.templateName.localeCompare(right.templateName)
    })
    .slice(0, FLOWS_PER_TILE)

interface PerformanceRankedTileProps {
  title: string
  description: string
  items: PerformancePortfolioRow[]
  emptyLabel: string
  metricLabel: string
  volumeLabel: string
  getMetricValue: (item: PerformancePortfolioRow) => number
  formatMetric: (value: number) => string
  'data-testid'?: string
}

const PerformanceRankedTile: React.FC<PerformanceRankedTileProps> = ({
  title,
  description,
  items,
  emptyLabel,
  metricLabel,
  volumeLabel,
  getMetricValue,
  formatMetric,
  'data-testid': testId
}) => (
  <div className="gba:rounded-xl gba:border gba:border-border gba:bg-card" data-testid={testId}>
    <div className="gba:flex gba:flex-col gba:gap-1 gba:border-b gba:border-border gba:p-4">
      <h3 className="gba:text-base gba:font-semibold gba:text-foreground">{title}</h3>
      <p className="gba:text-sm gba:text-muted-foreground">{description}</p>
    </div>

    <div className="gba:flex gba:flex-col">
      {!items.length ? (
        <div className="gba:px-4 gba:py-6 gba:text-sm gba:text-muted-foreground">{emptyLabel}</div>
      ) : (
        items.map((item, index) => (
          <div
            key={`${item.templateId}-${item.templateName}-${index}`}
            className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:border-b gba:border-border/60 gba:px-4 gba:py-3 gba:last:border-b-0"
          >
            <div className="gba:min-w-0 gba:flex-1">
              <div className="gba:text-xs gba:font-medium gba:text-muted-foreground">#{index + 1}</div>
              <div className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground">{item.templateName}</div>
              <div className="gba:text-xs gba:text-muted-foreground">
                {item.totalWorkflows} {volumeLabel}
              </div>
            </div>

            <div className="gba:flex gba:min-w-24 gba:flex-col gba:items-end gba:text-right">
              <div className="gba:text-sm gba:font-semibold gba:text-foreground">
                {formatMetric(getMetricValue(item))}
              </div>
              <div className="gba:text-xs gba:text-muted-foreground">{metricLabel}</div>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
)

export const PerformancePortfolioView: React.FC<PerformancePortfolioViewProps> = ({
  kpiItems,
  isPortfolioLoading = false,
  portfolioError,
  onRetryPortfolio,
  isTemplatesLoading = false,
  templates,
  templatesError,
  onRetryTemplates,
  'data-testid': testId = 'flow-success-performance-portfolio'
}) => {
  const { t } = useTranslation(translations)
  const rankedTiles = [
    {
      id: 'completion-top',
      title: t('templates-completion-top-title'),
      description: t('templates-completion-top-description'),
      items: getRankedTemplates(templates, item => item.completionRate, 'desc'),
      emptyLabel: t('state-empty'),
      metricLabel: t('flows-completion-rate'),
      volumeLabel: t('flows-total-workflows'),
      getMetricValue: (item: PerformancePortfolioRow) => item.completionRate,
      formatMetric: formatPercent
    },
    {
      id: 'completion-bottom',
      title: t('templates-completion-bottom-title'),
      description: t('templates-completion-bottom-description'),
      items: getRankedTemplates(templates, item => item.completionRate, 'asc'),
      emptyLabel: t('state-empty'),
      metricLabel: t('flows-completion-rate'),
      volumeLabel: t('flows-total-workflows'),
      getMetricValue: (item: PerformancePortfolioRow) => item.completionRate,
      formatMetric: formatPercent
    },
    {
      id: 'cycle-fastest',
      title: t('templates-cycle-fastest-title'),
      description: t('templates-cycle-fastest-description'),
      items: getRankedTemplates(templates, item => item.avgCycleTime, 'asc'),
      emptyLabel: t('state-empty'),
      metricLabel: t('flows-avg-cycle-time'),
      volumeLabel: t('flows-total-workflows'),
      getMetricValue: (item: PerformancePortfolioRow) => item.avgCycleTime,
      formatMetric: formatHoursDuration
    },
    {
      id: 'cycle-slowest',
      title: t('templates-cycle-slowest-title'),
      description: t('templates-cycle-slowest-description'),
      items: getRankedTemplates(templates, item => item.avgCycleTime, 'desc'),
      emptyLabel: t('state-empty'),
      metricLabel: t('flows-avg-cycle-time'),
      volumeLabel: t('flows-total-workflows'),
      getMetricValue: (item: PerformancePortfolioRow) => item.avgCycleTime,
      formatMetric: formatHoursDuration
    }
  ]

  return (
    <div className="gba:flex gba:flex-col gba:gap-6" id="performance-portfolio" data-testid={testId}>
      {portfolioError ? (
        <SuccessErrorState
          title={t('state-error-title')}
          message={portfolioError.message}
          onRetry={onRetryPortfolio}
          retryLabel={t('action-retry')}
          data-testid={`${testId}-portfolio-error`}
        />
      ) : (
        <SuccessKpiGrid
          items={kpiItems}
          isLoading={isPortfolioLoading}
          emptyTitle={t('state-empty')}
          emptyDescription={t('flows-portfolio-description')}
          data-testid={`${testId}-kpis`}
        />
      )}

      <div className="gba:flex gba:flex-col gba:gap-4">
        <div className="gba:flex gba:flex-col gba:gap-1">
          <CardTitle>{t('flows-templates-title')}</CardTitle>
          <CardDescription>{t('flows-templates-description')}</CardDescription>
        </div>

        {templatesError ? (
          <SuccessErrorState
            title={t('state-error-title')}
            message={templatesError.message}
            onRetry={onRetryTemplates}
            retryLabel={t('action-retry')}
            data-testid={`${testId}-templates-error`}
          />
        ) : isTemplatesLoading ? (
          <div className="gba:flex gba:min-h-48 gba:items-center gba:justify-center gba:text-sm gba:text-muted-foreground">
            {t('state-loading')}
          </div>
        ) : !templates.length ? (
          <SuccessEmptyState
            title={t('state-empty')}
            description={t('flows-no-templates')}
            icon={<Layers3 className="gba:h-8 gba:w-8" />}
            data-testid={`${testId}-empty`}
          />
        ) : (
          <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:xl:grid-cols-2">
            {rankedTiles.map(tile => (
              <PerformanceRankedTile
                key={tile.id}
                title={tile.title}
                description={tile.description}
                items={tile.items}
                emptyLabel={tile.emptyLabel}
                metricLabel={tile.metricLabel}
                volumeLabel={tile.volumeLabel}
                getMetricValue={tile.getMetricValue}
                formatMetric={tile.formatMetric}
                data-testid={`${testId}-${tile.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
