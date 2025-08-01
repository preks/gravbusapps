/**
 * Dashboard GraphQL Queries for Backoffice Absences
 * Contains all GraphQL query logic for the dashboard data fetching
 */

// Helper function to get date filters based on timeFilter (EXACT WORKING VERSION)
export const getDateFilters = (timeFilter: string) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const currentMonth = now.getMonth();

  switch (timeFilter) {
    case 'current-year':
      const yearFilters = {
        startDate: new Date(currentYear, 0, 1).toISOString(), // Jan 1
        endDate: new Date(currentYear, 11, 31, 23, 59, 59, 999).toISOString() // Dec 31
      };
      return yearFilters;

    case 'quarter':
      const quarterStartMonth = (currentQuarter - 1) * 3;
      const quarterEndMonth = quarterStartMonth + 2;
      
      const quarterStart = new Date(currentYear, quarterStartMonth, 1);
      const quarterEnd = new Date(currentYear, quarterEndMonth + 1, 0, 23, 59, 59, 999);
      
      return {
        startDate: quarterStart.toISOString(),
        endDate: quarterEnd.toISOString()
      };

    case 'month':
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
      
      return {
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString()
      };

    case 'everything':
      const everythingFilters = {
        startDate: '2020-01-01T00:00:00.000Z',
        endDate: new Date(currentYear + 1, 11, 31, 23, 59, 59, 999).toISOString()
      };
      return everythingFilters;

    default:
      return null;
  }
}; 