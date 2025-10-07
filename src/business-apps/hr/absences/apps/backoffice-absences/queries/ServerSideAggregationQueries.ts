/**
 * ✅ PROPER SERVER-SIDE AGGREGATION QUERIES
 * Uses EmployeeAbsenceAggregate and EmployeeAbsenceEntitlementAggregate 
 * for true server-side performance optimization
 */

import { getDateFilters } from './DashboardQueries';

// Centralized overlap where-clause builder (ISO, end-to-start overlap)
const buildBaseWhere = (startIso: string, endIso: string): string => `{
  _and: [
    { isDeleted: { _eq: false } },
    { startDate: { _lte: "${endIso}" } },
    { endDate: { _gte: "${startIso}" } }
  ]
}`;

/**
 * ✅ Core KPI Aggregations Query
 * Gets all essential metrics in a single optimized server-side aggregation
 */
export const getKPIAggregationsQuery = (timeFilter: string) => {
  const dateFilters = getDateFilters(timeFilter);
  
  if (!dateFilters) {
    throw new Error(`Invalid time filter: ${timeFilter}`);
  }

  // Base where condition for all absences
  const baseWhere = buildBaseWhere(dateFilters.startDate, dateFilters.endDate);

  return `
  query GetKPIAggregations {
    # Total absence metrics
    totalAbsences: EmployeeAbsenceAggregate(where: ${baseWhere}) {
      aggregate {
        count
        sum { effectiveDays }
        avg { effectiveDays }
      }
    }
    
    # Status-specific aggregations  
    approvedAbsences: EmployeeAbsenceAggregate(where: { _and: [${baseWhere}, { status: { _eq: "APPROVED" } }] }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }
    
    pendingAbsences: EmployeeAbsenceAggregate(where: { _and: [${baseWhere}, { status: { _eq: "PENDING" } }] }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }
    
    rejectedAbsences: EmployeeAbsenceAggregate(where: { _and: [${baseWhere}, { status: { _eq: "REJECTED" } }] }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }
    
    cancelledAbsences: EmployeeAbsenceAggregate(where: { _and: [${baseWhere}, { status: { _eq: "CANCELLED" } }] }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }
  }`;
};

/**
 * ✅ Vacation Entitlements Aggregations Query
 * Server-side vacation metrics aggregation with TIME FILTER
 */
export const getVacationEntitlementsAggregationsQuery = (timeFilter: string, vacationGroupId?: string) => {
  const dateFilters = getDateFilters(timeFilter);
  
  if (!dateFilters) {
    throw new Error(`Invalid time filter: ${timeFilter}`);
  }

  // Base where condition for vacation entitlements
  let entitlementWhere = `{
    _and: [
      { isDeleted: { _eq: false } },
      { employee: { employeePosition: { id: { _isNull: false } } } }
    ]
  }`;
  
  // Add vacation group filter if provided
  if (vacationGroupId) {
    entitlementWhere = `{
      _and: [
        { isDeleted: { _eq: false } },
        { type: { parentEntryId: { _eq: "${vacationGroupId}" } } },
        { employee: { employeePosition: { id: { _isNull: false } } } }
      ]
    }`;
  }

  // CRITICAL: Apply time filter to vacation entitlements (regardless of vacation group)
  if (dateFilters && dateFilters.startDate && dateFilters.endDate) {
    if (vacationGroupId) {
      // With vacation group filter + time filter
      entitlementWhere = `{
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
          { employee: { employeePosition: { id: { _isNull: false } } } }
        ]
      }`;
    } else {
      // No vacation group but still apply time filter
      entitlementWhere = `{
        _and: [
          { isDeleted: { _eq: false } },
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
          { employee: { employeePosition: { id: { _isNull: false } } } }
        ]
      }`;
    }
  }

  return `
  query GetVacationEntitlementsAggregations {
    vacationEntitlements: EmployeeAbsenceEntitlementAggregate(where: ${entitlementWhere}) {
      aggregate {
        count
        sum { total approved pending available }
        avg { total approved pending available }
      }
    }
  }`;
};

/**
 * ✅ Hybrid Data Query (Raw data for complex grouping)
 * For department stats and monthly trends that need complex client-side grouping
 */
export const getHybridDataQuery = (timeFilter: string) => {
  const dateFilters = getDateFilters(timeFilter);
  
  if (!dateFilters) {
    throw new Error(`Invalid time filter: ${timeFilter}`);
  }

  // Optimized where clause for raw data (minimal fields needed)
  let absenceWhere = `where: ${buildBaseWhere(dateFilters.startDate, dateFilters.endDate)}`;

  return `
  query GetHybridData {
    employeeAbsences: EmployeeAbsence(${absenceWhere}) {
      id
      status
      startDate
      endDate
      effectiveDays
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
        parentEntry {
          objectValue
          translations {
            localeCode
            value
          }
          id
          value
        }
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
  }`;
};

/**
 * ✅ Complete Server-Side Aggregation System
 * Combines all aggregation queries for maximum efficiency
 */
export const getCompleteAggregationsQuery = (
  timeFilter: string,
  vacationGroupId: string | null = null
): string => {
  const dateFilters = getDateFilters(timeFilter);
  
  if (!dateFilters) {
    throw new Error(`Invalid time filter: ${timeFilter}`);
  }

  // Base where condition for all absences
  const baseWhere = buildBaseWhere(dateFilters.startDate, dateFilters.endDate);

  // Vacation entitlements specific where condition - ALWAYS filter by current year for vacation entitlements
  let vacationWhereCondition = '';
  if (vacationGroupId) {
    const currentYear = new Date().getFullYear();
    const currentYearStart = `${currentYear}-01-01`;
    const currentYearEnd = `${currentYear}-12-31`;
    
    vacationWhereCondition = `
    where: {
      _and: [
        { isDeleted: { _eq: false } },
        { validFrom: { _lte: "${currentYearEnd}" } },
        { validTo: { _gte: "${currentYearStart}" } },
        { type: { id: { _eq: "AbsenceType:v1:A001" } } },
        { employee: { employeePosition: { id: { _isNull: false } } } }
      ]
    }`;
  }

  return `
  query GetCompleteAggregations {
    # ✅ CORE KPI AGGREGATIONS (server-side)
    totalAbsences: EmployeeAbsenceAggregate(where: ${baseWhere}) {
      aggregate {
        count
        sum { effectiveDays }
        avg { effectiveDays }
      }
    }
    
    # ✅ STATUS BREAKDOWN AGGREGATIONS (server-side)
    approvedAbsences: EmployeeAbsenceAggregate(where: { 
      _and: [${baseWhere}, { status: { _eq: "APPROVED" } }] 
    }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }
    
    pendingAbsences: EmployeeAbsenceAggregate(where: { 
      _and: [${baseWhere}, { status: { _eq: "PENDING" } }] 
    }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }
    
    rejectedAbsences: EmployeeAbsenceAggregate(where: { 
      _and: [${baseWhere}, { status: { _eq: "REJECTED" } }] 
    }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }
    
    cancelledAbsences: EmployeeAbsenceAggregate(where: { 
      _and: [${baseWhere}, { status: { _eq: "CANCELLED" } }] 
    }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }

    # ✅ VACATION ENTITLEMENTS AGGREGATIONS (server-side)
    ${vacationGroupId ? `
    vacationEntitlements: EmployeeAbsenceEntitlementAggregate(${vacationWhereCondition}) {
      aggregate {
        count
        sum { total }
        sum { approved }
        sum { pending }
        avg { total }
        avg { approved }
        avg { pending }
      }
    }
    ` : ''}

    # ✅ ACTIVE EMPLOYEES COUNT (from employeePosition table)
    activeEmployeesCount: EmployeePositionAggregate(where: { id: { _isNull: false } }) {
      aggregate {
        count
      }
    }

    # ✅ VACATION ABSENCE BALANCE DAYS (for avg used per employee calculation and remaining days total)
    ${vacationGroupId ? `
    vacationAbsenceBalance: EmployeeAbsenceAggregate(where: {
      _and: [
        { isDeleted: { _eq: false } },
        { type: { id: { _eq: "AbsenceType:v1:A001" } } },
        { employee: { employeePosition: { id: { _isNull: false } } } },
        { status: { _nin: ["APPROVED", "REJECTED"] } }
      ]
    }) {
      aggregate {
        sum { balance }
      }
    }
    ` : ''}

    # ✅ FULL RAW DATA (needed for frontend calculations per documentation)
    employeeAbsences: EmployeeAbsence(where: ${baseWhere}) {
      id
      status
      startDate
      endDate
      effectiveDays
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
        parentEntry {
          objectValue
          translations {
            localeCode
            value
          }
          id
          value
        }
      }
      employee {
        id
        firstName
        lastName
        displayName
        employeePosition {
          organizationalUnit {
            id
            name
          }
        }
      }
    }

    # ✅ VACATION ENTITLEMENTS RAW DATA (needed for entitlements page)
    ${vacationGroupId ? `
    EmployeeAbsenceEntitlement(${vacationWhereCondition}) {
      id
      total
      approved
      pending
      validFrom
      validTo
      type {
        id
        value
        parentEntryId
      }
      employee {
        id
        firstName
        lastName
        displayName
        employeePosition {
          organizationalUnit {
            id
            name
          }
        }
      }
    }
    ` : ''}
  }
`;
};

// ✅ HYBRID APPROACH: Keep working vacation aggregations + frontend calculations
// (Following documentation recommendations for incremental migration)

export const getOptimizedDashboardQuery = getCompleteAggregationsQuery;

// Export specific functions for modular usage
export const getDepartmentStatsAggregation = getHybridDataQuery;
export const getMonthlyTrendsAggregation = getHybridDataQuery;
export const getEnhancedVacationMetrics = (timeFilter: string, vacationGroupId?: string) => 
  getVacationEntitlementsAggregationsQuery(timeFilter, vacationGroupId);
export const getOptimizedAbsenceData = getKPIAggregationsQuery;

 