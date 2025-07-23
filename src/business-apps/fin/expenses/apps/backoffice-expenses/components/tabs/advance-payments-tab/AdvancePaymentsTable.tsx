/**
 * Advance Payments Table Component
 * Displays a table of advance payments with filtering and view capabilities
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useAdvancePayments } from '../../../hooks/useAdvancePayment';
import { DataTable, ActionButton } from '@newwork/gravity-ui-catalog';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { Alert, Spinner } from '@newwork/nw-design-system';

import { getAdvancePaymentStatusDisplay } from '../../../utils/utils';
import AdvancePaymentDetails from './AdvancePaymentDetails';
import { formatNumberFunction, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import Pill from '@/components/pill/Pill';
import { FileTextOutlined } from '@ant-design/icons';


const ADVANCE_PAYMENT_COLUMNS = {
  title: { key: 'description' as keyof any, type: 'string' as const },
  employeeFullName: { key: 'expensePlan.employee.firstName' as keyof any, type: 'string' as const },
  orgUnit: { key: 'expensePlan.employee.employeePosition.organizationalUnit.name' as keyof any, type: 'string' as const },
  costCenter: { key: 'costCenter.name' as keyof any, type: 'string' as const },
  planCode: { key: 'expensePlan.code' as keyof any, type: 'string' as const },
  status: { key: 'status' as keyof any, type: 'string' as const },
  totalAmount: { key: 'expensePlan.totalAmount' as keyof any, type: 'number' as const, nullable: true },
  amount: { key: 'amount' as keyof any, type: 'number' as const, nullable: true },
  paymentMethod: { key: 'paymentMethod' as keyof any, type: 'string' as const },
} as const;

interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
}

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = (props) => {
  const { search, onSearchChange, ...context } = props;

  const [searchText, setSearchText] = useState(search || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [amountMinFilter, setAmountMinFilter] = useState('');
  const [amountMaxFilter, setAmountMaxFilter] = useState('');
  const [advanceMinFilter, setAdvanceMinFilter] = useState('');
  const [advanceMaxFilter, setAdvanceMaxFilter] = useState('');
  const [reporterFilter, setReporterFilter] = useState('');

  // Reporter search states
  const [reporterSearchText, setReporterSearchText] = useState('');
  const [showReporterDropdown, setShowReporterDropdown] = useState(false);
  const [reporterSearchResults, setReporterSearchResults] = useState<string[]>([]);
  const [reporterSearchLoading, setReporterSearchLoading] = useState(false);
  const [selectedReporters, setSelectedReporters] = useState<string[]>([]);

  // Status filter states
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);

  // Selection states
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedActionType, setSelectedActionType] = useState<'advance-payment' | 'plan' | 'request'>('advance-payment');

  const { payments, totalCount, isLoading, error, fetchPayments, searchReporters, searchStatuses } = useAdvancePayments(context);

  // Debounced search for reporters
  const debouncedSearchReporters = useMemo(() => 
    debounce(async (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setReporterSearchResults([]);
        return;
      }
      
      setReporterSearchLoading(true);
      try {
        const results = await searchReporters(searchTerm);
        setReporterSearchResults(results);
      } catch (error) {
        console.error('Error searching reporters:', error);
        setReporterSearchResults([]);
      } finally {
        setReporterSearchLoading(false);
      }
    }, 300),
    [searchReporters]
  );

  // ⚡ PERFORMANCE: Properly memoized debounced function to prevent recreation on every render
  const debouncedFetchPayments = useMemo(() => 
    debounce((searchTerm: string, page: number, size: number, status?: string, amountMin?: string, amountMax?: string, advanceMin?: string, advanceMax?: string, reporter?: string, sortField?: string, sortOrder?: 'ascend' | 'descend' | null) => {
      fetchPayments(searchTerm, page, size, status, amountMin, amountMax, advanceMin, advanceMax, reporter);
    }, 300),
    [] // Stable - no dependencies needed as fetchPayments is already stable
  );

  
  useEffect(() => {
    debouncedFetchPayments(searchText, currentPage, pageSize, statusFilter.length > 0 ? statusFilter.join(',') : undefined, amountMinFilter, amountMaxFilter, advanceMinFilter, advanceMaxFilter, reporterFilter, undefined, undefined);
  }, [debouncedFetchPayments, searchText, currentPage, pageSize, statusFilter, amountMinFilter, amountMaxFilter, advanceMinFilter, advanceMaxFilter, reporterFilter]);

  // Load available statuses from backend
  useEffect(() => {
    const loadAvailableStatuses = async () => {
      try {
        const statuses = await searchStatuses();
        setAvailableStatuses(statuses);
      } catch (error) {
        console.error('Error loading available statuses:', error);
      }
    };

    loadAvailableStatuses();
  }, [searchStatuses]);

  // Sync with parent search prop if provided
  useEffect(() => {
    if (search !== undefined && search !== searchText) {
      setSearchText(search);
      setCurrentPage(1);
      debouncedFetchPayments(search, 1, pageSize, statusFilter.length > 0 ? statusFilter.join(',') : undefined, amountMinFilter, amountMaxFilter, advanceMinFilter, advanceMaxFilter, reporterFilter, undefined, undefined);
    }
  }, [search, debouncedFetchPayments, pageSize, statusFilter, amountMinFilter, amountMaxFilter, advanceMinFilter, advanceMaxFilter, reporterFilter]);

  // Handle search changes with debouncing
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    setCurrentPage(1);
    debouncedFetchPayments(value, 1, pageSize, statusFilter.length > 0 ? statusFilter.join(',') : undefined, amountMinFilter, amountMaxFilter, advanceMinFilter, advanceMaxFilter, reporterFilter, undefined, undefined);
    
    // Notify parent if callback exists
    if (onSearchChange) {
      onSearchChange(value);
    }
  }, [onSearchChange, pageSize, statusFilter, amountMinFilter, amountMaxFilter, advanceMinFilter, advanceMaxFilter, reporterFilter, debouncedFetchPayments]);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.reporter-search-container')) {
        setShowReporterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
    setSelectedActionType('advance-payment');
  }, []);

  // Column factory following OCP
  const createColumn = useCallback((key: keyof typeof ADVANCE_PAYMENT_COLUMNS, title: string, render?: (value: any, record: any) => React.ReactNode, additionalProps?: any) => {
    return {
      title,
      key: key,
      render,
      ...additionalProps,
    };
  }, []);

  const renderDataBody = useCallback(() => {
    if (isLoading && !payments?.length) {
      return <div style={{ padding: 24, textAlign: 'center' }}><div className="gba:flex gba:justify-center"><Spinner /></div></div>;
    }

    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return <Alert variant="destructive">{errorMessage}</Alert>;
    }

    if (!payments || payments.length === 0) {
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div>No advance payments found matching the current filters. Clear all filters to see all payments.</div>
        </div>
      );
    }

    return (
      <DataTable
        dataSource={payments}
        rowKey="id"
        onRow={(record: any) => ({
          onClick: (event) => {
            const target = event.target as HTMLElement;
            const isActionButton = target.closest('[class*="ant-dropdown-trigger"]');

            if (!isActionButton) {
              setSelectedItem(record);
            }
          },
          style: { cursor: 'pointer' }
        })}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: totalCount,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
        }}
        onChange={handleEnhancedTableChange}
        loading={isLoading}
        data-testid="advance-payments-data-table"
        columns={[
          {
            title: '',
            key: 'actions',
            align: 'center',
            width: 60,
            render: (_: any, record: any) => {
              const hasExpenseRequest = record.expensePlan && 
                Array.isArray(record.expensePlan.expenseRequest) && 
                record.expensePlan.expenseRequest.length > 0 && 
                record.expensePlan.expenseRequest[0]?.id;
              
              const flowData = [
                {
                  category: 'Actions',
                  key: 'view-advance-payment',
                  label: 'View Advance Payment Details',
                  onClick: () => {
                    setSelectedItem(record);
                    setSelectedActionType('advance-payment');
                  }
                },
                {
                  category: 'Actions',
                  key: 'view-plan',
                  label: 'View Plan Details',
                  onClick: () => {
                    setSelectedItem(record);
                    setSelectedActionType('plan');
                  }
                },
                ...(hasExpenseRequest ? [{
                  category: 'Actions',
                  key: 'view-request',
                  label: 'View Request Details',
                  onClick: () => {
                    setSelectedItem(record);
                    setSelectedActionType('request');
                  }
                }] : [])
              ];

              return (
                <div className="gba:flex gba:justify-center gba:items-center gba:w-full gba:h-full">
                  <ActionButton
                    onClick={(e) => e.stopPropagation()}
                    flowData={flowData}
                    data-testid={`actions-${record.id}`}
                    size="md"
                  />
                </div>
              );
            }
          },
          createColumn('title', 'Title', (text: any, record: any) => {
            const title = record.title || record.description || 'N/A';
            return <div style={{ fontWeight: 'normal' }} data-testid="advance-payment-title-cell">{title}</div>;
          }),
          createColumn('employeeFullName', 'Reporter', (text: any, record: any) => {
            const reporter = record.employeeFullName || 'N/A';
            return <div data-testid="advance-payment-reporter-cell">{reporter}</div>;
          }),
          createColumn('orgUnit', 'Org Unit', (text: any, record: any) => {
            const orgUnit = record.expensePlan?.employee?.employeePosition?.organizationalUnit?.name || 'N/A';
            return <div data-testid="advance-payment-org-unit-cell">{orgUnit}</div>;
          }),
          createColumn('costCenter', 'Cost Center', (text: any, record: any) => {
            const costCenter = record.costCenter?.name || 'N/A';
            return <div data-testid="advance-payment-cost-center-cell">{costCenter}</div>;
          }),
          createColumn('planCode', 'Plan Id', (text: any, record: any) => {
            const planCode = record.expensePlan?.code || 'N/A';
            return <div data-testid="advance-payment-plan-id-cell">{planCode}</div>;
          }),
          createColumn('status', 'Status', (text: any, record: any) => {
            const statusValue = record.status || 'N/A';
            const { label, type } = getAdvancePaymentStatusDisplay(statusValue);
            return <Pill label={label} type={type} className="gba:text-center" data-testid="advance-payment-status-cell" />;
          }),
          createColumn('totalAmount', 'Amount', (text: any, record: any) => {
            const totalAmount = record.expensePlan?.totalAmount || 0;
            const currency = record.currency?.code || record.expensePlan?.currency?.code || '';
            return (
              <span data-testid="advance-payment-amount-cell" className="gba:text-right">
                {formatNumberFunction(String(totalAmount ?? '0'))} {currency}
              </span>
            );
          }, { 
            onCell: () => ({ className: 'gba:text-right' }), 
            title: <div className="gba:text-right">Amount</div>
          }),
          createColumn('amount', 'Advance', (text: any, record: any) => {
            const advanceAmount = record.amount || 0;
            const currency = record.currency?.code || record.expensePlan?.currency?.code || '';
            return (
              <span data-testid="advance-payment-advance-cell" className="gba:text-right">
                {formatNumberFunction(String(advanceAmount ?? '0'))} {currency}
              </span>
            );
          }, { 
            onCell: () => ({ className: 'gba:text-right' }), 
            title: <div className="gba:text-right">Advance</div>
          }),
          createColumn('paymentMethod', 'Payment Method', (text: any, record: any) => {
            const paymentMethod = record.paymentMethod;
            let translatedMethod = 'N/A';
            
            if (paymentMethod === 'DIRECT_DEPOSIT') {
              translatedMethod = getTranslationFromI18nKeyAndLabel(
                'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_direct_deposit',
                'Direct Deposit'
              );
            } else if (paymentMethod) {
              translatedMethod = getTranslationFromI18nKeyAndLabel(
                'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_cash_payment',
                'Cash Payment'
              );
            }
            
            return <div data-testid="advance-payment-method-cell">{translatedMethod}</div>;
          }),
        ] as any}
      />
    );
  }, [payments, isLoading, error, totalCount, currentPage, pageSize, createColumn]);

  const renderAdvancePaymentDetails = useMemo(() => {
    if (!selectedItem) return null;

    return (
      <AdvancePaymentDetails
        selectedItem={selectedItem}
        onClose={handleCloseDetails}
        accessToken={props.accessToken}
        userInfo={props.userInfo}
        type={selectedActionType}
      />
    );
  }, [selectedItem, handleCloseDetails, props.accessToken, props.userInfo, selectedActionType]);

  // Enhanced table change handler for sorting
  const handleEnhancedTableChange = (pagination: any, _filters: any, sorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  // Filter groups for DataContainer
  const filterGroups: DataFilterGroup[] = [
    {
      id: 'status',
      title: 'Status',
      type: 'checkbox',
      filters: availableStatuses.map(status => ({
        id: status,
        label: getAdvancePaymentStatusDisplay(status).label,
        selected: statusFilter.includes(status)
      }))
    },
    {
      id: 'reporter',
      title: 'Reporter',
      type: 'custom',
      customComponent: (
        <div className="reporter-search-container gba:relative gba:p-2">
          <input
            type="text"
            value={reporterSearchText}
            onChange={(e) => {
              setReporterSearchText(e.target.value);
              setShowReporterDropdown(true);
              debouncedSearchReporters(e.target.value);
            }}
            onFocus={() => setShowReporterDropdown(true)}
            className="gba:h-8 gba:w-full gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
            placeholder="Search reporter..."
            data-testid="reporter-search-input"
          />
          
          {/* Dropdown with search results */}
          {showReporterDropdown && reporterSearchText.trim() && (
            <div className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:bg-white gba:border gba:border-gray-200 gba:rounded gba:shadow-lg gba:max-h-40 gba:overflow-y-auto gba:z-10">
              {reporterSearchLoading ? (
                <div className="gba:p-2 gba:text-sm gba:text-gray-500">
                  Loading reporters...
                </div>
              ) : reporterSearchResults.length === 0 ? (
                <div className="gba:p-2 gba:text-sm gba:text-gray-500">
                  No reporters found
                </div>
              ) : (
                reporterSearchResults.map((reporter) => (
                  <button
                    key={reporter}
                    className={`gba:w-full gba:text-left gba:p-2 gba:text-sm gba:hover:bg-gray-100 gba:transition-colors ${
                      selectedReporters.includes(reporter) ? 'gba:bg-blue-50 gba:text-blue-700' : 'gba:text-gray-700'
                    }`}
                    onClick={() => {
                      const newSelected = selectedReporters.includes(reporter)
                        ? selectedReporters.filter(r => r !== reporter)
                        : [...selectedReporters, reporter];
                      setSelectedReporters(newSelected);
                      setReporterFilter(newSelected.join(','));
                      
                      // Reset to page 1 when applying filters to ensure results are visible
                      setCurrentPage(1);
                      debouncedFetchPayments(searchText, 1, pageSize, statusFilter.length > 0 ? statusFilter.join(',') : undefined, amountMinFilter, amountMaxFilter, advanceMinFilter, advanceMaxFilter, newSelected.join(','), undefined, undefined);
                    }}
                    data-testid={`reporter-option-${reporter}`}
                  >
                    {reporter}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'amount',
      title: 'Amount',
      type: 'custom',
      customComponent: (
        <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-gray-600 gba:w-8">Min</span>
            <input
              type="number"
              value={amountMinFilter}
              onChange={(e) => {
                setAmountMinFilter(e.target.value);
                setCurrentPage(1);
                debouncedFetchPayments(searchText, 1, pageSize, statusFilter.length > 0 ? statusFilter.join(',') : undefined, e.target.value, amountMaxFilter, advanceMinFilter, advanceMaxFilter, reporterFilter, undefined, undefined);
              }}
              className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              placeholder="Min"
              data-testid="amount-min-filter-input"
            />
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-gray-600 gba:w-8">Max</span>
            <input
              type="number"
              value={amountMaxFilter}
              onChange={(e) => {
                setAmountMaxFilter(e.target.value);
                setCurrentPage(1);
                debouncedFetchPayments(searchText, 1, pageSize, statusFilter.length > 0 ? statusFilter.join(',') : undefined, amountMinFilter, e.target.value, advanceMinFilter, advanceMaxFilter, reporterFilter, undefined, undefined);
              }}
              className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              placeholder="Max"
              data-testid="amount-max-filter-input"
            />
          </div>
        </div>
      )
    },
    {
      id: 'advance',
      title: 'Advance',
      type: 'custom',
      customComponent: (
        <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-gray-600 gba:w-8">Min</span>
            <input
              type="number"
              value={advanceMinFilter}
              onChange={(e) => {
                setAdvanceMinFilter(e.target.value);
                setCurrentPage(1);
                debouncedFetchPayments(searchText, 1, pageSize, statusFilter.length > 0 ? statusFilter.join(',') : undefined, amountMinFilter, amountMaxFilter, e.target.value, advanceMaxFilter, reporterFilter, undefined, undefined);
              }}
              className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              placeholder="Min"
              data-testid="advance-min-filter-input"
            />
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-gray-600 gba:w-8">Max</span>
            <input
              type="number"
              value={advanceMaxFilter}
              onChange={(e) => {
                setAdvanceMaxFilter(e.target.value);
                setCurrentPage(1);
                debouncedFetchPayments(searchText, 1, pageSize, statusFilter.length > 0 ? statusFilter.join(',') : undefined, amountMinFilter, amountMaxFilter, advanceMinFilter, e.target.value, reporterFilter, undefined, undefined);
              }}
              className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              placeholder="Max"
              data-testid="advance-max-filter-input"
            />
          </div>
        </div>
      )
    }
  ];

  const selectedFilters: string[] = [
    ...(statusFilter.length > 0 ? ['status'] : []),
    ...(reporterFilter ? ['reporter'] : []),
    ...(amountMinFilter || amountMaxFilter ? ['amount'] : []),
    ...(advanceMinFilter || advanceMaxFilter ? ['advance'] : [])
  ];

  const filterLabelMap: Record<string, string> = {
    status: statusFilter.length > 0 ? `Status: ${statusFilter.map(status => getAdvancePaymentStatusDisplay(status).label).join(', ')}` : 'Status: All',
    reporter: `Reporter: ${selectedReporters.join(', ')}`,
    amount: `Amount: ${amountMinFilter || '0'} - ${amountMaxFilter || '∞'}`,
    advance: `Advance: ${advanceMinFilter || '0'} - ${advanceMaxFilter || '∞'}`
  };

  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    // Check if this is a status filter (any of the available statuses)
    if (availableStatuses.includes(filterId)) {
      const newStatusFilter = selected ? [...statusFilter, filterId] : statusFilter.filter(status => status !== filterId);
      setStatusFilter(newStatusFilter);
      setCurrentPage(1);
      debouncedFetchPayments(searchText, 1, pageSize, newStatusFilter.length > 0 ? newStatusFilter.join(',') : undefined, amountMinFilter, amountMaxFilter, advanceMinFilter, advanceMaxFilter, reporterFilter, undefined, undefined);
    }
  }, [availableStatuses, searchText, pageSize, debouncedFetchPayments, amountMinFilter, amountMaxFilter, advanceMinFilter, advanceMaxFilter, reporterFilter, statusFilter]);

  const setFilters = useCallback((filters: string[]) => {
    // Clear all filters
    setStatusFilter([]);
    setReporterFilter('');
    setSelectedReporters([]);
    setAmountMinFilter('');
    setAmountMaxFilter('');
    setAdvanceMinFilter('');
    setAdvanceMaxFilter('');
    setCurrentPage(1);
    debouncedFetchPayments(searchText, 1, pageSize, undefined, '', '', '', '', '', undefined, undefined);
  }, [searchText, pageSize, debouncedFetchPayments]);

  return (
    <>
      <DataContainer
        dataControllerProps={{
          listTitle: 'Advance Payments',
          listAmount: totalCount ? `${totalCount}` : undefined,
          search: searchText,
          setSearch: handleSearchChange,
          placeholder: 'Search in Advance Payments',
          filter: selectedFilters,
          setFilter: setFilters,
          filterLabelMap: filterLabelMap,
          actions: [],
        }}
        dataFilterProps={{
          filterGroups: filterGroups,
          onFilterChange: handleFilterChange as (filterId: string, selected: boolean) => void,
        }}
        dataBody={renderDataBody()}
        dataDetails={selectedItem ? {
          title: selectedActionType === 'advance-payment' 
            ? (selectedItem.title || selectedItem.description || 'Advance Payment Details')
            : selectedActionType === 'plan'
            ? (selectedItem.expensePlan?.title || 'Plan Details')
            : (selectedItem.expensePlan?.expenseRequest?.title || 'Request Details'),
          icon: <FileTextOutlined />,
          content: renderAdvancePaymentDetails,
          onClose: handleCloseDetails
        } : undefined}
      />
    </>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default AdvancePaymentsTable;
