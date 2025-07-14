import { useState, useMemo, useCallback } from 'react';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { ExpenseStatus } from '../utils';

export enum DataFilterType {
  CHECKBOX_GROUP = 'checkbox-group',
  DATE_RANGE = 'date-range',
  NUMBER_RANGE = 'number-range',
}

export const useExpensePlanFilters = () => {
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<[Date | null, Date | null] | null>(null);
  const [endDate, setEndDate] = useState<[Date | null, Date | null] | null>(null);
  const [reimbursableAmount, setReimbursableAmount] = useState<[number | null, number | null] | null>(null);
  const [paidAdvance, setPaidAdvance] = useState<[number | null, number | null] | null>(null);

  const filterGroups = useMemo<DataFilterGroup[]>(() => [
    {
      id: 'startDate',
      title: 'Filter by Start Date',
      type: DataFilterType.DATE_RANGE,
      value: startDate,
      onChange: setStartDate,
    },
    {
      id: 'endDate',
      title: 'Filter by End Date',
      type: DataFilterType.DATE_RANGE,
      value: endDate,
      onChange: setEndDate,
    },
    {
      id: 'status',
      title: 'Filter by Status',
      type: DataFilterType.CHECKBOX_GROUP,
      filters: [
        { id: ExpenseStatus.PREPARED, label: 'Prepared', selected: selectedFilters.includes(ExpenseStatus.PREPARED) },
        { id: ExpenseStatus.CREATED, label: 'Draft (Created)', selected: selectedFilters.includes(ExpenseStatus.CREATED) },
        { id: ExpenseStatus.PENDING, label: 'In Approval (Pending)', selected: selectedFilters.includes(ExpenseStatus.PENDING) },
        { id: ExpenseStatus.ASSIGNED, label: 'Assigned', selected: selectedFilters.includes(ExpenseStatus.ASSIGNED) },
        { id: ExpenseStatus.APPROVED, label: 'Approved', selected: selectedFilters.includes(ExpenseStatus.APPROVED) },
        { id: ExpenseStatus.REJECTED, label: 'Revision Required (Rejected)', selected: selectedFilters.includes(ExpenseStatus.REJECTED) },
        { id: ExpenseStatus.VERIFIED, label: 'In Transit (Verified)', selected: selectedFilters.includes(ExpenseStatus.VERIFIED) },
        { id: ExpenseStatus.BOOKED, label: 'In Transit (Booked)', selected: selectedFilters.includes(ExpenseStatus.BOOKED) },
        { id: ExpenseStatus.PAID, label: 'Paid', selected: selectedFilters.includes(ExpenseStatus.PAID) },
        { id: ExpenseStatus.CLOSED, label: 'Closed', selected: selectedFilters.includes(ExpenseStatus.CLOSED) },
        { id: ExpenseStatus.TRANSFERRED, label: 'In Transit (Transferred)', selected: selectedFilters.includes(ExpenseStatus.TRANSFERRED) },
      ],
    },
    {
      id: 'reimbursableAmount',
      title: 'Filter by Reimbursable Amount',
      type: DataFilterType.NUMBER_RANGE,
      value: reimbursableAmount,
      onChange: setReimbursableAmount,
    },
    {
      id: 'paidAdvance',
      title: 'Filter by Paid Advance',
      type: DataFilterType.NUMBER_RANGE,
      value: paidAdvance,
      onChange: setPaidAdvance,
    },
  ], [selectedFilters, startDate, endDate, reimbursableAmount, paidAdvance]);

  /**
   * Returns the current filters as an object for API queries (GraphQL/REST)
   */
  const getFilters = useCallback(() => {
    const conditions: any[] = [];

    if (search) {
      conditions.push({ _or: [
        { code: { _ilike: `%${search}%` } },
        { title: { _ilike: `%${search}%` } }
      ] });
    }
    if (selectedFilters.length > 0) {
      conditions.push({ status: { _in: selectedFilters } });
    }
    if (startDate?.[0]) {
      conditions.push({ startDate: { _gte: startDate[0] } });
    }
    if (startDate?.[1]) {
      conditions.push({ startDate: { _lte: startDate[1] } });
    }
    if (endDate?.[0]) {
      conditions.push({ endDate: { _gte: endDate[0] } });
    }
    if (endDate?.[1]) {
      conditions.push({ endDate: { _lte: endDate[1] } });
    }
    if (reimbursableAmount?.[0] !== null && reimbursableAmount?.[0] !== undefined) {
      conditions.push({ reimbursableAmount: { _gte: reimbursableAmount[0] } });
    }
    if (reimbursableAmount?.[1] !== null && reimbursableAmount?.[1] !== undefined) {
      conditions.push({ reimbursableAmount: { _lte: reimbursableAmount[1] } });
    }
    if (paidAdvance?.[0] !== null && paidAdvance?.[0] !== undefined) {
      conditions.push({ advancePaymentPaidAmount: { _gte: paidAdvance[0] } });
    }
    if (paidAdvance?.[1] !== null && paidAdvance?.[1] !== undefined) {
      conditions.push({ advancePaymentPaidAmount: { _lte: paidAdvance[1] } });
    }

    // Always exclude DISCARDED plans at backend level for correct pagination
    conditions.push({ status: { _neq: 'DISCARDED' } });
    return { _and: conditions.length > 0 ? conditions : [{}] };

  }, [search, selectedFilters, startDate, endDate, reimbursableAmount, paidAdvance]);

  const clearFilters = useCallback(() => {
    setSelectedFilters([]);
    setStartDate(null);
    setEndDate(null);
    setReimbursableAmount(null);
    setPaidAdvance(null);
  }, []);

  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    setSelectedFilters(prev =>
      selected ? [...prev, filterId] : prev.filter(id => id !== filterId)
    );
  }, []);

  return {
    search,
    setSearch,
    selectedFilters,
    setFilters: setSelectedFilters,
    filterGroups,
    handleFilterChange,
    clearFilters,
    getFilters,
  };
};
