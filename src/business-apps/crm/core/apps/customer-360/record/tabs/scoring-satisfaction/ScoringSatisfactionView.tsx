import React from 'react'
import { Badge, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { ChatTeardropTextIcon, GaugeIcon, SmileyIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatScoreValue, getGradeBadgeVariant } from '@/common/utils/aiScoreDisplay'
import customer360I18n from '../../../_i18n'
import type { Customer360Snapshot } from '../../../data/types'
import Customer360Metric from '../../../shared/Customer360Metric'
import Customer360Section from '../../../shared/Customer360Section'
import { formatDate, formatNumber } from '../../../utils/format'

// TODO(customer-feedback): This tab is hidden from Customer 360 until custom survey result UX is finalized.
export interface ScoringSatisfactionViewProps extends BusinessAppContextProps {
  snapshot: Customer360Snapshot
  loading?: boolean
}

const MetricTile = Customer360Metric

function formatResponseValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint') return value.toString()
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'symbol') return value.description ?? value.toString()
  if (typeof value === 'object') return JSON.stringify(value)
  return '-'
}

const ScoringSatisfactionView: React.FC<ScoringSatisfactionViewProps> = ({ snapshot, loading }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const scores = snapshot.scores
  const satisfaction = snapshot.satisfaction
  const surveyResults = satisfaction?.surveyResults ?? []
  const hasSatisfaction = Boolean(
    satisfaction && (satisfaction.csat !== undefined || satisfaction.nps !== undefined || surveyResults.length > 0)
  )

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
            {formatNumber(satisfaction?.csat) || '-'}
          </MetricTile>
          <MetricTile label={t('satisfaction-nps')} testId="customer-360-satisfaction-nps">
            {formatNumber(satisfaction?.nps) || '-'}
          </MetricTile>
          {satisfaction?.lastSurveyDate ? (
            <MetricTile label={t('satisfaction-last-survey')} testId="customer-360-satisfaction-last-survey">
              <span className="gba:text-base gba:font-medium">{formatDate(satisfaction.lastSurveyDate)}</span>
            </MetricTile>
          ) : null}
        </div>
        {surveyResults.length > 0 ? (
          <div className="gba:mt-4 gba:space-y-3" data-testid="customer-360-satisfaction-survey-results">
            <h3 className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium">
              <ChatTeardropTextIcon className="gba:size-4" />
              {t('satisfaction-survey-results-title')}
            </h3>
            {surveyResults.map(result => (
              <div key={result.id} className="gba:rounded-md gba:border gba:border-border gba:p-3 gba:space-y-2">
                <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
                  <div>
                    <p className="gba:text-sm gba:font-medium">
                      {result.surveyName || t('satisfaction-survey-untitled')}
                    </p>
                    {result.submittedAt ? (
                      <p className="gba:text-xs gba:text-muted-foreground">{formatDate(result.submittedAt)}</p>
                    ) : null}
                  </div>
                  {result.status ? (
                    <Badge variant={getStatusBadgeVariant(result.status)} size="sm">
                      {result.status}
                    </Badge>
                  ) : null}
                </div>
                <dl className="gba:grid gba:gap-2 gba:md:grid-cols-2">
                  {Object.entries(result.responses).map(([key, value]) => (
                    <div key={key}>
                      <dt className="gba:text-xs gba:text-muted-foreground">{key}</dt>
                      <dd className="gba:text-sm">{formatResponseValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        ) : null}
      </Customer360Section>
    </div>
  )
}

export default ScoringSatisfactionView
export { ScoringSatisfactionView }
