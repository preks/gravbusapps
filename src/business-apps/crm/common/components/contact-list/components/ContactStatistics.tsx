import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { 
  UserOutlined,
  MailOutlined,
  TrophyOutlined,
  ContactsOutlined
} from '@ant-design/icons';
import { ContactStatisticsData } from '../types';

interface ContactStatisticsProps {
  statistics: ContactStatisticsData;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const ContactStatistics: React.FC<ContactStatisticsProps> = ({
  statistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'recent-contacts',
      title: 'Recent Contacts',
      value: statistics.recentContacts,
      prefix: <UserOutlined />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Past 2 weeks'
    },
    {
      key: 'active-contacts',
      title: 'Active Contacts',
      value: statistics.activeContacts,
      prefix: <ContactsOutlined />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Currently active'
    },
    {
      key: 'email-engagements',
      title: 'Email Engagements',
      value: statistics.totalEmailEngagements,
      prefix: <MailOutlined />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Contacts with email'
    },
    {
      key: 'this-year',
      title: 'This Year',
      value: statistics.totalContactsThisYear,
      prefix: <TrophyOutlined />,
      color: '#eb2f96',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'New contacts'
    }
  ];

  return (
    <div data-testid="contact-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No contact statistics available."
        data-testid="contact-statistics"
      />
    </div>
  );
};

export default ContactStatistics; 