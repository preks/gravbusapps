import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

import type { AbsenceListCardAbsence } from '../types/absenceTypes'
import { Card } from '@newwork/nw-design-system'

interface KeyInsightsSectionProps {
  absences: AbsenceListCardAbsence[]
  overrides?: {
    plannedPct?: number
    unplannedPct?: number
    avgDaysPerRequest?: number
    approvalRatePct?: number
    vacationCount?: number
    sickCount?: number
  }
  /** When true, do not use local calculations as fallback; render error/placeholder */
  disableLocalCalc?: boolean
  /** Optional error text to display when overrides are missing */
  errorMessage?: string
}

const KeyInsightsSection: React.FC<KeyInsightsSectionProps> = ({
  absences,
  overrides,
  disableLocalCalc = false,
  errorMessage
}) => {
  const total = absences.length
  const planned = absences.filter(a => {
    const type = (a.type || '').toLowerCase()
    return type && !type.includes('sick') && !type.includes('unplanned')
  }).length
  const unplannedPct = total ? 100 - Math.round((planned / total) * 100) : 0
  const plannedPct = total ? Math.round((planned / total) * 100) : 0

  const absencesWithDuration = absences.filter(a => {
    const num = parseFloat(a.duration)
    return !isNaN(num) && num > 0
  })
  const avgLocal = absencesWithDuration.length
    ? (absencesWithDuration.reduce((sum, a) => sum + parseFloat(a.duration), 0) / absencesWithDuration.length).toFixed(
        1
      )
    : '0.0'

  const approved = absences.filter(a => (a.status || '').toLowerCase() === 'approved').length
  const approvalRate =
    overrides?.approvalRatePct ?? (disableLocalCalc ? 0 : total ? Math.round((approved / total) * 100) : 0)
  const avg = (overrides?.avgDaysPerRequest ?? (disableLocalCalc ? 0 : Number(avgLocal))).toString()
  const plannedPctFinal = overrides?.plannedPct ?? (disableLocalCalc ? undefined : plannedPct)
  const unplannedPctFinal = overrides?.unplannedPct ?? (disableLocalCalc ? undefined : unplannedPct)

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4" data-testid="key-insights-section">
      {/* Planned Absences Card */}
      <Card className="gba:h-full gba:shadow-sm gba:p-6" data-testid="key-insights-section-planned-absences">
        <div className="gba:flex gba:items-center">
          <span className="gba:text-sm gba:text-muted-foreground gba:font-medium" data-testid="planned-absences-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.planned_absences', 'Planned Absences')}
          </span>
        </div>
        <div className="gba:text-3xl gba:font-bold gba:text-foreground" data-testid="planned-absences-value">
          {plannedPctFinal}%
        </div>
        <div className="gba:text-xs gba:text-muted-foreground" data-testid="planned-absences-sub">
          {errorMessage ? (
            <span className="gba:text-destructive" data-testid="planned-absences-error">
              {errorMessage}
            </span>
          ) : overrides?.vacationCount !== undefined && overrides?.sickCount !== undefined ? (
            <span data-testid="planned-absences-breakdown">
              {overrides.vacationCount} {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.requests', 'requests')}{' '}
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.vacation', 'vacation')} vs {overrides.sickCount}{' '}
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.requests', 'requests')}{' '}
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.sick', 'sick')}
            </span>
          ) : (
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_hub.vs_unplanned',
              `vs ${unplannedPctFinal ?? 0}% unplanned (sick leave)`,
              { unplannedPct: unplannedPctFinal ?? 0 }
            )
          )}
        </div>
      </Card>
      {/* Avg Days Card */}
      <Card className="gba:h-full gba:shadow-sm gba:p-6" data-testid="key-insights-section-avg-days-per-request">
        <div className="gba:flex gba:items-center">
          <span className="gba:text-sm gba:text-muted-foreground gba:font-medium" data-testid="avg-days-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.avg_days_per_request', 'Avg Days per Request')}
          </span>
        </div>
        <div className="gba:text-3xl gba:font-bold gba:text-foreground" data-testid="avg-days-value">
          {avg}
        </div>
        <div className="gba:text-xs gba:text-muted-foreground" data-testid="avg-days-sub">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.avg_days_scope', 'Based on Approved requests')}
        </div>
      </Card>
      {/* Approval Rate Card */}
      <Card className="gba:h-full gba:shadow-sm gba:p-6" data-testid="key-insights-section-approval-rate">
        <div className="gba:flex gba:items-center">
          <span className="gba:text-sm gba:text-muted-foreground gba:font-medium" data-testid="approval-rate-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.approval_rate', 'Approval Rate')}
          </span>
        </div>
        <div className="gba:text-3xl gba:font-bold gba:text-foreground" data-testid="approval-rate-value">
          {approvalRate}%
        </div>
        <div className="gba:text-xs gba:text-muted-foreground" data-testid="approval-rate-sub">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_hub.approval_status_scope',
            'Statuses considered: APPROVED vs ALL STATUSES'
          )}
        </div>
      </Card>
    </div>
  )
}

export default KeyInsightsSection
