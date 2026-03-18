'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, Icon, SectionKpiCards, type KpiCardData } from '@newwork/nw-design-system'
import { CaretRightIcon, ChatCircleIcon, PaperPlaneTiltIcon, UsersIcon, WarningCircleIcon } from '@phosphor-icons/react'
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
  /** When false (viewing another employee's profile), Suggested Actions are hidden. */
  isSelfView?: boolean
}

const trendLabel = (value: number) => (value > 0 ? `+${value}` : String(value))

const FeedbackHubKpiGrid: React.FC<FeedbackHubKpiGridProps> = ({
  t,
  kpis,
  pendingRequestsCount,
  accessToken,
  employee,
  onOpenPendingPanel,
  isSelfView = true
}) => {
  const kpiCards: KpiCardData[] = useMemo(
    () => [
      {
        id: 'feedback-received',
        title: t('feedback-hub-kpi-received-title'),
        value: String(kpis.receivedTotal),
        icon: <Icon icon={ChatCircleIcon} size="sm" decorative />,
        iconColor: 'var(--nw-info)',
        footer: t('feedback-hub-kpi-trend-30d', { value: trendLabel(kpis.receivedTrend) })
      },
      {
        id: 'feedback-given',
        title: t('feedback-hub-kpi-given-title'),
        value: String(kpis.givenTotal),
        icon: <Icon icon={PaperPlaneTiltIcon} size="sm" decorative />,
        iconColor: 'var(--nw-success)',
        footer: t('feedback-hub-kpi-trend-30d', { value: trendLabel(kpis.givenTrend) })
      },
      {
        id: 'feedback-contributors',
        title: t('feedback-hub-kpi-contributors-title'),
        value: String(kpis.distinctContributors),
        icon: <Icon icon={UsersIcon} size="sm" decorative />,
        iconColor: 'var(--nw-decorative)',
        footer: t('feedback-hub-kpi-trend-30d', { value: trendLabel(kpis.contributorTrend) })
      }
    ],
    [
      kpis.receivedTotal,
      kpis.givenTotal,
      kpis.distinctContributors,
      kpis.receivedTrend,
      kpis.givenTrend,
      kpis.contributorTrend,
      t
    ]
  )

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-4 gba:gap-3 gba:items-start">
      <div className={isSelfView ? 'gba:md:col-span-3' : 'gba:md:col-span-4'}>
        <SectionKpiCards cards={kpiCards} className="gba:w-full gba:md:grid-cols-3 nw:md:grid-cols-3" />
      </div>
      {isSelfView && (
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
                    <WarningCircleIcon className="gba:h-4 gba:w-4 gba:shrink-0" />
                    <CaretRightIcon className="gba:h-4 gba:w-4 gba:shrink-0" />
                  </button>
                </li>
              )}
              {!(kpis.daysSinceReceived != null && kpis.daysSinceReceived <= 30) && (
                <li className="gba:space-y-1.5">
                  <p className="gba:mt-0.5">
                    {t('feedback-hub-suggested-no-received', {
                      days:
                        kpis.daysSinceReceived != null ? String(kpis.daysSinceReceived) : t('feedback-hub-days-never')
                    })}
                  </p>
                  <AppAction
                    variant="update-secondary"
                    buttonSize="default"
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
      )}
    </div>
  )
}

export default FeedbackHubKpiGrid
