import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { 
  BankOutlined,
  TrophyOutlined,
  DollarOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { AccountStatisticsData } from '../types';

interface AccountStatisticsProps {
  statistics: AccountStatisticsData;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const AccountStatistics: React.FC<AccountStatisticsProps> = ({
  statistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'recent-accounts',
      title: 'Recent Accounts',
      value: statistics.recentAccounts,
      prefix: <TeamOutlined />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Past 2 weeks'
    },
    {
      key: 'active-accounts',
      title: 'Active Accounts',
      value: statistics.activeAccounts,
      prefix: <BankOutlined />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Currently active'
    },
    {
      key: 'total-revenue',
      title: 'Total Revenue',
      value: formatCurrency(statistics.totalRevenue),
      prefix: <DollarOutlined />,
      color: '#fa8c16',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Estimated total'
    },
    {
      key: 'this-year',
      title: 'This Year',
      value: statistics.totalAccountsThisYear,
      prefix: <TrophyOutlined />,
      color: '#eb2f96',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'New accounts'
    }
  ];

  return (
    <div data-testid="account-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No account statistics available."
        data-testid="account-statistics"
      />
    </div>
  );
};

export default AccountStatistics; 