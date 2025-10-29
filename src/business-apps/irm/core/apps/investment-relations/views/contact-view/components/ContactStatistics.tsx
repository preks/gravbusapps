import React, { useEffect, useState } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { UserOutlined, MailOutlined, TrophyOutlined, ContactsOutlined } from '@ant-design/icons'
// import type { InvestmentContact } from '@/common/data/investment/types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useContactStatisticsQueries } from '../queries/ContactStatisticsQueries'

type ContactStatisticsProps = BusinessAppContextProps

export const ContactStatistics: React.FC<ContactStatisticsProps> = ({ ...context }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const {
    fetchRecentContactsWithTrend,
    fetchActiveContactsWithTrend,
    fetchEmailEngagementsWithTrend,
    fetchContactsThisYearWithTrend
  } = useContactStatisticsQueries(context)

  const [recent, setRecent] = useState<{ current: number; changePercent: number; isPositive: boolean }>({
    current: 0,
    changePercent: 0,
    isPositive: true
  })
  const [active, setActive] = useState<{ current: number; changePercent: number; isPositive: boolean }>({
    current: 0,
    changePercent: 0,
    isPositive: true
  })
  const [email, setEmail] = useState<{ current: number; changePercent: number; isPositive: boolean }>({
    current: 0,
    changePercent: 0,
    isPositive: true
  })
  const [thisYear, setThisYear] = useState<{ current: number; changePercent: number; isPositive: boolean }>({
    current: 0,
    changePercent: 0,
    isPositive: true
  })

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [r, a, e, y] = await Promise.all([
          fetchRecentContactsWithTrend(),
          fetchActiveContactsWithTrend(),
          fetchEmailEngagementsWithTrend(),
          fetchContactsThisYearWithTrend()
        ])
        const calc = (t: { current: number; previous: number }) => ({
          current: t.current,
          changePercent: t.previous > 0 ? ((t.current - t.previous) / t.previous) * 100 : t.current > 0 ? 100 : 0,
          isPositive: t.current - t.previous >= 0
        })
        setRecent(calc(r))
        setActive(calc(a))
        setEmail(calc(e))
        setThisYear(calc(y))
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to load contact statistics'))
      } finally {
        setIsLoading(false)
      }
    }
    load()
    // Run once on mount; hooks are memoized with useCallback
  }, [])

  // Helper function to format trend percentage with proper sign
  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : ''
    return `${sign}${changePercent.toFixed(1)}%`
  }

  // Transform the trend data into widgets format with trend information
  const widgets: WidgetItem[] = [
    {
      key: 'recent-contacts',
      title: 'Recent Contacts',
      value: recent.current,
      prefix: <UserOutlined />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Past 2 weeks',
      trend: {
        value: formatTrendPercent(recent.changePercent),
        positive: recent.isPositive,
        description: 'vs previous 2 weeks'
      }
    },
    {
      key: 'active-contacts',
      title: 'Active Contacts',
      value: active.current,
      prefix: <ContactsOutlined />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Currently active',
      trend: {
        value: formatTrendPercent(active.changePercent),
        positive: active.isPositive,
        description: 'vs last month'
      }
    },
    {
      key: 'email-engagements',
      title: 'Email Engagements',
      value: email.current,
      prefix: <MailOutlined />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Contacts with email',
      trend: {
        value: formatTrendPercent(email.changePercent),
        positive: email.isPositive,
        description: 'vs last month'
      }
    },
    {
      key: 'this-year',
      title: 'This Year',
      value: thisYear.current,
      prefix: <TrophyOutlined />,
      color: '#eb2f96',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'New contacts',
      trend: {
        value: formatTrendPercent(thisYear.changePercent),
        positive: thisYear.isPositive,
        description: 'vs same period last year'
      }
    }
  ]

  return (
    <div data-testid="contact-statistics-with-trend-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={() => window.location.reload()}
        skeletonCount={4}
        emptyText="No contact statistics available."
        data-testid="contact-statistics-with-trend"
      />
    </div>
  )
}
