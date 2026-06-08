import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { UserIcon, CurrencyDollarIcon, FunnelIcon, TargetIcon } from '@phosphor-icons/react'
import { CampaignKPIsProps } from '../types'
import { formatPercentage } from '@/common/utils/numberFormatter'
import translations from '@/business-apps/crm/campaigns/_i18n'
import { type WidgetItem } from '@/components/widget-group'
import { CampaignStatistics } from '@/business-apps/crm/campaigns/apps/campaign-management/components'

const CampaignKPIs: React.FC<CampaignKPIsProps> = ({ kpis, kpisWithTrends, isLoading, error, onRetry }) => {
  const { t } = useTranslation(translations)
  const toTrendBadgeValue = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`

  const widgets = useMemo<WidgetItem[]>(() => {
    const leadsConversionLabel =
      kpis && kpis.totalLeads > 0
        ? `${kpis.convertedLeads}/${kpis.totalLeads} converted (${formatPercentage(kpis.convertedLeadsPercentage)})`
        : '0/0 converted (0%)'
    const opportunitiesWinLabel =
      kpis && kpis.totalOpportunities > 0
        ? `${kpis.wonOpportunities}/${kpis.totalOpportunities} won (${formatPercentage(kpis.wonOpportunitiesPercentage)})`
        : '0/0 won (0%)'
    const mqlRate = kpis && kpis.totalLeads > 0 ? (kpis.mqlCount / kpis.totalLeads) * 100 : 0
    const sqlRate = kpis && kpis.totalLeads > 0 ? (kpis.sqlCount / kpis.totalLeads) * 100 : 0

    return [
      {
        key: 'total-leads',
        title: t('campaign-kpis-totalLeads'),
        value: kpisWithTrends?.totalLeads.current || 0,
        prefix: <UserIcon size={16} />,
        color: '#1890ff',
        span: { xs: 24, sm: 12, lg: 6 },
        description: leadsConversionLabel,
        trend: {
          value: toTrendBadgeValue(kpis?.convertedLeadsPercentage ?? 0),
          positive: (kpis?.convertedLeadsPercentage ?? 0) >= 0,
          description: 'vs previous period (30 days ago)'
        }
      },
      {
        key: 'mql-count',
        title: t('campaign-kpis-mql'),
        value: kpisWithTrends?.mqlCount.current || 0,
        prefix: <FunnelIcon size={16} />,
        color: '#52c41a',
        span: { xs: 24, sm: 12, lg: 6 },
        description: t('campaign-kpis-mql-description'),
        trend: {
          value: toTrendBadgeValue(mqlRate),
          positive: mqlRate >= 0,
          description: 'vs previous period (30 days ago)'
        }
      },
      {
        key: 'sql-count',
        title: t('campaign-kpis-sql'),
        value: kpisWithTrends?.sqlCount.current || 0,
        prefix: <TargetIcon size={16} />,
        color: '#fa8c16',
        span: { xs: 24, sm: 12, lg: 6 },
        description: t('campaign-kpis-sql-description'),
        trend: {
          value: toTrendBadgeValue(sqlRate),
          positive: sqlRate >= 0,
          description: 'vs previous period (30 days ago)'
        }
      },
      {
        key: 'total-opportunities',
        title: t('campaign-kpis-totalOpportunities'),
        value: kpisWithTrends?.totalOpportunities.current || 0,
        prefix: <CurrencyDollarIcon size={16} />,
        color: '#722ed1',
        span: { xs: 24, sm: 12, lg: 6 },
        description: opportunitiesWinLabel,
        trend: {
          value: toTrendBadgeValue(kpis?.wonOpportunitiesPercentage ?? 0),
          positive: (kpis?.wonOpportunitiesPercentage ?? 0) >= 0,
          description: 'vs previous period (30 days ago)'
        }
      }
    ]
  }, [kpis, kpisWithTrends, t])

  return (
    <CampaignStatistics
      widgets={widgets}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      dataTestId="campaign-kpis"
      emptyText={t('campaign-kpis-noData')}
      cardsClassName="gba:[&_div]:!bg-muted gba:[&_div]:!border-border/70"
    />
  )
}

export default CampaignKPIs
