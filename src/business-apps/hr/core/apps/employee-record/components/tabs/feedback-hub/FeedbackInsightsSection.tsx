'use client'

import React, { useMemo } from 'react'
import { Button } from '@newwork/nw-design-system'
import { ChatCircleIcon, EnvelopeSimpleIcon, HandHeartIcon, ScalesIcon, SparkleIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Employee } from '../../../hooks/useEmployeeData'
import { HrGrowthInsightCard, HrGrowthInsightsSection } from '../components/HrGrowthInsightsSection'
import { FeedbackHubKpis } from './types'

interface FeedbackInsightsSectionProps {
  t: (key: string, options?: Record<string, unknown>) => string
  kpis: FeedbackHubKpis
  pendingRequestsCount: number
  accessToken: string
  employee: Employee
  onOpenPendingPanel: () => void
  isSelfView?: boolean
  receivedList?: Array<{ type?: string; content?: string }>
}

type FeedbackInsightAction =
  | 'open_pending_panel'
  | 'open_give_feedback_flow'
  | 'open_request_feedback_flow'
  | 'open_send_appreciation_flow'

interface FeedbackInsightCard extends HrGrowthInsightCard {
  cta?: {
    label: string
    action: FeedbackInsightAction
  }
}

function buildInsights(
  t: FeedbackInsightsSectionProps['t'],
  kpis: FeedbackHubKpis,
  pendingRequestsCount: number,
  receivedList: FeedbackInsightsSectionProps['receivedList']
): FeedbackInsightCard[] {
  const cards: FeedbackInsightCard[] = []

  if (pendingRequestsCount > 0) {
    cards.push({
      id: 'pending-request',
      priority: 'high',
      icon: <EnvelopeSimpleIcon className="gba:h-5 gba:w-5" weight="fill" />,
      title: t('feedback-hub-insight-pending-title'),
      description: t('feedback-hub-insight-pending-description', { count: pendingRequestsCount }),
      cta: { label: t('feedback-hub-insight-pending-cta'), action: 'open_pending_panel' }
    })
  }

  const receivedLast30 = kpis.daysSinceReceived != null && kpis.daysSinceReceived <= 30
  const givenLast30 = kpis.daysSinceGiven != null && kpis.daysSinceGiven <= 30

  if (kpis.receivedTotal > 0 && kpis.givenTotal === 0) {
    cards.push({
      id: 'activity-imbalance',
      priority: 'recommended',
      icon: <ScalesIcon className="gba:h-5 gba:w-5" weight="fill" />,
      title: t('feedback-hub-insight-imbalance-title'),
      description: t('feedback-hub-insight-imbalance-description'),
      cta: { label: t('feedback-hub-insight-imbalance-cta'), action: 'open_give_feedback_flow' }
    })
  } else if (!receivedLast30 && !givenLast30) {
    cards.push({
      id: 'low-activity',
      priority: 'recommended',
      icon: <ChatCircleIcon className="gba:h-5 gba:w-5" weight="fill" />,
      title: t('feedback-hub-insight-low-activity-title'),
      description: t('feedback-hub-insight-low-activity-description'),
      cta: { label: t('feedback-hub-insight-low-activity-cta'), action: 'open_request_feedback_flow' }
    })
  }

  const hasPositiveFeedback = receivedList?.some(f => {
    const type = f.type?.toLowerCase() ?? ''
    return (
      type.includes('recognition') || type.includes('praise') || type.includes('kudos') || type.includes('positive')
    )
  })
  if (hasPositiveFeedback && kpis.receivedTotal > 0) {
    cards.push({
      id: 'recognition-opportunity',
      priority: 'opportunity',
      icon: <HandHeartIcon className="gba:h-5 gba:w-5" weight="fill" />,
      title: t('feedback-hub-insight-recognition-title'),
      description: t('feedback-hub-insight-recognition-description'),
      cta: { label: t('feedback-hub-insight-recognition-cta'), action: 'open_send_appreciation_flow' }
    })
  }

  if (cards.length === 0) {
    cards.push({
      id: 'healthy',
      priority: 'opportunity',
      icon: <SparkleIcon className="gba:h-5 gba:w-5" weight="fill" />,
      title: t('feedback-hub-insight-healthy-title'),
      description: t('feedback-hub-suggested-healthy')
    })
  }

  return cards
}

const FeedbackInsightsSection: React.FC<FeedbackInsightsSectionProps> = ({
  t,
  kpis,
  pendingRequestsCount,
  accessToken,
  employee,
  onOpenPendingPanel,
  isSelfView = true,
  receivedList
}) => {
  const insights = useMemo(
    () => buildInsights(t, kpis, pendingRequestsCount, receivedList),
    [t, kpis, pendingRequestsCount, receivedList]
  )

  if (!isSelfView) return null

  const handleCtaClick = (action: FeedbackInsightAction) => {
    if (action === 'open_pending_panel') {
      onOpenPendingPanel()
    }
  }

  const renderCta = (insight: FeedbackInsightCard) => {
    if (!insight.cta) return null

    if (insight.cta.action === 'open_give_feedback_flow') {
      return (
        <AppAction
          variant="update-primary"
          buttonSize="sm"
          contexts={[
            {
              context: FlowContextName.employeeGiveFeedback,
              contextData: { employeeId: employee?.id }
            }
          ]}
          prefixDataTestId={`insight-${insight.id}-cta`}
          accessToken={accessToken}
          autoExecute={true}
        >
          {insight.cta.label}
        </AppAction>
      )
    }

    if (insight.cta.action === 'open_request_feedback_flow' || insight.cta.action === 'open_send_appreciation_flow') {
      return (
        <AppAction
          variant="update-primary"
          buttonSize="sm"
          contexts={[
            {
              context:
                insight.cta.action === 'open_send_appreciation_flow'
                  ? FlowContextName.employeeGiveFeedback
                  : FlowContextName.employeeRequestFeedback,
              contextData: {
                employeeId: employee?.id,
                isRequestingFeedback: insight.cta.action === 'open_request_feedback_flow'
              }
            }
          ]}
          prefixDataTestId={`insight-${insight.id}-cta`}
          accessToken={accessToken}
          autoExecute={true}
        >
          {insight.cta.label}
        </AppAction>
      )
    }

    return (
      <Button
        variant="default"
        size="sm"
        onClick={() => handleCtaClick(insight.cta!.action)}
        data-testid={`insight-${insight.id}-cta`}
      >
        {insight.cta.label}
      </Button>
    )
  }

  return (
    <HrGrowthInsightsSection
      title={t('feedback-hub-insights-section-title')}
      description={t('feedback-hub-insights-section-description')}
      cards={insights.map(insight => ({
        ...insight,
        footer: renderCta(insight)
      }))}
      testIds={{
        section: 'feedback-insights-section',
        toggle: 'feedback-insights-toggle',
        scrollLeft: 'insights-scroll-left',
        scrollRight: 'insights-scroll-right',
        cardPrefix: 'insight-card',
        menuPrefix: 'insight'
      }}
    />
  )
}

export default FeedbackInsightsSection
