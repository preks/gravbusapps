/**
 * Server-Side Aggregation Queries for Backoffice Absences Dashboard
 * Uses GraphQL *Aggregate syntax for optimal performance
 * 
 * Based on comprehensive UI analysis - see SERVER_SIDE_AGGREGATIONS_DOCUMENTATION.md
 */

import { getDateFilters } from './DashboardQueries';

/**
 * ✅ CORE KPI AGGREGATIONS
 * Generates a single comprehensive query for all dashboard KPIs
 * Returns aggregated counts and sums for each status
 */
export const getDashboardKPIAggregations = (timeFilter: string): string => {
  const currentDate = new Date().toISOString();
  const dateFilters = getDateFilters(timeFilter);
  
  // Build base conditions as an object structure for _and array
  let baseConditions = [
    `{ isDeleted: { _eq: false } }`,
    `{ employee: { employeePosition: { _or: [{ exitDate: { _isNull: true } }, { exitDate: { _gte: "${currentDate}" } }] } } }`
  ];
  
  // Add date filters if present
  if (dateFilters) {
    baseConditions.push(`{ startDate: { _lte: "${dateFilters.endDate}" } }`);
    baseConditions.push(`{ endDate: { _gte: "${dateFilters.startDate}" } }`);
  }
  
  const baseConditionsStr = baseConditions.join(', ');
  
  return `
    query GetDashboardKPIAggregations {
      totalAbsences: EmployeeAbsenceAggregate(where: {
        _and: [${baseConditionsStr}]
      }) {
        aggregate {
          count
          sum { effectiveDays calendarDays workingDays }
          avg { effectiveDays }
        }
      }
      
      approvedAbsences: EmployeeAbsenceAggregate(where: {
        _and: [
          ${baseConditionsStr},
          { status: { _eq: "APPROVED" } }
        ]
      }) {
        aggregate {
          count
          sum { effectiveDays }
        }
      }
      
      pendingAbsences: EmployeeAbsenceAggregate(where: {
        _and: [
          ${baseConditionsStr},
          { status: { _eq: "PENDING" } }
        ]
      }) {
        aggregate {
          count
          sum { effectiveDays }
        }
      }
      
      rejectedAbsences: EmployeeAbsenceAggregate(where: {
        _and: [
          ${baseConditionsStr},
          { status: { _eq: "REJECTED" } }
        ]
      }) {
        aggregate {
          count
          sum { effectiveDays }
        }
      }
      
      cancelledAbsences: EmployeeAbsenceAggregate(where: {
        _and: [
          ${baseConditionsStr},
          { status: { _eq: "CANCELLED" } }
        ]
      }) {
        aggregate {
          count
          sum { effectiveDays }
        }
      }
    }
  `;
};

/**
 * ✅ VACATION ENTITLEMENTS AGGREGATIONS
 * Gets aggregated vacation data for entitlements analytics
 * Uses AbsenceGroup catalog to determine vacation group types
 */
export const getVacationEntitlementsAggregations = (timeFilter: string, vacationGroupId?: string): string => {
  const dateFilters = getDateFilters(timeFilter);
  
  // Build base conditions as an object structure for _and array
  let baseConditions = [
    `{ isDeleted: { _eq: false } }`,
    `{ employee: { employeePosition: { id: { _isNull: false } } } }`
  ];
  
  // Add vacation group filter if provided (use catalog-based filtering)
  if (vacationGroupId) {
    baseConditions.push(`{ type: { parentEntryId: { _eq: "${vacationGroupId}" } } }`);
  } else {
    // Fallback: if no vacation group ID provided, return empty result 
    console.warn('⚠️ No vacation group ID provided for entitlements aggregation');
    baseConditions.push(`{ id: { _eq: "impossible-id" } }`); // This will return 0 results
  }
  
  // Add date filters if present
  if (dateFilters) {
    baseConditions.push(`{ _or: [{ validFrom: { _gte: "${dateFilters.startDate}" } }, { validTo: { _gte: "${dateFilters.startDate}" } }, { _and: [{ validFrom: { _lte: "${dateFilters.endDate}" } }, { validTo: { _gte: "${dateFilters.startDate}" } }] }] }`);
  }
  
  const baseConditionsStr = baseConditions.join(', ');
  
  return `
    query GetVacationEntitlementsAggregations {
      vacationEntitlements: EmployeeAbsenceEntitlementAggregate(where: {
        _and: [${baseConditionsStr}]
      }) {
        aggregate {
          count
          sum { total approved pending }
          avg { total approved pending }
        }
      }
    }
  `;
};

/**
 * ✅ HYBRID DATA QUERY
 * Gets minimal absence data with relationships for client-side grouping
 * This preserves existing business logic while leveraging server performance
 */
export const getHybridAbsenceData = (timeFilter: string): string => {
  const currentDate = new Date().toISOString();
  const dateFilters = getDateFilters(timeFilter);
  
  // Build base conditions as an object structure for _and array
  let baseConditions = [
    `{ isDeleted: { _eq: false } }`,
    `{ employee: { employeePosition: { _or: [{ exitDate: { _isNull: true } }, { exitDate: { _gte: "${currentDate}" } }] } } }`
  ];
  
  // Add date filters if present
  if (dateFilters) {
    baseConditions.push(`{ startDate: { _lte: "${dateFilters.endDate}" } }`);
    baseConditions.push(`{ endDate: { _gte: "${dateFilters.startDate}" } }`);
  }
  
  const baseConditionsStr = baseConditions.join(', ');
  
  return `
    query GetHybridAbsenceData {
      absences: EmployeeAbsence(
        where: {
          _and: [${baseConditionsStr}]
        }
      ) {
        id
        status
        startDate
        endDate
        effectiveDays
        calendarDays
        workingDays
        createdAt
        type {
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
              name
            }
          }
        }
      }
    }
  `;
}; 