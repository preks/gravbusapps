import React from "react";
import { Badge, Card } from "@newwork/nw-design-system";
import { AlertTriangle, CheckCircle, Activity, Target, Zap } from "lucide-react";
import dayjs from "dayjs";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { filterAbsencesForEntitlements } from "../utils/absenceFilters";

interface WorkPatternsSectionProps {
  absences: any[];
}

const WorkPatternsSection: React.FC<WorkPatternsSectionProps> = ({
  absences,
}) => {
  const filteredAbsences = filterAbsencesForEntitlements(absences || []);
  const sortedAbsences = [...filteredAbsences].sort((a, b) =>
    dayjs(a.startDate).diff(dayjs(b.startDate))
  );

  const workPeriods: { start: dayjs.Dayjs; end: dayjs.Dayjs; days: number }[] =
    [];
  let prevEnd =
    sortedAbsences.length > 0
      ? dayjs(sortedAbsences[0].startDate).subtract(1, "day")
      : null;
  for (let i = 0; i < sortedAbsences.length; i++) {
    const currStart = dayjs(sortedAbsences[i].startDate);
    if (prevEnd && currStart.diff(prevEnd, "day") > 1) {
      workPeriods.push({
        start: prevEnd.add(1, "day"),
        end: currStart.subtract(1, "day"),
        days: currStart.diff(prevEnd, "day") - 1,
      });
    }
    prevEnd = dayjs(sortedAbsences[i].endDate);
  }
  if (prevEnd) {
    const today = dayjs();
    if (today.diff(prevEnd, "day") > 0) {
      workPeriods.push({
        start: prevEnd.add(1, "day"),
        end: today,
        days: today.diff(prevEnd, "day"),
      });
    }
  } else if (absences.length === 0) {
    workPeriods.push({
      start: dayjs().subtract(365, "day"),
      end: dayjs(),
      days: 365,
    });
  }

  const currentStreak =
    workPeriods.length > 0 ? workPeriods[workPeriods.length - 1].days : 0;

  const thisYear = dayjs().year();
  const longestStreakPeriod = workPeriods
    .filter((wp) => wp.end.year() === thisYear)
    .reduce(
      (max, wp) => (wp.days > (max?.days || 0) ? wp : max),
      null as null | (typeof workPeriods)[0]
    );
  const longestStreak = longestStreakPeriod ? longestStreakPeriod.days : 0;
  const longestStreakRange = longestStreakPeriod
    ? `${longestStreakPeriod.start.format(
        "MMM D"
      )} - ${longestStreakPeriod.end.format("MMM D")}`
    : "-";

  const avgStreak =
    workPeriods.length > 0
      ? Math.round(
          workPeriods.reduce((sum, wp) => sum + wp.days, 0) / workPeriods.length
        )
      : 0;

  const breakDurations = sortedAbsences
    .map((a) => dayjs(a.endDate).diff(dayjs(a.startDate), "day") + 1)
    .filter((d) => d > 0);
  const shortestBreak =
    breakDurations.length > 0 ? Math.min(...breakDurations) : 0;
  const getRecommendation = () => {
    if (currentStreak >= longestStreak && longestStreak > 0) {
      return {
        message: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.consider_break_longest', `You've reached your longest work streak of ${longestStreak} days! Consider a break.`, { longestStreak }),
        icon: <AlertTriangle className="gba:w-5 gba:h-5 gba:text-warning" />,
        variant: "destructive" as const
      };
    }
    if (currentStreak >= avgStreak && avgStreak > 0) {
      return {
        message: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.consider_break_average', `Consider taking a break soon. Your current streak of ${currentStreak} days is approaching your average of ${avgStreak} days.`, { currentStreak, avgStreak }),
        icon: <AlertTriangle className="gba:w-5 gba:h-5 gba:text-warning" />,
        variant: "secondary" as const
      };
    }
    return {
      message: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.healthy_work_pattern', "You're maintaining a healthy work pattern."),
      icon: <CheckCircle className="gba:w-5 gba:h-5 gba:text-success" />,
      variant: "default" as const
    };
  };

  const recommendation = getRecommendation();

  return (
    <div className="gba:space-y-6" data-testid="work-patterns-section">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-3">
        <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary gba:bg-opacity-10 gba:flex gba:items-center gba:justify-center">
          <Activity className="gba:w-4 gba:h-4 gba:text-primary" />
        </div>
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground" data-testid="work-patterns-section-title">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:absence_hub.work_patterns",
              "Work Patterns"
            )}
          </h3>
          <p className="gba:text-sm gba:text-muted-foreground" data-testid="work-patterns-section-subtitle">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:absence_hub.your_consecutive_work_day_analysis",
              "Your consecutive work day analysis"
            )}
          </p>
        </div>
      </div>

      {/* Current streak highlight */}
      <Card className="gba:p-6 gba:text-center gba:bg-gradient-to-br gba:from-primary gba:from-opacity-5 gba:to-primary gba:to-opacity-10">
        <div className="gba:text-4xl gba:font-bold gba:text-primary gba:mb-2" data-testid="current-streak-value">
          {currentStreak}
        </div>
        <div className="gba:text-base gba:font-medium gba:text-foreground gba:mb-1" data-testid="work-patterns-section-current-streak-label">
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:absence_hub.current_consecutive_work_days",
            "Current consecutive work days"
          )}
        </div>
        <div className="gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:absence_hub.since_last_time_off",
            "Since last time off"
          )}
        </div>
      </Card>
      {/* Statistics grid */}
      <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 gba:gap-4">
        {/* Longest Streak */}
        <Card className="gba:p-4 gba:text-center gba:space-y-2">
          <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-danger gba:bg-opacity-10 gba:flex gba:items-center gba:justify-center gba:mx-auto">
            <Target className="gba:w-4 gba:h-4 gba:text-danger" />
          </div>
          <div className="gba:text-xl gba:font-bold gba:text-foreground" data-testid="longest-streak-value">
            {longestStreak}
          </div>
          <div className="gba:text-sm gba:font-medium gba:text-foreground" data-testid="work-patterns-section-longest-streak-label">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:absence_hub.longest_streak",
              `Longest Streak (${thisYear})`,
              { thisYear }
            )}
          </div>
          <div className="gba:text-xs gba:text-muted-foreground" data-testid="work-patterns-section-longest-streak-sub">
            {longestStreakRange}
          </div>
        </Card>

        {/* Average Streak */}
        <Card className="gba:p-4 gba:text-center gba:space-y-2">
          <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary gba:bg-opacity-10 gba:flex gba:items-center gba:justify-center gba:mx-auto">
            <Activity className="gba:w-4 gba:h-4 gba:text-primary" />
          </div>
          <div className="gba:text-xl gba:font-bold gba:text-foreground" data-testid="average-streak-value">
            {avgStreak}
          </div>
          <div className="gba:text-sm gba:font-medium gba:text-foreground" data-testid="work-patterns-section-average-streak-label">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:absence_hub.average_streak",
              "Average Streak"
            )}
          </div>
          <div className="gba:text-xs gba:text-muted-foreground" data-testid="work-patterns-section-average-streak-sub">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:absence_hub.typical_work_period",
              "Typical work period"
            )}
          </div>
        </Card>

        {/* Shortest Break */}
        <Card className="gba:p-4 gba:text-center gba:space-y-2">
          <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-success gba:bg-opacity-10 gba:flex gba:items-center gba:justify-center gba:mx-auto">
            <Zap className="gba:w-4 gba:h-4 gba:text-success" />
          </div>
          <div className="gba:text-xl gba:font-bold gba:text-foreground" data-testid="shortest-break-value">
            {shortestBreak}
          </div>
          <div className="gba:text-sm gba:font-medium gba:text-foreground" data-testid="work-patterns-section-shortest-break-label">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:absence_hub.shortest_break",
              "Shortest Break"
            )}
          </div>
          <div className="gba:text-xs gba:text-muted-foreground" data-testid="work-patterns-section-shortest-break-sub">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:absence_hub.between_work_periods",
              "Between work periods"
            )}
          </div>
        </Card>
      </div>
      {/* Recommendation */}
      <Card className="gba:p-4">
        <div className="gba:flex gba:items-start gba:gap-3">
          {recommendation.icon}
          <div className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
              <h4 className="gba:font-medium gba:text-foreground" data-testid="work-patterns-section-recommendation-title">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:absence_hub.recommendation",
                  "Recommendation"
                )}
              </h4>
              <Badge variant={recommendation.variant} className="gba:text-xs">
                {recommendation.variant === "destructive" ? "Action Needed" : 
                 recommendation.variant === "secondary" ? "Consider" : "Good"}
              </Badge>
            </div>
            <p className="gba:text-sm gba:text-muted-foreground" data-testid="work-patterns-section-recommendation-body">
              {recommendation.message}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WorkPatternsSection;
