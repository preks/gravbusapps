import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import {
  UserOutlined,
  ContactsOutlined,
  DollarOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { usePerformanceStatisticsData } from '../../hooks';
import { formatCurrency } from '../../../../../../utils/currencyUtils';

const DATA_TEST_ID_PREFIX = 'PerformanceStatistics';

interface PerformanceStatisticsProps extends BusinessAppContextProps {
  employeeId: string;
  onRetry?: () => void;
}

export const PerformanceStatistics: React.FC<PerformanceStatisticsProps> = ({
  employeeId,
  accessToken,
  onRetry,
  ...context
}) => {
  // Fetch real performance statistics data
  const { statistics, isLoading, error, refetch } = usePerformanceStatisticsData(
    { accessToken, ...context },
    employeeId
  );

  // Handle retry - use both internal refetch and optional external onRetry
  const handleRetry = () => {
    refetch();
    onRetry?.();
  };

  // Transform stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'leads-worked',
      title: 'Leads Worked',
      value: statistics.leadsWorked.total,
      prefix: <UserOutlined />,
      color: '#1890ff',
      description: `${statistics.leadsWorked.converted} converted (${statistics.leadsWorked.conversionRate}%)`
    },
    {
      key: 'contacts-worked',
      title: 'Contacts Worked',
      value: statistics.contactsWorked.total,
      prefix: <ContactsOutlined />,
      color: '#52c41a',
      description: `${statistics.contactsWorked.salesRelated} sales-related (${statistics.contactsWorked.percentage}%)`
    },
    {
      key: 'opportunities-managed',
      title: 'Opportunities Managed',
      value: statistics.opportunitiesManaged.total,
      prefix: <DollarOutlined />,
      color: '#722ed1',
      description: `${statistics.opportunitiesManaged.won} won (${statistics.opportunitiesManaged.winRate}%)`
    },
    {
      key: 'accounts-managed',
      title: 'Accounts Managed',
      value: statistics.accountsManaged.total,
      prefix: <TeamOutlined />,
      color: '#fa8c16',
      description: `${formatCurrency(statistics.accountsManaged.revenue, statistics.accountsManaged.currencyId)} sales`
    }
  ];

  return (
    <div className="gba:w-full gba:mb-8" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error ? new Error(error) : null}
        onRetry={handleRetry}
        skeletonCount={4}
        emptyText="No performance statistics available."
        data-testid={DATA_TEST_ID_PREFIX}
      />
    </div>
  );
};

export default PerformanceStatistics; 