import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { UserIcon, AddressBookIcon, UsersThreeIcon, CurrencyDollarIcon } from '@phosphor-icons/react'
import { CampaignKPIsProps } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatPercentage } from '@/common/utils/numberFormatter'
import { NW_CHART_COLOR_VARS } from '@/business-apps/crm/campaigns/utils/campaignChartTokens'

const CampaignKPIs: React.FC<CampaignKPIsProps> = ({ kpisWithTrends, isLoading, error, onRetry }) => {
  // Transform KPIs data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'total-leads',
      title: getTranslationFromI18nKeyAndLabel('campaign.kpis.totalLeads', 'Total Leads'),
      value: kpisWithTrends?.totalLeads.current || 0,
      prefix: <UserIcon />,
      color: NW_CHART_COLOR_VARS[0],
      span: { xs: 24, sm: 12, lg: 6 },
      description: kpisWithTrends?.totalLeads.percentage
        ? `${formatPercentage(kpisWithTrends.totalLeads.percentage)} converted`
        : 'Campaign leads',
      trend: kpisWithTrends?.totalLeads.trend
    },
    {
      key: 'total-accounts',
      title: getTranslationFromI18nKeyAndLabel('campaign.kpis.totalAccounts', 'Total Accounts'),
      value: kpisWithTrends?.totalAccounts.current || 0,
      prefix: <AddressBookIcon />,
      color: NW_CHART_COLOR_VARS[1],
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('campaign.kpis.accounts.description', 'Campaign accounts'),
      trend: kpisWithTrends?.totalAccounts.trend
    },
    {
      key: 'total-contacts',
      title: getTranslationFromI18nKeyAndLabel('campaign.kpis.totalContacts', 'Total Contacts'),
      value: kpisWithTrends?.totalContacts.current || 0,
      prefix: <UsersThreeIcon />,
      color: NW_CHART_COLOR_VARS[2],
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('campaign.kpis.contacts.description', 'Campaign contacts'),
      trend: kpisWithTrends?.totalContacts.trend
    },
    {
      key: 'total-opportunities',
      title: getTranslationFromI18nKeyAndLabel('campaign.kpis.totalOpportunities', 'Total Opportunities'),
      value: kpisWithTrends?.totalOpportunities.current || 0,
      prefix: <CurrencyDollarIcon />,
      color: NW_CHART_COLOR_VARS[3],
      span: { xs: 24, sm: 12, lg: 6 },
      description: kpisWithTrends?.totalOpportunities.percentage
        ? `${formatPercentage(kpisWithTrends.totalOpportunities.percentage)} won`
        : 'Campaign opportunities',
      trend: kpisWithTrends?.totalOpportunities.trend
    }
  ]

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      skeletonCount={4}
      emptyText={getTranslationFromI18nKeyAndLabel('campaign.kpis.noData', 'No campaign KPIs available.')}
      className="gba:w-full"
      data-testid="campaign-kpis"
    />
  )
}

export default CampaignKPIs
