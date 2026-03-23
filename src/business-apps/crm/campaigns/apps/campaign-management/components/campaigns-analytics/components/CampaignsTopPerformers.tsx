import React, { useState } from 'react'
import { Alert, AlertDescription, Button, Card, CardContent } from '@newwork/nw-design-system'
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
      <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">{label}</span>
    </div>
    <div className="gba:text-sm gba:font-bold gba:text-foreground">{value}</div>
    {subtitle && <div className="gba:text-xs gba:text-muted-foreground">{subtitle}</div>}
  </div>
)

// Reusable empty state component
interface EmptyStateProps {
  icon: React.ReactNode
  message: string
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, message }) => (
  <Card className="gba:border-dashed">
    <CardContent className="gba:p-8 gba:text-center">
      <div className="gba:text-3xl gba:mb-2 gba:text-muted-foreground">{icon}</div>
      <p className="gba:text-sm gba:text-muted-foreground">{message}</p>
    </CardContent>
  </Card>
)

// Reusable performance card component
interface PerformanceCardProps {
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
  name,
  subtitle,
  index,
  stats,
  revenue,
  revenueLabel = 'Revenue',
  testIdPrefix
}) => (
  <Card data-testid={`${testIdPrefix}-${index}`}>
    <CardContent className="gba:p-4">
      <div className="gba:flex gba:flex-col gba:gap-4 gba:sm:flex-row gba:sm:items-center gba:sm:justify-between">
        <div className="gba:flex gba:items-start gba:gap-3 gba:min-w-0">
          {index === 0 && <TrophyIcon className="gba:text-lg gba:shrink-0 gba:text-[var(--nw-chart-4)]" aria-hidden />}
          <div className="gba:min-w-0">
            <h4 className="gba:text-sm gba:font-semibold gba:text-foreground gba:truncate">{name}</h4>
            <span className="gba:inline-block gba:text-xs gba:px-2 gba:py-0.5 gba:rounded-full gba:font-medium gba:bg-muted gba:text-foreground gba:mt-1">
              #{index + 1}
            </span>
            {subtitle && <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">{subtitle}</div>}
          </div>
        </div>
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4 gba:sm:gap-6 gba:flex-1 gba:justify-end">
          {stats.map(stat => (
            <StatCard key={stat.label} {...stat} />
          ))}
          <div className="gba:text-center gba:w-full gba:border-t gba:border-border gba:pt-4 gba:sm:w-auto gba:sm:border-t-0 gba:sm:border-l gba:sm:pt-0 gba:sm:pl-4 gba:min-w-24">
            <div className="gba:text-xs gba:mb-1 gba:text-muted-foreground">{revenueLabel}</div>
            <div className="gba:text-lg gba:font-bold gba:text-[var(--nw-chart-2)]">
              {formatCurrencyCompact(revenue, 'USD')}
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
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
        <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-primary gba:mx-auto gba:mb-4" />
        <p className="gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('campaigns.analytics.topPerformers.loading', 'Loading top performers...')}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <Card data-testid="campaigns-top-performers-error">
        <CardContent className="gba:p-6">
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
        </CardContent>
      </Card>
    )
  }

  // UI matching record view with tabs
  const performers = (topEmployees || []).slice(0, 5).map(mapEmployeeToPerformer)

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
                className="gba:space-y-4 gba:bg-muted gba:rounded-lg gba:p-4"
                style={{ maxHeight: '480px', overflowY: 'auto', overflowX: 'hidden' }}
                data-testid="top-campaigns-list"
              >
                {topCampaigns && topCampaigns.length > 0 ? (
                  topCampaigns
                    .slice(0, 5)
                    .map((c, index) => (
                      <PerformanceCard
                        key={c.campaignId}
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
                className="gba:space-y-4 gba:bg-muted gba:rounded-lg gba:p-4"
                style={{ maxHeight: '480px', overflowY: 'auto', overflowX: 'hidden' }}
                data-testid="top-employees-list"
              >
                {performers && performers.length > 0 ? (
                  performers.map((performer: PerformerData, index: number) => (
                    <PerformanceCard
                      key={performer.employeeId}
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
