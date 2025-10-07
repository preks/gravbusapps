import React, { useMemo } from 'react';
import { TabComponentProps } from '../../../types';
import { DashboardData } from '../../../types';
// Reuse personal absences statistics sections across all employees
import PersonalKeyInsightsSection from '../../../../personal-absences/components/KeyInsightsSection';
// import PersonalUsageTrendsSection from '../../../../personal-absences/components/UsageTrendsSection';
// import PersonalYearComparisonSection from '../../../../personal-absences/components/YearComparisonSection';
import OrgWorkPatternsPanel from './OrgWorkPatternsPanel';
import OrgYearComparisonCard from './OrgYearComparisonCard';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { getOverlapTypeCountsByYear } from '../../../utils/getOverlapTypeCounts';
import { getKeyInsightsStatsByYear } from '../../../utils/getKeyInsightsStats';
import dayjs from 'dayjs';
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

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
  // Fixed AbsenceGroup IDs provided by admin (parentEntryId values)
  const FIXED_VACATION_GROUP_ID = 'AbsenceGroup:v1:RECR';
  const FIXED_SICK_GROUP_ID = 'AbsenceGroup:v1:HEALTH';
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

  const [typeCounts, setTypeCounts] = React.useState<Record<string, number>>({});
  const [uiError, setUiError] = React.useState<string | null>(null);
  const [vacationGroupIds, setVacationGroupIds] = React.useState<string[] | null>(null);
  const [sickGroupIds, setSickGroupIds] = React.useState<string[] | null>(null);
  const [keyStats, setKeyStats] = React.useState<{
    plannedPct: number;
    unplannedPct: number;
    avgDaysPerRequest: number;
    approvalRatePct: number;
    vacationDays?: number;
    sickDays?: number;
    vacationCount?: number;
    sickCount?: number;
  } | null>(null);

  // Use STRICT AbsenceGroup IDs only (provided by admin): no merges from raw data
  React.useEffect(() => {
    const v = [FIXED_VACATION_GROUP_ID];
    const s = [FIXED_SICK_GROUP_ID];
    setVacationGroupIds(v);
    setSickGroupIds(s);
    try { console.log('StatisticsTab: Planned group IDs', { vacationGroupIds: v, sickGroupIds: s }); } catch {}
  }, [currentYear]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!accessToken) return;
        // Fetch Leave Type Distribution. If we don't have types from dashboard, fetch distinct types from server for current year
        let namesToQuery = typeNames;
        if (!namesToQuery || namesToQuery.length === 0) {
          const startIso = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0)).toISOString();
          const endIso = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999)).toISOString();
          const distinctTypesQuery = `
            query DistinctAbsenceTypes($where: EmployeeAbsenceBoolExp!, $limit: Int!) {
              EmployeeAbsence(where: $where, limit: $limit) {
                type { value }
              }
            }
          `;
          try {
            const resp: any = await graphQLClient.request(distinctTypesQuery, {
              where: {
                _and: [
                  { isDeleted: { _eq: false } },
                  { startDate: { _lte: endIso } },
                  { endDate: { _gte: startIso } }
                ]
              },
              limit: 1000
            });
            const fetched = Array.from(new Set(
              (resp?.EmployeeAbsence || [])
                .map((r: any) => String(r?.type?.value || ''))
                .filter((v: string) => v.trim().length > 0)
            )) as string[];
            namesToQuery = fetched;
          } catch (e) {
            // leave namesToQuery as empty; handled below
            console.error('BackofficeAbsences: failed to fetch distinct absence types');
          }
        }
        if (namesToQuery && namesToQuery.length > 0) {
          const res = await getOverlapTypeCountsByYear(graphQLClient, { year: currentYear, typeNames: namesToQuery });
          if (mounted) setTypeCounts(res);
        } else if (mounted) {
          setTypeCounts({});
          setUiError('No absence types available for current year');
        }
        // Wait until group IDs are available (avoid race/throw)
        if (!vacationGroupIds || vacationGroupIds.length === 0 || !sickGroupIds || sickGroupIds.length === 0) {
          return;
        }
        const ks = await getKeyInsightsStatsByYear(graphQLClient, {
          year: currentYear,
          typeNames,
          vacationGroupIds: vacationGroupIds || undefined,
          sickGroupIds: sickGroupIds || undefined
        });
        if (mounted) setKeyStats({
          plannedPct: ks.plannedPct,
          unplannedPct: ks.unplannedPct,
          avgDaysPerRequest: ks.avgDaysPerRequest,
          approvalRatePct: ks.approvalRatePct,
          vacationCount: ks.vacationCount,
          sickCount: ks.sickCount
        });
      } catch (err: any) {
        const graphQLErrorMsg = err?.response?.errors?.[0]?.message || err?.message || 'Failed to load statistics';
        console.error('BackofficeAbsences: statistics fetch error ->', graphQLErrorMsg);
        if (mounted) {
          setTypeCounts({});
          setKeyStats(null);
          setUiError(graphQLErrorMsg);
        }
      }
    })();
    return () => { mounted = false; };
  }, [graphQLClient, accessToken, currentYear, JSON.stringify(typeNames), JSON.stringify(vacationGroupIds), JSON.stringify(sickGroupIds)]);

  return (
    <div className="gba:statisticsRoot" data-testid="backoffice-statistics-tab">
      <div className="gba:pb-6" data-testid="backoffice-statistics-key-insights">
        <PersonalKeyInsightsSection
          absences={absences as any[]}
          overrides={keyStats ? {
            plannedPct: keyStats.plannedPct,
            unplannedPct: keyStats.unplannedPct,
            avgDaysPerRequest: keyStats.avgDaysPerRequest,
            approvalRatePct: keyStats.approvalRatePct,
            vacationCount: keyStats.vacationCount,
            sickCount: keyStats.sickCount
          } : undefined}
          disableLocalCalc
          errorMessage={!keyStats ? uiError || 'Failed to load Planned Absences' : undefined}
        />
      </div>
      {/* Work Patterns and Monthly Patterns side by side (custom panel) */}
      <div className="gba:statisticsSection" data-testid="backoffice-statistics-workpatterns-grid">
        <OrgWorkPatternsPanel absences={absences as any[]} accessToken={accessToken} />
      </div>
      {/* Year comparison + Leave Type Distribution side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4" data-testid="backoffice-statistics-yoy-and-leave-grid">
        <div className="gba:statisticsSection" data-testid="backoffice-statistics-year-comparison">
          <OrgYearComparisonCard absences={absences as any[]} accessToken={accessToken} />
        </div>
        <div className="gba:statisticsSection" data-testid="backoffice-statistics-leave-type-distribution">
          <Card>
            <CardHeader className="gba:pb-2"><CardTitle className="gba:text-sm">{getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.leave_type_title', `Leave Type Distribution by Year (${currentYear})`, { year: currentYear })}</CardTitle></CardHeader>
            <CardContent className="gba:pt-0">
              <div className="gba:flex gba:flex-col gba:gap-2.5">
                {Object.keys(typeCounts).length === 0 ? (
                  <div className="gba:text-sm gba:text-red-600">{uiError || 'No data'}</div>
                ) : (
                  (() => {
                    const maxVal = Math.max(...Object.values(typeCounts));
                    return Object.entries(typeCounts).map(([type, cnt]) => {
                      const pct = maxVal > 0 ? Math.max(4, Math.round((Number(cnt) / maxVal) * 100)) : 0;
                      return (
                        <div key={type} className="gba:flex gba:items-center">
                          <div className="gba:w-28 gba:text-sm gba:text-gray-700">{type}</div>
                          <div className="gba:flex-1 gba:px-3">
                            <div className="gba:bg-gray-100 gba:rounded">
                              <div style={{ width: `${pct}%`, height: 10, background: '#3b82f6', borderRadius: 6 }} />
                            </div>
                          </div>
                          <div className="gba:w-20 gba:text-right gba:text-sm gba:text-gray-900">{cnt}</div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
              <div className="gba:mt-2 gba:text-xs gba:text-gray-500" data-testid="leave-type-distribution-status-note">{getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.statuses_considered_approved', 'Statuses considered: Approved')}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};


