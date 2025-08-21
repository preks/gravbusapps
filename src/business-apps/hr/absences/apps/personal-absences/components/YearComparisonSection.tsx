import React from "react";
import { Badge, Progress } from "@newwork/nw-design-system";
import { Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import dayjs from "dayjs";
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { filterAbsencesForEntitlements } from '../utils/absenceFilters';

interface YearComparisonSectionProps {
  absences: any[];
}

function getLastNYears(n: number) {
  const currentYear = dayjs().year();
  return Array.from({ length: n }, (_, i) => currentYear - i);
}

function getYearLabel(year: number, currentYear: number) {
  return year === currentYear ? `${year} (Current)` : `${year}`;
}

const YearComparisonSection: React.FC<YearComparisonSectionProps> = ({ absences }) => {
  const approvedAbsences = filterAbsencesForEntitlements(absences || []);
  const years = getLastNYears(3);
  const currentYear = years[0];
  const yearData = years.map((year, idx) => {
    const value = approvedAbsences.filter(a => dayjs(a.startDate).year() === year).length;
    return {
      year,
      label: getYearLabel(year, currentYear),
      value,
      color: idx === 0 ? "#3390ff" : "#bfc7d1",
    };
  });

  const leaveTypeData = years.map(year => {
    const yearAbsences = approvedAbsences.filter(a => dayjs(a.startDate).year() === year);
    const total = yearAbsences.length;
    const typeMap: Record<string, { label: string; value: number; color: string }> = {};
    yearAbsences.forEach(a => {
      const label = a.type || "Other";
      const key = (label || "other").toLowerCase();
      const color = `#${a.typeColor}`;
      if (!typeMap[key]) {
        typeMap[key] = { label, value: 0, color };
      }
      typeMap[key].value += 1;
    });
    const types = Object.values(typeMap).sort((a, b) => b.value - a.value);
    return {
      year,
      total,
      types,
    };
  });

  const prev = yearData[1]?.value || 0;
  const curr = yearData[0]?.value || 0;
  let improvementMsg = "";
  let improvementIcon = "";
  if (prev === 0 && curr === 0) {
    improvementMsg = getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.no_change_last_year', 'No change from last year');
    improvementIcon = "";
  } else if (prev === 0 && curr > 0) {
    improvementMsg = getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.new_absences_this_year', 'New absences this year');
    improvementIcon = "↑";
  } else if (prev > 0 && curr === 0) {
    improvementMsg = getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.all_absences_cleared_last_year', 'All absences cleared from last year');
    improvementIcon = "↓";
  } else {
    const diffPct = Math.round(((curr - prev) / prev) * 100);
    improvementMsg =
      diffPct < 0
        ? getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.decrease_from_last_year', '{{pct}}% decrease from last year – Good work-life balance improvement', { pct: Math.abs(diffPct) })
        : diffPct > 0
        ? getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.increase_from_last_year', '{{pct}}% increase from last year – More absences taken', { pct: diffPct })
        : getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.no_change_last_year', 'No change from last year');
    improvementIcon = diffPct < 0 ? "↓" : diffPct > 0 ? "↑" : "";
  }

  const getTrendIcon = () => {
    const prev = yearData[1]?.value || 0;
    const curr = yearData[0]?.value || 0;
    if (prev === 0 || curr === prev) return <Minus className="gba:w-4 gba:h-4 gba:text-muted-foreground" />;
    return curr > prev ? 
      <TrendingUp className="gba:w-4 gba:h-4 gba:text-warning" /> : 
      <TrendingDown className="gba:w-4 gba:h-4 gba:text-success" />;
  };

  const getTrendBadge = () => {
    const prev = yearData[1]?.value || 0;
    const curr = yearData[0]?.value || 0;
    if (prev === 0 && curr === 0) return null;
    if (prev === 0 && curr > 0) return <Badge variant="secondary" className="gba:text-xs">New Activity</Badge>;
    if (prev > 0 && curr === 0) return <Badge variant="default" className="gba:text-xs">Clear Year</Badge>;
    const diffPct = Math.round(((curr - prev) / prev) * 100);
    if (diffPct < -10) return <Badge variant="default" className="gba:text-xs">Improved Balance</Badge>;
    if (diffPct > 10) return <Badge variant="secondary" className="gba:text-xs">More Active</Badge>;
    return <Badge variant="outline" className="gba:text-xs">Stable</Badge>;
  };

  return (
    <div className="gba:space-y-6" data-testid="year-comparison-section">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-3">
        <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary gba:bg-opacity-10 gba:flex gba:items-center gba:justify-center">
          <Calendar className="gba:w-4 gba:h-4 gba:text-primary" />
        </div>
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground" data-testid="year-comparison-section-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.year_over_year_comparison', 'Year-over-Year Comparison')}
          </h3>
          <p className="gba:text-sm gba:text-muted-foreground" data-testid="year-comparison-section-subtitle">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.absence_patterns_changed', 'How your absence patterns have changed')}
          </p>
        </div>
        {getTrendBadge()}
      </div>

      {/* Year comparison bars */}
      <div className="gba:space-y-3">
        {yearData.map((row: { year: number; label: string; value: number; color: string }) => (
          <div className="gba:flex gba:items-center gba:justify-between" key={row.year}>
            <span className="gba:text-sm gba:font-medium gba:text-foreground gba:w-24">{row.label}</span>
            <div className="gba:flex-1 gba:mx-4">
              <div className="gba:h-2 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                <div
                  className="gba:h-full gba:rounded-full gba:transition-all gba:duration-300"
                  style={{ 
                    width: `${Math.max((row.value / Math.max(...yearData.map(y => y.value), 1)) * 100, 4)}%`,
                    backgroundColor: row.year === currentYear ? 'var(--nw-color-primary-500)' : 'var(--nw-color-secondary-400)'
                  }}
                />
              </div>
            </div>
            <span className="gba:text-sm gba:font-medium gba:text-foreground gba:w-16 gba:text-right">
              {row.value} {getTranslationFromI18nKeyAndLabel(row.value === 1 ? 'lowcoder:absence_hub.day' : 'lowcoder:absence_hub.days', row.value === 1 ? 'day' : 'days')}
            </span>
          </div>
        ))}
      </div>

      {/* Trend insight */}
      <div className="gba:flex gba:items-start gba:gap-3 gba:p-4 gba:bg-muted gba:rounded-lg" data-testid="year-comparison-section-improvement">
        {getTrendIcon()}
        <div className="gba:text-sm gba:text-muted-foreground">{improvementMsg}</div>
      </div>
      {/* Leave Type Distribution */}
      <div className="gba:space-y-4">
        <h4 className="gba:font-medium gba:text-foreground" data-testid="year-comparison-section-leave-type-title">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.leave_type_distribution', 'Leave Type Distribution by Year')}
        </h4>
        <div className="gba:space-y-4" data-testid="year-comparison-section-leave-type-rows">
          {leaveTypeData.map((row: { year: number; total: number; types: { label: string; value: number; color: string }[] }) => (
            <div className="gba:space-y-2" key={row.year}>
              <div className="gba:flex gba:items-center gba:justify-between">
                <span className="gba:text-sm gba:font-medium gba:text-foreground" data-testid="year-comparison-section-leave-type-year">
                  {row.year}
                </span>
                <Badge variant="outline" className="gba:text-xs">
                  {row.total} {getTranslationFromI18nKeyAndLabel(row.total === 1 ? 'lowcoder:absence_hub.day' : 'lowcoder:absence_hub.days', row.total === 1 ? 'day' : 'days')} total
                </Badge>
              </div>
              {row.total > 0 && (
                <div className="gba:h-3 gba:bg-muted gba:rounded-full gba:overflow-hidden gba:flex" data-testid="year-comparison-section-leave-type-bar-bg">
                  {row.types.map((type: { label: string; value: number; color: string }, idx: number) => (
                    <div
                      key={type.label}
                      className="gba:h-full gba:transition-all gba:duration-300"
                      style={{
                        width: `${(type.value / row.total) * 100}%`,
                        backgroundColor: type.color.startsWith('#') ? type.color : `#${type.color}`,
                      }}
                      title={`${type.label}: ${type.value} days`}
                    />
                  ))}
                </div>
              )}
              {row.types.length > 0 && (
                <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-2" data-testid="year-comparison-section-leave-type-legend-types">
                  {row.types.map((type: { label: string; value: number; color: string }) => (
                    <div key={type.label} className="gba:flex gba:items-center gba:gap-1" data-testid="year-comparison-section-leave-type-legend-type">
                      <div 
                        className="gba:w-3 gba:h-3 gba:rounded-full" 
                        style={{ backgroundColor: type.color.startsWith('#') ? type.color : `#${type.color}` }}
                      />
                      <span className="gba:text-xs gba:text-muted-foreground">
                        {type.label}: {type.value}d
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default YearComparisonSection;