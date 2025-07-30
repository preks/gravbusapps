/**
 * Type definitions for Backoffice Absences Dashboard
 * Contains all TypeScript interfaces and types used throughout the app
 */

import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext';

// Time filter types
export type TimeFilter = 'current-year' | 'quarter' | 'month' | 'everything';

// Props interface for components that need time filter
export interface DashboardDataProps extends BusinessAppContextProps {
  timeFilter?: TimeFilter;
}

// Absence Details navigation types
export interface AbsenceDetailsFilter {
  month?: string;
  startDate?: string;
  endDate?: string;
  status?: string; // Filter by absence status (APPROVED, PENDING, etc.)
}

// Views and navigation types
export type CurrentView = 'tabs' | 'absence-details';
export type ActiveTab = 'dashboard' | 'absence-list' | 'calendar' | 'reports';

// Dashboard data interfaces
export interface DashboardData {
  // Core metrics
  totalAbsences: number;
  pendingAbsences: number;
  approvedAbsences: number;
  rejectedAbsences: number;
  averageDuration: number;
  approvalRate: number;

  // Vacation metrics
  averageVacationDays: number;
  averageUsed: number;
  averagePending: number;
  totalVacationLiability: number;
  
  // Department statistics
  departmentStats: Array<{
    name: string;
    totalDays: number;
    uniqueEmployees: number;
    avgDaysPerEmployee: number;
    avgRequestsPerEmployee: number;
    totalRequests: number;
  }>;

  // Monthly trends data
  monthlyData: Array<{
    month: string;
    total: number; // Chart expects 'total', not 'totalRequests'
    uniqueEmployees: number;
    avgRequestsPerEmployee: number;
    avgDurationPerRequest: number;
    totalDuration: number;
    typeBreakdown: Record<string, number>;
  }>;

  // Raw data for components
  rawAbsences: Array<any>;
  
  // Chart data
  statusBreakdown: Array<{
    status: string;
    totalDays: number;
    count: number;
    percentage: number;
  }>;
  
  typeBreakdown: Array<{
    type: string;
    totalDays: number;
    count: number;
  }>;
  
  // Entitlements data
  entitlements: {
    averageVacationPerEmployee: number;
    totalActiveEmployees: number;
    averageAvailable: number;
    averageUsed: number;
  };
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

// Enhanced absence interface for list components
export interface EnhancedAbsence {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  effectiveDays?: number;
  calendarDays?: number;
  type: {
    value: string;
    parentEntryId?: string;
  };
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeePosition?: {
      organizationalUnit?: {
        name: string;
      };
    };
  };
  // Additional computed fields
  employeeName: string;
  groupName: string;
  typeName: string;
  pictureThumbnail?: string;
  createdAt?: string;
}

// Date filter interface
export interface DateFilters {
  startDate: string;
  endDate: string;
}

// Component props interfaces
export interface TabComponentProps extends BusinessAppContextProps {
  dashboardData?: DashboardData;
}

export interface PageComponentProps extends BusinessAppContextProps {
  onNavigateBack?: () => void;
} 