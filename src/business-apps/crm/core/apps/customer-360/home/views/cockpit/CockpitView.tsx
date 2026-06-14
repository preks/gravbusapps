import React, { useMemo } from 'react'
import { Button, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import {
  WarningCircleIcon,
  ListChecksIcon,
  CalendarCheckIcon,
  ChartPieSliceIcon,
  RobotIcon
} from '@phosphor-icons/react'
import customer360I18n from '../../../_i18n'
import WidgetGroup, { type WidgetItem } from '@/components/widget-group'
import Customer360Section from '../../../shared/Customer360Section'
import { formatCurrency } from '../../../utils/format'
import AttentionList from '../../components/AttentionList'
import ProvisionalNote from '../../components/ProvisionalNote'
import PortfolioHero from '../../components/PortfolioHero'
import InsightCard from './components/InsightCard'
import type { Customer360HomeViewProps } from '../../types'

const COCKPIT_PREVIEW_LIMIT = 5

/**
 * Portfolio cockpit — the Customer 360 home landing. Welcomes with a hero,
 * surfaces book-of-business KPIs, previews attention accounts and offers a
 * navigable insight hub into renewals, analytics and the portfolio agent.
 */
const CockpitView: React.FC<Customer360HomeViewProps> = ({ portfolio, openCustomer, onNavigateView }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const { stats, rows, loading, error } = portfolio

  const widgets = useMemo<WidgetItem[]>(() => {
    const dash = '—'
    return [
      { key: 'total', title: t('cockpit-total-customers'), value: stats.totalCustomers },
      { key: 'accounts', title: t('cockpit-accounts'), value: stats.totalAccounts },
      {
        key: 'attention',
        title: t('cockpit-needs-attention'),
        value: stats.needsAttention,
        footer: t('cockpit-needs-attention-footer')
      },
      { key: 'unassigned', title: t('cockpit-unassigned'), value: stats.unassigned },
      {
        key: 'csat',
        title: t('cockpit-avg-csat'),
        value: typeof stats.avgCsat === 'number' ? stats.avgCsat : dash,
        valueIsString: typeof stats.avgCsat !== 'number',
        suffix: typeof stats.avgCsat === 'number' ? '%' : undefined
      },
      {
        key: 'overdue',
        title: t('cockpit-overdue'),
        value: typeof stats.overdueTotal === 'number' ? formatCurrency(stats.overdueTotal, stats.currency) : dash,
        valueIsString: true
      }
    ]
  }, [stats, t])

  const topAttention = useMemo(() => rows.filter(row => row.attentionReasons.length > 0), [rows])

  const renewalsCount = useMemo(() => {
    return rows.filter(row => (row.summary.expiringContracts ?? 0) > 0).length
  }, [rows])

  const compositionMetric = stats.totalCustomers

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="customer-360-cockpit-view">
      {portfolio.provisional ? <ProvisionalNote /> : null}

      <PortfolioHero stats={stats} loading={loading} onNavigateView={onNavigateView} />

      <WidgetGroup
        widgets={widgets}
        isLoading={loading}
        error={error}
        onRetry={portfolio.refetch}
        data-testid="customer-360-cockpit-kpis"
      />

      <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:lg:grid-cols-3">
        <div className="gba:lg:col-span-2">
          <Customer360Section
            title={t('cockpit-attention-title')}
            icon={WarningCircleIcon}
            count={stats.needsAttention}
            loading={loading}
            error={error}
            errorTitle={t('error-title')}
            isEmpty={!loading && topAttention.length === 0}
            emptyTitle={t('worklist-empty-title')}
            emptyDescription={t('worklist-empty-description')}
            testId="customer-360-cockpit-attention"
            action={
              <Button variant="ghost" size="sm" onClick={() => onNavigateView('explorer', { attentionFilter: true })}>
                <ListChecksIcon className="gba:mr-2 gba:size-4" />
                {t('cockpit-view-worklist')}
              </Button>
            }
          >
            <AttentionList
              rows={topAttention}
              openCustomer={openCustomer}
              limit={COCKPIT_PREVIEW_LIMIT}
              testId="customer-360-cockpit-attention-list"
            />
          </Customer360Section>
        </div>

        <div className="gba:flex gba:flex-col gba:gap-4">
          <InsightCard
            icon={CalendarCheckIcon}
            title={t('cockpit-insights-renewals-title')}
            description={t('cockpit-insights-renewals-description')}
            metric={renewalsCount}
            actionLabel={t('cockpit-insights-renewals-action')}
            onOpen={() => onNavigateView('renewals')}
            testId="customer-360-cockpit-insight-renewals"
          />
          <InsightCard
            icon={ChartPieSliceIcon}
            title={t('cockpit-insights-composition-title')}
            description={t('cockpit-insights-composition-description')}
            metric={compositionMetric}
            actionLabel={t('cockpit-insights-composition-action')}
            onOpen={() => onNavigateView('analytics')}
            testId="customer-360-cockpit-insight-composition"
          />
          <InsightCard
            icon={RobotIcon}
            title={t('cockpit-insights-agent-title')}
            description={t('cockpit-insights-agent-description')}
            actionLabel={t('cockpit-insights-agent-action')}
            onOpen={() => onNavigateView('agent')}
            testId="customer-360-cockpit-insight-agent"
          />
        </div>
      </div>
    </div>
  )
}

export default CockpitView
export { CockpitView }
