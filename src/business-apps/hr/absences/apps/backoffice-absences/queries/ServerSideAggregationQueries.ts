/**
 * ✅ PROPER SERVER-SIDE AGGREGATION QUERIES
 * Uses EmployeeAbsenceAggregate and EmployeeAbsenceEntitlementAggregate 
 * for true server-side performance optimization
 */

import { getDateFilters } from './DashboardQueries';

/**
 * ✅ Core KPI Aggregations Query
 * Gets all essential metrics in a single optimized server-side aggregation
 */
export const getKPIAggregationsQuery = (timeFilter: string) => {
  const dateFilters = getDateFilters(timeFilter);
  
  if (!dateFilters) {
    throw new Error(`Invalid time filter: ${timeFilter}`);
  }

  const currentDate = new Date().toISOString();

  // Base where condition for all absences
  const baseWhere = `{
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

  return `
  query GetKPIAggregations {
    # Total absence metrics
    totalAbsences: EmployeeAbsenceAggregate(where: ${baseWhere}) {
      aggregate {
        count
        sum { effectiveDays calendarDays workingDays }
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
 * Server-side vacation metrics aggregation
 */
export const getVacationEntitlementsAggregationsQuery = (vacationGroupId?: string) => {
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

  const currentDate = new Date().toISOString();

  // Optimized where clause for raw data (minimal fields needed)
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

  return `
  query GetHybridData {
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
  }`;
};

/**
 * ✅ Complete Server-Side Aggregation System
 * Combines all aggregation queries for maximum efficiency
 */
export const getCompleteAggregationsQuery = (timeFilter: string, vacationGroupId?: string) => {
  const dateFilters = getDateFilters(timeFilter);
  
  if (!dateFilters) {
    throw new Error(`Invalid time filter: ${timeFilter}`);
  }

  const currentDate = new Date().toISOString();

  // Base where condition
  const baseWhere = `{
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

  // Vacation entitlements where condition
  let vacationWhere = `{
    _and: [
      { isDeleted: { _eq: false } },
      { employee: { employeePosition: { id: { _isNull: false } } } }
    ]
  }`;
  
  if (vacationGroupId) {
    vacationWhere = `{
      _and: [
        { isDeleted: { _eq: false } },
        { type: { parentEntryId: { _eq: "${vacationGroupId}" } } },
        { employee: { employeePosition: { id: { _isNull: false } } } }
      ]
    }`;
  }

  return `
  query GetCompleteServerSideAggregations {
    # ✅ CORE KPI AGGREGATIONS
    totalAbsences: EmployeeAbsenceAggregate(where: ${baseWhere}) {
      aggregate {
        count
        sum { effectiveDays calendarDays workingDays }
        avg { effectiveDays }
      }
    }
    
    approvedAbsences: EmployeeAbsenceAggregate(where: { _and: [${baseWhere}, { status: { _eq: "APPROVED" } }] }) {
      aggregate { count sum { effectiveDays } }
    }
    
    pendingAbsences: EmployeeAbsenceAggregate(where: { _and: [${baseWhere}, { status: { _eq: "PENDING" } }] }) {
      aggregate { count sum { effectiveDays } }
    }
    
    rejectedAbsences: EmployeeAbsenceAggregate(where: { _and: [${baseWhere}, { status: { _eq: "REJECTED" } }] }) {
      aggregate { count sum { effectiveDays } }
    }
    
    cancelledAbsences: EmployeeAbsenceAggregate(where: { _and: [${baseWhere}, { status: { _eq: "CANCELLED" } }] }) {
      aggregate { count sum { effectiveDays } }
    }

    # ✅ VACATION ENTITLEMENTS AGGREGATIONS
    vacationEntitlements: EmployeeAbsenceEntitlementAggregate(where: ${vacationWhere}) {
      aggregate {
        count
        sum { total approved pending available }
        avg { total approved pending available }
      }
    }

    # ✅ RAW DATA FOR COMPLEX GROUPING
    employeeAbsences: EmployeeAbsence(where: ${baseWhere}) {
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

    # ✅ VACATION ENTITLEMENTS RAW DATA
    EmployeeAbsenceEntitlement(where: ${vacationWhere}) {
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
  }`;
};

// Export main function for useDashboardData
export const getOptimizedDashboardQuery = getCompleteAggregationsQuery;

// Export specific functions for modular usage
export const getDepartmentStatsAggregation = getHybridDataQuery;
export const getMonthlyTrendsAggregation = getHybridDataQuery;
export const getEnhancedVacationMetrics = getVacationEntitlementsAggregationsQuery;
export const getOptimizedAbsenceData = getKPIAggregationsQuery;

 