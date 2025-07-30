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
export const groupAbsencesByMonth = (absences: any[]) => {
  const monthMap = new Map();
  
  absences.forEach((absence) => {
    const startDate = new Date(absence.startDate);
    const monthKey = startDate.toLocaleDateString('en-US', { month: 'long' });
    
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        month: monthKey,
        absences: [],
        employees: new Set(),
        typeBreakdown: {}
      });
    }
    
    const monthData = monthMap.get(monthKey);
    monthData.absences.push(absence);
    monthData.employees.add(absence.employee?.id);
    
    // Use groupName for type breakdown
    const groupName = absence.groupName || 'Unknown Group';
    monthData.typeBreakdown[groupName] = (monthData.typeBreakdown[groupName] || 0) + 1;
  });
  
  return Array.from(monthMap.values()).map(monthData => {
    const totalRequests = monthData.absences.length;
    const uniqueEmployees = monthData.employees.size;
    const totalDuration = monthData.absences.reduce((sum: number, absence: any) => 
      sum + (absence.effectiveDays || absence.calendarDays || 0), 0
    );
    
    return {
      month: monthData.month,
      totalRequests,
      uniqueEmployees,
      avgRequestsPerEmployee: uniqueEmployees > 0 ? Math.round((totalRequests / uniqueEmployees) * 100) / 100 : 0,
      avgDurationPerRequest: totalRequests > 0 ? Math.round((totalDuration / totalRequests) * 100) / 100 : 0,
      totalDuration,
      typeBreakdown: monthData.typeBreakdown
    };
  });
};

// Vacation entitlements utilities
export const calculateVacationMetrics = (entitlements: any[]) => {
  if (entitlements.length === 0) {
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

  const employeeCount = entitlements.length;
  const averageVacationDays = Math.round((totals.total / employeeCount) * 100) / 100;
  const averageUsed = Math.round((totals.used / employeeCount) * 100) / 100;
  const averagePending = Math.round((totals.pending / employeeCount) * 100) / 100;
  
  // Calculate total liability (remaining vacation days across all employees)
  const totalRemaining = entitlements.reduce((sum, entitlement) => {
    const remaining = (entitlement.total || 0) - (entitlement.approved || 0) - (entitlement.pending || 0);
    return sum + Math.max(0, remaining); // Only count positive remaining days
  }, 0);

  return {
    averageVacationDays,
    averageUsed,
    averagePending,
    totalVacationLiability: totalRemaining
  };
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