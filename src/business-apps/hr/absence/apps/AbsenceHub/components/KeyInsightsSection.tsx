import React from "react";
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

import type { AbsenceListCardAbsence } from '../types/absenceTypes';

interface KeyInsightsSectionProps {
  absences: AbsenceListCardAbsence[];
}

const KeyInsightsSection: React.FC<KeyInsightsSectionProps> = ({ absences }) => {
  const total = absences.length;
  const planned = absences.filter(a => {
    const type = (a.type || '').toLowerCase();
    return type && !type.includes('sick') && !type.includes('unplanned');
  }).length;
  const unplannedPct = total ? 100 - Math.round((planned / total) * 100) : 0;
  const plannedPct = total ? Math.round((planned / total) * 100) : 0;

  const absencesWithDuration = absences.filter(a => {
    const num = parseFloat(a.duration);
    return !isNaN(num) && num > 0;
  });
  const avg = absencesWithDuration.length
    ? (
        absencesWithDuration.reduce((sum, a) => sum + parseFloat(a.duration), 0) /
        absencesWithDuration.length
      ).toFixed(1)
    : '0.0';

  const approved = absences.filter(a => (a.status || '').toLowerCase() === 'approved').length;
  const approvalRate = total ? Math.round((approved / total) * 100) : 0;

  return (
    <section className="gba:statisticsKeyInsights" data-testid="key-insights-section">
      <div className="gba:insightCard gba:insightCard--blue" data-testid="key-insights-section-planned-absences">
        <div className="gba:insightValue">{plannedPct}%</div>
        <div className="gba:insightTitle">{getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.planned_absences', 'Planned Absences')}</div>
        <div className="gba:insightSub">{getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.vs_unplanned', `vs ${unplannedPct}% unplanned (sick leave)`, { unplannedPct })}</div>
      </div>

      <div className="gba:insightCard gba:insightCard--green" data-testid="key-insights-section-avg-days-per-request">
        <div className="gba:insightValue">{avg}</div>
        <div className="gba:insightTitle">{getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.avg_days_per_request', 'Avg Days per Request')}</div>
        <div className="gba:insightSub">{getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.efficient_leave_planning', 'Efficient leave planning')}</div>
      </div>

      <div className="gba:insightCard gba:insightCard--purple" data-testid="key-insights-section-approval-rate">
        <div className="gba:insightValue">{approvalRate}%</div>
        <div className="gba:insightTitle">{getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.approval_rate', 'Approval Rate')}</div>
        <div className="gba:insightSub">{getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.excellent_planning_and_timing', 'Excellent planning & timing')}</div>
      </div>
    </section>
  );
};

export default KeyInsightsSection;
