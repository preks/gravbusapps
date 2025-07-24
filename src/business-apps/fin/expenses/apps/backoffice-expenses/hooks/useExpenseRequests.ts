import { useState, useEffect, useMemo } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import {
  GET_EXPENSE_REQUESTS,
  PROCESS_PAYMENT_MUTATION,
} from '../queries';
import { ExpenseData, ExpenseRequest, ExpenseRequestQueryData } from '../types';

// ⚡ BEST PRACTICE: Query limit enforcement for safety (like leads)
const MAX_QUERY_LIMIT = 1000;
const enforceQueryLimit = (limit: number): number => {
  return Math.min(limit, MAX_QUERY_LIMIT);
};

const transformExpenseRequest = (item: ExpenseRequest): ExpenseData => {
  const getCalculatedPayable = () => {
    // ⚡ SIMPLIFIED: Use total amount directly since we removed complex calculations for performance
    return item?.totalAmount ?? 0;
  };

  return {
    id: item.id,
    expenseId: String(item.id ?? '-'),
    employeeCode: item.employee?.code ?? '-',
    code: item.code ?? '-',
    sapNumber: item.employee?.additionalProperties?.SAPNumber ?? '-',
    employee: `${item.employee?.firstName ?? ''} ${item.employee?.lastName ?? ''}`.trim() || '-',
    title: item.title ?? '-',
    creationDate: item.createdAt ?? '-',
    startDate: item.startDate ?? '',
    endDate: item.endDate ?? '',
    requestDate: item.requestDate ?? '',
    reporter: `${item.employee?.firstName ?? ''} ${item.employee?.lastName ?? ''}`.trim() || '-',
    type: item.requestType?.value ?? '-',
    amount: item.totalAmount ? `${item.totalAmount} ${item.currency?.code ?? ''}`.trim() : '-',
    advance: '-', // ⚡ SIMPLIFIED: Removed for performance
    status: item.status ?? '-',
    payableAmount: getCalculatedPayable() != 0 ? `${getCalculatedPayable()} ${item.currency?.code ?? ''}`.trim() : '-',
    paymentMethod: '-', // ⚡ SIMPLIFIED: Removed for performance
    employeeId: String(item.employee?.id ?? '-'),
    version: '-', // ⚡ SIMPLIFIED: Default value for performance
    currency: item.currency?.code ?? '',
    currencyRef: '-', // ⚡ SIMPLIFIED: Default value for performance
    typeRef: '-', // ⚡ SIMPLIFIED: Default value for performance
    totalRemainingAmount: '-', // ⚡ SIMPLIFIED: Default value for performance
    userId: '-', // ⚡ SIMPLIFIED: Default value for performance
    expenseRuleId: '-', // ⚡ SIMPLIFIED: Default value for performance
    totalAmount: item.totalAmount ?? 0,
    employeeDocumentId: null, // ⚡ SIMPLIFIED: Default value for performance
    documentData: null, // ⚡ SIMPLIFIED: Default value for performance
    department: item.employee?.employeePosition?.costCenter?.name ?? 'N/A',
  };
};

import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export const useExpenseRequests = ({ accessToken }: Pick<BusinessAppContextProps, 'accessToken'>) => {
  const client = useGraphqlClient(accessToken); // accessToken is now guaranteed by BusinessAppContextProps

  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [mutationLoading, setMutationLoading] = useState<boolean>(false); // Specific loading for mutations
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20); // ⚡ BEST PRACTICE: Match leads default (20)
  const [sorter, setSorter] = useState<Record<string, any>>({ createdAt: 'DESC_NULLS_LAST' });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

      const fetchData = async () => {
    if (!accessToken || !client) {
      setError('Access token and GraphQL client are required.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Build conditions array to properly combine search and filters
      const conditions: any[] = [];
      
      // Base conditions that always apply
      conditions.push({ isDeleted: { _eq: false } });
      
      // Status condition
      if (statusFilter && statusFilter !== '') {
        conditions.push({ status: { _eq: statusFilter } });
      } else {
        // Only exclude DISCARDED if no specific status filter is applied
        conditions.push({ status: { _neq: 'DISCARDED' } });
      }

      // Add department filter if provided
      if (departmentFilter && departmentFilter !== '') {
        conditions.push({
          _or: [
            { employee: { employeePosition: { costCenter: { name: { _eq: departmentFilter } } } } },
            { employee: { employeePosition: { organizationalUnit: { name: { _eq: departmentFilter } } } } }
          ]
        });
      }

      // Add search conditions if search term is provided
      if (searchTerm && searchTerm.trim() !== '') {
        const searchValue = `%${searchTerm.trim()}%`;
        conditions.push({
          _or: [
            // Basic expense fields
            { code: { _ilike: searchValue } },
            { title: { _ilike: searchValue } },
            
            // Employee fields
            { employee: { firstName: { _ilike: searchValue } } },
            { employee: { lastName: { _ilike: searchValue } } },
            { employee: { code: { _ilike: searchValue } } },
            
            // Department/organizational fields
            { employee: { employeePosition: { costCenter: { name: { _ilike: searchValue } } } } },
            { employee: { employeePosition: { organizationalUnit: { name: { _ilike: searchValue } } } } },
            
            // Request type
            { requestType: { value: { _ilike: searchValue } } },
            { requestType: { translations: { value: { _ilike: searchValue } } } },
            
            // Currency
            { currency: { code: { _ilike: searchValue } } },
          ]
        });
      }

      // Build final where clause
      const baseWhere = conditions.length === 1 ? conditions[0] : { _and: conditions };

      // ⚡ BEST PRACTICE: Enforce query limit for safety (like leads)
      const safePageSize = enforceQueryLimit(pageSize);
      
      const variables = {
        limit: safePageSize,
        offset: (currentPage - 1) * safePageSize,
        where: baseWhere,
        orderBy: sorter,
      };

      const responseData = await client.request<ExpenseRequestQueryData>(
        GET_EXPENSE_REQUESTS,
        variables
      );

      const rawData = responseData.ExpenseRequest ?? [];
      const transformedData = rawData.map(transformExpenseRequest);

      setExpenses(transformedData);
      setTotalItems(responseData.total.aggregate.count ?? 0);
    } catch (err) {
      console.error('Error fetching expense requests:', err);
      setError('Failed to fetch expense requests. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // ⚡ PERFORMANCE OPTIMIZATION: Add debouncing for search and filters
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData();
    }, searchTerm ? 300 : 0); // 300ms debounce for search, immediate for other changes

    return () => clearTimeout(timeoutId);
  }, [client, currentPage, pageSize, sorter, searchTerm, statusFilter, departmentFilter, accessToken]);

  const handleTableChange = (pagination: any, newFilters: any, newSorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);

    if (newSorter.field && newSorter.order) {
        const order = newSorter.order === 'ascend' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST';
        setSorter({ [newSorter.field]: order });
    } else {
        setSorter({ createdAt: 'DESC_NULLS_LAST' });
    }
  };

  // New function to handle search
  const handleSearch = (search: string) => {
    setSearchTerm(search);
    setCurrentPage(1); // Reset to first page when searching
  };

  // New function to handle status filter
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // New function to handle department filter
  const handleDepartmentFilter = (department: string) => {
    setDepartmentFilter(department);
    setCurrentPage(1); // Reset to first page when filtering
  };
  
  const departments = useMemo(() => {
    const deptSet = new Set(expenses.map(exp => exp.department).filter(d => d && d !== 'N/A'));
    return Array.from(deptSet);
  }, [expenses]);

  const processExpensePayment = async (id: string) => {
    if (!client) return false;
    setMutationLoading(true);
    setError(null);
    try {
      await client.request(PROCESS_PAYMENT_MUTATION, { id });
      await fetchData(); // Refresh data after payment processing
      setMutationLoading(false);
      return true;
    } catch (err) {
      console.error('Error processing expense payment:', err);
      setError('Failed to process expense payment.');
      setMutationLoading(false);
      return false;
    }
  };

  return {
    expenses,
    loading,
    mutationLoading, // Loading state for mutation operations
    error,
    totalItems,
    currentPage,
    pageSize,
    searchTerm,
    statusFilter,
    departmentFilter,
    departments,
    handleTableChange,
    handleSearch,
    handleStatusFilter,
    handleDepartmentFilter,
    fetchData,
    processExpensePayment,
  };
};


