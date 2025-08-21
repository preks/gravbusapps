import React from "react";
import { Card, Badge } from "@newwork/nw-design-system";
import { BarChart3, Calendar } from "lucide-react";
import dayjs from "dayjs";
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { filterAbsencesForEntitlements } from '../utils/absenceFilters';

interface UsageTrendsSectionProps {
  absences: any[];
}

const months = [
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_jan', 'Jan'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_feb', 'Feb'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_mar', 'Mar'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_apr', 'Apr'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_may', 'May'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_jun', 'Jun'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_jul', 'Jul'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_aug', 'Aug'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_sep', 'Sep'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_oct', 'Oct'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_nov', 'Nov'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_dec', 'Dec'),
];
const days = [
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_mon', 'Mon'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_tue', 'Tue'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_wed', 'Wed'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_thu', 'Thu'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_fri', 'Fri'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_sat', 'Sat'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_sun', 'Sun'),
];

function getMonthlyUsage(absences: any[], year: number) {
  const usage = Array(12).fill(0);
  absences.forEach((a) => {
    if (!a.startDate) return;
    const date = dayjs(a.startDate);
    if (date.year() === year) {
      usage[date.month()] += 1;
    }
  });
  return usage;
}

function getDayOfWeekUsage(absences: any[]) {
  const usage = Array(7).fill(0);
  absences.forEach((a) => {
    if (!a.startDate) return;
    const date = dayjs(a.startDate);
    usage[date.day() === 0 ? 6 : date.day() - 1] += 1;
  });
  return usage;
}

const UsageTrendsSection: React.FC<UsageTrendsSectionProps> = ({ absences }) => {
  const approvedAbsences = filterAbsencesForEntitlements(absences || []);
  const currentYear = dayjs().year();
  const monthlyUsage = getMonthlyUsage(approvedAbsences, currentYear);
  const dayOfWeekUsage = getDayOfWeekUsage(approvedAbsences);
  const maxDay = Math.max(...dayOfWeekUsage);
  const mostCommonIdx = dayOfWeekUsage.findIndex((v) => v === maxDay);
  const total = dayOfWeekUsage.reduce((a, b) => a + b, 0);
  const mostCommonPct = total > 0 ? Math.round((maxDay / total) * 100) : 0;

  return (
    <div className="gba:space-y-6" data-testid="usage-trends-section">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-3">
        <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary gba:bg-opacity-10 gba:flex gba:items-center gba:justify-center">
          <BarChart3 className="gba:w-4 gba:h-4 gba:text-primary" />
        </div>
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground" data-testid="usage-trends-section-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.usage_trends_patterns', 'Usage Trends & Patterns')}
          </h3>
          <p className="gba:text-sm gba:text-muted-foreground" data-testid="usage-trends-section-subtitle">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.your_absence_patterns_over_time', 'Your absence patterns over time')}
          </p>
        </div>
      </div>
      {/* Monthly Usage */}
      <div className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <h4 className="gba:font-medium gba:text-foreground" data-testid="usage-trends-section-subsection-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.monthly_usage', `Monthly Usage (${currentYear})`, { currentYear })}
          </h4>
          <Badge variant="outline" className="gba:text-xs">
            {monthlyUsage.reduce((sum, val) => sum + val, 0)} total
          </Badge>
        </div>
        <div className="gba:grid gba:grid-cols-6 md:gba:grid-cols-12 gba:gap-2" data-testid="usage-trends-section-subsection-bar-chart">
          {monthlyUsage.map((val, i) => (
            <div className="gba:text-center gba:space-y-2" key={months[i]}>
              <div
                className="gba:relative gba:h-16 gba:bg-muted gba:rounded-md gba:flex gba:items-end gba:justify-center gba:overflow-hidden"
                data-testid={`month-bar-${months[i]}`}
              >
                <div
                  className="gba:w-full gba:bg-primary gba:transition-all gba:duration-300 gba:rounded-b-md"
                  style={{
                    height: `${val > 0 ? Math.max((val / Math.max(...monthlyUsage, 1)) * 100, 8) : 4}%`,
                  }}
                />
              </div>
              <div className="gba:text-xs gba:text-muted-foreground" data-testid="usage-trends-section-subsection-bar-chart-month">{months[i]}</div>
              <div className="gba:text-xs gba:font-medium gba:text-foreground" data-testid={`month-value-${months[i]}`}>
                {val}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Day of Week Preferences */}
      <div className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <h4 className="gba:font-medium gba:text-foreground" data-testid="usage-trends-section-subsection-week-bar-chart-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_preferences', 'Day of Week Preferences')}
          </h4>
          {maxDay > 0 && (
            <Badge variant="secondary" className="gba:text-xs">
              Most: {days[mostCommonIdx]} ({mostCommonPct}%)
            </Badge>
          )}
        </div>
        <div className="gba:grid gba:grid-cols-7 gba:gap-2" data-testid="usage-trends-section-subsection-week-bar-chart">
          {dayOfWeekUsage.map((val, i) => (
            <div
              className={`gba:text-center gba:space-y-2 ${
                i === mostCommonIdx && val > 0 ? "gba:opacity-100" : "gba:opacity-75"
              }`}
              key={days[i]}
              data-testid={`weekday-bar-${days[i]}`}
            >
              <div className="gba:relative gba:h-12 gba:bg-muted gba:rounded-md gba:flex gba:items-end gba:justify-center gba:overflow-hidden">
                <div
                  className={`gba:w-full gba:transition-all gba:duration-300 gba:rounded-b-md ${
                    i === mostCommonIdx && val > 0 ? "gba:bg-primary" : "gba:bg-secondary"
                  }`}
                  style={{
                    height: `${val > 0 ? Math.max((val / Math.max(...dayOfWeekUsage, 1)) * 100, 8) : 4}%`,
                  }}
                />
              </div>
              <div className="gba:text-xs gba:text-muted-foreground" data-testid="usage-trends-section-subsection-week-bar-chart-day">{days[i]}</div>
              <div className="gba:text-xs gba:font-medium gba:text-foreground" data-testid="usage-trends-section-subsection-week-bar-chart-value">{val}</div>
            </div>
          ))}
        </div>
        {maxDay > 0 && (
          <div className="gba:text-center gba:text-sm gba:text-muted-foreground gba:mt-3" data-testid="usage-trends-section-subsection-week-bar-chart-note">
            You most commonly take time off on{" "}
            <span className="gba:font-semibold gba:text-foreground" data-testid="usage-trends-section-subsection-week-bar-chart-note-most-common">{days[mostCommonIdx]}</span>
            {" "}({mostCommonPct}% of all absences)
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageTrendsSection;
