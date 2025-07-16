import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { 
  UserOutlined, 
  FireOutlined, 
  ShopOutlined, 
  BankOutlined,
  TrophyOutlined 
} from '@ant-design/icons';

interface LeadStatisticsWithTrendProps {
  trendData: {
    recentLeads: {
      current: number;
      changePercent: number;
      isPositive: boolean;
    };
    hotLeads: {
      current: number;
      changePercent: number;
      isPositive: boolean;
    };
    conversionRate: {
      current: number;
      currentRate: number;
      currentTotal: number;
      changePercent: number;
      isPositive: boolean;
    };
  };
  mostCommonLeadSource: string;
  mostCommonIndustry: string;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export const LeadStatisticsWithTrend: React.FC<LeadStatisticsWithTrendProps> = ({
  trendData,
  mostCommonLeadSource,
  mostCommonIndustry,
  isLoading = false,
  error = null,
  onRetry
}) => {
  // Get current year for display
  const currentYear = new Date().getFullYear();

  // Helper function to format trend percentage with proper sign
  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(1)}%`;
  };

  // Transform the trend data into widgets format with trend information
  const widgets: WidgetItem[] = [
    {
      key: 'recent-leads',
      title: 'Recent Leads',
      value: trendData.recentLeads.current,
      prefix: <UserOutlined />,
      color: '#1677ff',
      span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
      description: 'New leads (past 2 weeks)',
      trend: {
        value: formatTrendPercent(trendData.recentLeads.changePercent),
        positive: trendData.recentLeads.isPositive,
        description: 'vs previous 2 weeks'
      }
    },
    {
      key: 'hot-leads',
      title: 'Hot Leads',
      value: trendData.hotLeads.current,
      prefix: <FireOutlined />,
      color: '#ff4d4f',
      span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
      description: 'High priority prospects',
      trend: {
        value: formatTrendPercent(trendData.hotLeads.changePercent),
        positive: trendData.hotLeads.isPositive,
        description: 'vs last month'
      }
    },
    {
      key: 'top-lead-source',
      title: 'Top Lead Source',
      value: mostCommonLeadSource,
      prefix: <ShopOutlined />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
      description: 'Most common in recent leads'
    },
    {
      key: 'top-industry',
      title: 'Top Industry',
      value: mostCommonIndustry,
      prefix: <BankOutlined />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, md: 8, lg: 4, xl: 4 },
      description: 'Most common in recent leads'
    },
    {
      key: 'conversion-rate',
      title: 'Conversion Rate',
      value: trendData.conversionRate.currentRate,
      prefix: <TrophyOutlined />,
      color: '#722ed1',
      precision: 1,
      suffix: '%',
      span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
      description: `${trendData.conversionRate.current} converted in ${currentYear}`,
      trend: {
        value: formatTrendPercent(trendData.conversionRate.changePercent),
        positive: trendData.conversionRate.isPositive,
        description: 'vs last year'
      }
    }
  ];

  return (
    <div data-testid="lead-statistics-with-trend-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={5}
        emptyText="No lead statistics available."
        data-testid="lead-statistics-with-trend"
      />
    </div>
  );
}; 