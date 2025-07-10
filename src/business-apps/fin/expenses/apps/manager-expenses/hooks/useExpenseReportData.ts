import { useState, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { GET_EXPENSE_PLANS_BY_MANAGER } from '../queries/expensePlans';
import { GET_EXPENSE_REQUESTS_BY_MANAGER } from '../queries/expenseRequests';
import { GET_EXPENSE_ITEMS_BY_MANAGER } from '../queries/expenseItems';
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { GET_ADVANCE_PAYMENTS_BY_MANAGER } from '../queries/advancePayments';

// Define report types
export enum ReportType {
  EXPENSE_ITEM = 'expense_item',
  EXPENSE_PLAN = 'expense_plan',
  EXPENSE_REQUEST = 'expense_request',
  ADVANCE_PAYMENT = 'advance_payment'
}

// Define report metadata
export interface ReportMetadata {
  id: string;
  name: string;
  type: ReportType;
  description?: string;
  selected?: boolean;
}

// Define base report item interface
export interface ReportItem {
  id: string;
  [key: string]: any;
}

// Define expense item interface
export interface ExpenseItemReport extends ReportItem {
  date: string;
  title: string;
  description: string;
  category: string;
  amount: number;
  employeeName: string;
  currency?: string;
}

// Define expense plan interface
export interface ExpensePlanReport extends ReportItem {
  code: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  totalAmount: number;
  employeeName: string;
  currency: string;
}

// Define expense request interface
export interface ExpenseRequestReport extends ReportItem {
  code: string;
  title: string;
  requestDate: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  employeeName: string;
  currency: string;
}

// Define advance payment interface
export interface AdvancePaymentReport extends ReportItem {
  code: string;
  title: string;
  planDate: string;
  startDate: string;
  endDate: string;
  status: string;
  totalAmount: number;
  advanceAmount: number;
  employeeName: string;
  currency: string;
  advanceCurrency: string;
}

// Define hook return interface
export interface UseExpenseReportDataReturn {
  reportTypes: ReportMetadata[];
  selectedReportType: ReportType | null;
  setSelectedReportType: (type: ReportType) => void;
  reportData: ReportItem[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  fetchReportData: () => Promise<void>;
}

/**
 * Hook for fetching and managing expense report data
 */
export const useExpenseReportData = ({
  accessToken,
  userInfo,
}: BusinessAppContextProps): UseExpenseReportDataReturn => {
  // Initialize GraphQL client
  const graphqlClient = useGraphqlClient(accessToken);
  
  // Get managerId from userInfo or use a fallback UUID for development
  const managerId = userInfo?.employeeDetails?.employeeId || userInfo?.id || '00000000-0000-0000-0000-000000000000';
  
  // State for report data, loading state, and errors
  const [reportData, setReportData] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  
  // State for pagination and filtering
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // State for selected report type
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(ReportType.EXPENSE_ITEM);
 
  // Define report types
  const reportTypes: ReportMetadata[] = [
    {
      id: 'report-1',
      name: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_item_report', 'Expense Item Report'),
      type: ReportType.EXPENSE_ITEM,
      selected: selectedReportType === ReportType.EXPENSE_ITEM
    },
    {
      id: 'report-2',
      name: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_plan_report', 'Expense Plan Report'),
      type: ReportType.EXPENSE_PLAN,
      selected: selectedReportType === ReportType.EXPENSE_PLAN
    },
    {
      id: 'report-3',
      name: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_request_report', 'Expense Request Report'),
      type: ReportType.EXPENSE_REQUEST,
      selected: selectedReportType === ReportType.EXPENSE_REQUEST
    },
    {
      id: 'report-4',
      name: getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_report.search_module', 'Advance Payment Report'),
      type: ReportType.ADVANCE_PAYMENT,
      selected: selectedReportType === ReportType.ADVANCE_PAYMENT
    }
  ];
  
  // Process expense items data
  const processExpenseItemsData = (data: any): ExpenseItemReport[] => {
    if (!data?.ExpenseItem?.length) return [];
    
    return data.ExpenseItem.map((item: any) => {
      // Get the first expense group from positions or use 'Uncategorized'
      const expenseGroup = item.expensePosition && item.expensePosition.length > 0 && item.expensePosition[0].expenseGroupRef 
        ? item.expensePosition[0].expenseGroupRef.replace('ExpenseGroup:v1:', '') 
        : 'Uncategorized';
        
      return {
        id: item.id,
        date: item.expenseRequest?.createdAt ? formatDate(item.expenseRequest.createdAt, 'date.short') : '-',
        title: item.title || '',
        description: item.description || '',
        category: expenseGroup,
        amount: item.totalAmount || 0,
        employeeName: item.employee?.fullName || ''
      };
    });
  };
  
  // Process expense plans data
  const processExpensePlansData = (data: any): ExpensePlanReport[] => {
    if (!data?.ExpensePlan?.length) return [];
    
    return data.ExpensePlan.map((plan: any) => ({
      id: plan.id,
      code: plan.code || '',
      title: plan.title || '',
      startDate: plan.startDate ? formatDate(plan.startDate, 'date.short') : '',
      endDate: plan.endDate ? formatDate(plan.endDate, 'date.short') : '',
      status: plan.status || '',
      totalAmount: plan.totalAmount || 0,
      currency: '', // Currency field not available in the query
      employeeName: plan.employee?.fullName || ''
    }));
  };
  
  // Process expense requests data
  const processExpenseRequestsData = (data: any): ExpenseRequestReport[] => {
    if (!data?.ExpenseRequest?.length) return [];
    
    return data.ExpenseRequest.map((request: any) => ({
      id: request.id,
      code: request.code || '',
      title: request.title || '',
      requestDate: request.requestDate ? formatDate(request.requestDate, 'date.short') : '',
      createdAt: request.createdAt ? formatDate(request.createdAt, 'date.short') : '',
      status: request.status || '',
      totalAmount: request.totalAmount || 0,
      currency: request.currencyRef || '',
      employeeName: request.employee?.fullName || ''
    }));
  };
  
  // Process advance payments data
  const processAdvancePaymentsData = (data: any): AdvancePaymentReport[] => {
    if (!data?.ExpensePlan?.length) return [];
    
    return data.ExpensePlan.map((plan: any) => {
      // Calculate total advance payment amount
      const advanceAmount = plan.advancePayment?.reduce((sum: number, payment: any) => {
        return sum + (payment.amount || 0);
      }, 0) || 0;
      
      // Extract currency information
      const planCurrency = plan.currencyRef ? plan.currencyRef.replace('Currency:v1:', '') : '';
      const advanceCurrency = plan.advancePayment?.length > 0 && plan.advancePayment[0].currencyRef
        ? plan.advancePayment[0].currencyRef.replace('Currency:v1:', '')
        : planCurrency;
      
      return {
        id: plan.id,
        code: plan.code || '',
        title: plan.title || '',
        planDate: plan.planDate ? formatDate(plan.planDate, 'date.short') : '',
        startDate: plan.startDate ? formatDate(plan.startDate, 'date.short') : '',
        endDate: plan.endDate ? formatDate(plan.endDate, 'date.short') : '',
        status: plan.status || '',
        totalAmount: plan.totalAmount || 0,
        advanceAmount: advanceAmount,
        employeeName: plan.employee?.fullName || '',
        currency: planCurrency,
        advanceCurrency: advanceCurrency
      };
    });
  };
  
  // Fetch expense items report
  const fetchExpenseItems = useCallback(async () => {
    if (!graphqlClient) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the real manager ID from userInfo
      const result = await graphqlClient.request(GET_EXPENSE_ITEMS_BY_MANAGER, {
        managerId: managerId, // Use real manager ID from userInfo
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        searchTerm: searchTerm ? `%${searchTerm}%` : '%%'
      });
      
      const processedData = processExpenseItemsData(result);
      setReportData(processedData);
      setTotalCount(result?.ExpenseItemAggregate?.aggregate?.count || 0);
      
    } catch (err) {
      console.error('Error fetching expense items:', err);
      setError('Failed to load expense items data');
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient, pageSize, currentPage, searchTerm, managerId]);
  
  // Fetch expense plans report
  const fetchExpensePlans = useCallback(async () => {
    if (!graphqlClient) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the real manager ID from userInfo
      const result = await graphqlClient.request(GET_EXPENSE_PLANS_BY_MANAGER, {
        managerId: managerId, // Use real manager ID from userInfo
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        searchTerm: searchTerm ? `%${searchTerm}%` : '%%'
      });
      
      const processedData = processExpensePlansData(result);
      setReportData(processedData);
      setTotalCount(result?.ExpensePlanAggregate?.aggregate?.count || 0);
      
    } catch (err) {
      console.error('Error fetching expense plans:', err);
      setError('Failed to load expense plans data');
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient, pageSize, currentPage, searchTerm, managerId]);
  
  // Fetch expense requests report
  const fetchExpenseRequests = useCallback(async () => {
    if (!graphqlClient) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the real manager ID from userInfo
      const result = await graphqlClient.request(GET_EXPENSE_REQUESTS_BY_MANAGER, {
        managerId: managerId, // Use real manager ID from userInfo
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        searchTerm: searchTerm ? `%${searchTerm}%` : '%%'
      });
      
      const processedData = processExpenseRequestsData(result);
      setReportData(processedData);
      setTotalCount(result?.ExpenseRequestAggregate?.aggregate?.count || 0);
      
    } catch (err) {
      console.error('Error fetching expense requests:', err);
      setError('Failed to load expense requests data');
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient, pageSize, currentPage, searchTerm, managerId]);
  
  // Fetch advance payments report
  const fetchAdvancePayments = useCallback(async () => {
    if (!graphqlClient) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the real manager ID from userInfo
      const result = await graphqlClient.request(GET_ADVANCE_PAYMENTS_BY_MANAGER, {
        managerId: managerId, // Use real manager ID from userInfo
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        searchTerm: searchTerm ? `%${searchTerm}%` : '%%'
      });
      
      const processedData = processAdvancePaymentsData(result);
      setReportData(processedData);
      setTotalCount(result?.AdvancePaymentAggregate?.aggregate?.count || 0);
      
    } catch (err) {
      console.error('Error fetching advance payments:', err);
      setError('Failed to load advance payments data');
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient, pageSize, currentPage, searchTerm, managerId]);
  
  // Main function to fetch report data based on selected type
  const fetchReportData = useCallback(async () => {
    if (!selectedReportType) return;
    
    switch (selectedReportType) {
      case ReportType.EXPENSE_ITEM:
        await fetchExpenseItems();
        break;
      case ReportType.EXPENSE_PLAN:
        await fetchExpensePlans();
        break;
      case ReportType.EXPENSE_REQUEST:
        await fetchExpenseRequests();
        break;
      case ReportType.ADVANCE_PAYMENT:
        await fetchAdvancePayments();
        break;
      default:
        console.warn(`Unknown report type: ${selectedReportType}`);
    }
  }, [selectedReportType, fetchExpenseItems, fetchExpensePlans, fetchExpenseRequests, fetchAdvancePayments]);
  
  return {
    reportTypes,
    selectedReportType,
    setSelectedReportType,
    reportData,
    isLoading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchTerm,
    setSearchTerm,
    fetchReportData
  };
};
