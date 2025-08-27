import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { 
  DollarOutlined,
  TrophyOutlined,
  RiseOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { formatCompactCurrency } from '@/common/utils/numberFormatter';

interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
}

interface OpportunityStatisticsWithTrendProps {
  trendData: {
    recentOpportunities: TrendData;
    opportunityValue: TrendData;
    winRate: TrendData;
    opportunitiesThisYear: TrendData;
  };
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/**
 * Enhanced OpportunityStatistics component with trend data
 */
export const OpportunityStatisticsWithTrend: React.FC<OpportunityStatisticsWithTrendProps> = ({
  trendData,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const formatCurrency = (amount: number): string => formatCompactCurrency(amount, 'USD');

  // Helper function to format trend percentage with proper sign
  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(1)}%`;
  };

  // Transform the trend data into widgets format with trend information
  const widgets: WidgetItem[] = [
    {
      key: 'recent-opportunities',
      title: 'Recent Opportunities',
      value: trendData.recentOpportunities.current,
      prefix: <ClockCircleOutlined />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Past 2 weeks',
      trend: {
        value: formatTrendPercent(trendData.recentOpportunities.changePercent),
        positive: trendData.recentOpportunities.isPositive,
        description: 'vs previous 2 weeks'
      }
    },
    {
      key: 'total-pipeline-value',
      title: 'Total Pipeline Value',
      value: formatCurrency(trendData.opportunityValue.current),
      prefix: <DollarOutlined />,
      color: '#52c41a',
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'All opportunities',
      trend: {
        value: formatTrendPercent(trendData.opportunityValue.changePercent),
        positive: trendData.opportunityValue.isPositive,
        description: 'vs last quarter'
      }
    },
    {
      key: 'average-win-rate',
      title: 'Average Win Rate',
      value: trendData.winRate.current,
      prefix: <TrophyOutlined />,
      color: '#fa8c16',
      suffix: '%',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Winning chance',
      trend: {
        value: formatTrendPercent(trendData.winRate.changePercent),
        positive: trendData.winRate.isPositive,
        description: 'vs last year'
      }
    },
    {
      key: 'this-year',
      title: 'This Year',
      value: trendData.opportunitiesThisYear.current,
      prefix: <RiseOutlined />,
      color: '#eb2f96',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'New opportunities',
      trend: {
        value: formatTrendPercent(trendData.opportunitiesThisYear.changePercent),
        positive: trendData.opportunitiesThisYear.isPositive,
        description: 'vs same period last year'
      }
    }
  ];

  return (
    <div data-testid="opportunity-statistics-with-trend-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No opportunity statistics available."
        data-testid="opportunity-statistics-with-trend"
      />
    </div>
  );
}; 