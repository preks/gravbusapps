import React from "react";

interface KeyInsightsSectionProps {
  absences: any[];
}

const KeyInsightsSection: React.FC<KeyInsightsSectionProps> = ({ absences }) => (
  <section className="gba:statisticsKeyInsights" data-testid="key-insights-section">
    {(() => {
      const total = absences.length;
      const planned = absences.filter(a => {
        const type = (a.type || '').toLowerCase();
        return type && !type.includes('sick') && !type.includes('unplanned');
      }).length;
      const unplannedPct = total ? 100 - Math.round((planned / total) * 100) : 0;
      const plannedPct = total ? Math.round((planned / total) * 100) : 0;
      return (
        <div className="gba:insightCard gba:insightCard--blue" data-testid="key-insights-section-planned-absences">
          <div className="gba:insightValue">{plannedPct}%</div>
          <div className="gba:insightTitle">Planned Absences</div>
          <div className="gba:insightSub">vs {unplannedPct}% unplanned (sick leave)</div>
        </div>
      );
    })()}

    {(() => {
      const absencesWithDays = absences.filter(a => typeof a.workingDays === 'number' && a.workingDays > 0);
      const avg = absencesWithDays.length
        ? (
            absencesWithDays.reduce((sum, a) => sum + a.workingDays, 0) /
            absencesWithDays.length
          ).toFixed(1)
        : '0.0';
      return (
        <div className="gba:insightCard gba:insightCard--green" data-testid="key-insights-section-avg-days-per-request">
          <div className="gba:insightValue">{avg}</div>
          <div className="gba:insightTitle">Avg Days per Request</div>
          <div className="gba:insightSub">Efficient leave planning</div>
        </div>
      );
    })()}

    {(() => {
      const approved = absences.filter(a => (a.status || '').toLowerCase() === 'approved').length;
      const total = absences.length;
      const rate = total ? Math.round((approved / total) * 100) : 0;
      return (
        <div className="gba:insightCard gba:insightCard--purple" data-testid="key-insights-section-approval-rate">
          <div className="gba:insightValue">{rate}%</div>
          <div className="gba:insightTitle">Approval Rate</div>
          <div className="gba:insightSub">Excellent planning & timing</div>
        </div>
      );
    })()}
  </section>
);

export default KeyInsightsSection;
