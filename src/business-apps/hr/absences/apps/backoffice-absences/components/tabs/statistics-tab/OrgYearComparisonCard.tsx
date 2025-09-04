import React, { useEffect, useState } from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { getYearRange } from '../../../utils/getYearlyDaysAggregates';

interface OrgYearComparisonCardProps {
  absences: any[];
  accessToken?: string;
}

export const OrgYearComparisonCard: React.FC<OrgYearComparisonCardProps> = ({ absences, accessToken }) => {
  const graphQLClient = useGraphQLClient(accessToken as any);
  const [rows, setRows] = useState<{
    year: number;
    total: number; // requests
    changePercent: number | null; // raw percent change as float, null when prev=0
    label: string;                // formatted label to display
    badgeClass: string;           // tailwind classes per rule
  }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const range = await getYearRange(graphQLClient);
        if (!range) {
          throw new Error('Missing year range');
        }
        // Requests per year (APPROVED)
        const qParts: string[] = [];
        const varDecls: string[] = [];
        const variables: Record<string, any> = {};
        for (let y = range.minYear; y <= range.maxYear; y++) {
          const startIso = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)).toISOString();
          const endIso = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)).toISOString();
          const name = `y_${y}`;
          const whereVar = `w_${y}`;
          varDecls.push(`$${whereVar}: EmployeeAbsenceBoolExp!`);
          variables[whereVar] = {
            _and: [
              { isDeleted: { _eq: false } },
              { status: { _eq: 'APPROVED' } },
              { startDate: { _lte: endIso } },
              { endDate: { _gte: startIso } }
            ]
          };
          qParts.push(`${name}: EmployeeAbsenceAggregate(where: $${whereVar}) { aggregate { count } }`);
        }
        const query = `query YoYCounts(${varDecls.join(', ')}) { ${qParts.join('\n')} }`;
        const res: any = await graphQLClient.request(query, variables);
        const yearly: Record<number, number> = {};
        for (let y = range.minYear; y <= range.maxYear; y++) {
          yearly[y] = Number(res?.[`y_${y}`]?.aggregate?.count || 0);
        }
        const years = Object.keys(yearly).map(Number).sort((a,b)=>b-a);
        const computed = years.map((y, idx) => {
          const total = Math.round(Number(yearly[y] || 0)); // requests
          const prev = Number(yearly[years[idx+1] ?? -1] || 0);
          let changePercent: number | null = null;
          let label = '0%';
          let badgeClass = 'gba:text-gray-600 gba:bg-gray-100';

          if (prev === 0) {
            if (total > 0) {
              // New requests vs zero baseline
              label = `+${total} New requests`;
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
        if (mounted) {
          setRows(computed);
          setError(null);
        }
      } catch (e) {
        if (mounted) {
          setRows([]);
          setError('Failed to load Year-over-Year data');
        }
      }
    })();
    return () => { mounted = false; };
  }, [graphQLClient, absences]);

  // const currentYear = dayjs().year();
  const maxTotal = rows.length ? Math.max(...rows.map(r => r.total)) || 1 : 1;

  return (
    <Card data-testid="org-year-comparison-card">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base">{getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.yoy_title', 'Year-over-Year Comparison')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:pt-0">
        <div className="gba:space-y-2.5">
          {error && (
            <div className="gba:text-sm gba:text-red-600" data-testid="org-year-comparison-error">{error}</div>
          )}
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
              <div key={r.year} className="gba:flex gba:items-center" data-testid={`org-yoy-row-${r.year}`}>
                <div className="gba:w-28 gba:flex gba:items-center">
                  <div className="gba:text-gray-900 gba:text-sm">{r.year}</div>
                </div>
                <div className="gba:flex-1 gba:px-3">
                  <div className="gba:bg-gray-100 gba:rounded">
                    <div style={{ width: `${barPct}%`, height: 10, background: '#3b82f6', borderRadius: 6 }} data-testid={`org-yoy-bar-${r.year}`} />
                  </div>
                </div>
                <div className="gba:w-20 gba:text-right gba:text-sm gba:text-gray-900" data-testid={`org-yoy-total-${r.year}`}>{r.total}</div>
                <div className={`gba:w-28 gba:text-right gba:text-sm ${changeTextClass}`} data-testid={`org-yoy-change-${r.year}`}>{r.changePercent && r.changePercent !== 0 ? (r.changePercent > 0 ? '↗ ' : '↘ ') : ''}{r.label}</div>
              </div>
            );
          })}
        </div>
        <div className="gba:mt-2 gba:text-xs gba:text-gray-500">{getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.statuses_considered_approved', 'Statuses considered: APPROVED')}</div>
      </CardContent>
    </Card>
  );
};

export default OrgYearComparisonCard;


