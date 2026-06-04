import React, { useMemo } from 'react'
import { Button, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { WarningCircleIcon, ListChecksIcon } from '@phosphor-icons/react'
import customer360I18n from '../../../_i18n'
import WidgetGroup, { type WidgetItem } from '@/components/widget-group'
import Customer360Section from '../../../components/Customer360Section'
import { formatCurrency } from '../../../utils/format'
import AttentionList from '../../components/AttentionList'
import ProvisionalNote from '../../components/ProvisionalNote'
import type { Customer360HomeViewProps } from '../../types'

const COCKPIT_PREVIEW_LIMIT = 5

/**
 * Portfolio cockpit — book-of-business KPIs plus a preview of the AI attention
 * worklist. This is the Home landing surface.
 */
const CockpitView: React.FC<Customer360HomeViewProps> = ({ portfolio, openCustomer, onNavigateView }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const { stats, rows, loading, error } = portfolio

  const widgets = useMemo<WidgetItem[]>(() => {
    const dash = '—'
    return [
      { key: 'total', title: t('cockpit-total-customers'), value: stats.totalCustomers },
      { key: 'accounts', title: t('cockpit-accounts'), value: stats.totalAccounts },
      { key: 'contacts', title: t('cockpit-contacts'), value: stats.totalContacts },
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

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="customer-360-cockpit-view">
      {portfolio.provisional ? <ProvisionalNote /> : null}

      <WidgetGroup
        widgets={widgets}
        isLoading={loading}
        error={error}
        onRetry={portfolio.refetch}
        data-testid="customer-360-cockpit-kpis"
      />

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
          <Button variant="ghost" size="sm" onClick={() => onNavigateView('worklist')}>
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
  )
}

export default CockpitView
export { CockpitView }
