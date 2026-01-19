import React, { useState } from 'react'
import { Alert, AlertDescription, Button } from '@newwork/nw-design-system'
import {
  UserIcon,
  CurrencyDollarIcon,
  AddressBookIcon,
  BankIcon,
  TrophyIcon,
  ChartBarIcon
} from '@phosphor-icons/react'
import { Tabs } from 'antd'
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyCompact, formatPercentage as formatPct } from '@/common/utils/numberFormatter'

// Reusable stat card component to eliminate duplication
interface StatCardProps {
  icon: React.ReactNode
  iconColor: string
  label: string
  value: number | string
  subtitle?: string
}

const StatCard: React.FC<StatCardProps> = ({ icon, iconColor, label, value, subtitle }) => (
  <div className="gba:text-center">
    <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
      <span className="gba:text-xs" style={{ color: iconColor }}>
        {icon}
      </span>
      <span className="gba:text-xs gba:font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
    </div>
    <div className="gba:text-sm gba:font-bold" style={{ color: 'var(--color-text-primary)' }}>
      {value}
    </div>
    {subtitle && (
      <div className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {subtitle}
      </div>
    )}
  </div>
)

// Reusable empty state component
interface EmptyStateProps {
  icon: React.ReactNode
  message: string
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, message }) => (
  <div className="gba:p-8 gba:text-center gba:rounded-lg" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
    <div className="gba:text-3xl gba:mb-2">{icon}</div>
    <div style={{ color: 'var(--color-text-secondary)' }}>{message}</div>
  </div>
)

// Reusable performance card component
interface PerformanceCardProps {
  id: string
  name: string
  subtitle?: string
  index: number
  stats: Array<{
    icon: React.ReactNode
    iconColor: string
    label: string
    value: number
    subtitle?: string
  }>
  revenue: number
  revenueLabel?: string
  testIdPrefix: string
}

const PerformanceCard: React.FC<PerformanceCardProps> = ({
  id,
  name,
  subtitle,
  index,
  stats,
  revenue,
  revenueLabel = 'Revenue',
  testIdPrefix
}) => (
  <div
    key={id}
    className="gba:p-4 gba:rounded-lg"
    style={{
      backgroundColor: 'var(--color-surface-primary)',
      boxShadow: 'var(--shadow-md)',
      border: 'var(--border-width-thin) solid var(--color-border-default)'
    }}
    data-testid={`${testIdPrefix}-${index}`}
  >
    <div className="gba:flex gba:items-center gba:justify-between">
      <div className="gba:flex gba:items-center gba:gap-3">
        {index === 0 && <TrophyIcon className="gba:text-lg" style={{ color: 'var(--color-warning-500)' }} />}
        <div>
          <h4 className="gba:text-sm gba:font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {name}
          </h4>
          <span
            className="gba:text-xs gba:px-2 gba:py-0.5 gba:rounded-full gba:font-medium"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-text-primary)'
            }}
          >
            #{index + 1}
          </span>
          {subtitle && (
            <div className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <div className="gba:flex gba:items-center gba:gap-6">
        {stats.map(stat => (
          <StatCard key={stat.label} {...stat} />
        ))}
        <div className="gba:text-center gba:pl-4 gba:border-l" style={{ borderColor: 'var(--color-border-default)' }}>
          <div className="gba:text-xs gba:mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            {revenueLabel}
          </div>
          <div className="gba:text-lg gba:font-bold" style={{ color: 'var(--color-success-600)' }}>
            {formatCurrencyCompact(revenue, 'USD')}
          </div>
        </div>
      </div>
    </div>
  </div>
)

// Map employee analytics item into the performer UI model
interface EmployeeAnalyticsItem {
  employeeId: string
  employeeName: string
  leadsCount?: number
  convertedLeadsCount?: number
  opportunitiesCount?: number
  wonOpportunitiesCount?: number
  contactsCount?: number
  accountsCount?: number
  totalRevenue?: number
}

interface PerformerData {
  employeeId: string
  employeeName: string
  leads: { total: number; converted: number }
  opportunities: { total: number; won: number }
  contacts: { total: number }
  accounts: { total: number }
  revenue: number
}

const mapEmployeeToPerformer = (e: EmployeeAnalyticsItem): PerformerData => ({
  employeeId: e.employeeId,
  employeeName: e.employeeName,
  leads: { total: e.leadsCount || 0, converted: e.convertedLeadsCount || 0 },
  opportunities: { total: e.opportunitiesCount || 0, won: e.wonOpportunitiesCount || 0 },
  contacts: { total: e.contactsCount || 0 },
  accounts: { total: e.accountsCount || 0 },
  revenue: e.totalRevenue || 0
})

const getPercentage = (converted: number, total: number): number => {
  return total > 0 ? Math.round((converted / total) * 100) : 0
}

// Helper to build campaign stats configuration - eliminates duplication
const buildCampaignStats = (c: {
  leadsCount?: number
  conversionRate?: number
  opportunitiesCount?: number
  wonOpportunitiesCount?: number
  contactsCount?: number
  accountsCount?: number
}) => [
  {
    icon: <UserIcon className="gba:text-xs" />,
    iconColor: 'var(--color-primary-500)',
    label: 'Leads',
    value: c.leadsCount || 0,
    subtitle: `Conv: ${formatPct(c.conversionRate || 0)}`
  },
  {
    icon: <CurrencyDollarIcon className="gba:text-xs" />,
    iconColor: 'var(--color-success-500)',
    label: 'Opps',
    value: c.opportunitiesCount || 0,
    subtitle: `${c.wonOpportunitiesCount || 0}/${c.opportunitiesCount || 0} (${getPercentage(c.wonOpportunitiesCount || 0, c.opportunitiesCount || 0)}%)`
  },
  {
    icon: <AddressBookIcon className="gba:text-xs" />,
    iconColor: 'var(--color-warning-500)',
    label: 'Contacts',
    value: c.contactsCount || 0
  },
  {
    icon: <BankIcon className="gba:text-xs" />,
    iconColor: 'var(--color-info-500)',
    label: 'Accounts',
    value: c.accountsCount || 0
  }
]

// Helper to build performer stats configuration - eliminates duplication
const buildPerformerStats = (performer: PerformerData) => [
  {
    icon: <UserIcon className="gba:text-xs" />,
    iconColor: 'var(--color-primary-500)',
    label: 'Leads',
    value: performer.leads.total,
    subtitle: `${performer.leads.converted}/${performer.leads.total} (${getPercentage(performer.leads.converted, performer.leads.total)}%)`
  },
  {
    icon: <CurrencyDollarIcon className="gba:text-xs" />,
    iconColor: 'var(--color-success-500)',
    label: 'Opps',
    value: performer.opportunities.total,
    subtitle: `${performer.opportunities.won}/${performer.opportunities.total} (${getPercentage(performer.opportunities.won, performer.opportunities.total)}%)`
  },
  {
    icon: <AddressBookIcon className="gba:text-xs" />,
    iconColor: 'var(--color-warning-500)',
    label: 'Contacts',
    value: performer.contacts.total
  },
  {
    icon: <BankIcon className="gba:text-xs" />,
    iconColor: 'var(--color-info-500)',
    label: 'Accounts',
    value: performer.accounts.total
  }
]

const CampaignsTopPerformers: React.FC<CampaignsAnalyticsComponentProps> = ({
  topCampaigns = [],
  topEmployees = [],
  isLoading = false,
  error = null,
  onRetry
}) => {
  const [activeTab, setActiveTab] = useState('campaigns')

  if (isLoading) {
    return (
      <div className="gba:p-8 gba:text-center" data-testid="campaigns-top-performers-loading">
        <div
          className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:mx-auto gba:mb-4"
          style={{ borderColor: 'var(--color-primary-500)' }}
        />
        <p style={{ color: 'var(--color-text-secondary)' }}>
          {getTranslationFromI18nKeyAndLabel('campaigns.analytics.topPerformers.loading', 'Loading top performers...')}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="gba:p-6 gba:rounded-lg gba:shadow-md"
        style={{ backgroundColor: 'var(--color-surface-primary)' }}
        data-testid="campaigns-top-performers-error"
      >
        <Alert variant="destructive">
          <AlertDescription>
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <div className="gba:font-semibold gba:mb-1">
                  {getTranslationFromI18nKeyAndLabel(
                    'campaigns.analytics.topPerformers.errorTitle',
                    'Error Loading Top Performers'
                  )}
                </div>
                <div>{error}</div>
              </div>
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // UI matching record view with tabs
  const performers = (topEmployees || []).map(mapEmployeeToPerformer)

  // Build tabs for Top Campaigns and Top Employees
  return (
    <div data-testid="campaigns-top-performers-tabs">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            label: (
              <span>
                <ChartBarIcon />
                {getTranslationFromI18nKeyAndLabel('campaigns.analytics.topPerformers.campaigns', 'Top Campaigns')}
              </span>
            ),
            key: 'campaigns',
            children: (
              <div
                className="gba:space-y-6 gba:bg-white gba:pb-6"
                style={{ maxHeight: '480px', overflowY: 'auto', overflowX: 'hidden' }}
                data-testid="top-campaigns-list"
              >
                {topCampaigns && topCampaigns.length > 0 ? (
                  topCampaigns
                    .slice(0, 5)
                    .map((c, index) => (
                      <PerformanceCard
                        key={c.campaignId}
                        id={c.campaignId}
                        name={c.campaignName}
                        subtitle={`${c.campaignType} • ${c.status}`}
                        index={index}
                        stats={buildCampaignStats(c)}
                        revenue={c.totalRevenue || 0}
                        revenueLabel="Revenue"
                        testIdPrefix="analytics-top-campaign"
                      />
                    ))
                ) : (
                  <EmptyState
                    icon={<ChartBarIcon />}
                    message={getTranslationFromI18nKeyAndLabel(
                      'campaigns.analytics.topPerformers.noCampaigns',
                      'No campaign performance data available'
                    )}
                  />
                )}
              </div>
            )
          },
          {
            label: (
              <span>
                <UserIcon />
                {getTranslationFromI18nKeyAndLabel('campaigns.analytics.topPerformers.employees', 'Top Employees')}
              </span>
            ),
            key: 'employees',
            children: (
              <div
                className="gba:space-y-6 gba:bg-white gba:pb-6"
                style={{ maxHeight: '480px', overflowY: 'auto', overflowX: 'hidden' }}
                data-testid="top-employees-list"
              >
                {performers && performers.length > 0 ? (
                  performers.map((performer: PerformerData, index: number) => (
                    <PerformanceCard
                      key={performer.employeeId}
                      id={performer.employeeId}
                      name={performer.employeeName}
                      index={index}
                      stats={buildPerformerStats(performer)}
                      revenue={performer.revenue}
                      revenueLabel="Won Revenue"
                      testIdPrefix="analytics-top-performer"
                    />
                  ))
                ) : (
                  <EmptyState
                    icon={<UserIcon />}
                    message={getTranslationFromI18nKeyAndLabel(
                      'campaigns.analytics.topPerformers.noEmployees',
                      'No employee performance data available'
                    )}
                  />
                )}
              </div>
            )
          }
        ]}
      />
    </div>
  )
}

export default CampaignsTopPerformers
