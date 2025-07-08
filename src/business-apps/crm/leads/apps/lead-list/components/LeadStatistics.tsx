import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { 
  UserOutlined, 
  FireOutlined, 
  CalendarOutlined, 
  TrophyOutlined 
} from '@ant-design/icons';
import { LeadStatisticsData } from '../queries/LeadStatisticsQueries';

interface LeadStatisticsProps {
  statistics: LeadStatisticsData;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const LeadStatistics: React.FC<LeadStatisticsProps> = ({
  statistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  // Get current year for display
  const currentYear = new Date().getFullYear();

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'recent-leads',
      title: 'Recent Leads',
      value: statistics.recentLeads,
      prefix: <UserOutlined />,
      color: '#1677ff',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'New leads (past 2 weeks)'
    },
    {
      key: 'hot-leads',
      title: 'Hot Leads',
      value: statistics.hotLeads,
      prefix: <FireOutlined />,
      color: '#ff4d4f',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'High priority prospects'
    },
    {
      key: 'this-month-leads',
      title: 'This Month',
      value: statistics.thisMonthLeads,
      prefix: <CalendarOutlined />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'New leads this month'
    },
    {
      key: 'conversion-rate',
      title: 'Conversion Rate',
      value: statistics.conversionRateThisYear,
      prefix: <TrophyOutlined />,
      color: '#722ed1',
      precision: 1,
      suffix: '%',
      span: { xs: 24, sm: 12, md: 6 },
      description: `${statistics.convertedLeadsThisYear} converted in ${currentYear}`
    }
  ];

  return (
    <div data-testid="lead-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No lead statistics available."
        data-testid="lead-statistics"
      />
    </div>
  );
};

export default LeadStatistics; 