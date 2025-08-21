import React from "react";
import { Card, Badge } from "@newwork/nw-design-system";
import { TrendingUp, Calendar, CheckCircle } from "lucide-react";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import type { AbsenceListCardAbsence } from "../types/absenceTypes";

interface KeyInsightsSectionProps {
  absences: AbsenceListCardAbsence[];
}

const KeyInsightsSection: React.FC<KeyInsightsSectionProps> = ({
  absences,
}) => {
  const total = absences.length;
  const planned = absences.filter((a) => {
    const type = (a.type || "").toLowerCase();
    return type && !type.includes("sick") && !type.includes("unplanned");
  }).length;
  const unplannedPct = total ? 100 - Math.round((planned / total) * 100) : 0;
  const plannedPct = total ? Math.round((planned / total) * 100) : 0;

  const absencesWithDuration = absences.filter((a) => {
    const num = parseFloat(a.duration);
    return !isNaN(num) && num > 0;
  });
  const avg = absencesWithDuration.length
    ? (
        absencesWithDuration.reduce(
          (sum, a) => sum + parseFloat(a.duration),
          0
        ) / absencesWithDuration.length
      ).toFixed(1)
    : "0.0";

  const approved = absences.filter(
    (a) => (a.status || "").toLowerCase() === "approved"
  ).length;
  const approvalRate = total ? Math.round((approved / total) * 100) : 0;

  const getApprovalBadge = () => {
    if (approvalRate >= 95) return <Badge variant="default" className="gba:text-xs">Excellent</Badge>;
    if (approvalRate >= 85) return <Badge variant="secondary" className="gba:text-xs">Good</Badge>;
    if (approvalRate >= 70) return <Badge variant="secondary" className="gba:text-xs">Fair</Badge>;
    return <Badge variant="destructive" className="gba:text-xs">Needs Improvement</Badge>;
  };

  return (
    <div
      className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 gba:gap-6"
      data-testid="key-insights-section"
    >
      {/* Planned Absences Card */}
      <Card
        className="gba:p-6 gba:space-y-4 gba:hover:shadow-md gba:transition-shadow"
        data-testid="key-insights-section-planned-absences"
      >
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary gba:bg-opacity-10 gba:flex gba:items-center gba:justify-center">
              <Calendar className="gba:w-4 gba:h-4 gba:text-primary" />
            </div>
            <span className="gba:text-sm gba:font-medium gba:text-muted-foreground" data-testid="planned-absences-title">
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:absence_hub.planned_absences",
                "Planned Absences"
              )}
            </span>
          </div>
          {plannedPct >= 80 && <Badge variant="default" className="gba:text-xs">Well Planned</Badge>}
        </div>
        <div className="gba:text-center">
          <div className="gba:text-3xl gba:font-bold gba:text-foreground" data-testid="planned-absences-value">
            {plannedPct}%
          </div>
          <div className="gba:text-xs gba:text-muted-foreground gba:mt-1" data-testid="planned-absences-sub">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:absence_hub.vs_unplanned",
              `vs ${unplannedPct}% unplanned`,
              { unplannedPct }
            )}
          </div>
        </div>
      </Card>
      
      {/* Avg Days Card */}
      <Card
        className="gba:p-6 gba:space-y-4 gba:hover:shadow-md gba:transition-shadow"
        data-testid="key-insights-section-avg-days-per-request"
      >
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-success gba:bg-opacity-10 gba:flex gba:items-center gba:justify-center">
              <TrendingUp className="gba:w-4 gba:h-4 gba:text-success" />
            </div>
            <span className="gba:text-sm gba:font-medium gba:text-muted-foreground" data-testid="avg-days-title">
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:absence_hub.avg_days_per_request",
                "Avg Days per Request"
              )}
            </span>
          </div>
          {parseFloat(avg) <= 5 && <Badge variant="default" className="gba:text-xs">Efficient</Badge>}
        </div>
        <div className="gba:text-center">
          <div className="gba:text-3xl gba:font-bold gba:text-foreground" data-testid="avg-days-value">
            {avg}
          </div>
          <div className="gba:text-xs gba:text-muted-foreground gba:mt-1" data-testid="avg-days-sub">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:absence_hub.efficient_leave_planning",
              "Days per request"
            )}
          </div>
        </div>
      </Card>
      
      {/* Approval Rate Card */}
      <Card
        className="gba:p-6 gba:space-y-4 gba:hover:shadow-md gba:transition-shadow"
        data-testid="key-insights-section-approval-rate"
      >
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-success gba:bg-opacity-10 gba:flex gba:items-center gba:justify-center">
              <CheckCircle className="gba:w-4 gba:h-4 gba:text-success" />
            </div>
            <span className="gba:text-sm gba:font-medium gba:text-muted-foreground" data-testid="approval-rate-title">
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:absence_hub.approval_rate",
                "Approval Rate"
              )}
            </span>
          </div>
          {getApprovalBadge()}
        </div>
        <div className="gba:text-center">
          <div className="gba:text-3xl gba:font-bold gba:text-foreground" data-testid="approval-rate-value">
            {approvalRate}%
          </div>
          <div className="gba:text-xs gba:text-muted-foreground gba:mt-1" data-testid="approval-rate-sub">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:absence_hub.approval_success_rate",
              "Approval success rate"
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default KeyInsightsSection;
