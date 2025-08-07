import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { 
  UserOutlined,
  ContactsOutlined,
  DollarOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes';

const CampaignsAnalyticsStatistics: React.FC<CampaignsAnalyticsComponentProps> = ({
  metrics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  if (!metrics) {
    return null;
  }

  const widgets: WidgetItem[] = [
    // 1. Total Leads (with conversion percentage)
    {
      key: 'total-leads',
      title: 'Total Leads',
      value: metrics.totalLeads,
      prefix: <UserOutlined />,
      color: '#1890ff',
      description: metrics.averageConversionRate > 0 
        ? `${formatPercentage(metrics.averageConversionRate)} converted`
        : 'Generated across all campaigns',
    },
    
    // 2. Total Accounts (created from campaign leads)
    {
      key: 'total-accounts',
      title: 'Total Accounts',
      value: metrics.totalAccounts,
      prefix: <ContactsOutlined />,
      color: '#52c41a',
      description: 'Created from campaign leads',
    },
    
    // 3. Total Contacts (added through campaigns)
    {
      key: 'total-contacts',
      title: 'Total Contacts',
      value: metrics.totalContacts,
      prefix: <TeamOutlined />,
      color: '#722ed1',
      description: 'Added through campaigns',
    },
    
    // 4. Total Opportunities (with revenue and win rate)
    {
      key: 'total-opportunities',
      title: 'Total Opportunities',
      value: metrics.totalOpportunities,
      prefix: <DollarOutlined />,
      color: '#fa8c16',
      description: metrics.totalRevenue > 0 
        ? `${formatCurrency(metrics.totalRevenue)} revenue, ${formatPercentage(metrics.averageWinRate)} win rate`
        : metrics.averageWinRate > 0 
          ? `${formatPercentage(metrics.averageWinRate)} win rate`
          : 'Generated from campaigns',
      valueIsString: false,
    },
  ];

  return (
    <div data-testid="campaigns-analytics-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No analytics data available."
        data-testid="campaigns-analytics-statistics"
      />
    </div>
  );
};

export default CampaignsAnalyticsStatistics;
