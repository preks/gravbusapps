import React from "react";
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

import type { AbsenceListCardAbsence } from '../types/absenceTypes';
import { Card } from "antd";

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
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4" data-testid="key-insights-section">
      {/* Planned Absences Card */}
      <Card
        className="gba:h-full gba:shadow-sm"
        data-testid="key-insights-section-planned-absences"
      >
        <div className="gba:flex gba:items-center">
          <span className="gba:text-sm gba:text-gray-500 gba:font-medium" data-testid="planned-absences-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.planned_absences', 'Planned Absences')}
          </span>
        </div>
        <div className="gba:text-3xl gba:font-bold gba:text-gray-900" data-testid="planned-absences-value">{plannedPct}%</div>
        <div className="gba:text-xs gba:text-gray-500" data-testid="planned-absences-sub">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.vs_unplanned', `vs ${unplannedPct}% unplanned (sick leave)`, { unplannedPct })}
        </div>
      </Card>
      {/* Avg Days Card */}
      <Card
        className="gba:h-full gba:shadow-sm"
        data-testid="key-insights-section-avg-days-per-request"
      >
        <div className="gba:flex gba:items-center">
          <span className="gba:text-sm gba:text-gray-500 gba:font-medium" data-testid="avg-days-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.avg_days_per_request', 'Avg Days per Request')}
          </span>
        </div>
        <div className="gba:text-3xl gba:font-bold gba:text-gray-900" data-testid="avg-days-value">{avg}</div>
        <div className="gba:text-xs gba:text-gray-500" data-testid="avg-days-sub">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.efficient_leave_planning', 'Efficient leave planning')}
        </div>
      </Card>
      {/* Approval Rate Card */}
      <Card
        className="gba:h-full gba:shadow-sm"
        data-testid="key-insights-section-approval-rate"
      >
        <div className="gba:flex gba:items-center">
          <span className="gba:text-sm gba:text-gray-500 gba:font-medium" data-testid="approval-rate-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.approval_rate', 'Approval Rate')}
          </span>
        </div>
        <div className="gba:text-3xl gba:font-bold gba:text-gray-900" data-testid="approval-rate-value">{approvalRate}%</div>
        <div className="gba:text-xs gba:text-gray-500" data-testid="approval-rate-sub">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.excellent_planning_and_timing', 'Excellent planning & timing')}
        </div>
      </Card>
    </div>
  );
};

export default KeyInsightsSection;
