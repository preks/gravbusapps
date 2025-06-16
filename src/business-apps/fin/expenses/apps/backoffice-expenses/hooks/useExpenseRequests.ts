import { useState, useEffect, useMemo } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import {
  GET_EXPENSE_REQUESTS,
  PROCESS_PAYMENT_MUTATION,
} from '../queries';
import { ExpenseData, ExpenseRequest, ExpenseRequestQueryData } from '../types';
import { useTranslation } from 'react-i18next';

const transformExpenseRequest = (item: ExpenseRequest): ExpenseData => {
  const getCalculatedPayable = () => {
    let calculatedPayable = 0;
    if (item?.totalAmount) {
      const nonReimbursable = item.nonReimbursableAmount ?? 0;
      const advancePayment = item.expensePlan?.advancePayment?.[0]?.amount ?? 0;
      calculatedPayable = item.totalAmount - nonReimbursable - advancePayment;
    }
    return calculatedPayable;
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
    reporter: (item.employee?.employeePosition?.firstName && item.employee.employeePosition.lastName)
      ? `${item.employee.employeePosition.firstName} ${item.employee.employeePosition.lastName}`.trim()
      : '-',
    type: item.requestType?.translations?.[0]?.value ?? item.requestType?.value ?? '-',
    amount: item.totalAmount ? `${item.totalAmount} ${item.currency?.code ?? ''}`.trim() : '-',
    advance: item.expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount ?? '-',
    status: item.status ?? '-',
    payableAmount: getCalculatedPayable() != 0 ? `${getCalculatedPayable()} ${item.currency?.code ?? ''}`.trim() : '-',
    paymentMethod: item.expensePlan?.advancePayment?.[0]?.paymentMethod ?? '-',
    employeeId: String(item.employee?.id ?? '-'),
    version: String(item.version ?? '-'),
    currency: item.currency?.code ?? '',
    currencyRef: item.currencyRef ?? '',
    typeRef: item.requestTypeRef ?? '',
    totalRemainingAmount: item.totalRemainingAmount ?? '',
    userId: item.employee?.userId ?? '',
    expenseRuleId: item.expenseRuleId ?? '',
    totalAmount: item.totalAmount ?? 0,
    employeeDocumentId: item.employeeDocumentId ?? null,
    documentData: item.employeeDocument ?? '',
    department: item.employee?.employeePosition?.costCenter?.name ?? 'N/A',
  };
};

import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export const useExpenseRequests = ({ accessToken }: Pick<BusinessAppContextProps, 'accessToken'>) => {
  const { i18n } = useTranslation();
  const client = useGraphqlClient(accessToken); // accessToken is now guaranteed by BusinessAppContextProps

  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [mutationLoading, setMutationLoading] = useState<boolean>(false); // Specific loading for mutations
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sorter, setSorter] = useState<Record<string, any>>({ createdAt: 'DESC_NULLS_LAST' });
  const [filters, setFilters] = useState<Record<string, any>>({});

      const fetchData = async () => {
    if (!accessToken || !client) {
      setError('Access token and GraphQL client are required.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const baseWhere: any = {
        _and: [
          { status: { _neq: 'DISCARDED' } },
          { isDeleted: { _eq: false } },
        ],
      };

      const where = { ...baseWhere, ...filters };

      const variables = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        activeUserLocale: i18n.language,
        where,
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

  useEffect(() => {
    fetchData();
  }, [client, currentPage, pageSize, sorter, filters, i18n.language, accessToken]);

  const handleTableChange = (pagination: any, newFilters: any, newSorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);

    if (newSorter.field && newSorter.order) {
        const order = newSorter.order === 'ascend' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST';
        setSorter({ [newSorter.field]: order });
    } else {
        setSorter({ createdAt: 'DESC_NULLS_LAST' });
    }

    // Handle filters from Ant Design table
    const antdFilters: Record<string, any> = {};
    for (const key in newFilters) {
        if (newFilters[key]) {
            antdFilters[key] = { _in: newFilters[key] };
        }
    }
    setFilters(prevFilters => ({ ...prevFilters, ...antdFilters }));
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
    departments,
    handleTableChange,
    setFilters,
    fetchData,
    processExpensePayment,
  };
};


