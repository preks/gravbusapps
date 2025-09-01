import React, { useMemo, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { getYearRange, getYearlyDaysAggregates } from '../../../utils/getYearlyDaysAggregates';

interface OrgYearComparisonCardProps {
  absences: any[];
  accessToken?: string;
}

export const OrgYearComparisonCard: React.FC<OrgYearComparisonCardProps> = ({ absences, accessToken }) => {
  const graphQLClient = useGraphQLClient(accessToken as any);
  const [rows, setRows] = useState<{
    year: number;
    total: number;
    changePercent: number | null; // raw percent change as float, null when prev=0
    label: string;                // formatted label to display
    badgeClass: string;           // tailwind classes per rule
  }[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const range = await getYearRange(graphQLClient);
        if (!range) return;
        const yearly = await getYearlyDaysAggregates(graphQLClient, range.minYear, range.maxYear);
        const years = Object.keys(yearly).map(Number).sort((a,b)=>b-a);
        const computed = years.map((y, idx) => {
          const total = Math.round(Number(yearly[y] || 0));
          const prev = Number(yearly[years[idx+1] ?? -1] || 0);
          let changePercent: number | null = null;
          let label = '0%';
          let badgeClass = 'gba:text-gray-600 gba:bg-gray-100';

          if (prev === 0) {
            if (total > 0) {
              // New absences vs zero baseline
              label = `New +${total} days`;
              badgeClass = 'gba:text-blue-700 gba:bg-blue-50';
            } else {
              label = '0%';
            }
          } else {
            // Use precise float, then format to 2 decimals for display
            changePercent = ((total - prev) / prev) * 100;
            if (total === 0) {
              // Exact elimination only when zero
              label = '-100%';
            } else {
              const formatted = Math.abs(changePercent).toFixed(2);
              const sign = changePercent > 0 ? '+' : changePercent < 0 ? '-' : '';
              label = `${sign}${formatted}%`;
            }
            if (changePercent > 0) {
              badgeClass = 'gba:text-red-700 gba:bg-red-50';
            } else if (changePercent < 0) {
              badgeClass = 'gba:text-green-700 gba:bg-green-50';
            } else {
              badgeClass = 'gba:text-gray-600 gba:bg-gray-100';
            }
          }

          return { year: y, total, changePercent, label, badgeClass };
        });
        if (mounted) setRows(computed);
      } catch {
        // Fallback to client-derived if server fails
        const byYear = new Map<number, number>();
        (absences || []).forEach((a: any) => {
          if (String(a.status || '').toUpperCase() !== 'APPROVED') return;
          const y = dayjs(a.startDate).year();
          const d = Number(a.effectiveDays) || 0;
          byYear.set(y, (byYear.get(y) || 0) + d);
        });
        const years = Array.from(byYear.keys()).sort((a, b) => b - a);
        const result = years.map((y, idx) => {
          const total = Math.round((byYear.get(y) || 0));
          const prev = byYear.get(years[idx + 1] ?? -1) || 0;
          let changePercent: number | null = null;
          let label = '0%';
          let badgeClass = 'gba:text-gray-600 gba:bg-gray-100';

          if (prev === 0) {
            if (total > 0) {
              label = `New +${total} days`;
              badgeClass = 'gba:text-blue-700 gba:bg-blue-50';
            }
          } else {
            changePercent = ((total - prev) / prev) * 100;
            if (total === 0) {
              label = '-100%';
            } else {
              const formatted = Math.abs(changePercent).toFixed(2);
              const sign = changePercent > 0 ? '+' : changePercent < 0 ? '-' : '';
              label = `${sign}${formatted}%`;
            }
            if (changePercent > 0) badgeClass = 'gba:text-red-700 gba:bg-red-50';
            else if (changePercent < 0) badgeClass = 'gba:text-green-700 gba:bg-green-50';
          }

          return { year: y, total, changePercent, label, badgeClass };
        });
        if (mounted) setRows(result);
      }
    })();
    return () => { mounted = false; };
  }, [graphQLClient, absences]);

  const currentYear = dayjs().year();
  const maxTotal = rows.length ? Math.max(...rows.map(r => r.total)) || 1 : 1;

  return (
    <Card data-testid="org-year-comparison-card">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base">Year-over-Year Comparison</CardTitle>
      </CardHeader>
      <CardContent className="gba:pt-0">
        <div className="gba:space-y-2.5">
          {rows.map((r) => {
            const barPct = Math.max(4, Math.round((r.total / maxTotal) * 100));
            const changeTextClass = r.badgeClass.includes('red')
              ? 'gba:text-red-700'
              : r.badgeClass.includes('green')
              ? 'gba:text-green-700'
              : r.badgeClass.includes('blue')
              ? 'gba:text-blue-700'
              : 'gba:text-gray-600';
            return (
              <div key={r.year} className="gba:flex gba:items-center">
                <div className="gba:w-28 gba:flex gba:items-center">
                  <div className="gba:text-gray-900 gba:text-sm">{r.year}</div>
                </div>
                <div className="gba:flex-1 gba:px-3">
                  <div className="gba:bg-gray-100 gba:rounded">
                    <div style={{ width: `${barPct}%`, height: 10, background: '#3b82f6', borderRadius: 6 }} />
                  </div>
                </div>
                <div className="gba:w-20 gba:text-right gba:text-sm gba:text-gray-900">{r.total}</div>
                <div className={`gba:w-28 gba:text-right gba:text-sm ${changeTextClass}`}>{r.changePercent && r.changePercent !== 0 ? (r.changePercent > 0 ? '↗ ' : '↘ ') : ''}{r.label}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrgYearComparisonCard;


