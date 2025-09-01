import React, { useMemo } from 'react';
import { TabComponentProps } from '../../../types';
import { DashboardData } from '../../../types';
// Reuse personal absences statistics sections across all employees
import PersonalKeyInsightsSection from '../../../../personal-absences/components/KeyInsightsSection';
import PersonalUsageTrendsSection from '../../../../personal-absences/components/UsageTrendsSection';
import PersonalYearComparisonSection from '../../../../personal-absences/components/YearComparisonSection';
import OrgWorkPatternsPanel from './OrgWorkPatternsPanel';
import OrgYearComparisonCard from './OrgYearComparisonCard';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { getOverlapTypeDaysByYear } from '../../../utils/getOverlapTypeDays';
import dayjs from 'dayjs';
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system';

interface AbsenceListCardAbsence {
  type: string;
  status: string;
  title: string;
  startDate: string;
  endDate: string;
  duration: string;
  description: string;
  requestedInfo: string;
  icon?: React.ReactNode;
  typeColor?: string;
  statusColor?: string;
  requestDate?: string;
}

export const StatisticsTab: React.FC<TabComponentProps & { dashboardData: DashboardData }> = ({ dashboardData, accessToken }) => {
  // Map org-wide raw absences to the structure expected by personal statistics components
  const absences: AbsenceListCardAbsence[] = useMemo(() => {
    const items = dashboardData?.rawAbsences || [];
    return items.map((a: any) => ({
      type: a.typeName || a.groupName || '',
      status: a.status || '',
      title: a.typeName || a.groupName || 'Absence',
      startDate: a.startDate,
      endDate: a.endDate,
      duration: String(Number(a.effectiveDays) || 0),
      description: a.employeeName ? `Employee: ${a.employeeName}` : '',
      requestedInfo: a.createdAt || ''
    }));
  }, [dashboardData?.rawAbsences]);

  // Server aggregate: Leave Type Distribution by Year (sum of effectiveDays per type)
  const graphQLClient = useGraphQLClient(accessToken);
  const currentYear = dayjs().year();
  const typeNames = useMemo(() => {
    const set = new Set<string>();
    (dashboardData?.rawAbsences || []).forEach((a: any) => {
      if (a.typeName) set.add(a.typeName);
    });
    return Array.from(set);
  }, [dashboardData?.rawAbsences]);

  const [typeDays, setTypeDays] = React.useState<Record<string, number>>({});
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!accessToken || typeNames.length === 0) return;
        const res = await getOverlapTypeDaysByYear(graphQLClient, { year: currentYear, typeNames });
        if (mounted) setTypeDays(res);
      } catch {
        if (mounted) setTypeDays({});
      }
    })();
    return () => { mounted = false; };
  }, [graphQLClient, accessToken, currentYear, JSON.stringify(typeNames)]);

  return (
    <div className="gba:statisticsRoot" data-testid="backoffice-statistics-tab">
      <div className="gba:pb-6" data-testid="backoffice-statistics-key-insights">
        <PersonalKeyInsightsSection absences={absences as any[]} />
      </div>
      {/* Work Patterns and Monthly Patterns side by side (custom panel) */}
      <div className="gba:statisticsSection" data-testid="backoffice-statistics-workpatterns-grid">
        <OrgWorkPatternsPanel absences={absences as any[]} />
      </div>
      {/* Year comparison + Leave Type Distribution side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4" data-testid="backoffice-statistics-yoy-and-leave-grid">
        <div className="gba:statisticsSection" data-testid="backoffice-statistics-year-comparison">
          <OrgYearComparisonCard absences={absences as any[]} accessToken={accessToken} />
        </div>
        <div className="gba:statisticsSection" data-testid="backoffice-statistics-leave-type-distribution">
          <Card>
            <CardHeader className="gba:pb-2"><CardTitle className="gba:text-sm">Leave Type Distribution by Year ({currentYear})</CardTitle></CardHeader>
            <CardContent className="gba:pt-0">
              <div className="gba:flex gba:flex-col gba:gap-2.5">
                {Object.keys(typeDays).length === 0 ? (
                  <div className="gba:text-sm gba:text-gray-500">No data</div>
                ) : (
                  (() => {
                    const maxVal = Math.max(...Object.values(typeDays));
                    return Object.entries(typeDays).map(([type, days]) => {
                      const pct = maxVal > 0 ? Math.max(4, Math.round((Number(days) / maxVal) * 100)) : 0;
                      return (
                        <div key={type} className="gba:flex gba:items-center">
                          <div className="gba:w-28 gba:text-sm gba:text-gray-700">{type}</div>
                          <div className="gba:flex-1 gba:px-3">
                            <div className="gba:bg-gray-100 gba:rounded">
                              <div style={{ width: `${pct}%`, height: 10, background: '#3b82f6', borderRadius: 6 }} />
                            </div>
                          </div>
                          <div className="gba:w-20 gba:text-right gba:text-sm gba:text-gray-900">{days}d</div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};


