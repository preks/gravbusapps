import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { 
  BarChartOutlined, 
  PlayCircleOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined 
} from '@ant-design/icons';
import { SalesCampaignStatistics } from './types/SalesCampaignTypes';

interface CampaignStatisticsProps {
  statistics: SalesCampaignStatistics;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const CampaignStatistics: React.FC<CampaignStatisticsProps> = ({
  statistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  // Helper function to format duration
  const formatDuration = (days: number): string => {
    if (days === 0) return '0 days';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  // Mock trend data (in a real app, this would come from historical data)
  const getTrendData = (currentValue: number, metric: string) => {
    // Simulate trend data - in reality, this would be calculated from historical data
    const mockPreviousValues = {
      totalCampaigns: Math.max(0, currentValue - Math.floor(Math.random() * 5)),
      activeCampaigns: Math.max(0, currentValue - Math.floor(Math.random() * 3)),
      completedCampaigns: Math.max(0, currentValue - Math.floor(Math.random() * 4)),
      averageDuration: Math.max(0, currentValue - Math.floor(Math.random() * 10))
    };
    
    const previousValue = mockPreviousValues[metric as keyof typeof mockPreviousValues] || 0;
    const change = currentValue - previousValue;
    const changePercent = previousValue > 0 ? ((change / previousValue) * 100) : 0;
    
    return {
      value: `${change > 0 ? '+' : ''}${changePercent.toFixed(1)}%`,
      positive: change > 0,
      description: `vs last period`
    };
  };

  // Transform stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'total-campaigns',
      title: 'Total Campaigns',
      value: statistics.totalCampaigns,
      prefix: <BarChartOutlined />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'All campaigns in the system',
      trend: getTrendData(statistics.totalCampaigns, 'totalCampaigns')
    },
    {
      key: 'active-campaigns',
      title: 'Active Campaigns',
      value: statistics.activeCampaigns,
      prefix: <PlayCircleOutlined />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Currently running campaigns',
      trend: getTrendData(statistics.activeCampaigns, 'activeCampaigns')
    },
    {
      key: 'completed-campaigns',
      title: 'Completed Campaigns',
      value: statistics.completedCampaigns,
      prefix: <CheckCircleOutlined />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Successfully finished campaigns',
      trend: getTrendData(statistics.completedCampaigns, 'completedCampaigns')
    },
    {
      key: 'average-duration',
      title: 'Average Duration',
      value: formatDuration(statistics.averageDuration),
      valueIsString: true,
      prefix: <ClockCircleOutlined />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Average campaign duration in days',
      trend: getTrendData(statistics.averageDuration, 'averageDuration')
    }
  ];

  return (
    <div data-testid="campaign-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No campaign statistics available."
        data-testid="campaign-statistics"
      />
    </div>
  );
};

export default CampaignStatistics; 