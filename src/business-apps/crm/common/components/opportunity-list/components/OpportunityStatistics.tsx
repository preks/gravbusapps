import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { 
  DollarOutlined,
  TrophyOutlined,
  RiseOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { OpportunityStatisticsData } from '../types';

interface OpportunityStatisticsProps {
  statistics: OpportunityStatisticsData;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const OpportunityStatistics: React.FC<OpportunityStatisticsProps> = ({
  statistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'recent-opportunities',
      title: 'Recent Opportunities',
      value: statistics.recentOpportunities,
      prefix: <ClockCircleOutlined />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Past 2 weeks'
    },
    {
      key: 'total-pipeline-value',
      title: 'Total Pipeline Value',
      value: formatCurrency(statistics.totalOpportunityValue),
      prefix: <DollarOutlined />,
      color: '#52c41a',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'All opportunities'
    },
    {
      key: 'average-win-rate',
      title: 'Average Win Rate',
      value: statistics.averageWinRate,
      prefix: <TrophyOutlined />,
      color: '#fa8c16',
      suffix: '%',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Winning chance'
    },
    {
      key: 'this-year',
      title: 'This Year',
      value: statistics.totalOpportunitiesThisYear,
      prefix: <RiseOutlined />,
      color: '#eb2f96',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'New opportunities'
    }
  ];

  return (
    <div data-testid="opportunity-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No opportunity statistics available."
        data-testid="opportunity-statistics"
      />
    </div>
  );
};

export default OpportunityStatistics; 