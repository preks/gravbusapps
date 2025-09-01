import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { getMonthlyAggregates } from '../../../utils/getMonthlyAggregates';

interface OrgWorkPatternsPanelProps {
  absences: any[];
  accessToken?: string;
}

const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export const OrgWorkPatternsPanel: React.FC<OrgWorkPatternsPanelProps> = ({ absences, accessToken }) => {
  const currentYear = dayjs().year();
  const graphQLClient = useGraphQLClient(accessToken as any);
  const [monthlyServer, setMonthlyServer] = useState<number[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!accessToken) return;
        const { byMonthCount } = await getMonthlyAggregates(graphQLClient, currentYear);
        if (mounted) {
          setMonthlyServer(byMonthCount);
        }
      } catch (e) {
        if (mounted) {
          setMonthlyServer(null);
        }
      }
    })();
    return () => { mounted = false; };
  }, [graphQLClient, accessToken, currentYear]);

  const { dayCounts, dayPercents, monthlyCounts, monthlyPercents, peakMonth, lowMonth } = useMemo(() => {
    const approved = (absences || []).filter((a: any) => String(a.status || '').toUpperCase() === 'APPROVED');

    const dayCounts = Array(7).fill(0);
    const monthCounts = Array(12).fill(0);

    approved.forEach((a: any) => {
      if (a.startDate) {
        const d = dayjs(a.startDate);
        // Day-of-week (Mon=0..Sun=6)
        const idx = d.day() === 0 ? 6 : d.day() - 1;
        dayCounts[idx] += 1;
        // Monthly (current year only)
        if (d.year() === currentYear) {
          monthCounts[d.month()] += 1;
        }
      }
    });

    const dayTotal = dayCounts.reduce((s:number,c:number)=>s+c,0) || 1;
    const baseMonthCounts = monthlyServer ?? monthCounts;
    const monthlyTotal = baseMonthCounts.reduce((s:number,c:number)=>s+c,0) || 1;

    const dayPercents = dayCounts.map((c:number)=> Math.round((c/dayTotal)*100));
    const monthlyPercents = baseMonthCounts.map((c:number)=> Math.round((c/monthlyTotal)*100));

    const peakIdx = monthCounts.indexOf(Math.max(...monthCounts));
    const lowIdx = monthCounts.indexOf(Math.min(...monthCounts));

    return {
      dayCounts,
      dayPercents,
      monthlyCounts: baseMonthCounts,
      monthlyPercents,
      peakMonth: { label: monthLabels[peakIdx], percent: monthlyPercents[peakIdx] },
      lowMonth: { label: monthLabels[lowIdx], percent: monthlyPercents[lowIdx] }
    };
  }, [absences, currentYear]);

  const renderBar = (value: number, percent: number) => (
    <div className="gba:flex gba:items-center gba:gap-3 gba:w-full">
      <div className="gba:flex-1 gba:bg-gray-200 gba:rounded">
        <div style={{ width: `${Math.min(100, percent)}%`, background: '#3b82f6', height: 10, borderRadius: 6 }} />
      </div>
      <div className="gba:w-10 gba:text-right gba:text-sm">{value}</div>
      <div className="gba:w-10 gba:text-right gba:text-sm">{percent}%</div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base">{getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.work_patterns_title', 'Work Patterns')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:pt-0">
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          {/* Day of Week Preferences */}
          <div>
            <div className="gba:text-sm gba:font-medium gba:mb-2">{getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.work_patterns_dow', 'Day of Week Preferences')}</div>
            <div className="gba:space-y-2.5">
              {dayLabels.map((label, i) => (
                <div key={label} className="gba:flex gba:items-center gba:gap-3" data-testid={`work-patterns-dow-${i}`}>
                  <div className="gba:w-10 gba:text-sm gba:text-gray-700" data-testid={`work-patterns-dow-label-${i}`}>{label}</div>
                  {renderBar(dayCounts[i], dayPercents[i])}
                </div>
              ))}
            </div>
            <div className="gba:text-xs gba:text-gray-500 gba:mt-2">{
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_hub.work_patterns_most_common',
                `Most common: ${dayLabels[dayPercents.indexOf(Math.max(...dayPercents))]} (${Math.max(...dayPercents)}% of all absences)`,
                {
                  day: dayLabels[dayPercents.indexOf(Math.max(...dayPercents))],
                  percent: Math.max(...dayPercents)
                }
              )
            }</div>
          </div>

          {/* Monthly Absence Patterns */}
          <div>
            <div className="gba:text-sm gba:font-medium gba:mb-2">{getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.work_patterns_monthly', 'Monthly Absence Patterns')}</div>
            <div className="gba:space-y-2.5">
              {monthLabels.map((m, i) => (
                <div key={m} className="gba:flex gba:items-center gba:gap-3" data-testid={`work-patterns-month-${i}`}>
                  <div className="gba:w-10 gba:text-sm gba:text-gray-700" data-testid={`work-patterns-month-label-${i}`}>{m}</div>
                  {renderBar(monthlyCounts[i], monthlyPercents[i])}
                </div>
              ))}
            </div>
            <div className="gba:text-xs gba:text-gray-500 gba:mt-2">{
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_hub.work_patterns_peak_low',
                `Peak season: ${peakMonth.label} (${peakMonth.percent}% of all absences) · Lowest: ${lowMonth.label} (${lowMonth.percent}% of all absences)`,
                {
                  peak: peakMonth.label,
                  peakPercent: peakMonth.percent,
                  low: lowMonth.label,
                  lowPercent: lowMonth.percent
                }
              )
            }</div>
          </div>
        </div>
        <div className="gba:mt-4 gba:text-xs gba:bg-blue-50 gba:border gba:border-blue-100 gba:rounded gba:p-3" data-testid="work-patterns-seasonal-insight">
          {
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_hub.work_patterns_seasonal_insight',
              `Seasonal Insight: Peak month ${peakMonth.label} (${peakMonth.percent}% of all absences) · Lowest ${lowMonth.label} (${lowMonth.percent}% of all absences). Consider staffing adjustments during peak periods.`,
              {
                peak: peakMonth.label,
                peakPercent: peakMonth.percent,
                low: lowMonth.label,
                lowPercent: lowMonth.percent
              }
            )
          }
        </div>
        <div className="gba:mt-2 gba:text-xs gba:text-gray-600" data-testid="work-patterns-status-note">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.statuses_considered_approved_counts', 'Statuses considered: APPROVED; values represent request counts.')}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrgWorkPatternsPanel;


