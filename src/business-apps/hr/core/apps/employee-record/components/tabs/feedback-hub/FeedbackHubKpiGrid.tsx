'use client'

import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { AlertCircle, ChevronRight, MessageSquare, Send, TrendingUp, Users } from 'lucide-react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Employee } from '../../../hooks/useEmployeeData'
import { FeedbackHubKpis } from './types'

interface FeedbackHubKpiGridProps {
  t: (key: string, options?: Record<string, unknown>) => string
  kpis: FeedbackHubKpis
  pendingRequestsCount: number
  accessToken: string
  employee: Employee
  onOpenPendingPanel: () => void
}

const trendLabel = (value: number) => (value > 0 ? `+${value}` : String(value))

const FeedbackHubKpiGrid: React.FC<FeedbackHubKpiGridProps> = ({
  t,
  kpis,
  pendingRequestsCount,
  accessToken,
  employee,
  onOpenPendingPanel
}) => (
  <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-4 gba:gap-4 gba:items-start">
    <Card>
      <CardContent className="gba:p-4">
        <p className="gba:text-sm gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
          <MessageSquare className="gba:h-4 gba:w-4" />
          {t('feedback-hub-kpi-received-title')}
        </p>
        <p className="gba:text-2xl gba:font-semibold">{kpis.receivedTotal}</p>
        <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
          <TrendingUp className="gba:h-3.5 gba:w-3.5" />
          {t('feedback-hub-kpi-trend-30d', { value: trendLabel(kpis.receivedTrend) })}
        </p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="gba:p-4">
        <p className="gba:text-sm gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
          <Send className="gba:h-4 gba:w-4" />
          {t('feedback-hub-kpi-given-title')}
        </p>
        <p className="gba:text-2xl gba:font-semibold">{kpis.givenTotal}</p>
        <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
          <TrendingUp className="gba:h-3.5 gba:w-3.5" />
          {t('feedback-hub-kpi-trend-30d', { value: trendLabel(kpis.givenTrend) })}
        </p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="gba:p-4">
        <p className="gba:text-sm gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
          <Users className="gba:h-4 gba:w-4" />
          {t('feedback-hub-kpi-contributors-title')}
        </p>
        <p className="gba:text-2xl gba:font-semibold">{kpis.distinctContributors}</p>
        <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
          <TrendingUp className="gba:h-3.5 gba:w-3.5" />
          {t('feedback-hub-kpi-trend-30d', { value: trendLabel(kpis.contributorTrend) })}
        </p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="gba:p-4">
        <p className="gba:text-sm gba:font-medium gba:mb-3">{t('feedback-hub-suggested-actions-title')}</p>
        <ul className="gba:list-disc gba:pl-5 gba:space-y-3 gba:text-sm gba:text-muted-foreground">
          {pendingRequestsCount > 0 && (
            <li>
              <button
                type="button"
                className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-left gba:text-primary hover:gba:underline gba:font-medium gba:mt-0.5"
                onClick={onOpenPendingPanel}
              >
                {t('feedback-hub-suggested-pending', { count: pendingRequestsCount })}
                <AlertCircle className="gba:h-4 gba:w-4 gba:shrink-0" />
                <ChevronRight className="gba:h-4 gba:w-4 gba:shrink-0" />
              </button>
            </li>
          )}
          {(kpis.daysSinceReceived == null || kpis.daysSinceReceived > 30) && (
            <li className="gba:space-y-1.5">
              <p className="gba:mt-0.5">
                {t('feedback-hub-suggested-no-received', {
                  days: kpis.daysSinceReceived != null ? String(kpis.daysSinceReceived) : t('feedback-hub-days-never')
                })}
              </p>
              <AppAction
                variant="update-primary"
                contexts={[
                  {
                    context: FlowContextName.employeeRequestFeedback,
                    contextData: { employeeId: employee?.id, isRequestingFeedback: true }
                  }
                ]}
                prefixDataTestId="suggested-request-feedback"
                accessToken={accessToken}
                autoExecute={true}
              >
                {t('feedback-hub-request-feedback')}
              </AppAction>
            </li>
          )}
          {(kpis.daysSinceGiven == null || kpis.daysSinceGiven > 30) && (
            <li className="gba:space-y-1.5">
              <p className="gba:mt-0.5">{t('feedback-hub-suggested-no-given')}</p>
              <AppAction
                variant="update-secondary"
                buttonSize="default"
                contexts={[
                  { context: FlowContextName.employeeGiveFeedback, contextData: { employeeId: employee?.id } }
                ]}
                prefixDataTestId="suggested-give-feedback"
                accessToken={accessToken}
                autoExecute={true}
              >
                {t('feedback-hub-give-feedback')}
              </AppAction>
            </li>
          )}
          {pendingRequestsCount === 0 &&
            kpis.daysSinceReceived != null &&
            kpis.daysSinceReceived <= 30 &&
            kpis.daysSinceGiven != null &&
            kpis.daysSinceGiven <= 30 && (
              <li>
                <p className="gba:mt-0.5">{t('feedback-hub-suggested-healthy')}</p>
              </li>
            )}
        </ul>
      </CardContent>
    </Card>
  </div>
)

export default FeedbackHubKpiGrid
