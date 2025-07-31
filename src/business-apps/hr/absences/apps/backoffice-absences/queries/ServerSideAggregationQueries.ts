/**
 * ✅ OPTIMIZED: Server-Side Dashboard Queries
 * Based on working DashboardQueries.ts pattern but optimized for performance
 */

import { getDateFilters } from './DashboardQueries';

/**
 * ✅ WORKING: Main dashboard query (optimized version of getDashboardQuery)
 * Uses the PROVEN syntax from DashboardQueries.ts but with optimized field selection
 */
export const getOptimizedDashboardQuery = (timeFilter: string, vacationGroupId?: string) => {
  const dateFilters = getDateFilters(timeFilter);
  
  if (!dateFilters) {
    throw new Error(`Invalid time filter: ${timeFilter}`);
  }

  const currentDate = new Date().toISOString();

  // ✅ PROVEN: Same where clause logic as working DashboardQueries.ts
  let absenceWhere = `where: { 
    _and: [
      { isDeleted: { _eq: false } },
      { startDate: { _lte: "${dateFilters.endDate}" } },
      { endDate: { _gte: "${dateFilters.startDate}" } },
      { employee: { employeePosition: { 
        _or: [
          { exitDate: { _isNull: true } },
          { exitDate: { _gte: "${currentDate}" } }
        ]
      } } }
    ]
  }`;

  // ✅ PROVEN: Same entitlement where clause logic as working DashboardQueries.ts
  let entitlementWhere = `where: {
    _and: [
      { isDeleted: { _eq: false } },
      {
        employee: { 
          employeePosition: { id: { _isNull: false } }
        }
      }
    ]
  }`;
  
  // Add vacation group filter if provided (same logic as DashboardQueries.ts)
  if (vacationGroupId) {
    entitlementWhere = `where: {
      _and: [
        { isDeleted: { _eq: false } },
        { type: { parentEntryId: { _eq: "${vacationGroupId}" } } },
        {
          employee: { 
            employeePosition: { id: { _isNull: false } }
          }
        }
      ]
    }`;
  } else {
    console.warn('⚠️ No vacation group ID provided - vacation metrics will be empty');
    entitlementWhere = `where: {
      _and: [
        { isDeleted: { _eq: false } },
        { id: { _eq: "impossible-id" } }
      ]
    }`;
  }

  // ✅ CRITICAL FIX: Add date filtering for vacation entitlements (missing from optimized query)
  if (dateFilters && vacationGroupId) {
    entitlementWhere = `where: {
        _and: [
          { isDeleted: { _eq: false } },
          { type: { parentEntryId: { _eq: "${vacationGroupId}" } } },
          {
            _or: [
              { validFrom: { _gte: "${dateFilters.startDate}" } },
              { validTo: { _gte: "${dateFilters.startDate}" } },
              { 
                _and: [
                  { validFrom: { _lte: "${dateFilters.endDate}" } },
                  { validTo: { _gte: "${dateFilters.startDate}" } }
                ]
              }
            ]
          },
          {
            employee: { 
              employeePosition: { id: { _isNull: false } }
            }
          }
        ]
    }`;
  }

  return `
  query GetOptimizedDashboardData {
    employeeAbsences: EmployeeAbsence(${absenceWhere}) {
      id
      status
      startDate
      endDate
      effectiveDays
      calendarDays
      createdAt
      type {
        objectValue
        translations {
          localeCode
          value
        }
        id
        value
        parentEntryId
      }
      employee {
        id
        firstName
        lastName
        employeePosition {
          organizationalUnit {
            id
            name
          }
        }
      }
    }
    
    EmployeeAbsenceEntitlement(${entitlementWhere}) {
      employeeId
      available
      approved
      total
      pending
      type {
        id
        value
        parentEntryId
      }
    }
  }
`;
};

// Export aliases for backward compatibility with useDashboardData.ts
export const getDepartmentStatsAggregation = getOptimizedDashboardQuery;
export const getMonthlyTrendsAggregation = getOptimizedDashboardQuery;
export const getEnhancedVacationMetrics = getOptimizedDashboardQuery;
export const getOptimizedAbsenceData = getOptimizedDashboardQuery;

 