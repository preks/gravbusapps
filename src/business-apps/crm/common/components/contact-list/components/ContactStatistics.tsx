import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { 
  UserOutlined,
  MailOutlined,
  TrophyOutlined,
  ContactsOutlined
} from '@ant-design/icons';

interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
}

interface ContactStatisticsWithTrendProps {
  trendData: {
    recentContacts: TrendData;
    activeContacts: TrendData;
    emailEngagements: TrendData;
    contactsThisYear: TrendData;
  };
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/**
 * Enhanced ContactStatistics component with trend data
 */
export const ContactStatisticsWithTrend: React.FC<ContactStatisticsWithTrendProps> = ({
  trendData,
  isLoading = false,
  error = null,
  onRetry
}) => {
  // Helper function to format trend percentage with proper sign
  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(1)}%`;
  };

  // Transform the trend data into widgets format with trend information
  const widgets: WidgetItem[] = [
    {
      key: 'recent-contacts',
      title: 'Recent Contacts',
      value: trendData.recentContacts.current,
      prefix: <UserOutlined />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Past 2 weeks',
      trend: {
        value: formatTrendPercent(trendData.recentContacts.changePercent),
        positive: trendData.recentContacts.isPositive,
        description: 'vs previous 2 weeks'
      }
    },
    {
      key: 'active-contacts',
      title: 'Active Contacts',
      value: trendData.activeContacts.current,
      prefix: <ContactsOutlined />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Currently active',
      trend: {
        value: formatTrendPercent(trendData.activeContacts.changePercent),
        positive: trendData.activeContacts.isPositive,
        description: 'vs last month'
      }
    },
    {
      key: 'email-engagements',
      title: 'Email Engagements',
      value: trendData.emailEngagements.current,
      prefix: <MailOutlined />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Contacts with email',
      trend: {
        value: formatTrendPercent(trendData.emailEngagements.changePercent),
        positive: trendData.emailEngagements.isPositive,
        description: 'vs last month'
      }
    },
    {
      key: 'this-year',
      title: 'This Year',
      value: trendData.contactsThisYear.current,
      prefix: <TrophyOutlined />,
      color: '#eb2f96',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'New contacts',
      trend: {
        value: formatTrendPercent(trendData.contactsThisYear.changePercent),
        positive: trendData.contactsThisYear.isPositive,
        description: 'vs same period last year'
      }
    }
  ];

  return (
    <div data-testid="contact-statistics-with-trend-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No contact statistics available."
        data-testid="contact-statistics-with-trend"
      />
    </div>
  );
}; 