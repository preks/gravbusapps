import React from 'react'
import { Badge, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { GaugeIcon, SmileyIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatScoreValue, getGradeBadgeVariant } from '@/common/utils/aiScoreDisplay'
import customer360I18n from '../../_i18n'
import type { Customer360Snapshot, Customer360Subject } from '../../data/types'
import Customer360Section from '../../components/Customer360Section'
import Customer360Metric from '../../components/Customer360Metric'
import { formatDate, formatNumber } from '../../utils/format'

export interface ScoringSatisfactionViewProps extends BusinessAppContextProps {
  subject: Customer360Subject
  snapshot: Customer360Snapshot
  loading?: boolean
}

const MetricTile = Customer360Metric

/**
 * Scoring & Satisfaction tab — surfaces the reused AI scoring signal and the
 * (awaiting-backend) CSAT / NPS satisfaction metrics.
 */
const ScoringSatisfactionView: React.FC<ScoringSatisfactionViewProps> = ({ snapshot, loading }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const scores = snapshot.scores
  const satisfaction = snapshot.satisfaction
  const hasSatisfaction = Boolean(satisfaction && (satisfaction.csat !== undefined || satisfaction.nps !== undefined))

  return (
    <div
      className="gba:col-span-12 gba:grid gba:grid-cols-1 gba:gap-4 gba:items-start gba:lg:grid-cols-2"
      data-testid="customer-360-scoring-satisfaction-view"
    >
      <Customer360Section
        title={t('scoring-title')}
        icon={GaugeIcon}
        loading={loading}
        errorTitle={t('error-title')}
        isEmpty={!scores}
        emptyTitle={t('scoring-empty-title')}
        emptyDescription={t('scoring-empty-description')}
        testId="customer-360-scoring-section"
      >
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <MetricTile label={t('scoring-ai-score')} testId="customer-360-scoring-ai">
            {formatScoreValue(scores?.aiScore)}
          </MetricTile>
          {scores?.scoreLabel ? (
            <MetricTile label={t('scoring-grade')} testId="customer-360-scoring-grade">
              <Badge variant={getGradeBadgeVariant(scores.scoreLabel)} size="lg">
                {scores.scoreLabel}
              </Badge>
            </MetricTile>
          ) : null}
          {typeof scores?.icpScore === 'number' ? (
            <MetricTile label={t('scoring-icp-score')} testId="customer-360-scoring-icp">
              {formatNumber(scores.icpScore)}
            </MetricTile>
          ) : null}
        </div>
      </Customer360Section>

      <Customer360Section
        title={t('satisfaction-title')}
        icon={SmileyIcon}
        loading={loading}
        errorTitle={t('error-title')}
        isEmpty={!hasSatisfaction}
        emptyTitle={t('satisfaction-empty-title')}
        emptyDescription={t('satisfaction-empty-description')}
        testId="customer-360-satisfaction-section"
      >
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <MetricTile label={t('satisfaction-csat')} testId="customer-360-satisfaction-csat">
            {formatNumber(satisfaction?.csat) || '—'}
          </MetricTile>
          <MetricTile label={t('satisfaction-nps')} testId="customer-360-satisfaction-nps">
            {formatNumber(satisfaction?.nps) || '—'}
          </MetricTile>
          {satisfaction?.lastSurveyDate ? (
            <MetricTile label={t('satisfaction-last-survey')} testId="customer-360-satisfaction-last-survey">
              <span className="gba:text-base gba:font-medium">{formatDate(satisfaction.lastSurveyDate)}</span>
            </MetricTile>
          ) : null}
        </div>
      </Customer360Section>
    </div>
  )
}

export default ScoringSatisfactionView
export { ScoringSatisfactionView }
