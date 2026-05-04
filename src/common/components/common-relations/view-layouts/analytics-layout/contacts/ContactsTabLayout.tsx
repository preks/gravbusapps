import React from 'react'
import { WidgetGroup } from '@/components/widget-group'
import { AddressBookIcon, UsersIcon, CurrencyCircleDollarIcon, TrendUpIcon } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { ContactInsightsDashboard, ContactInsightsDashboardData } from './widgets/ContactInsightsDashboard'
import { ContactQualityMatrix, ContactQualityData } from './widgets/ContactQualityMatrix'
import { ContactLifecycleChart } from './widgets/ContactLifecycleChart'

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

export interface ContactsOverTimePoint {
  date: string
  contactsCreated: number
}

export interface ContactsTabLayoutProps {
  title?: string
  totalContacts: number
  thisMonth: number
  lastMonth: number
  growth?: number
  totalLastMonth?: number
  totalGrowth?: number
  trendLoading?: boolean
  avgPerAccount?: number
  avgPerAccountLastMonth?: number
  selectedTimeFilter: TimeFilter
  onTimeFilterChange: (filter: TimeFilter) => void
  contactsOverTime: ContactsOverTimePoint[]
  topAccountsByContacts: Array<{ accountName: string; contactCount: number }>
  recentContacts: Array<{
    id: string
    name: string
    accountName?: string
    createdDate: string
    daysSinceCreated: number
  }>
  insightsData?: ContactInsightsDashboardData // optional: if provided, show dashboard widget
  qualityData?: ContactQualityData
  moduleColor?: string
  module: 'crm' | 'irm'
}

export const ContactsTabLayout: React.FC<ContactsTabLayoutProps> = ({
  totalContacts,
  thisMonth,
  lastMonth,
  growth,
  totalLastMonth,
  totalGrowth,
  trendLoading,
  avgPerAccount,
  avgPerAccountLastMonth,
  selectedTimeFilter,
  onTimeFilterChange,
  contactsOverTime,
  topAccountsByContacts,
  recentContacts,
  insightsData,
  qualityData,
  moduleColor = 'default',
  module
}) => {
  // Helper to calculate trend percentage
  const calculateTrendPercent = (current: number, previous: number): number => {
    if (previous > 0) {
      return Math.abs(((current - previous) / previous) * 100)
    }
    return current > 0 ? 100 : 0
  }

  const safeThisMonth = thisMonth || 0
  const safeLastMonth = lastMonth || 0
  const newThisMonthTrendPercent = calculateTrendPercent(safeThisMonth, safeLastMonth)
  const newThisMonthPositive = safeThisMonth >= safeLastMonth

  const safeAvg = avgPerAccount || 0
  const safeAvgLast = avgPerAccountLastMonth ?? undefined
  const avgPerAccountTrendPercent = safeAvgLast !== undefined ? calculateTrendPercent(safeAvg, safeAvgLast) : undefined
  const avgPerAccountPositive = safeAvgLast !== undefined ? safeAvg >= safeAvgLast : undefined
  const kpis = [
    {
      key: 'total-contacts',
      title: 'Total Contacts',
      value: totalContacts || 0,
      prefix: <AddressBookIcon size={16} />,
      description: 'All contacts in the system',
      ...(totalGrowth !== undefined && totalLastMonth !== undefined
        ? {
            trend: {
              value: `${(totalGrowth || 0) >= 0 ? '+' : ''}${totalGrowth.toFixed(1)}%`,
              positive: (totalGrowth || 0) >= 0,
              description: 'vs previous period (30 days ago)'
            }
          }
        : {})
    },
    {
      key: 'contacts-this-month',
      title: 'New This Month',
      value: thisMonth || 0,
      prefix: <TrendUpIcon size={16} />,
      description: 'Contacts created this month',
      ...(thisMonth !== undefined && lastMonth !== undefined
        ? {
            trend: {
              value: `${newThisMonthPositive ? '+' : ''}${newThisMonthTrendPercent.toFixed(1)}%`,
              positive: newThisMonthPositive,
              description: 'vs previous period (30 days ago)'
            }
          }
        : {})
    },
    {
      key: 'growth-rate',
      title: 'Monthly Growth',
      value: growth || 0,
      suffix: '%',
      prefix: <CurrencyCircleDollarIcon size={16} />,
      description: 'Month-over-month growth',
      ...(growth !== undefined
        ? {
            trend: {
              value: `${(growth || 0) >= 0 ? '+' : ''}${(growth || 0).toFixed(1)}%`,
              positive: (growth || 0) >= 0,
              description: 'vs previous period (30 days ago)'
            }
          }
        : {})
    },
    {
      key: 'avg-contacts-per-account',
      title: 'Average per Account',
      value: avgPerAccount || 0,
      precision: 1,
      prefix: <UsersIcon size={16} />,
      description: 'Average contacts per account',
      ...(avgPerAccount !== undefined && avgPerAccountLastMonth !== undefined
        ? {
            trend: {
              value: `${avgPerAccountPositive ? '+' : ''}${(avgPerAccountTrendPercent ?? 0).toFixed(1)}%`,
              positive: !!avgPerAccountPositive,
              description: 'vs previous period (30 days ago)'
            }
          }
        : {})
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid="contacts-analytics-tab">
      <div>
        <WidgetGroup widgets={kpis} isLoading={trendLoading} data-testid="contacts-key-metrics" />
      </div>

      <ContactLifecycleChart
        key={`contact-lifecycle-${selectedTimeFilter}`}
        data={contactsOverTime}
        isLoading={trendLoading}
        selectedTimeFilter={selectedTimeFilter}
        onTimeFilterChange={onTimeFilterChange}
        moduleColor={moduleColor}
      />

      {/** Optional full insights dashboard (exact copy from originals) */}
      {insightsData && <ContactInsightsDashboard data={insightsData} moduleColor={moduleColor} module={module} />}

      {!insightsData && (
        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
          <Card data-testid="top-accounts-by-contacts">
            <CardHeader>
              <CardTitle>Top Accounts by Contact Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-3 gba:max-h-80 gba:overflow-y-auto">
                {topAccountsByContacts.slice(0, 8).map((account, index) => (
                  <div
                    key={account.accountName}
                    className="gba:p-3 gba:bg-gray-50 gba:border gba:border-gray-200 gba:rounded-lg"
                    data-testid={`top-account-${index}`}
                  >
                    <div className="gba:flex gba:justify-between gba:items-center">
                      <div className="gba:flex-1">
                        <h5 className="gba:font-medium gba:text-gray-900 gba:text-sm">{account.accountName}</h5>
                      </div>
                      <div className="gba:text-right">
                        <span className="gba:text-xs gba:text-gray-600">{account.contactCount} contacts</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="recent-contacts">
            <CardHeader>
              <CardTitle>Recent Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-3">
                {recentContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="gba:p-3 gba:bg-gray-50 gba:border gba:border-gray-200 gba:rounded-lg"
                    data-testid={`recent-contact-${contact.id}`}
                  >
                    <div className="gba:flex gba:justify-between gba:items-start">
                      <div className="gba:flex-1">
                        <h5 className="gba:font-medium gba:text-gray-900 gba:text-sm">{contact.name}</h5>
                        {contact.accountName && (
                          <p className="gba:text-xs gba:text-gray-600 gba:mt-1">{contact.accountName}</p>
                        )}
                      </div>
                      <div className="gba:text-right">
                        <span className="gba:text-xs gba:text-gray-500">
                          {contact.daysSinceCreated === 0 ? 'Today' : `${contact.daysSinceCreated}d ago`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {qualityData && <ContactQualityMatrix data={qualityData} moduleColor={moduleColor} />}
    </div>
  )
}

export default ContactsTabLayout
