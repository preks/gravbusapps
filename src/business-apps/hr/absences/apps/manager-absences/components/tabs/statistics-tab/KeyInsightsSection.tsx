import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Card, CardContent } from '@newwork/nw-design-system'
import { useAbsenceCatalogs } from '../../../hooks/useAbsenceCatalogs'

interface KeyInsightsSectionProps {
  data: any
  context: any
}

export const KeyInsightsSection: React.FC<KeyInsightsSectionProps> = ({ data, context }) => {
  const { absenceGroups, isLoading: catalogsLoading } = useAbsenceCatalogs(context)
  if (catalogsLoading || absenceGroups.length === 0) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="key-insights-section-loading">
        {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
      </div>
    )
  }
  const statistics = data || {}

  const plannedAbsences = statistics.plannedAbsences || 0
  const unplannedAbsences = statistics.unplannedAbsences || 0
  const totalRelevantAbsences = plannedAbsences + unplannedAbsences
  const averageDaysPerRequest = statistics.averageDaysPerRequest || '0.0'

  const plannedPct = totalRelevantAbsences > 0 ? Math.round((plannedAbsences / totalRelevantAbsences) * 100) : 0
  const unplannedPct = totalRelevantAbsences > 0 ? Math.round((unplannedAbsences / totalRelevantAbsences) * 100) : 0

  const approvalRate = statistics.approvalRate || 0

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4" data-testid="key-insights-section">
      {/* Planned Absences Card */}
      <Card className="gba:h-full gba:shadow-sm" data-testid="key-insights-section-planned-absences">
        <CardContent className="gba:p-4">
          <div className="gba:flex gba:items-center">
            <span
              className="gba:text-sm gba:text-muted-foreground gba:font-medium"
              data-testid="planned-absences-title"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_hub.planned_absences',
                'Planned Absences (Vacation)'
              )}
            </span>
          </div>
          <div className="gba:text-3xl gba:font-bold gba:text-foreground" data-testid="planned-absences-value">
            {plannedPct}%
          </div>
          <div className="gba:text-xs gba:text-muted-foreground" data-testid="planned-absences-sub">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_hub.vs_unplanned',
              `vs ${unplannedPct}% unplanned (sick leave)`,
              { unplannedPct }
            )}
          </div>
        </CardContent>
      </Card>
      {/* Avg Days Card */}
      <Card className="gba:h-full gba:shadow-sm" data-testid="key-insights-section-avg-days-per-request">
        <CardContent className="gba:p-4">
          <div className="gba:flex gba:items-center">
            <span className="gba:text-sm gba:text-muted-foreground gba:font-medium" data-testid="avg-days-title">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.avg_days_per_request', 'Avg Days per Request')}
            </span>
          </div>
          <div className="gba:text-3xl gba:font-bold gba:text-foreground" data-testid="avg-days-value">
            {averageDaysPerRequest}
          </div>
          <div className="gba:text-xs gba:text-muted-foreground" data-testid="avg-days-sub">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_hub.efficient_leave_planning',
              'Efficient leave planning'
            )}
          </div>
        </CardContent>
      </Card>
      {/* Approval Rate Card */}
      <Card className="gba:h-full gba:shadow-sm" data-testid="key-insights-section-approval-rate">
        <CardContent className="gba:p-4">
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
              'Statuses considered: Approved vs All Statuses'
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
