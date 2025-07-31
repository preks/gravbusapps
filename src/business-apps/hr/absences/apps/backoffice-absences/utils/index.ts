/**
 * Utility functions for Backoffice Absences Dashboard
 * Contains reusable helper functions used throughout the app
 */

// Currency utility functions
export const extractCurrencyCode = (currencyId: string): string => {
  return currencyId.split(':').pop() || 'EUR';
};

export const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode
  }).format(amount);
};

// Date utility functions
export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};

export const formatDateFull = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Absence calculation utilities
export const calculateAverageDuration = (absences: any[]): number => {
  if (absences.length === 0) return 0;
  
  const totalDays = absences.reduce((sum, absence) => {
    return sum + (absence.effectiveDays || absence.calendarDays || 0);
  }, 0);
  
  return Math.round((totalDays / absences.length) * 100) / 100; // Round to 2 decimal places
};

export const calculateApprovalRate = (absences: any[]): number => {
  if (absences.length === 0) return 0;
  
  const approvedCount = absences.filter(absence => 
    absence.status === 'APPROVED'
  ).length;
  
  return Math.round((approvedCount / absences.length) * 100);
};

// Department statistics utilities
export const groupAbsencesByDepartment = (absences: any[]) => {
  const departmentMap = new Map();
  
  absences.forEach((absence) => {
    // employeePosition is now a single active position (filtered at query level)
    const departmentName = absence.employee?.employeePosition?.organizationalUnit?.name || 'No Department';
    
    if (!departmentMap.has(departmentName)) {
      departmentMap.set(departmentName, {
        name: departmentName,
        absences: [],
        employees: new Set()
      });
    }
    
    const dept = departmentMap.get(departmentName);
    dept.absences.push(absence);
    dept.employees.add(absence.employee?.id);
  });
  
  return Array.from(departmentMap.values()).map(dept => {
    const totalDays = dept.absences.reduce((sum: number, absence: any) => 
      sum + (absence.effectiveDays || absence.calendarDays || 0), 0
    );
    const uniqueEmployees = dept.employees.size;
    const totalRequests = dept.absences.length;
    
    return {
      name: dept.name,
      totalDays,
      uniqueEmployees,
      avgDaysPerEmployee: uniqueEmployees > 0 ? Math.round((totalDays / uniqueEmployees) * 100) / 100 : 0,
      avgRequestsPerEmployee: uniqueEmployees > 0 ? Math.round((totalRequests / uniqueEmployees) * 100) / 100 : 0,
      totalRequests
    };
  }).sort((a, b) => b.totalDays - a.totalDays);
};

// Monthly trends utilities
export const groupAbsencesByMonth = (absences: any[], timeFilter?: string) => {
  const monthMap = new Map();
  
  // ✅ FIX: Get current year for filtering months
  const currentYear = new Date().getFullYear();
  const filterYear = timeFilter === 'current-year' ? currentYear : null;
  
  console.log('📅 groupAbsencesByMonth called with:', {
    absencesCount: absences.length,
    timeFilter,
    filterYear,
    logic: filterYear ? 'Show only months from filtered year' : 'Show all months'
  });
  
  absences.forEach((absence) => {
    const startDate = new Date(absence.startDate);
    const endDate = new Date(absence.endDate);
    
    // ✅ FIX: For year-spanning absences, use the month that falls within the filtered year
    let targetDate: Date;
    
    if (filterYear) {
      // If filtering by year, choose the date that falls within the target year
      if (startDate.getFullYear() === filterYear) {
        targetDate = startDate; // Absence starts in target year
      } else if (endDate.getFullYear() === filterYear) {
        targetDate = endDate; // Absence ends in target year
        
        // ✅ DEBUG: Log year-spanning absences
        console.log('🔄 Year-spanning absence mapped to target year:', {
          absenceId: absence.id,
          originalStart: absence.startDate,
          originalEnd: absence.endDate,
          startYear: startDate.getFullYear(),
          endYear: endDate.getFullYear(),
          filterYear,
          mappedToMonth: targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          logic: `Moved from ${startDate.getFullYear()} to ${filterYear} because it ends in target year`
        });
      } else {
        // Absence doesn't overlap with target year, skip it
        console.log('⏭️ Skipping absence - no overlap with target year:', {
          absenceId: absence.id,
          startYear: startDate.getFullYear(),
          endYear: endDate.getFullYear(),
          filterYear
        });
        return;
      }
    } else {
      // No year filtering, use start date as before
      targetDate = startDate;
    }
    
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth(); // 0-11
    const monthName = targetDate.toLocaleDateString('en-US', { month: 'short' }); // Jan, Feb, etc.
    
    // ✅ Use year-month key for proper chronological sorting
    const sortKey = `${year}-${month.toString().padStart(2, '0')}`; // e.g., "2024-01", "2024-02"
    
    if (!monthMap.has(sortKey)) {
      monthMap.set(sortKey, {
        month: monthName, // Display name (Jan, Feb, etc.)
        year,
        monthNumber: month,
        sortKey,
        absences: [],
        employees: new Set(),
        typeBreakdown: {}
      });
    }
    
    const monthData = monthMap.get(sortKey);
    monthData.absences.push(absence);
    monthData.employees.add(absence.employee?.id);
    
    // Use groupName for type breakdown
    const groupName = absence.groupName || 'Unknown Group';
    monthData.typeBreakdown[groupName] = (monthData.typeBreakdown[groupName] || 0) + 1;
  });
  
  // ✅ FIX: Sort months chronologically and transform data
  const sortedMonthData = Array.from(monthMap.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey)); // Sort by "2024-01", "2024-02", etc.
  
  // ✅ FIX: Check if we have multiple years - if so, include year in display
  const years = [...new Set(sortedMonthData.map(d => d.year))];
  const includeYear = years.length > 1;
  
  
  return sortedMonthData.map(monthData => {
      const totalRequests = monthData.absences.length;
      const uniqueEmployees = monthData.employees.size;
      const totalDuration = monthData.absences.reduce((sum: number, absence: any) => 
        sum + (absence.effectiveDays || absence.calendarDays || 0), 0
      );
      
      // ✅ FIX: Include year when multiple years exist to avoid duplicates
      const displayMonth = includeYear ? `${monthData.month} ${monthData.year}` : monthData.month;
      
      const result = {
        month: displayMonth, // "Jan 2024", "Dec 2024", "Jan 2025" when multiple years, otherwise just "Jan", "Feb"
        total: totalRequests, // ✅ FIX: Use 'total' instead of 'totalRequests' for chart compatibility
        totalRequests, // Keep for backward compatibility
        uniqueEmployees,
        avgRequestsPerEmployee: uniqueEmployees > 0 ? Math.round((totalRequests / uniqueEmployees) * 100) / 100 : 0,
        avgDurationPerRequest: totalRequests > 0 ? Math.round((totalDuration / totalRequests) * 100) / 100 : 0,
        totalDuration,
        typeBreakdown: monthData.typeBreakdown
      };
      
      
      return result;
    });
};

// Vacation entitlements utilities
export const calculateVacationMetrics = (entitlements: any[]) => {
  console.log('🔍 DEBUG: calculateVacationMetrics input:', {
    entitlementsCount: entitlements.length,
    sampleEntitlements: entitlements.slice(0, 3).map(e => ({
      id: e.id || e.employeeId,
      total: e.total,
      approved: e.approved,
      pending: e.pending,
      available: e.available,
      allFields: Object.keys(e)
    }))
  });

  if (entitlements.length === 0) {
    console.log('⚠️ No entitlements found, returning zeros');
    return {
      averageVacationDays: 0,
      averageUsed: 0,
      averagePending: 0,
      totalVacationLiability: 0
    };
  }

  const totals = entitlements.reduce(
    (acc, entitlement) => ({
      total: acc.total + (entitlement.total || 0),
      used: acc.used + (entitlement.approved || 0),
      pending: acc.pending + (entitlement.pending || 0)
    }),
    { total: 0, used: 0, pending: 0 }
  );

  console.log('🔍 DEBUG: calculateVacationMetrics totals:', {
    totals,
    employeeCount: entitlements.length,
    hasValidTotals: totals.total > 0 || totals.used > 0 || totals.pending > 0
  });

  const employeeCount = entitlements.length;
  const averageVacationDays = Math.round((totals.total / employeeCount) * 100) / 100;
  const averageUsed = Math.round((totals.used / employeeCount) * 100) / 100;
  const averagePending = Math.round((totals.pending / employeeCount) * 100) / 100;
  
  // Calculate total liability (remaining vacation days across all employees)
  const totalRemaining = entitlements.reduce((sum, entitlement) => {
    const remaining = (entitlement.total || 0) - (entitlement.approved || 0) - (entitlement.pending || 0);
    return sum + Math.max(0, remaining); // Only count positive remaining days
  }, 0);

  const result = {
    averageVacationDays,
    averageUsed,
    averagePending,
    totalVacationLiability: totalRemaining
  };

  console.log('🔍 DEBUG: calculateVacationMetrics result:', result);

  return result;
};

// Color utilities for charts
export const getAbsenceGroupColor = (groupName: string): string => {
  const colorMap: Record<string, string> = {
    'Vacation': '#3b82f6',
    'Sick Leave': '#ef4444',
    'Special Leave': '#8b5cf6',
    'Work Leave': '#f59e0b',
    'Unknown Group': '#6b7280'
  };
  
  return colorMap[groupName] || '#6b7280';
};

// Navigation utilities
export const getMonthDateRange = (month: string, year: number = new Date().getFullYear()) => {
  const monthIndex = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ].findIndex(m => m.startsWith(month.substring(0, 3)));
  
  if (monthIndex === -1) return null;
  
  // Calculate start and end dates using UTC to avoid timezone issues
  const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
};

// ✅ NEW: Server-Side Aggregation Utilities
export {
  processKPIAggregations,
  processVacationEntitlementsAggregations,
  processHybridDashboardData,
  validateServerClientConsistency,
  measureAggregationPerformance
} from './serverSideAggregationUtils'; 