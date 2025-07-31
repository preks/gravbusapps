/**
 * Dashboard GraphQL Queries for Backoffice Absences
 * Contains all GraphQL query logic for the dashboard data fetching
 */

// Helper function to get date filters based on timeFilter (EXACT WORKING VERSION)
export const getDateFilters = (timeFilter: string) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  console.log('🗓️ Current date context:', {
    now: now.toISOString(),
    currentYear,
    currentMonth: now.getMonth(),
    timeFilter
  });
  
  switch (timeFilter) {
    case 'current-year':
      const yearFilters = {
        startDate: `${currentYear}-01-01T00:00:00.000Z`,
        endDate: `${currentYear}-12-31T23:59:59.999Z`
      };
      console.log('📅 Year filters:', yearFilters);
      return yearFilters;
      
    case 'quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      // Fix: Use UTC dates to avoid timezone issues
      const quarterStartMonth = currentQuarter * 3; // 0, 3, 6, 9 for Q1, Q2, Q3, Q4
      const quarterEndMonth = quarterStartMonth + 2; // 2, 5, 8, 11 for Q1, Q2, Q3, Q4
      
      // Use UTC methods to avoid timezone conversion
      const quarterStart = new Date(Date.UTC(currentYear, quarterStartMonth, 1, 0, 0, 0, 0));
      const quarterEnd = new Date(Date.UTC(currentYear, quarterEndMonth + 1, 0, 23, 59, 59, 999));
      const quarterFilters = {
        startDate: quarterStart.toISOString(),
        endDate: quarterEnd.toISOString()
      };
      console.log('📅 Quarter filters (UTC FIXED):', {
        currentMonth: now.getMonth() + 1,
        currentQuarter,
        quarterNumber: currentQuarter + 1,
        quarterStartMonth: quarterStartMonth + 1, // +1 for human readable (July = 7)
        quarterEndMonth: quarterEndMonth + 1,     // +1 for human readable (Sept = 9)
        quarterStart: quarterStart.toISOString(),
        quarterEnd: quarterEnd.toISOString(),
        expectedQuarter: currentQuarter === 2 ? 'Q3 (July-September)' : `Q${currentQuarter + 1}`,
        ...quarterFilters
      });
      return quarterFilters;
      
    case 'month':
      // Use UTC to avoid timezone issues
      const monthStart = new Date(Date.UTC(currentYear, now.getMonth(), 1, 0, 0, 0, 0));
      const monthEnd = new Date(Date.UTC(currentYear, now.getMonth() + 1, 0, 23, 59, 59, 999));
      const monthFilters = {
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString()
      };
      console.log('📅 Month filters (UTC):', {
        currentMonth: now.getMonth() + 1,
        monthName: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getMonth()],
        ...monthFilters
      });
      return monthFilters;
      
    case 'everything':
      const everythingFilters = {
        startDate: '2020-01-01T00:00:00.000Z',
        endDate: `${currentYear + 1}-12-31T23:59:59.999Z`
      };
      console.log('📅 Everything filters:', everythingFilters);
      return everythingFilters;
       
    default:
      return null;
  }
};

// Dashboard query using string interpolation (ORIGINAL WORKING APPROACH)
export const getDashboardQuery = (timeFilter: string): string => {
  const currentDate = new Date().toISOString();
  const dateFilters = getDateFilters(timeFilter);
  
  let absenceWhere = `where: { 
    _and: [
      { isDeleted: { _eq: false } },
      { employee: { employeePosition: { 
        _or: [
          { exitDate: { _isNull: true } },
          { exitDate: { _gte: "${currentDate}" } }
        ]
      } } }
    ]
  }`;
  
  if (dateFilters) {
    absenceWhere = `where: { 
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
  }

  let entitlementWhere = `where: {
    _and: [
      { isDeleted: { _eq: false } },
      {
        _or: [
          { type: { value: { _ilike: "%vacation%" } } },
          { type: { value: { _ilike: "%annual%" } } },
          { type: { value: { _ilike: "%holiday%" } } },
          { type: { value: { _ilike: "%leave%" } } }
        ]
      },
      {
        employee: { 
          employeePosition: { id: { _isNull: false } }
        }
      }
    ]
  }`;
  
  if (dateFilters) {
    entitlementWhere = `where: {
        _and: [
          { isDeleted: { _eq: false } },
          {
            _or: [
              { type: { value: { _ilike: "%vacation%" } } },
              { type: { value: { _ilike: "%annual%" } } },
              { type: { value: { _ilike: "%holiday%" } } },
              { type: { value: { _ilike: "%leave%" } } }
            ]
          },
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
  query GetDashboardData {
    employeeAbsences: EmployeeAbsence(${absenceWhere}) {
      id
      status
      startDate
      endDate
      effectiveDays
      calendarDays
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
    }
  }
`;
}; 