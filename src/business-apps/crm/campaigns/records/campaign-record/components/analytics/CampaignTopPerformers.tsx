import React from 'react'
import { TrophyIcon, UserIcon, CurrencyDollarIcon, AddressBookIcon, BankIcon } from '@phosphor-icons/react'
import { Alert, AlertDescription, Button } from '@newwork/nw-design-system'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'

interface TopPerformer {
  employeeId: string
  employeeName: string
  leads: { total: number; converted: number }
  opportunities: { total: number; won: number }
  contacts: { total: number }
  accounts: { total: number }
  revenue: number
}

interface CampaignTopPerformersProps {
  performers: TopPerformer[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

const CampaignTopPerformers: React.FC<CampaignTopPerformersProps> = ({
  performers,
  isLoading = false,
  error = null,
  onRetry
}) => {
  if (isLoading) {
    return (
      <div className="gba:p-8 gba:text-center" data-testid="top-performers-loading">
        <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-primary gba:mx-auto gba:mb-4"></div>
        <p className="gba:text-muted-foreground">Loading top performers...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:rounded-lg gba:shadow-md gba:bg-card" data-testid="top-performers-error-container">
        <Alert variant="destructive" data-testid="top-performers-error-alert">
          <AlertDescription>
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <div className="gba:font-semibold gba:mb-1">Error Loading Top Performers</div>
                <div>{error}</div>
              </div>
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry} data-testid="top-performers-retry-button">
                  Retry
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!performers || performers.length === 0) {
    return (
      <div className="gba:space-y-6" data-testid="campaign-top-performers-container">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:mb-2 gba:text-foreground">Top Performers</h3>
          <p className="gba:text-sm gba:text-muted-foreground">Top 5 employees ranked by won revenue</p>
        </div>

        <div className="gba:p-8 gba:text-center gba:rounded-lg gba:bg-muted">
          <UserIcon className="gba:text-3xl gba:mb-4 gba:text-muted-foreground" />
          <p className="gba:text-muted-foreground">No performance data available yet.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="gba:mb-4">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-2 gba:text-foreground">Top Performers</h3>
        <p className="gba:text-sm gba:text-muted-foreground">Top 5 employees ranked by won revenue</p>
      </div>

      {/* Performers List */}
      <div className="gba:space-y-3" data-testid="campaign-top-performers-list">
        {performers.map((performer, index) => (
          <div
            key={performer.employeeId}
            className="gba:p-4 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:shadow-md"
            data-testid={`top-performer-${index}`}
          >
            <div className="gba:flex gba:items-center gba:justify-between">
              {/* Left Side - Employee Info */}
              <div className="gba:flex gba:items-center gba:gap-3">
                {index === 0 && (
                  <TrophyIcon className="gba:text-lg gba:text-warning" data-testid="first-place-trophy" />
                )}
                <div>
                  <h4 className="gba:text-sm gba:font-semibold gba:text-foreground">{performer.employeeName}</h4>
                  <span className="gba:text-xs gba:px-2 gba:py-0.5 gba:rounded-full gba:font-medium gba:bg-muted gba:text-foreground">
                    #{index + 1}
                  </span>
                </div>
              </div>

              {/* Right Side - Entity Breakdown */}
              <div className="gba:flex gba:items-center gba:gap-6">
                {/* Leads */}
                <div className="gba:text-center">
                  <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                    <UserIcon className="gba:text-xs gba:text-primary" />
                    <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">Leads</span>
                  </div>
                  <div className="gba:text-sm gba:font-bold gba:text-foreground">{performer.leads.total}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">
                    {performer.leads.converted}/{performer.leads.total} (
                    {performer.leads.total > 0
                      ? Math.round((performer.leads.converted / performer.leads.total) * 100)
                      : 0}
                    %)
                  </div>
                </div>

                {/* Opportunities */}
                <div className="gba:text-center">
                  <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                    <CurrencyDollarIcon className="gba:text-xs gba:text-success" />
                    <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">Opps</span>
                  </div>
                  <div className="gba:text-sm gba:font-bold gba:text-foreground">{performer.opportunities.total}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">
                    {performer.opportunities.won}/{performer.opportunities.total} (
                    {performer.opportunities.total > 0
                      ? Math.round((performer.opportunities.won / performer.opportunities.total) * 100)
                      : 0}
                    %)
                  </div>
                </div>

                {/* Contacts */}
                <div className="gba:text-center">
                  <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                    <AddressBookIcon className="gba:text-xs gba:text-warning" />
                    <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">Contacts</span>
                  </div>
                  <div className="gba:text-sm gba:font-bold gba:text-foreground">{performer.contacts.total}</div>
                </div>

                {/* Accounts */}
                <div className="gba:text-center">
                  <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                    <BankIcon className="gba:text-xs gba:text-info" />
                    <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">Accounts</span>
                  </div>
                  <div className="gba:text-sm gba:font-bold gba:text-foreground">{performer.accounts.total}</div>
                </div>

                {/* Revenue */}
                <div className="gba:text-center gba:pl-4 gba:border-l gba:border-border">
                  <div className="gba:text-xs gba:mb-1 gba:text-muted-foreground">Won Revenue</div>
                  <div className="gba:text-lg gba:font-bold gba:text-success">
                    {formatCurrencyCompact(performer.revenue, 'EUR')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default CampaignTopPerformers
