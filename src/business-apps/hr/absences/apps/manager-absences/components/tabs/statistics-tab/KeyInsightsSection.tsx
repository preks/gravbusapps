import React from "react";
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils';
import { Card, CardContent } from '@newwork/nw-design-system';
import dayjs from "dayjs";
import { useAbsenceCatalogs } from '../../../hooks/useAbsenceCatalogs';

interface KeyInsightsSectionProps {
  data: any;
  context: any; // Add context to access the catalog hook
}

export const KeyInsightsSection: React.FC<KeyInsightsSectionProps> = ({ data, context }) => {
  // Get actual absence groups from catalog
  const { absenceGroups, isLoading: catalogsLoading } = useAbsenceCatalogs(context);
  
  // Debug: Log the hook state
  console.log('=== KEY INSIGHTS SECTION DEBUG ===');
  console.log('Context:', context);
  console.log('Catalogs loading:', catalogsLoading);
  console.log('Absence groups count:', absenceGroups?.length || 0);
  
  // Log the actual absence groups to understand what we have
  console.log('Actual absence groups from catalog:', absenceGroups.map(group => ({
    id: group.id,
    name: group.name,
    code: group.catalogEntry.code
  })));
  
  // Create a map of group IDs to their names for easy lookup
  const groupNameMap = new Map(absenceGroups.map(group => [group.id, group.name.toLowerCase()]));
  
  // Get vacation and sick leave group IDs
  const getVacationGroupId = () => {
    console.log('Looking for vacation group in:', absenceGroups.map(g => ({ name: g.name, code: g.catalogEntry.code })));
    
    const vacationGroup = absenceGroups.find(group => 
      group.name.toLowerCase().includes('vacation') || 
      group.catalogEntry.code?.toLowerCase() === 'recr'
    );
    
    if (vacationGroup) {
      console.log('Found vacation group:', { id: vacationGroup.id, name: vacationGroup.name, code: vacationGroup.catalogEntry.code });
    } else {
      console.log('No vacation group found');
    }
    
    return vacationGroup?.id;
  };
  
  const getSickLeaveGroupId = () => {
    console.log('Looking for sick leave group in:', absenceGroups.map(g => ({ name: g.name, code: g.catalogEntry.code })));
    
    const sickLeaveGroup = absenceGroups.find(group => 
      group.name.toLowerCase().includes('sick') || 
      group.catalogEntry.code?.toLowerCase() === 'health'
    );
    
    if (sickLeaveGroup) {
      console.log('Found sick leave group:', { id: sickLeaveGroup.id, name: sickLeaveGroup.name, code: sickLeaveGroup.catalogEntry.code });
    } else {
      console.log('No sick leave group found');
    }
    
    return sickLeaveGroup?.id;
  };
  
  const vacationGroupId = getVacationGroupId();
  const sickLeaveGroupId = getSickLeaveGroupId();
  
  // Debug: Log all available absence groups
  console.log('=== ABSENCE GROUPS DEBUG ===');
  console.log('Total absence groups found:', absenceGroups.length);
  console.log('All available absence groups:', absenceGroups.map(group => ({
    id: group.id,
    name: group.name,
    code: group.catalogEntry.code,
    fullEntry: group.catalogEntry
  })));
  
  if (absenceGroups.length === 0) {
    console.log('⚠️ WARNING: No absence groups found in catalog!');
  }
  
  // Wait for catalogs to load before proceeding
  if (catalogsLoading || absenceGroups.length === 0) {
    console.log('Catalogs still loading or empty, waiting...', { catalogsLoading, groupsCount: absenceGroups.length });
    return (
      <div className="gba:p-6 gba:text-center" data-testid="key-insights-section-loading">
        Loading absence catalogs...
      </div>
    );
  }
  
  // Use SQL-based statistics from backend instead of frontend calculations
  // The data prop IS the statistics object, not data.statistics
  const statistics = data || {};
  const currentYear = dayjs().year();
  
  // Extract SQL-calculated values from the new statistics structure
  const plannedAbsences = statistics.plannedAbsences || 0;
  const unplannedAbsences = statistics.unplannedAbsences || 0;
  const totalRelevantAbsences = plannedAbsences + unplannedAbsences;
  const averageDaysPerRequest = statistics.averageDaysPerRequest || '0.0';
  
  console.log('=== SQL-BASED STATISTICS ===');
  console.log('Planned absences (from SQL):', plannedAbsences);
  console.log('Unplanned absences (from SQL):', unplannedAbsences);
  console.log('Total relevant absences:', totalRelevantAbsences);
  console.log('Average days per request:', averageDaysPerRequest);
  
  // Calculate percentages between planned and unplanned only
  const plannedPct = totalRelevantAbsences > 0 ? Math.round((plannedAbsences / totalRelevantAbsences) * 100) : 0;
  const unplannedPct = totalRelevantAbsences > 0 ? Math.round((unplannedAbsences / totalRelevantAbsences) * 100) : 0;
  
  // Get approval rate from statistics (calculated in the hook)
  const approvalRate = statistics.approvalRate || 0;
  
  console.log('Calculated percentages:', {
    planned: plannedPct,
    unplanned: unplannedPct,
    total: totalRelevantAbsences,
    approvalRate: approvalRate
  });

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4" data-testid="key-insights-section">
      {/* Planned Absences Card */}
      <Card
        className="gba:h-full gba:shadow-sm"
        data-testid="key-insights-section-planned-absences"
      >
        <CardContent className="gba:p-4">
          <div className="gba:flex gba:items-center">
            <span className="gba:text-sm gba:text-gray-500 gba:font-medium" data-testid="planned-absences-title">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.planned_absences', 'Planned Absences (Vacation)')}
            </span>
          </div>
          <div className="gba:text-3xl gba:font-bold gba:text-gray-900" data-testid="planned-absences-value">{plannedPct}%</div>
          <div className="gba:text-xs gba:text-gray-500" data-testid="planned-absences-sub">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.vs_unplanned', `vs ${unplannedPct}% unplanned (sick leave)`, { unplannedPct })}
          </div>
        </CardContent>
      </Card>
      {/* Avg Days Card */}
      <Card
        className="gba:h-full gba:shadow-sm"
        data-testid="key-insights-section-avg-days-per-request"
      >
        <CardContent className="gba:p-4">
          <div className="gba:flex gba:items-center">
            <span className="gba:text-sm gba:text-gray-500 gba:font-medium" data-testid="avg-days-title">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.avg_days_per_request', 'Avg Days per Request')}
            </span>
          </div>
          <div className="gba:text-3xl gba:font-bold gba:text-gray-900" data-testid="avg-days-value">{averageDaysPerRequest}</div>
          <div className="gba:text-xs gba:text-gray-500" data-testid="avg-days-sub">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.efficient_leave_planning', 'Efficient leave planning')}
          </div>
        </CardContent>
      </Card>
      {/* Approval Rate Card */}
      <Card
        className="gba:h-full gba:shadow-sm"
        data-testid="key-insights-section-approval-rate"
      >
        <CardContent className="gba:p-4">
          <div className="gba:flex gba:items-center">
            <span className="gba:text-sm gba:text-gray-500 gba:font-medium" data-testid="approval-rate-title">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.approval_rate', 'Approval Rate')}
            </span>
          </div>
          <div className="gba:text-3xl gba:font-bold gba:text-gray-900" data-testid="approval-rate-value">{approvalRate}%</div>
          <div className="gba:text-xs gba:text-gray-500" data-testid="approval-rate-sub">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.approval_status_scope', 'Statuses considered: APPROVED vs ALL STATUSES')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 