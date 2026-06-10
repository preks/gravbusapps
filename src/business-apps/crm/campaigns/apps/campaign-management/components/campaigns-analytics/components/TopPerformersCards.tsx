import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { UserIcon, CurrencyDollarIcon, AddressBookIcon, BankIcon, TrophyIcon } from '@phosphor-icons/react'
import { formatCurrencyCompact, formatPercentage as formatPct } from '@/common/utils/numberFormatter'

interface StatCardProps {
  icon: React.ReactNode
  iconClassName: string
  label: string
  value: number | string
  subtitle?: string
}

const StatCard: React.FC<StatCardProps> = ({ icon, iconClassName, label, value, subtitle }) => (
  <div className="gba:text-center">
    <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
      <span className={`gba:text-xs ${iconClassName}`}>{icon}</span>
      <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">{label}</span>
    </div>
    <div className="gba:text-sm gba:font-bold gba:text-foreground">{value}</div>
    {subtitle && <div className="gba:text-xs gba:text-muted-foreground">{subtitle}</div>}
  </div>
)

interface EmptyStateProps {
  icon: React.ReactNode
  message: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, message }) => (
  <Card className="gba:border-dashed">
    <CardContent className="gba:p-8 gba:text-center">
      <div className="gba:text-3xl gba:mb-2 gba:text-muted-foreground">{icon}</div>
      <p className="gba:text-sm gba:text-muted-foreground">{message}</p>
    </CardContent>
  </Card>
)

interface PerformanceCardProps {
  name: string
  subtitle?: string
  index: number
  stats: Array<{
    icon: React.ReactNode
    iconClassName: string
    label: string
    value: number
    subtitle?: string
  }>
  revenue: number
  revenueLabel?: string
  testIdPrefix: string
}

export const PerformanceCard: React.FC<PerformanceCardProps> = ({
  name,
  subtitle,
  index,
  stats,
  revenue,
  revenueLabel = 'Revenue',
  testIdPrefix
}) => (
  <Card className="gba:bg-muted/50 gba:border-border gba:shadow-sm" data-testid={`${testIdPrefix}-${index}`}>
    <CardContent className="gba:p-4">
      <div className="gba:flex gba:flex-col gba:gap-4 gba:sm:flex-row gba:sm:items-center gba:sm:justify-between">
        <div className="gba:flex gba:items-start gba:gap-3 gba:min-w-0">
          {index === 0 && <TrophyIcon className="gba:text-lg gba:shrink-0 gba:text-warning" aria-hidden />}
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
            <div className="gba:text-lg gba:font-bold gba:text-success">{formatCurrencyCompact(revenue, 'USD')}</div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

const getPercentage = (converted: number, total: number): number => {
  return total > 0 ? Math.round((converted / total) * 100) : 0
}

export const buildCampaignStats = (c: {
  leadsCount?: number
  conversionRate?: number
  opportunitiesCount?: number
  wonOpportunitiesCount?: number
  contactsCount?: number
  accountsCount?: number
}) => [
  {
    icon: <UserIcon className="gba:text-xs" />,
    iconClassName: 'gba:text-primary',
    label: 'Leads',
    value: c.leadsCount || 0,
    subtitle: `Conv: ${formatPct(c.conversionRate || 0)}`
  },
  {
    icon: <CurrencyDollarIcon className="gba:text-xs" />,
    iconClassName: 'gba:text-success',
    label: 'Opps',
    value: c.opportunitiesCount || 0,
    subtitle: `${c.wonOpportunitiesCount || 0}/${c.opportunitiesCount || 0} (${getPercentage(c.wonOpportunitiesCount || 0, c.opportunitiesCount || 0)}%)`
  },
  {
    icon: <AddressBookIcon className="gba:text-xs" />,
    iconClassName: 'gba:text-warning',
    label: 'Contacts',
    value: c.contactsCount || 0
  },
  {
    icon: <BankIcon className="gba:text-xs" />,
    iconClassName: 'gba:text-info',
    label: 'Accounts',
    value: c.accountsCount || 0
  }
]
