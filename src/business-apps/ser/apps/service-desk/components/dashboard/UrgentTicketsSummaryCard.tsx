import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@newwork/nw-design-system'
import { AlertTriangle, Clock, Activity, ArrowRight } from 'lucide-react'
import { useMyTickets } from './hooks/useMyTickets'

/**
 * Urgent Tickets Summary Card - Displays a quick summary of urgent tickets
 * with a call-to-action to navigate to the Tickets tab
 */
export interface UrgentTicketsSummaryCardProps extends BusinessAppContextProps {
  onNavigateToTickets?: (filter?: 'overdue' | 'dueToday' | 'inProgress') => void
}

export const UrgentTicketsSummaryCard: React.FC<UrgentTicketsSummaryCardProps> = ({
  accessToken,
  userInfo,
  onNavigateToTickets
}) => {
  const { dueToday, overdue, inProgressTickets, isLoading, error } = useMyTickets({
    accessToken,
    userInfo,
    limit: 100
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <AlertTriangle className="gba:h-5 gba:w-5 gba:text-orange-500" />
            {getTranslationFromI18nKeyAndLabel('services.dashboard.urgent_summary.title', 'Urgent Attention Needed')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:text-center gba:py-4 gba:text-muted-foreground">
            <p className="gba:text-sm">Loading...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <AlertTriangle className="gba:h-5 gba:w-5 gba:text-destructive" />
            {getTranslationFromI18nKeyAndLabel('services.dashboard.urgent_summary.error_title', 'Error')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="gba:text-sm gba:text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const hasUrgentTickets = overdue.length > 0 || dueToday.length > 0 || inProgressTickets.length > 0

  return (
    <Card className="gba:border-l-4 gba:border-l-orange-500" data-testid="urgent-tickets-summary-card">
      <CardHeader className="gba:pb-4">
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
          <AlertTriangle className="gba:h-5 gba:w-5 gba:text-orange-500" />
          {getTranslationFromI18nKeyAndLabel('services.dashboard.urgent_summary.title', 'Urgent Attention Needed')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasUrgentTickets ? (
          <div className="gba:text-center gba:py-4">
            <p className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'services.dashboard.urgent_summary.no_urgent',
                'Great! No urgent tickets at the moment.'
              )}
            </p>
          </div>
        ) : (
          <div className="gba:flex gba:flex-col gba:lg:flex-row gba:gap-4 gba:items-start gba:lg:items-center gba:justify-between">
            {/* Urgent Tickets List - Horizontal on Desktop */}
            <div className="gba:flex gba:flex-col gba:lg:flex-row gba:gap-3 gba:flex-1 gba:w-full gba:lg:w-auto">
              {/* Overdue Tickets */}
              {overdue.length > 0 && (
                <button
                  onClick={() => onNavigateToTickets?.('overdue')}
                  className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-destructive/10 hover:gba:bg-destructive/20 gba:transition-colors gba:text-left gba:flex-1"
                >
                  <AlertTriangle className="gba:h-5 gba:w-5 gba:text-destructive gba:flex-shrink-0" />
                  <div className="gba:flex-1">
                    <p className="gba:font-semibold gba:text-foreground gba:flex gba:items-center gba:gap-2">
                      {overdue.length} {overdue.length === 1 ? 'ticket' : 'tickets'} overdue
                    </p>
                    <p className="gba:text-xs gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel(
                        'services.dashboard.urgent_summary.overdue_desc',
                        'Requires immediate attention'
                      )}
                    </p>
                  </div>
                </button>
              )}

              {/* Due Today */}
              {dueToday.length > 0 && (
                <button
                  onClick={() => onNavigateToTickets?.('dueToday')}
                  className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-orange-500/10 hover:gba:bg-orange-500/20 gba:transition-colors gba:text-left gba:flex-1"
                >
                  <Clock className="gba:h-5 gba:w-5 gba:text-orange-500 gba:flex-shrink-0" />
                  <div className="gba:flex-1">
                    <p className="gba:font-semibold gba:text-foreground gba:flex gba:items-center gba:gap-2">
                      {dueToday.length} {dueToday.length === 1 ? 'ticket' : 'tickets'} due today
                    </p>
                    <p className="gba:text-xs gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel(
                        'services.dashboard.urgent_summary.due_today_desc',
                        'Complete before end of day'
                      )}
                    </p>
                  </div>
                </button>
              )}

              {/* In Progress */}
              {inProgressTickets.length > 0 && (
                <button
                  onClick={() => onNavigateToTickets?.('inProgress')}
                  className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-blue-500/10 hover:gba:bg-blue-500/20 gba:transition-colors gba:text-left gba:flex-1"
                >
                  <Activity className="gba:h-5 gba:w-5 gba:text-blue-500 gba:flex-shrink-0" />
                  <div className="gba:flex-1">
                    <p className="gba:font-semibold gba:text-foreground gba:flex gba:items-center gba:gap-2">
                      {inProgressTickets.length} {inProgressTickets.length === 1 ? 'ticket' : 'tickets'} in progress
                    </p>
                    <p className="gba:text-xs gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel(
                        'services.dashboard.urgent_summary.in_progress_desc',
                        'Currently working on'
                      )}
                    </p>
                  </div>
                </button>
              )}
            </div>

            {/* Call to Action - Right Side on Desktop */}
            <Button
              onClick={() => onNavigateToTickets?.()}
              className="gba:w-full gba:lg:w-auto gba:whitespace-nowrap"
              variant="default"
            >
              {getTranslationFromI18nKeyAndLabel('services.dashboard.urgent_summary.view_all', 'Go to My Tickets')}
              <ArrowRight className="gba:ml-2 gba:h-4 gba:w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
