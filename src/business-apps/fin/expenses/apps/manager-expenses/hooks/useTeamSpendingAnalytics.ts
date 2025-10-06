import { useState, useEffect, useMemo } from 'react';
import {
  normalizeStatus,
  EXCLUDE_ITEM_STATUSES,
  EXCLUDE_REQUEST_STATUSES,
  EXCLUDE_PLAN_STATUSES,
  EXCLUDE_ADV_PAYMENT_STATUSES,
} from '../constants/expenseStatus';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { GET_EXPENSE_ANALYTICS_DATA } from '../queries/analytics';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

dayjs.extend(weekday);
dayjs.extend(localeData);

// Define interfaces for analytics data
interface EmployeePosition {
  organizationalUnit?: {
    id: string;
    name: string;
  };
  siteLocation?: {
    id: string;
    name: string;
  };
}

interface Employee {
  id: string;
  fullName: string;
  employeePosition?: EmployeePosition;
}

interface ExpensePosition {
  expenseGroupRef: string;
  expenseGroup?: {
    value?: string;
    translations?: Array<{ value?: string; localeCode?: string }>;
  };
}

interface ExpenseItem {
  id: string;
  title: string;
  expenseDate: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  currencyRef: string;
  employee: Employee;
  expensePosition?: ExpensePosition[];
}

interface ExpenseRequest {
  id: string;
  title: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  currencyRef: string;
  employee: Employee;
}

interface ExpensePlan {
  id: string;
  title: string;
  code: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  currencyRef: string;
  employee: Employee;
}

interface AdvancePayment {
  id: string;
  code: string;
  amount: number;
  status: string;
  transactionDate: string;
  createdAt: string;
  currencyRef: string;
  expensePlan: {
    id: string;
    title: string;
    employee: Employee;
  };
}

interface AnalyticsData {
  expenseItems: ExpenseItem[];
  expenseRequests: ExpenseRequest[];
  expensePlans: ExpensePlan[];
  advancePayments: AdvancePayment[];
}

// Define interfaces for processed analytics data
interface ChartData {
  name: string;
  value: number;
}

interface TimeSeriesData {
  date: string;
  value: number;
}

interface StatusBreakdown {
  status: string;
  count: number;
  amount: number;
}

interface OrgUnitBreakdown {
  orgUnit: string;
  count: number;
  amount: number;
}

interface LocationBreakdown {
  location: string;
  count: number;
  amount: number;
}

interface ProcessedAnalyticsData {
  expenseItemsByCategory: ChartData[];
  expenseItemsByMonth: TimeSeriesData[];
  expenseItemsByStatus: StatusBreakdown[];
  expenseRequestsByMonth: TimeSeriesData[];
  expenseRequestsByStatus: StatusBreakdown[];
  expensePlansByMonth: TimeSeriesData[];
  expensePlansByStatus: StatusBreakdown[];
  advancePaymentsByMonth: TimeSeriesData[];
  advancePaymentsByStatus: StatusBreakdown[];
  expensesByOrgUnit: OrgUnitBreakdown[];
  expensesByLocation: LocationBreakdown[];
  totalExpenseAmount: number;
  totalRequestAmount: number;
  totalPlanAmount: number;
  totalAdvanceAmount: number;
}

// Define date range options
export enum DateRangeOption {
  LAST_30_DAYS = 'last30Days',
  LAST_90_DAYS = 'last90Days',
  LAST_6_MONTHS = 'last6Months',
  LAST_YEAR = 'lastYear',
  YEAR_TO_DATE = 'yearToDate',
  ALL_TIME = 'allTime'
}

export interface DateRangeValues {
  startDate: string | null;
  endDate: string | null;
}

// Define the filter interfaces
export interface LocationFilter {
  id: string;
  name: string;
  selected: boolean;
}

export interface DepartmentFilter {
  id: string;
  name: string;
  selected: boolean;
}

export const useTeamSpendingAnalytics = (
  accessToken: string,
  managerId: string,
  currencyFilter?: string | null
) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeOption>(DateRangeOption.LAST_30_DAYS);
  // Removed custom date range handling
  const [locationFilters, setLocationFilters] = useState<LocationFilter[]>([]);
  const [departmentFilters, setDepartmentFilters] = useState<DepartmentFilter[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState<string>('');
  const [rawData, setRawData] = useState<AnalyticsData | null>(null);
  
  const graphqlClient = useGraphQLClient(accessToken);
  
  // Calculate date range based on selected option
  const dateRangeValues = useMemo(() => {
    const now = dayjs();
    let startDate: string | null = null;
    let endDate = now.format('YYYY-MM-DD');
    
    switch (dateRange) {
      case DateRangeOption.LAST_30_DAYS:
        startDate = now.subtract(30, 'day').format('YYYY-MM-DD');
        break;
      case DateRangeOption.LAST_90_DAYS:
        startDate = now.subtract(90, 'day').format('YYYY-MM-DD');
        break;
      case DateRangeOption.LAST_6_MONTHS:
        startDate = now.subtract(6, 'month').format('YYYY-MM-DD');
        break;
      case DateRangeOption.LAST_YEAR:
        startDate = now.subtract(1, 'year').format('YYYY-MM-DD');
        break;
      case DateRangeOption.YEAR_TO_DATE:
        startDate = now.startOf('year').format('YYYY-MM-DD');
        break;
      case DateRangeOption.ALL_TIME:
        startDate = null; // No start date means all time
        break;
      default:
        startDate = now.subtract(30, 'day').format('YYYY-MM-DD');
    }
    
    return { startDate, endDate };
  }, [dateRange]);
  
  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      // Validate required parameters
      if (!accessToken) {
        // silent fail in production; keep user-friendly error only
        if (import.meta?.env?.DEV) console.error('useTeamSpendingAnalytics - Missing accessToken');
        setError('Missing authentication token');
        setIsLoading(false);
        return;
      }
      
      if (!managerId || managerId === 'undefined' || managerId === 'null') {
        if (import.meta?.env?.DEV) console.error('useTeamSpendingAnalytics - Invalid managerId:', managerId);
        setError('Invalid manager ID');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Ensure managerId is properly formatted for the GraphQL query
        const validManagerId = managerId.trim();
        
        // Helper function to standardize currency reference format
        const standardizeCurrencyRef = (currencyRef: string | null | undefined): string | undefined => {
          if (!currencyRef) return undefined;
          return currencyRef.startsWith('Currency:v1:') ? currencyRef : `Currency:v1:${currencyRef}`;
        };
        
        // Format the currency reference for the database query (Currency:v1:CODE format)
        const formattedCurrencyRef = standardizeCurrencyRef(currencyFilter);
        
        // debug log removed
        
        const variables = {
          managerId: validManagerId,
          startDate: dateRangeValues.startDate,
          endDate: dateRangeValues.endDate,
          currencyRef: formattedCurrencyRef
        };
        
        // debug log removed
        
        const response = await graphqlClient.request(GET_EXPENSE_ANALYTICS_DATA, variables);
        // Map the snake_case response to our camelCase interface
        setRawData({
          expenseItems: response.expenseItems || [],
          expenseRequests: response.expenseRequests || [],
          expensePlans: response.expensePlans || [],
          advancePayments: response.advancePayments || []
        });
      } catch (err) {
        if (import.meta?.env?.DEV) console.error('Error fetching analytics data:', err);
        setError('Failed to fetch analytics data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [accessToken, managerId, dateRangeValues, graphqlClient, currencyFilter]);
  
  // Extract unique locations from raw data
  useEffect(() => {
    if (!rawData) return;
    
    // Extract unique locations from expense items
    const uniqueLocations = new Map<string, { id: string; name: string }>();
    
    // Extract from expense items
    for (const item of rawData.expenseItems) {
      if (item.employee?.employeePosition?.siteLocation?.id && item.employee?.employeePosition?.siteLocation?.name) {
        const location = item.employee.employeePosition.siteLocation;
        uniqueLocations.set(location.id, {
          id: location.id,
          name: location.name
        });
      }
    }
    
    // Extract from expense requests
    for (const item of rawData.expenseRequests) {
      if (item.employee?.employeePosition?.siteLocation?.id && item.employee?.employeePosition?.siteLocation?.name) {
        const location = item.employee.employeePosition.siteLocation;
        uniqueLocations.set(location.id, {
          id: location.id,
          name: location.name
        });
      }
    }
    
    // Extract from expense plans
    for (const item of rawData.expensePlans) {
      if (item.employee?.employeePosition?.siteLocation?.id && item.employee?.employeePosition?.siteLocation?.name) {
        const location = item.employee.employeePosition.siteLocation;
        uniqueLocations.set(location.id, {
          id: location.id,
          name: location.name
        });
      }
    }
    
    // Convert to array and sort by name
    const locations = Array.from(uniqueLocations.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(location => ({
        id: location.id,
        name: location.name,
        selected: false
      }));
    
    setLocationFilters(locations);
  }, [rawData]);
  
  // Extract unique departments from raw data
  useEffect(() => {
    if (!rawData) return;
    
    // Extract unique departments from expense items
    const uniqueDepartments = new Map<string, { id: string; name: string }>();
    
    // Extract from expense items
    for (const item of rawData.expenseItems) {
      if (item.employee?.employeePosition?.organizationalUnit?.id && item.employee?.employeePosition?.organizationalUnit?.name) {
        const department = item.employee.employeePosition.organizationalUnit;
        uniqueDepartments.set(department.id, {
          id: department.id,
          name: department.name
        });
      }
    }
    
    // Extract from expense requests
    for (const item of rawData.expenseRequests) {
      if (item.employee?.employeePosition?.organizationalUnit?.id && item.employee?.employeePosition?.organizationalUnit?.name) {
        const department = item.employee.employeePosition.organizationalUnit;
        uniqueDepartments.set(department.id, {
          id: department.id,
          name: department.name
        });
      }
    }
    
    // Extract from expense plans
    for (const item of rawData.expensePlans) {
      if (item.employee?.employeePosition?.organizationalUnit?.id && item.employee?.employeePosition?.organizationalUnit?.name) {
        const department = item.employee.employeePosition.organizationalUnit;
        uniqueDepartments.set(department.id, {
          id: department.id,
          name: department.name
        });
      }
    }
    
    // Convert to array and sort by name
    const departments = Array.from(uniqueDepartments.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(department => ({
        id: department.id,
        name: department.name,
        selected: false
      }));
    
    setDepartmentFilters(departments);
  }, [rawData]);
  
  // Function to toggle location filter selection
  const toggleLocationFilter = (locationId: string) => {
    setLocationFilters(prevFilters => {
      return prevFilters.map(filter => {
        if (filter.id === locationId) {
          return { ...filter, selected: !filter.selected };
        }
        return filter;
      });
    });
  };

  // Function to toggle department filter selection
  const toggleDepartmentFilter = (departmentId: string) => {
    setDepartmentFilters(prevFilters => {
      return prevFilters.map(filter => {
        if (filter.id === departmentId) {
          return { ...filter, selected: !filter.selected };
        }
        return filter;
      });
    });
  };

  // Function to handle search term changes
  const handleSearchTermChange = (term: string) => {
    setSearchTerm(term);
  };

  // Function to handle department search term changes
  const handleDepartmentSearchTermChange = (term: string) => {
    setDepartmentSearchTerm(term);
  };

  // Filter locations by search term
  const filteredLocationFilters = useMemo(() => {
    if (!searchTerm) return locationFilters;
    
    return locationFilters.filter(location => 
      location.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [locationFilters, searchTerm]);
  
  // Filter departments by search term
  const filteredDepartmentFilters = useMemo(() => {
    if (!departmentSearchTerm) return departmentFilters;
    
    return departmentFilters.filter(department => 
      department.name.toLowerCase().includes(departmentSearchTerm.toLowerCase())
    );
  }, [departmentFilters, departmentSearchTerm]);
  
  // Extract available currencies from raw data
  const availableCurrencies = useMemo(() => {
    if (!rawData) return [];
    
    const currencySet = new Set<string>();
    
    // Collect from expense items
    if (rawData.expenseItems) {
      for (const item of rawData.expenseItems) {
      if (item.currencyRef) {
        // Extract currency code from Currency:v1:EUR format
        const code = item.currencyRef.split(':').pop();
        if (code) currencySet.add(code);
      }
      }
    }
    
    // Collect from expense requests
    if (rawData.expenseRequests) {
      for (const request of rawData.expenseRequests) {
        if (request.currencyRef) {
          const code = request.currencyRef.split(':').pop();
          if (code) currencySet.add(code);
        }
      }
    }
    
    // Collect from expense plans
    if (rawData.expensePlans) {
      for (const plan of rawData.expensePlans) {
        if (plan.currencyRef) {
          const code = plan.currencyRef.split(':').pop();
          if (code) currencySet.add(code);
        }
      }
    }
    
    // Collect from advance payments
    if (rawData.advancePayments) {
      for (const payment of rawData.advancePayments) {
        if (payment.currencyRef) {
          const code = payment.currencyRef.split(':').pop();
          if (code) currencySet.add(code);
        }
      }
    }
    
    return Array.from(currencySet).sort((a, b) => a.localeCompare(b));
  }, [rawData]);
  
  // Apply filters to raw data
  const processedData: ProcessedAnalyticsData | null = useMemo(() => {
    if (!rawData) return null;

    // Get selected location IDs for filtering
    const selectedLocationIds = locationFilters
      .filter(location => location.selected)
      .map(location => location.id);

    // Get selected department IDs for filtering
    const selectedDepartmentIds = departmentFilters
      .filter(department => department.selected)
      .map(department => department.id);

    // Function to check if date is within selected range
    const isDateInRange = (dateStr: string | undefined) => {
      if (!dateStr) return false;
      const date = dayjs(dateStr);

      // Get date range based on selected option
      let startDate: dayjs.Dayjs | null = null;
      let endDate: dayjs.Dayjs | null = null;

      const today = dayjs();

      switch (dateRange) {
        case DateRangeOption.LAST_30_DAYS:
          startDate = today.subtract(30, 'day');
          endDate = today;
          break;
        case DateRangeOption.LAST_90_DAYS:
          startDate = today.subtract(90, 'day');
          endDate = today;
          break;
        case DateRangeOption.LAST_6_MONTHS:
          startDate = today.subtract(6, 'month');
          endDate = today;
          break;
        case DateRangeOption.LAST_YEAR:
          startDate = today.subtract(1, 'year');
          endDate = today;
          break;
        case DateRangeOption.YEAR_TO_DATE:
          startDate = dayjs().startOf('year');
          endDate = today;
          break;
        case DateRangeOption.ALL_TIME:
          return true; // No date filtering
        // CUSTOM removed
      }

      // Check if date is within range
      if (startDate && !date.isAfter(startDate)) {
        return false;
      }

      if (endDate && !date.isBefore(endDate)) {
        return false;
      }

      return true;
    };

    // Status exclusion lists centralized in constants

    // Filter expense items
    const filteredExpenseItems = rawData.expenseItems ? rawData.expenseItems.filter(item => {
      // Check if date is within range
      if (!isDateInRange(item.expenseDate || item.createdAt)) return false;

      // Check if employee's location is selected
      const locationId = item.employee?.employeePosition?.siteLocation?.id;
      if (locationId && selectedLocationIds.length > 0 && !selectedLocationIds.includes(locationId)) {
        return false;
      }

      // Check if employee's department is selected
      const departmentId = item.employee?.employeePosition?.organizationalUnit?.id;
      if (departmentId && selectedDepartmentIds.length > 0 && !selectedDepartmentIds.includes(departmentId)) {
        return false;
      }

      // Check if currency matches filter
      if (currencyFilter) {
        const standardizedFilter = currencyFilter.startsWith('Currency:v1:') ? currencyFilter : `Currency:v1:${currencyFilter}`;
        const standardizedItemRef = item.currencyRef?.startsWith('Currency:v1:') ? item.currencyRef : `Currency:v1:${item.currencyRef || ''}`;
        
        if (standardizedItemRef !== standardizedFilter) {
          return false;
        }
      }

      // Exclude specific statuses to match list screens
      if (item.status && EXCLUDE_ITEM_STATUSES.has(item.status)) {
        return false;
      }

      return true;
    }) : [];

    // Filter expense requests
    const filteredExpenseRequests = rawData.expenseRequests ? rawData.expenseRequests.filter(item => {
      // Check if date is within range
      if (!isDateInRange(item.createdAt)) return false;

      // Check if employee's location is selected
      const locationId = item.employee?.employeePosition?.siteLocation?.id;
      if (locationId && selectedLocationIds.length > 0 && !selectedLocationIds.includes(locationId)) {
        return false;
      }

      // Check if employee's department is selected
      const departmentId = item.employee?.employeePosition?.organizationalUnit?.id;
      if (departmentId && selectedDepartmentIds.length > 0 && !selectedDepartmentIds.includes(departmentId)) {
        return false;
      }

      // Check if currency matches filter
      if (currencyFilter) {
        const standardizedFilter = currencyFilter.startsWith('Currency:v1:') ? currencyFilter : `Currency:v1:${currencyFilter}`;
        const standardizedItemRef = item.currencyRef?.startsWith('Currency:v1:') ? item.currencyRef : `Currency:v1:${item.currencyRef || ''}`;
        
        if (standardizedItemRef !== standardizedFilter) {
          return false;
        }
      }

      // Exclude statuses as in manager expenses request lists
      if (item.status && EXCLUDE_REQUEST_STATUSES.has(item.status)) {
        return false;
      }

      return true;
    }) : [];

    // Filter expense plans
    const filteredExpensePlans = rawData.expensePlans ? rawData.expensePlans.filter(item => {
      // Check if date is within range
      if (!isDateInRange(item.createdAt)) return false;

      // Check if employee's location is selected
      const locationId = item.employee?.employeePosition?.siteLocation?.id;
      if (locationId && selectedLocationIds.length > 0 && !selectedLocationIds.includes(locationId)) {
        return false;
      }

      // Check if employee's department is selected
      const departmentId = item.employee?.employeePosition?.organizationalUnit?.id;
      if (departmentId && selectedDepartmentIds.length > 0 && !selectedDepartmentIds.includes(departmentId)) {
        return false;
      }

      // Check if currency matches filter
      if (currencyFilter) {
        const standardizedFilter = currencyFilter.startsWith('Currency:v1:') ? currencyFilter : `Currency:v1:${currencyFilter}`;
        const standardizedItemRef = item.currencyRef?.startsWith('Currency:v1:') ? item.currencyRef : `Currency:v1:${item.currencyRef || ''}`;
        
        if (standardizedItemRef !== standardizedFilter) {
          return false;
        }
      }

      // Exclude statuses as in manager expenses plan lists
      if (item.status && EXCLUDE_PLAN_STATUSES.has(item.status)) {
        return false;
      }

      return true;
    }) : [];

    // Filter advance payments
    const filteredAdvancePayments = rawData.advancePayments ? rawData.advancePayments.filter(item => {
      // Check if date is within range (revert to createdAt only)
      if (!isDateInRange(item.createdAt)) return false;

      // Check if employee's location is selected
      const locationId = item.expensePlan?.employee?.employeePosition?.siteLocation?.id;
      if (locationId && selectedLocationIds.length > 0 && !selectedLocationIds.includes(locationId)) {
        return false;
      }

      // Check if employee's department is selected
      const departmentId = item.expensePlan?.employee?.employeePosition?.organizationalUnit?.id;
      if (departmentId && selectedDepartmentIds.length > 0 && !selectedDepartmentIds.includes(departmentId)) {
        return false;
      }

      // Check if currency matches filter
      if (currencyFilter) {
        const standardizedFilter = currencyFilter.startsWith('Currency:v1:') ? currencyFilter : `Currency:v1:${currencyFilter}`;
        const standardizedItemRef = item.currencyRef?.startsWith('Currency:v1:') ? item.currencyRef : `Currency:v1:${item.currencyRef || ''}`;
        
        if (standardizedItemRef !== standardizedFilter) {
          return false;
        }
      }

      // Exclude statuses as in manager expenses advance payment lists
      if (item.status && EXCLUDE_ADV_PAYMENT_STATUSES.has(item.status)) {
        return false;
      }

      return true;
    }) : [];

    // Helper function to get localized category display name
    const getCategoryDisplayName = (position: ExpensePosition): string => {
      const catalog = position.expenseGroup;
      const locale = getCurrentActiveUserLocale().toLowerCase();
      const translated = catalog?.translations?.find((t) => t?.localeCode?.toLowerCase() === locale)?.value;
      const display = translated || catalog?.value;
      const codeKey = position.expenseGroupRef || 'Uncategorized';
      return display || codeKey;
    };

    // Helper function to add amount to category map
    const addToCategory = (categoryMap: Map<string, number>, category: string, amount: number): void => {
      const currentAmount = categoryMap.get(category) || 0;
      categoryMap.set(category, currentAmount + amount);
    };

    // Helper function to process a single expense item for categorization
    const processItemCategory = (item: ExpenseItem, categoryMap: Map<string, number>): void => {
      if (item.expensePosition && Array.isArray(item.expensePosition)) {
        const positions = item.expensePosition;
        if (positions.length > 0) {
          // Divide total amount equally among positions
          const amountPerPosition = (item.totalAmount || 0) / positions.length;
          for (const position of positions as ExpensePosition[]) {
            const category = getCategoryDisplayName(position);
            addToCategory(categoryMap, category, amountPerPosition);
          }
        } else {
          addToCategory(categoryMap, 'Uncategorized', item.totalAmount || 0);
        }
      } else {
        addToCategory(categoryMap, 'Uncategorized', item.totalAmount || 0);
      }
    };

    // Process expense items by category
    const categoryMap = new Map<string, number>();
    filteredExpenseItems.forEach((item: ExpenseItem) => {
      processItemCategory(item, categoryMap);
    });
    
    const expenseItemsByCategory: ChartData[] = Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name,
        value
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
    
    // Process time series data
    const processTimeSeriesData = (items: any[], amountField: string = 'totalAmount') => {
      if (!Array.isArray(items)) return [];
      
      const monthMap = new Map<string, number>();
      
      items.forEach(item => {
        if (!item || !item.createdAt) return;
        
        const date = dayjs(item.createdAt).format('YYYY-MM');
        const currentAmount = monthMap.get(date) || 0;
        monthMap.set(date, currentAmount + (item[amountField] || 0));
      });
      
      // Sort by date
      return Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, value]) => ({ date, value }));
    };
    
    // Process data by status
    const processStatusData = (items: any[], amountField: string = 'totalAmount') => {
      if (!Array.isArray(items)) return [];
      
      const statusMap = new Map<string, { count: number; amount: number }>();
      
      items.forEach(item => {
        if (!item) return;
        // Normalize to canonical statuses used in Expenses
        const status = normalizeStatus(item.status);
        const prev = statusMap.get(status) || { count: 0, amount: 0 };
        const addAmount = Number(item?.[amountField] ?? 0);
        statusMap.set(status, {
          count: prev.count + 1,
          amount: prev.amount + (Number.isNaN(addAmount) ? 0 : addAmount)
        });
      });
      
      return Array.from(statusMap.entries())
        .map(([status, agg]) => ({ status, count: agg.count, amount: agg.amount }))
        .sort((a, b) => b.count - a.count);
    };
    
    // Process by organizational unit
    const orgUnitMap = new Map<string, { count: number; amount: number }>();
    const processOrgUnitData = (items: any[], amountField: string = 'totalAmount') => {
      if (!Array.isArray(items)) return;
      
      items.forEach(item => {
        if (!item) return;
        
        const employee = item.employee || (item.expensePlan?.employee);
        if (!employee) return;
        
        const orgUnit = employee.employeePosition?.organizationalUnit?.name || 'Unknown';
        const current = orgUnitMap.get(orgUnit) || { count: 0, amount: 0 };
        
        orgUnitMap.set(orgUnit, {
          count: current.count + 1,
          amount: current.amount + (item[amountField] || 0)
        });
      });
    };
    
    // Process by location
    const locationMap = new Map<string, { count: number; amount: number }>();
    const processLocationData = (items: any[], amountField: string = 'totalAmount') => {
      if (!Array.isArray(items)) return;
      
      items.forEach(item => {
        if (!item) return;
        
        const employee = item.employee || (item.expensePlan?.employee);
        if (!employee) return;
        
        const location = employee.employeePosition?.siteLocation?.name || 'Unknown';
        const current = locationMap.get(location) || { count: 0, amount: 0 };
        
        locationMap.set(location, {
          count: current.count + 1,
          amount: current.amount + (item[amountField] || 0)
        });
      });
    };
    
    // Process all data types
    processOrgUnitData(filteredExpenseItems);
    processOrgUnitData(filteredExpenseRequests);
    processOrgUnitData(filteredExpensePlans);
    processOrgUnitData(filteredAdvancePayments, 'amount');
    
    processLocationData(filteredExpenseItems);
    processLocationData(filteredExpenseRequests);
    processLocationData(filteredExpensePlans);
    processLocationData(filteredAdvancePayments, 'amount');
    
    // Calculate totals
    const totalExpenseAmount = filteredExpenseItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const totalRequestAmount = filteredExpenseRequests.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const totalPlanAmount = filteredExpensePlans.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const totalAdvanceAmount = filteredAdvancePayments.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    return {
      expenseItemsByCategory,
      expenseItemsByMonth: processTimeSeriesData(filteredExpenseItems),
      expenseItemsByStatus: processStatusData(filteredExpenseItems),
      expenseRequestsByMonth: processTimeSeriesData(filteredExpenseRequests),
      expenseRequestsByStatus: processStatusData(filteredExpenseRequests),
      expensePlansByMonth: processTimeSeriesData(filteredExpensePlans),
      expensePlansByStatus: processStatusData(filteredExpensePlans),
      advancePaymentsByMonth: processTimeSeriesData(filteredAdvancePayments, 'amount'),
      advancePaymentsByStatus: processStatusData(filteredAdvancePayments, 'amount'),
      expensesByOrgUnit: Array.from(orgUnitMap.entries()).map(([orgUnit, data]) => ({
        orgUnit,
        count: data.count,
        amount: data.amount
      })),
      expensesByLocation: Array.from(locationMap.entries()).map(([location, data]) => ({
        location,
        count: data.count,
        amount: data.amount
      })),
      totalExpenseAmount,
      totalRequestAmount,
      totalPlanAmount,
      totalAdvanceAmount
    };
  }, [rawData, locationFilters, departmentFilters, dateRange, currencyFilter]);

  return {
    isLoading,
    error,
    data: processedData,
    dateRange,
    setDateRange,
    // custom range removed
    locationFilters: filteredLocationFilters,
    toggleLocationFilter,
    searchTerm,
    setSearchTerm: handleSearchTermChange,
    departmentFilters: filteredDepartmentFilters,
    toggleDepartmentFilter,
    departmentSearchTerm,
    setDepartmentSearchTerm: handleDepartmentSearchTermChange,
    currencyFilter,
    availableCurrencies
  };
};
