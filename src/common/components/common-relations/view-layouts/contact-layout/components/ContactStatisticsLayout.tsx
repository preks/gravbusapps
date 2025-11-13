import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { UserOutlined, MailOutlined, TrophyOutlined, ContactsOutlined } from '@ant-design/icons'

interface TrendData {
  current: number
  previous: number
  change: number
  changePercent: number
  isPositive: boolean
}

export interface ContactStatisticsData {
  recentContacts: TrendData
  activeContacts: TrendData
  emailEngagements: TrendData
  contactsThisYear: TrendData
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

interface ContactStatisticsLayoutProps {
  statistics: ContactStatisticsData
  'data-testid'?: string
}

/**
 * Contact Statistics Layout
 * Displays contact statistics with trends
 * Used by both CRM and IRM Contact Views
 */
export const ContactStatisticsLayout: React.FC<ContactStatisticsLayoutProps> = ({
  statistics,
  'data-testid': dataTestId = 'contact-statistics'
}) => {
  const { recentContacts, activeContacts, emailEngagements, contactsThisYear, isLoading, error, refetch } = statistics

  // Helper function to format trend percentage with proper sign
  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : ''
    return `${sign}${changePercent.toFixed(1)}%`
  }

  // Transform the statistics into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'recent-contacts',
      title: 'Recent Contacts',
      value: recentContacts.current,
      prefix: <UserOutlined />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Past 2 weeks',
      trend: {
        value: formatTrendPercent(recentContacts.changePercent),
        positive: recentContacts.isPositive,
        description: 'vs previous 2 weeks'
      }
    },
    {
      key: 'active-contacts',
      title: 'Active Contacts',
      value: activeContacts.current,
      prefix: <ContactsOutlined />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Currently active',
      trend: {
        value: formatTrendPercent(activeContacts.changePercent),
        positive: activeContacts.isPositive,
        description: 'vs last month'
      }
    },
    {
      key: 'email-engagements',
      title: 'Email Engagements',
      value: emailEngagements.current,
      prefix: <MailOutlined />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Contacts with email',
      trend: {
        value: formatTrendPercent(emailEngagements.changePercent),
        positive: emailEngagements.isPositive,
        description: 'vs last month'
      }
    },
    {
      key: 'this-year',
      title: 'This Year',
      value: contactsThisYear.current,
      prefix: <TrophyOutlined />,
      color: '#eb2f96',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'New contacts',
      trend: {
        value: formatTrendPercent(contactsThisYear.changePercent),
        positive: contactsThisYear.isPositive,
        description: 'vs same period last year'
      }
    }
  ]

  return (
    <div data-testid={`${dataTestId}-container`}>
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeletonCount={4}
        emptyText="No contact statistics available."
        data-testid={dataTestId}
      />
    </div>
  )
}
