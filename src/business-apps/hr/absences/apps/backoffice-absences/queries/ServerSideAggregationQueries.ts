/**
 * Server-Side Aggregation Queries for Backoffice Absences Dashboard
 * Uses GraphQL *Aggregate syntax for optimal performance
 */

import { getDateFilters } from './DashboardQueries';

// ✅ SERVER-SIDE: Dashboard KPI Aggregations
export const getDashboardKPIQuery = (timeFilter: string): string => {
  const currentDate = new Date().toISOString();
  const dateFilters = getDateFilters(timeFilter);
  
  // Create base where condition
  let whereCondition = '';
  if (dateFilters) {
    whereCondition = `
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { startDate: { _lte: "${dateFilters.endDate}" } },
          { endDate: { _gte: "${dateFilters.startDate}" } },
          { employee: { 
              employeePosition: { 
                _or: [
                  { exitDate: { _isNull: true } },
                  { exitDate: { _gte: "${currentDate}" } }
                ]
              } 
            } 
          }
        ]
      }`;
  } else {
    whereCondition = `
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { employee: { 
              employeePosition: { 
                _or: [
                  { exitDate: { _isNull: true } },
                  { exitDate: { _gte: "${currentDate}" } }
                ]
              } 
            } 
          }
        ]
      }`;
  }

  return `
    query GetDashboardKPIAggregations {
      totalAbsences: EmployeeAbsenceAggregate(
        ${whereCondition}
      ) {
        aggregate {
          count
          sum {
            effectiveDays
            calendarDays
            workingDays
          }
          avg {
            effectiveDays
            calendarDays
            workingDays
          }
        }
      }
      
      approvedAbsences: EmployeeAbsenceAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } },
            { status: { _eq: "APPROVED" } },
            ${dateFilters ? `{ startDate: { _lte: "${dateFilters.endDate}" } },` : ''}
            ${dateFilters ? `{ endDate: { _gte: "${dateFilters.startDate}" } },` : ''}
            { employee: { 
                employeePosition: { 
                  _or: [
                    { exitDate: { _isNull: true } },
                    { exitDate: { _gte: "${currentDate}" } }
                  ]
                } 
              } 
            }
          ]
        }
      ) {
        aggregate {
          count
          sum { effectiveDays }
        }
      }
      
      pendingAbsences: EmployeeAbsenceAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } },
            { status: { _eq: "PENDING" } },
            ${dateFilters ? `{ startDate: { _lte: "${dateFilters.endDate}" } },` : ''}
            ${dateFilters ? `{ endDate: { _gte: "${dateFilters.startDate}" } },` : ''}
            { employee: { 
                employeePosition: { 
                  _or: [
                    { exitDate: { _isNull: true } },
                    { exitDate: { _gte: "${currentDate}" } }
                  ]
                } 
              } 
            }
          ]
        }
      ) {
        aggregate {
          count
          sum { effectiveDays }
        }
      }
      
      rejectedAbsences: EmployeeAbsenceAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } },
            { status: { _eq: "REJECTED" } },
            ${dateFilters ? `{ startDate: { _lte: "${dateFilters.endDate}" } },` : ''}
            ${dateFilters ? `{ endDate: { _gte: "${dateFilters.startDate}" } },` : ''}
            { employee: { 
                employeePosition: { 
                  _or: [
                    { exitDate: { _isNull: true } },
                    { exitDate: { _gte: "${currentDate}" } }
                  ]
                } 
              } 
            }
          ]
        }
      ) {
        aggregate {
          count
          sum { effectiveDays }
        }
      }
      
      draftAbsences: EmployeeAbsenceAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } },
            { status: { _eq: "DRAFT" } },
            ${dateFilters ? `{ startDate: { _lte: "${dateFilters.endDate}" } },` : ''}
            ${dateFilters ? `{ endDate: { _gte: "${dateFilters.startDate}" } },` : ''}
            { employee: { 
                employeePosition: { 
                  _or: [
                    { exitDate: { _isNull: true } },
                    { exitDate: { _gte: "${currentDate}" } }
                  ]
                } 
              } 
            }
          ]
        }
      ) {
        aggregate {
          count
          sum { effectiveDays }
        }
      }
    }
  `;
};

// ✅ SERVER-SIDE: Department Statistics Aggregations  
export const getDepartmentStatsQuery = (timeFilter: string): string => {
  const currentDate = new Date().toISOString();
  const dateFilters = getDateFilters(timeFilter);
  
  // Create where condition for department stats
  let whereCondition = '';
  if (dateFilters) {
    whereCondition = `
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { startDate: { _lte: "${dateFilters.endDate}" } },
          { endDate: { _gte: "${dateFilters.startDate}" } },
          { employee: { 
              employeePosition: { 
                _or: [
                  { exitDate: { _isNull: true } },
                  { exitDate: { _gte: "${currentDate}" } }
                ]
              } 
            } 
          }
        ]
      }`;
  } else {
    whereCondition = `
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { employee: { 
              employeePosition: { 
                _or: [
                  { exitDate: { _isNull: true } },
                  { exitDate: { _gte: "${currentDate}" } }
                ]
              } 
            } 
          }
        ]
      }`;
  }

  return `
    query GetDepartmentStatsAggregations {
      departmentAbsences: EmployeeAbsence(
        ${whereCondition}
      ) {
        id
        effectiveDays
        calendarDays
        workingDays
        employee {
          id
          organizationalUnit {
            id
            name
          }
        }
      }
    }
  `;
};

// ✅ SERVER-SIDE: Monthly Trends Aggregations
export const getMonthlyTrendsQuery = (timeFilter: string): string => {
  const currentDate = new Date().toISOString();
  const dateFilters = getDateFilters(timeFilter);
  
  // Create where condition for monthly trends
  let whereCondition = '';
  if (dateFilters) {
    whereCondition = `
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { startDate: { _lte: "${dateFilters.endDate}" } },
          { endDate: { _gte: "${dateFilters.startDate}" } },
          { employee: { 
              employeePosition: { 
                _or: [
                  { exitDate: { _isNull: true } },
                  { exitDate: { _gte: "${currentDate}" } }
                ]
              } 
            } 
          }
        ]
      }`;
  } else {
    whereCondition = `
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { employee: { 
              employeePosition: { 
                _or: [
                  { exitDate: { _isNull: true } },
                  { exitDate: { _gte: "${currentDate}" } }
                ]
              } 
            } 
          }
        ]
      }`;
  }

  return `
    query GetMonthlyTrendsAggregations {
      monthlyAbsences: EmployeeAbsence(
        ${whereCondition}
      ) {
        id
        startDate
        endDate
        effectiveDays
        calendarDays
        workingDays
        status
        type {
          id
          value
          parentEntryId
        }
        employee {
          id
        }
      }
    }
  `;
};

// ✅ SERVER-SIDE: Vacation Entitlements Aggregations
export const getVacationEntitlementsQuery = (timeFilter: string): string => {
  const currentDate = new Date().toISOString();
  const dateFilters = getDateFilters(timeFilter);
  
  // Create where condition for vacation entitlements
  let whereCondition = '';
  if (dateFilters) {
    whereCondition = `
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { _or: [
            { validFrom: { _gte: "${dateFilters.startDate}" } },
            { validTo: { _gte: "${dateFilters.startDate}" } },
            { _and: [
              { validFrom: { _lte: "${dateFilters.endDate}" } },
              { validTo: { _gte: "${dateFilters.startDate}" } }
            ] }
          ] },
          { employee: { 
              employeePosition: { 
                _or: [
                  { exitDate: { _isNull: true } },
                  { exitDate: { _gte: "${currentDate}" } }
                ]
              } 
            } 
          }
        ]
      }`;
  } else {
    whereCondition = `
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { employee: { 
              employeePosition: { 
                _or: [
                  { exitDate: { _isNull: true } },
                  { exitDate: { _gte: "${currentDate}" } }
                ]
              } 
            } 
          }
        ]
      }`;
  }

  return `
    query GetVacationEntitlementsAggregations {
      vacationEntitlements: EmployeeAbsenceEntitlement(
        ${whereCondition}
      ) {
        id
        entitlement
        validFrom
        validTo
        employee {
          id
          organizationalUnit {
            id
            name
          }
        }
        type {
          id
          value
        }
      }
      
      vacationAbsences: EmployeeAbsence(
        where: {
          _and: [
            { isDeleted: { _eq: false } },
            ${dateFilters ? `{ startDate: { _lte: "${dateFilters.endDate}" } },` : ''}
            ${dateFilters ? `{ endDate: { _gte: "${dateFilters.startDate}" } },` : ''}
            { type: { 
              _or: [
                { value: { _ilike: "%vacation%" } },
                { value: { _ilike: "%annual%" } },
                { value: { _ilike: "%holiday%" } }
              ]
            } },
            { employee: { 
                employeePosition: { 
                  _or: [
                    { exitDate: { _isNull: true } },
                    { exitDate: { _gte: "${currentDate}" } }
                  ]
                } 
              } 
            }
          ]
        }
      ) {
        id
        effectiveDays
        calendarDays
        workingDays
        employee {
          id
        }
      }
    }
  `;
};

// ✅ COMBINED: All Dashboard Aggregations in One Query
export const getAllDashboardAggregationsQuery = (timeFilter: string): string => {
  const currentDate = new Date().toISOString();
  const dateFilters = getDateFilters(timeFilter);
  
  let baseWhere = `{
    isDeleted: { _eq: false },
    employee: { 
        employeePosition: { 
          _or: [
            { exitDate: { _isNull: true } },
            { exitDate: { _gte: "${currentDate}" } }
          ]
        } 
      } 
  }`;
  
  if (dateFilters) {
    baseWhere = `{
      _and: [
        { isDeleted: { _eq: false } },
        { startDate: { _lte: "${dateFilters.endDate}" } },
        { endDate: { _gte: "${dateFilters.startDate}" } },
        { employee: { 
            employeePosition: { 
              _or: [
                { exitDate: { _isNull: true } },
                { exitDate: { _gte: "${currentDate}" } }
              ]
            } 
          } 
        }
      ]
    }`;
  }

  return `
    query GetAllDashboardAggregations {
      # KPI Aggregations
      totalAbsences: EmployeeAbsenceAggregate(where: ${baseWhere}) {
        aggregate {
          count
          sum { effectiveDays, calendarDays, workingDays }
          avg { effectiveDays, calendarDays, workingDays }
        }
      }
      
      approvedAbsences: EmployeeAbsenceAggregate(
        where: {
          _and: [
            ${baseWhere.replace('{', '').replace('}', '')},
            { status: { _eq: "APPROVED" } }
          ]
        }
      ) {
        aggregate { count, sum { effectiveDays } }
      }
      
      pendingAbsences: EmployeeAbsenceAggregate(
        where: {
          _and: [
            ${baseWhere.replace('{', '').replace('}', '')},
            { status: { _eq: "PENDING" } }
          ]
        }
      ) {
        aggregate { count, sum { effectiveDays } }
      }
      
      rejectedAbsences: EmployeeAbsenceAggregate(
        where: {
          _and: [
            ${baseWhere.replace('{', '').replace('}', '')},
            { status: { _eq: "REJECTED" } }
          ]
        }
      ) {
        aggregate { count, sum { effectiveDays } }
      }
      
      draftAbsences: EmployeeAbsenceAggregate(
        where: {
          _and: [
            ${baseWhere.replace('{', '').replace('}', '')},
            { status: { _eq: "DRAFT" } }
          ]
        }
      ) {
        aggregate { count, sum { effectiveDays } }
      }
      
      # Raw data for client-side grouping (department & monthly trends)
      rawAbsences: EmployeeAbsence(
        where: ${baseWhere}
        orderBy: [{ startDate: ASC }]
      ) {
        id
        employeeId
        startDate
        endDate
        effectiveDays
        calendarDays
        workingDays
        status
        createdAt
        type {
          id
          value
          parentEntry {
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
              name
            }
          }
        }
      }
      
      # Vacation Entitlements
      vacationEntitlements: EmployeeAbsenceEntitlementAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } },
            {
              _or: [
                { type: { value: { _ilike: "%vacation%" } } },
                { type: { value: { _ilike: "%annual%" } } },
                { type: { value: { _ilike: "%holiday%" } } }
              ]
            },
            { employee: { employeePosition: { id: { _isNull: false } } } }
          ]
        }
      ) {
        aggregate {
          count
          sum { total, approved, pending }
          avg { total, approved, pending }
        }
      }
      
      # Active Employees Count
      activeEmployees: EmployeeAggregate(
        where: {
          employeePosition: {
            _or: [
              { exitDate: { _isNull: true } },
              { exitDate: { _gte: "${currentDate}" } }
            ]
          }
        }
      ) {
        aggregate { count }
      }
    }
  `;
}; 