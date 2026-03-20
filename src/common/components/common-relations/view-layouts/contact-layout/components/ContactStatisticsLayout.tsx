import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { UserIcon, UsersIcon, TrophyIcon, AddressBookIcon } from '@phosphor-icons/react'

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
  totalContacts: TrendData
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
  const { recentContacts, activeContacts, totalContacts, contactsThisYear, isLoading, error, refetch } = statistics

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
      prefix: <UserIcon size={16} />,
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
      prefix: <AddressBookIcon />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'With active opportunities',
      trend: {
        value: formatTrendPercent(activeContacts.changePercent),
        positive: activeContacts.isPositive,
        description: 'vs last month'
      }
    },
    {
      key: 'total-contacts',
      title: 'Total Contacts',
      value: totalContacts.current,
      prefix: <UsersIcon size={16} />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'All contacts in system',
      trend: {
        value: formatTrendPercent(totalContacts.changePercent),
        positive: totalContacts.isPositive,
        description: 'vs last month'
      }
    },
    {
      key: 'this-year',
      title: 'This Year',
      value: contactsThisYear.current,
      prefix: <TrophyIcon size={16} />,
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
