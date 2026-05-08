import React from 'react'
import { WidgetGroup } from '@/components/widget-group'
import { AddressBookIcon, UsersIcon, CurrencyCircleDollarIcon, TrendUpIcon } from '@phosphor-icons/react'
import { ContactQualityMatrix, ContactQualityData } from './widgets/ContactQualityMatrix'
import { ContactLifecycleChart } from './widgets/ContactLifecycleChart'
import { ContactDistributionPie } from './widgets/ContactDistributionPie'

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
  contactsByContactType?: Array<{ type: string; count: number }>
  contactsByContactTypeLoading?: boolean
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
  contactsByContactType = [],
  contactsByContactTypeLoading = false,
  qualityData,
  moduleColor = 'default'
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

      <ContactDistributionPie
        title="Contacts by Account Contact Type"
        description="Contacts grouped by account relationship type"
        data={contactsByContactType.map(item => ({ label: item.type, count: item.count }))}
        isLoading={contactsByContactTypeLoading}
        moduleColor={moduleColor}
        dataTestId="contacts-by-contact-type-chart"
      />

      {qualityData && <ContactQualityMatrix data={qualityData} moduleColor={moduleColor} />}
    </div>
  )
}

export default ContactsTabLayout
