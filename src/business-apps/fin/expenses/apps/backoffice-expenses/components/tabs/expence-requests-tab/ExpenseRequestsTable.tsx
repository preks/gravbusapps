/**
 * Expense Requests Table Component
 * Displays a table of expense requests with filtering and view capabilities
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useExpenseRequests } from '../../../hooks/useExpenseRequests';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead,
  TableRow,
  TableCell,
  Alert, 
  Spinner,
  Button,
  Checkbox,
  Card,
  CardContent
} from '@newwork/nw-design-system';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { getTranslationFromI18nKeyAndLabel, formatDate, formatNumberFunction } from '@/common/utils/windowUtils';
import { ExpenseData } from '../../../types';
import { getExpenseRequestStatusDisplay } from '../../../utils/utils';
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils';

import {
  ExpenseRequestPdfModal,
  EmployeeSearchFilter,
  AmountFilter,
  ExpenseRequestTableRow,
  ExpenseRequestPagination
} from './components';

import {
  useExpenseRequestFilters,
  useExpenseRequestPdf,
  useExpenseRequestActions,
  useExpenseRequestTransfer
} from './hooks';

interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
}

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = (props) => {
  const { search, onSearchChange, accessToken } = props;
 
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
  }), [props.accessToken]);
  

  const [initialParams] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      search: urlParams.get('search') || '',
      page: parseInt(urlParams.get('page') || '1', 10),
      pageSize: parseInt(urlParams.get('pageSize') || '20', 10),
      status: urlParams.get('status') || '',
      department: urlParams.get('department') || ''
    };
  });
  

  const [searchText, setSearchText] = useState<string>(search ?? initialParams.search);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<ExpenseData[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);

  const clearSelection = useCallback(() => {
    setSelectedRecords([]);
    setSelectedRowKeys([]);
  }, []);

  const updateURLParams = useCallback((params: {
    search?: string;
    page?: number;
    pageSize?: number;
    status?: string;
    department?: string;
  }) => {
    const newSearchParams = new URLSearchParams(window.location.search);
    
    if (params.search !== undefined) {
      if (params.search) {
        newSearchParams.set('search', params.search);
      } else {
        newSearchParams.delete('search');
      }
    }
    
    if (params.page !== undefined) {
      if (params.page > 1) {
        newSearchParams.set('page', params.page.toString());
      } else {
        newSearchParams.delete('page');
      }
    }
    
    if (params.pageSize !== undefined) {
      if (params.pageSize !== 20) {
        newSearchParams.set('pageSize', params.pageSize.toString());
      } else {
        newSearchParams.delete('pageSize');
      }
    }

    if (params.status !== undefined) {
      if (params.status) {
        newSearchParams.set('status', params.status);
      } else {
        newSearchParams.delete('status');
      }
    }

    if (params.department !== undefined) {
      if (params.department) {
        newSearchParams.set('department', params.department);
      } else {
        newSearchParams.delete('department');
      }
    }

    const newURL = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;
    window.history.replaceState({}, '', newURL);
  }, []);

  const { 
    expenses, 
    totalItems, 
    loading, 
    error, 
    currentPage, 
    pageSize,
    fetchData,
    searchEmployees, 
    searchStatuses,
    handleEmployeeFilter,
    handleStatusFilter,
    handleAmountFilter,
    handleTableChange, 
    handleSearch,
    amountMinFilter,
    amountMaxFilter,
  } = useExpenseRequests(contextProps);

 


  const {
    isPdfModalVisible,
    pdfUrl,
    pdfLoading,
    pdfError,
    handlePrintExpenseRequest,
    handleClosePdfModal
  } = useExpenseRequestPdf(props);

  const {
    handleDownloadAccountingNote,
    handleTriggerCSV
  } = useExpenseRequestActions(props);

  const {
    handleTransferPayment,
    handleBulkTransferPayment
  } = useExpenseRequestTransfer(props, fetchData, clearSelection);

  const {
    employeeFilter,
    setEmployeeFilter,
    employeeSearchText,
    setEmployeeSearchText,
    showEmployeeDropdown,
    setShowEmployeeDropdown,
    employeeSearchResults,
    employeeSearchLoading,
    selectedEmployees,
    setSelectedEmployees,
    debouncedSearchEmployees,
    statusFilter,
    setStatusFilter,
    handleStatusFilterChange,
    localAmountMin,
    setLocalAmountMin,
    localAmountMax,
    setLocalAmountMax,
    debouncedAmountFilter
  } = useExpenseRequestFilters({
    searchEmployees,
    handleEmployeeFilter,
    handleStatusFilter,
    handleAmountFilter,
    amountMinFilter,
    amountMaxFilter,
    availableStatuses
  });

  useEffect(() => {
    const loadAvailableStatuses = async () => {
      try {
        const statuses = await searchStatuses();
        
        if (statuses.length === 0) {
          const defaultStatuses = ['CREATED', 'PENDING', 'APPROVED', 'VERIFIED', 'BOOKED', 'CLOSED', 'PAID', 'REJECTED'];
          setAvailableStatuses(defaultStatuses);
        } else {
          setAvailableStatuses(statuses);
        }
      } catch (error) {
        console.error('Error loading available statuses:', error);
        const defaultStatuses = ['CREATED', 'PENDING', 'APPROVED', 'VERIFIED', 'BOOKED', 'CLOSED', 'PAID', 'REJECTED'];
        setAvailableStatuses(defaultStatuses);
      }
    };

    loadAvailableStatuses();
  }, [searchStatuses]);

  useEffect(() => {
    if (contextProps.accessToken) {
      fetchData();
    }
  }, [contextProps.accessToken]);

  useEffect(() => {
    if (searchText !== initialParams.search) {
      updateURLParams({ search: searchText });
    }
  }, [searchText, initialParams.search, updateURLParams]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    handleSearch(value);
    onSearchChange?.(value);
  }, [handleSearch, onSearchChange]);

  const handleRowClick = useCallback((record: any) => {
    setSelectedExpense(record as ExpenseData);
  }, []);

  const handleNavigateToExpenseRequest = useCallback((record: ExpenseData) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', { 
      expenseRequestId: record.id 
    });
    navigateTo(url);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedExpense(null);
    setSelectedRowKeys([]);
  }, []);

  // Bulk selection handlers
  const handleSelectRecord = useCallback((record: ExpenseData, checked: boolean) => {
    if (checked) {
      setSelectedRecords(prev => [...prev, record]);
      setSelectedRowKeys(prev => [...prev, record.id]);
    } else {
      setSelectedRecords(prev => prev.filter(r => r.id !== record.id));
      setSelectedRowKeys(prev => prev.filter(key => key !== record.id));
    }
  }, []);

  const handleSelectAllRecords = useCallback((checked: boolean) => {
    if (checked) {
      const bookableRecords = expenses?.filter(expense => expense.status === 'BOOKED') || [];
      setSelectedRecords(bookableRecords);
      setSelectedRowKeys(bookableRecords.map(record => record.id));
    } else {
      setSelectedRecords([]);
      setSelectedRowKeys([]);
    }
  }, [expenses]);

  const handleBulkTransfer = useCallback(() => {
    if (selectedRecords.length > 0) {
      const bookableRecords = selectedRecords.filter(record => record.status === 'BOOKED');
      if (bookableRecords.length > 0) {
        handleBulkTransferPayment(bookableRecords);
      }
    }
  }, [selectedRecords, handleBulkTransferPayment]);

  // Check if any selected records are bookable
  const hasBookableSelected = useMemo(() => {
    return selectedRecords.some(record => record.status === 'BOOKED');
  }, [selectedRecords]);

  // Check if all visible records are bookable
  const allBookableSelected = useMemo(() => {
    const bookableRecords = expenses?.filter(expense => expense.status === 'BOOKED') || [];
    return selectedRecords.length > 0 && 
           selectedRecords.length === bookableRecords.length &&
           selectedRecords.every(record => record.status === 'BOOKED');
  }, [selectedRecords, expenses]);

  // Count of bookable records
  const bookableRecordsCount = useMemo(() => {
    return expenses?.filter(expense => expense.status === 'BOOKED').length || 0;
  }, [expenses]);

  const filterGroups: DataFilterGroup[] = useMemo(() => {
    return [
      {
        id: 'status',
        title: getTranslationFromI18nKeyAndLabel('expense.request.filter.status', 'Status'),
        type: 'checkbox',
        filters: availableStatuses.map(status => ({
          id: status,
          label: getExpenseRequestStatusDisplay(status).label,
          selected: statusFilter.includes(status)
        }))
      },
      {
        id: 'employee',
        title: getTranslationFromI18nKeyAndLabel('expense.request.filter.employee', 'Employee'),
        type: 'custom',
        customComponent: (
          <EmployeeSearchFilter
            employeeSearchText={employeeSearchText}
            setEmployeeSearchText={setEmployeeSearchText}
            showEmployeeDropdown={showEmployeeDropdown}
            setShowEmployeeDropdown={setShowEmployeeDropdown}
            employeeSearchResults={employeeSearchResults}
            employeeSearchLoading={employeeSearchLoading}
            selectedEmployees={selectedEmployees}
            setSelectedEmployees={setSelectedEmployees}
            setEmployeeFilter={setEmployeeFilter}
            handleEmployeeFilter={handleEmployeeFilter}
            debouncedSearchEmployees={debouncedSearchEmployees}
          />
        )
      },
      {
        id: 'amount',
        title: getTranslationFromI18nKeyAndLabel('expense.request.filter.amount', 'Amount'),
        type: 'custom',
        customComponent: (
          <AmountFilter
            localAmountMin={localAmountMin}
            setLocalAmountMin={setLocalAmountMin}
            localAmountMax={localAmountMax}
            setLocalAmountMax={setLocalAmountMax}
            debouncedAmountFilter={debouncedAmountFilter}
          />
        )
      }
    ];
  }, [availableStatuses, statusFilter, employeeSearchText, showEmployeeDropdown, employeeSearchResults, employeeSearchLoading, selectedEmployees, handleEmployeeFilter, debouncedSearchEmployees, localAmountMin, setLocalAmountMin, localAmountMax, setLocalAmountMax, debouncedAmountFilter]);

  const getFilters = useCallback((filtersToApply?: string[]) => {
    const filters: Record<string, any> = {};
    if (employeeFilter) filters.employee = employeeFilter;
    return filters;
  }, [employeeFilter]);

  const setFilters = useCallback((filters: string[]) => {
    setEmployeeFilter('');
    setSelectedEmployees([]);
    setEmployeeSearchText('');
    setStatusFilter([]);
    setLocalAmountMin('');
    setLocalAmountMax('');
    
    handleEmployeeFilter('');
    handleStatusFilter('');
    handleAmountFilter('', '');
  }, [handleEmployeeFilter, handleStatusFilter, handleAmountFilter]);


  const handleEnhancedTableChange = useCallback((pagination: any) => {
    handleTableChange(pagination, {}, {});
  }, [handleTableChange]);



  if (loading && expenses.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-4">
        <Alert
          variant="destructive"
          data-testid="expense-requests-error"
        >
          <div className="gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('expense.request.error.title', 'Error Loading Data')}
          </div>
          <div className="gba:text-sm">{error}</div>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <DataContainer
        dataControllerProps={{
          listTitle: getTranslationFromI18nKeyAndLabel('expense.request.list.title', 'Expense Requests'),
          listAmount: totalItems ? `${totalItems}` : undefined,
          search: searchText,
          setSearch: handleSearchChange,
          placeholder: getTranslationFromI18nKeyAndLabel('expense.request.search.placeholder', 'Search in Expense Requests'),
          filter: Object.keys(getFilters()),
          setFilter: setFilters,
          filterLabelMap: {
            status: statusFilter.length > 0 ? `Status: ${statusFilter.map(s => getExpenseRequestStatusDisplay(s).label).join(', ')}` : 'Status: All',
            employee: employeeFilter ? `Employee: ${selectedEmployees.map(e => e.name).join(', ')}` : 'Employee: All',
            amount: `Amount: ${amountMinFilter || '0'} - ${amountMaxFilter || '∞'}`,
          },
          actions: hasBookableSelected ? (
            <Button
              onClick={handleBulkTransfer}
              data-testid="bulk-transfer-payment-button"
              variant="outline"
              size="sm"
            >
              Transfer Payment ({selectedRecords.filter(r => r.status === 'BOOKED').length} selected)
            </Button>
          ) : undefined,
        }}
        dataFilterProps={{
          filterGroups: filterGroups,
          onFilterChange: (filterId: string, selected: boolean) => {
            if (filterId === '') {
              if (selected) {
                setEmployeeFilter('');
                setSelectedEmployees([]);
                setEmployeeSearchText('');
                setStatusFilter([]);
                setLocalAmountMin('');
                setLocalAmountMax('');
                
                handleEmployeeFilter('');
                handleStatusFilter('');
                handleAmountFilter('', '');
              }
            } else {
              if (filterId === 'employee') {
                if (selected) {
                } else {
                  setEmployeeFilter('');
                  setSelectedEmployees([]);
                  setEmployeeSearchText('');
                  handleEmployeeFilter('');
                }
              } else if (availableStatuses.includes(filterId)) {
                handleStatusFilterChange(filterId, selected);
              }
            }
          },
        }}
        dataBody={
          loading && !expenses?.length ? (
            <div className="gba:flex gba:justify-center gba:p-8">
              <Spinner />
            </div>
          ) : error ? (
            <Alert variant="destructive" className="gba:m-4">
              {error}
            </Alert>
          ) : !expenses || expenses.length === 0 ? (
            <div className="gba:p-8 gba:text-center gba:text-gray-500">
              No expense requests found matching the current filters.
            </div>
          ) : (
            <div className="gba:pr-6 gba:overflow-hidden">
              <Card data-testid="expense-requests-container">
                <CardContent className="gba:p-0">
                  {loading && (
                    <div className="gba:flex gba:justify-center gba:p-4">
                      <Spinner />
                    </div>
                  )}
                  
                  <div className="gba:overflow-x-auto gba:mt-4 gba:max-w-full">
                    <Table data-testid="expense-requests-data-table" className="gba:min-w-[1600px] gba:w-full">
                      <TableHeader>
                        <TableRow className="gba:border-b gba:bg-gray-50">
                          <TableHead className="gba:w-[50px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-3">
                            {bookableRecordsCount > 0 && (
                              <Checkbox
                                checked={allBookableSelected}
                                onCheckedChange={handleSelectAllRecords}
                                data-testid="select-all-records-checkbox"
                              />
                            )}
                          </TableHead>
                          <TableHead className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-3">Actions</TableHead>
                          <TableHead className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Employee</TableHead>
                          <TableHead className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Employee Code</TableHead>
                          <TableHead className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">SAP Number</TableHead>
                          <TableHead className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Request Number</TableHead>
                          <TableHead className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Title</TableHead>
                          <TableHead className="gba:w-[8%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Start Date</TableHead>
                          <TableHead className="gba:w-[8%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">End Date</TableHead>
                          <TableHead className="gba:w-[8%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Creation Date</TableHead>
                          <TableHead className="gba:w-[8%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">Status</TableHead>
                          <TableHead className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:text-right">Remaining Amount</TableHead>
                          <TableHead className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:text-right">Total Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!loading && (!expenses || expenses.length === 0) ? (
                          <TableRow>
                            <TableCell colSpan={12} className="gba:py-8 gba:text-center">
                              <div className="gba:text-gray-500">
                                No expense requests found matching the current filters.
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          expenses?.map((record: ExpenseData) => (
                            <ExpenseRequestTableRow
                              key={record.id}
                              record={record}
                              onRowClick={handleRowClick}
                              onNavigateToExpenseRequest={handleNavigateToExpenseRequest}
                              onDownloadAccountingNote={handleDownloadAccountingNote}
                              onTriggerCSV={handleTriggerCSV}
                              onPrintExpenseRequest={handlePrintExpenseRequest}
                              onTransferPayment={handleTransferPayment}
                              isSelected={selectedRowKeys.includes(record.id)}
                              onSelectRecord={handleSelectRecord}
                            />
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination */}
                  <ExpenseRequestPagination
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    onPageChange={handleEnhancedTableChange}
                  />
                </CardContent>
              </Card>
            </div>
          )
        }
        dataDetails={
          selectedExpense ? {
            title: selectedExpense.title || getTranslationFromI18nKeyAndLabel('expense.request.details.title', 'Expense Request Details'),
            content: (
              <div className="gba:p-4">
                <div className="gba:mb-4">
                  <h3 className="gba:text-lg gba:font-semibold">{selectedExpense.title}</h3>
                  <p className="gba:text-sm gba:text-gray-600">{selectedExpense.code}</p>
                </div>
                <div className="gba:space-y-2">
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Employee:</span>
                    <span>{selectedExpense.employee}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Employee Code:</span>
                    <span>{selectedExpense.employeeCode}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">SAP Number:</span>
                    <span>{selectedExpense.sapNumber}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Request Number:</span>
                    <span>{selectedExpense.code}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Title:</span>
                    <span>{selectedExpense.title}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Start Date:</span>
                    <span>{selectedExpense.startDate && selectedExpense.startDate !== 'N/A' ? formatDate(selectedExpense.startDate, 'date.long') : 'N/A'}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">End Date:</span>
                    <span>{selectedExpense.endDate && selectedExpense.endDate !== 'N/A' ? formatDate(selectedExpense.endDate, 'date.long') : 'N/A'}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Creation Date:</span>
                    <span>{selectedExpense.creationDate && selectedExpense.creationDate !== 'N/A' ? formatDate(selectedExpense.creationDate, 'date.long') : 'N/A'}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Status:</span>
                    <span>{selectedExpense.status}</span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Remaining Amount:</span>
                    <span>
                      {(() => {
                        const remainingAmount = Number(selectedExpense.totalRemainingAmount) || 0;
                        const currencyCode = selectedExpense.currency || '';
                        return remainingAmount > 0 ? `${formatNumberFunction(String(remainingAmount))} ${currencyCode}` : '-';
                      })()}
                    </span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:font-medium">Total Amount:</span>
                    <span>{formatNumberFunction(String(selectedExpense.totalAmount))}</span>
                  </div>
                </div>
              </div>
            ),
            onClose: handleCloseDetails,
          } : undefined
        }
        floatingDetails={true}
      />
      
      {/* PDF Modal */}
      <ExpenseRequestPdfModal
        isVisible={isPdfModalVisible}
        pdfUrl={pdfUrl}
        pdfLoading={pdfLoading}
        pdfError={pdfError}
        onClose={handleClosePdfModal}
      />
    </>
  );
};

export default ExpenseRequestsTable;
