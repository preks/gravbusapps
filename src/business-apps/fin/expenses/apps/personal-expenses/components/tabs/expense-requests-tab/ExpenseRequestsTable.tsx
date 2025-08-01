import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDebounce } from '@/common/hooks/useDebounce';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Alert, Empty, Modal } from 'antd';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell, 
  Card, 
  CardContent, 
  Spinner, 
  Button, 
  Badge,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@newwork/nw-design-system';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { getExpenseRequestStatusDisplay, ExpenseStatus } from '../../../utils';
import { InfoCircleOutlined } from '@ant-design/icons';
import Pill, { PillType } from '@/components/pill';
import ExpenseRequestDetails from './ExpenseRequestDetails';
import { formatDate, formatNumberFunction, getDateFormat } from '@/common/utils/windowUtils';
import dayjs from 'dayjs';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { startProcess } from '@/common/utils/start-process';
import { useExpenseRequestFileService } from '../../../utils/expenseRequestFileService';
import { PiArrowUp, PiArrowDown } from 'react-icons/pi';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';

export interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  items?: any[];
  isLoading?: boolean;
  error?: string | null;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onTableChange?: (pagination: any, filters: any, sorter: any) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  selectedFilters?: string[];
  setFilters?: (filters: string[]) => void;
  filterGroups?: any[];
  handleFilterChange?: (filterId: string, selected: boolean) => void;
  clearFilters?: () => void;
  filterLabelMap?: Record<string, string>;
  onAddExpenseRequest?: () => void;
}

const DEFAULT_PAGE_SIZE = 20;

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = React.memo((props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }), [props.accessToken, props.userInfo]);
  
  // Use props passed from parent instead of hook directly
  const {
    items = [],
    isLoading = false,
    error = null,
    totalCount = 0,
    currentPage = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    onTableChange,
    search = '',
    onSearchChange,
    selectedFilters = [],
    setFilters,
    filterGroups = [],
    handleFilterChange,
    clearFilters,
    filterLabelMap = {},
    onAddExpenseRequest
  } = props;

  // Local search state for immediate UI feedback
  const [searchInput, setSearchInput] = useState(search || '');
  
  // Debounced search term for API calls
  const debouncedSearchTerm = useDebounce(searchInput, 300);

  // Server-side sorting state
  const [sortField, setSortField] = useState<string>('requestDate');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend');

  // Selected item for details panel
  const [selectedItem, setSelectedItem] = useState<typeof items[0] | null>(null);

  // Selected row keys for table
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Print functionality state
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [printPdfUrl, setPrintPdfUrl] = useState<string>('');
  const [printLoading, setPrintLoading] = useState<boolean>(false);
  
  // Use the file service hook
  const { printExpenseRequest, isMounted } = useExpenseRequestFileService(props);

  // Sync local search input with prop changes
  useEffect(() => {
    setSearchInput(search || '');
  }, [search]);

  // Call parent callback when debounced search changes
  useEffect(() => {
    if (onSearchChange && debouncedSearchTerm !== search) {
      onSearchChange(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearchChange, search]);

  // Handle search input changes (immediate UI update)
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  // Handle filter changes
  const handleFilterChangeCallback = useCallback((filterId: string, selected: boolean) => {
    if (handleFilterChange) {
      handleFilterChange(filterId, selected);
    }
  }, [handleFilterChange]);

  // Enhanced server-side sorting handler
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      // Cycle through: ascend -> descend -> clear
      if (sortOrder === 'ascend') {
        setSortOrder('descend');
      } else if (sortOrder === 'descend') {
        setSortField('');
        setSortOrder(undefined);
      } else {
        setSortOrder('ascend');
      }
    } else {
      setSortField(field);
      setSortOrder('ascend');
    }
    // Reset to first page when sorting changes
    if (onTableChange) {
      onTableChange({ current: 1, pageSize }, {}, { field, order: sortOrder === 'ascend' ? 'descend' : 'ascend' });
    }
  }, [sortField, sortOrder, onTableChange, pageSize]);

  // Helper function to render sort icon
  const renderSortIcon = useCallback((field: string) => {
    if (sortField !== field) return null;
    if (sortOrder === 'ascend') return <PiArrowUp className="gba:inline gba:ml-1" size={12} />;
    if (sortOrder === 'descend') return <PiArrowDown className="gba:inline gba:ml-1" size={12} />;
    return null;
  }, [sortField, sortOrder]);

  // Enhanced table change handler for pagination
  const handleEnhancedTableChange = useCallback((pagination: any, _filters: any, sorter: any) => {
    if (onTableChange) {
      // Update sorting state if sorter is provided
      if (sorter && sorter.field) {
        setSortField(sorter.field);
        setSortOrder(sorter.order);
      }
      onTableChange(pagination, _filters, sorter);
    }
  }, [onTableChange]);

  // Memoize pagination configuration
  const paginationConfig = useMemo(() => ({
    current: currentPage,
    pageSize: pageSize,
    total: totalCount,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total: number, range: [number, number]) => 
      `${range[0]}-${range[1]} of ${total} items`,
    onChange: (page: number, size: number) => handleEnhancedTableChange({ current: page, pageSize: size }, {}, {}),
    onShowSizeChange: (current: number, size: number) => handleEnhancedTableChange({ current, pageSize: size }, {}, {})
  }), [currentPage, pageSize, totalCount, handleEnhancedTableChange]);

  // Helper function to determine status display with memoization
  const getStatusDisplay = useCallback((status: string): { type: PillType; text: string; color?: string } => {
    // Use the same logic as the filter sidebar to get consistent labels
    const statusConfig = getExpenseRequestStatusDisplay(status);
    // Only show backend status in parentheses if the label is different from the status
    let displayText: string;
    if (statusConfig.label.toLowerCase() === status.toLowerCase()) {
      displayText = statusConfig.label;
    } else {
      displayText = `${statusConfig.label}`;
    }
    return { type: statusConfig.type, text: displayText, color: statusConfig.color };
  }, [])

  // Handle row selection change
  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  }, []);

  // Handle item selection
  const handleSelectItem = useCallback((item: typeof items[0]) => {
    setSelectedItem(item);
  }, []);

  const handleViewExpenseRequestDetails = useCallback((item: typeof items[0]) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', { 
      expenseRequestId: item.id
    });
    navigateTo(url);
  }, []);

  // Handle editing an expense request
  const handleEditExpenseRequest = useCallback((item: typeof items[0]) => {
    console.log('Editing expense request:', item.id);
    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseRequest',
      payload: {
            employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
            expenseRequestId: item.id
      }
    });
  }, []);

  // Handle printing an expense request
  const handlePrintRequest = useCallback(async (record: typeof items[0]) => {
    setPrintLoading(true);
    setPrintModalOpen(true);

    try {
      const result = await printExpenseRequest(record);
      
      if (result.success && result.pdfUrl && isMounted.current) {
        setPrintPdfUrl(result.pdfUrl);
      } else if (!result.success) {
        console.error('Error printing request:', result.error);
      }
    } catch (error) {
      console.error('Error fetching print PDF:', error);
    } finally {
      if (isMounted.current) {
        setPrintLoading(false);
      }
    }
  }, [printExpenseRequest, isMounted]);

  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // Render the data body with memoization
  const renderDataBody = useCallback(() => {
    // Show error message if there's an error
    if (error) {
      const errorMessage = typeof error === 'string' ? error : (error as Error)?.message || 'Failed to load expense requests.';
      return <Alert message="Error" description={errorMessage} type="error" showIcon />;
    }

    // Show empty state only when not loading and there are no items
    if (!isLoading && (!items || items.length === 0)) {
      return <Empty 
        description="No expense requests found matching your criteria." 
        style={{ margin: '40px 0' }}
      />;
    }
    
    // Always render the table, but use the loading prop to show loading state
    // This keeps the table visible during loading for better UX

    return (
      <div className="expense-requests-table">
        <Card data-testid="expense-requests-table-container">
          <CardContent className="gba:p-0">
            {isLoading && (
              <div className="gba:flex gba:justify-center gba:p-4">
                <Spinner />
              </div>
            )}
            
            <div className="gba:overflow-x-auto">
              <Table data-testid="expense-requests-data-table">
                <TableHeader>
                  <TableRow className="gba:border-b gba:bg-gray-50">
                    <TableHead className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-3"/>
                    <TableHead 
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('code')}
                      data-testid="expense-requests-code-header"
                    >
                      <div className="gba:flex gba:items-center">
                        Request Number
                        {renderSortIcon('code')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('title')}
                      data-testid="expense-requests-title-header"
                    >
                      <div className="gba:flex gba:items-center">
                        Title
                        {renderSortIcon('title')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('requestDate')}
                      data-testid="expense-requests-request-date-header"
                    >
                      <div className="gba:flex gba:items-center">
                        Request Date
                        {renderSortIcon('requestDate')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('startDate')}
                      data-testid="expense-requests-start-date-header"
                    >
                      <div className="gba:flex gba:items-center">
                        Start Date
                        {renderSortIcon('startDate')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('endDate')}
                      data-testid="expense-requests-end-date-header"
                    >
                      <div className="gba:flex gba:items-center">
                        End Date
                        {renderSortIcon('endDate')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                      onClick={() => handleSort('status')}
                      data-testid="expense-requests-status-header"
                    >
                      <div className="gba:flex gba:items-center">
                        Status
                        {renderSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100 gba:text-right"
                      onClick={() => handleSort('reimbursableAmount')}
                      data-testid="expense-requests-reimbursable-amount-header"
                    >
                      <div className="gba:flex gba:items-center gba:justify-end">
                        Reimbursable Amount
                        {renderSortIcon('reimbursableAmount')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:text-right"
                      data-testid="expense-requests-advance-header"
                    >
                      <div className="gba:flex gba:items-center gba:justify-end">
                        Advance
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isLoading && (!items || items.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={9} className="gba:py-8 gba:text-center">
                        <Empty 
                          description="No expense requests found matching your criteria." 
                          style={{ margin: '40px 0' }}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    items?.map((record: any) => (
                      <TableRow 
                        key={record.id} 
                        className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors gba:cursor-pointer ${selectedItem?.id === record.id ? 'gba:bg-blue-50' : ''}`}
                        onClick={() => handleSelectItem(record)}
                        data-testid={`expense-request-row-${record.id}`}
                      >
                        <TableCell className="gba:py-4 gba:px-3">
                          <div className="gba:flex gba:justify-start gba:gap-2">
                            <AppActionButton
                              data-testid={`expense-request-update-button-${record.id}`}
                              variant="secondary"
                              staticFlowData={[
                                ...(record.status === 'CREATED' || record.status === 'REJECTED') ? [
                                {
                                  category: 'Actions',
                                  key: 'edit-expense-request',
                                  label: 'Update Request',
                                  onClick: (e?: React.MouseEvent) => {
                                    e?.stopPropagation();
                                    handleEditExpenseRequest(record);
                                  }
                                }]: [],
                                  ...((record.status === "APPROVED"  || record.status === "VERIFIED" || record.status === "BOOKED" || record.status === "TRANSFERRED" || record.status === "PAID") && (record.employeeDocument && record.employeeDocument?.file && record.employeeDocument.file.trim() !== '')) ? [
                                {
                                  category: 'Actions',
                                  key: 'print',
                                  label: 'Print',
                                  onClick: (e?: React.MouseEvent) => {
                                    e?.stopPropagation();
                                    handlePrintRequest(record);
                                  }
                                }]: [],
                                  {
                                    category: 'Navigations',
                                    key: 'view-expense-request',
                                    label: 'View Request Details',
                                    onClick: (e?: React.MouseEvent) => {
                                      e?.stopPropagation();
                                      handleViewExpenseRequestDetails(record);
                                    }
                                  },
                              ]}
                              accessToken={contextProps.accessToken}
                              emptyStateBehavior="disable"
                              deferMainContextRequestsUntilClick
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6">
                          {record.code || 'N/A'}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6">
                          {record.title}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6">
                          {record.requestDate ? dayjs(record.requestDate).format(getDateFormat('date.short')) : '-'}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6">
                          {record.startDate ? dayjs(record.startDate).format(getDateFormat('date.short')) : '-'}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6">
                          {record.endDate ? dayjs(record.endDate).format(getDateFormat('date.short')) : '-'}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6">
                          {(() => {
                            const { type, text, color } = getStatusDisplay(record.status);
                            return <Pill type={type} label={text} color={color} />;
                          })()}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6 gba:text-right">
                          {(() => {
                            const currencyCode = record.currency?.code || '';
                            const formattedAmount = record.reimbursableAmount && record.reimbursableAmount !== 0 ? `${formatNumberFunction(String(record.reimbursableAmount ?? '0'))} ${currencyCode}` : '-';
                            
                            return (
                              <div data-testid={`reimbursable-amount-${record.id}`}>
                                {formattedAmount}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6 gba:text-right">
                          {(() => {
                            const advanceAmountValue = record.expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount;
                            const advanceAmount = advanceAmountValue && advanceAmountValue !== 0 ? advanceAmountValue : '-';
                            
                            // Use expense plan currency if available, otherwise fall back to main currency
                            const currencyCode = advanceAmountValue && advanceAmountValue !== 0  ?  record.currency?.code  : '';
                            const formattedAmount = `${formatNumberFunction(String(advanceAmount))} ${currencyCode}`;
                          
                            return (
                              <div data-testid={`total-amount-${record.id}`}>
                                {formattedAmount}
                              </div>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination - same pattern as other table components */}
            {totalCount > pageSize && (
              <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:border-t" data-testid="expense-requests-pagination">
                <div className="gba:text-sm gba:text-muted-foreground" data-testid="expense-requests-pagination-info">
                  {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} expense requests`}
                </div>
                <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <p className="gba:text-sm gba:font-medium">Rows per page</p>
                    <select
                      value={pageSize}
                      onChange={(e) => handleEnhancedTableChange({ current: 1, pageSize: Number(e.target.value) }, {}, {})}
                      className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                      data-testid="expense-requests-page-size-select"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium" data-testid="expense-requests-page-info">
                    Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                  </div>
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <Button
                      variant="outline"
                      className="gba:h-8 gba:w-8 gba:p-0"
                      onClick={() => handleEnhancedTableChange({ current: 1, pageSize }, {}, {})}
                      disabled={currentPage === 1}
                      data-testid="expense-requests-first-page-button"
                    >
                      <span className="gba:sr-only">Go to first page</span>
                      ⟨⟨
                    </Button>
                    <Button
                      variant="outline"
                      className="gba:h-8 gba:w-8 gba:p-0"
                      onClick={() => handleEnhancedTableChange({ current: currentPage - 1, pageSize }, {}, {})}
                      disabled={currentPage === 1}
                      data-testid="expense-requests-previous-page-button"
                    >
                      <span className="gba:sr-only">Go to previous page</span>
                      ⟨
                    </Button>
                    <Button
                      variant="outline"
                      className="gba:h-8 gba:w-8 gba:p-0"
                      onClick={() => handleEnhancedTableChange({ current: currentPage + 1, pageSize }, {}, {})}
                      disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                      data-testid="expense-requests-next-page-button"
                    >
                      <span className="gba:sr-only">Go to next page</span>
                      ⟩
                    </Button>
                    <Button
                      variant="outline"
                      className="gba:h-8 gba:w-8 gba:p-0"
                      onClick={() => handleEnhancedTableChange({ current: Math.ceil(totalCount / pageSize), pageSize }, {}, {})}
                      disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                      data-testid="expense-requests-last-page-button"
                    >
                      <span className="gba:sr-only">Go to last page</span>
                      ⟩⟩
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }, [items, isLoading, error, totalCount, currentPage, pageSize, handleEnhancedTableChange, handleSort, renderSortIcon, handleSelectItem, handleEditExpenseRequest, handlePrintRequest, getStatusDisplay, contextProps.accessToken]);

  return (
    <>
      <DataContainer
        dataControllerProps={{
          listTitle: 'Expense Requests',
          listAmount: totalCount ? `${totalCount}` : undefined,
          search: searchInput,
          setSearch: handleSearchChange,
          placeholder: 'Search by request number, title, or status...',
          filter: selectedFilters,
          setFilter: setFilters || (() => {}),
          filterLabelMap: filterLabelMap,
          addButton: {
            onClick: onAddExpenseRequest || (() => {}),
            label: 'Add',
            'data-testid': 'add-expense-plan-button',
          },
        }}
        dataFilterProps={{
          filterGroups: filterGroups,
          onFilterChange: handleFilterChangeCallback,
        }}
        dataBody={renderDataBody()}
      />

      {/* Expense Request Details Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && handleCloseDetails()}>
        <SheetContent className="gba:w-[600px] gba:sm:gba:w-[600px] gba:max-w-none">
          <SheetHeader>
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-gray-900">
              {selectedItem?.title || 'Expense Request Details'}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:mt-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
            {selectedItem && (
              <ExpenseRequestDetails
                selectedItem={selectedItem}
                onClose={handleCloseDetails}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Print Modal */}
      <Modal
        title="Print Expense Request"
        open={printModalOpen}
        onCancel={() => setPrintModalOpen(false)}
        footer={null}
        width={800}
        data-testid="expense-request-print-modal"
      >
        {printLoading ? (
          <div className="gba:flex gba:justify-center gba:p-8">
            <Spinner />
          </div>
        ) : printPdfUrl ? (
          <iframe
            src={printPdfUrl}
            style={{ width: '100%', height: '600px', border: 'none' }}
            title="Expense Request PDF"
            data-testid="expense-request-pdf-iframe"
          />
        ) : (
          <div className="gba:text-center gba:p-8 gba:text-gray-500">
            Failed to load PDF
          </div>
        )}
      </Modal>
    </>
  );
});

export default ExpenseRequestsTable;
