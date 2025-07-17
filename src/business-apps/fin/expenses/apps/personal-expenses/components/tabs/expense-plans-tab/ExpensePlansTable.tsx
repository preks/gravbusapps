import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ExpensePlan } from '../../../hooks/useGetExpensePlans';
import { getExpensePlanStatusDisplay } from '../../../utils';
import ExpensePlanDetails from './ExpensePlanDetails';
import ExpenseRequestDetails from '../expense-requests-tab/ExpenseRequestDetails';
import { startProcess } from '@/common/utils/start-process';
import { Spin, Alert, Typography, Modal } from 'antd';
import { formatDate, formatNumberFunction } from '@/common/utils/windowUtils';
import { DataTable, ActionButton } from '@newwork/gravity-ui-catalog';
import { FileTextOutlined } from '@ant-design/icons';
import Pill from '@/components/pill/Pill';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { useExpensePlanFileService } from '../../../utils/expensePlanFileService';

const { Text } = Typography;

// Sorting utilities following SOLID principles
interface SortableField<T> {
  key: keyof T;
  type: 'string' | 'number' | 'date';
  nullable?: boolean;
}

class SortingService {
  static createSorter<T>(field: SortableField<T>) {
    return (a: T, b: T) => {
      const aValue = a[field.key];
      const bValue = b[field.key];
      
      // Handle nullable values
      const aSafe = field.nullable ? (aValue ?? 0) : aValue;
      const bSafe = field.nullable ? (bValue ?? 0) : bValue;
      
      switch (field.type) {
        case 'string':
          return String(aSafe).localeCompare(String(bSafe));
        case 'number':
          return Number(aSafe) - Number(bSafe);
        case 'date':
          const aDate = aSafe ? new Date(String(aSafe)).getTime() : 0;
          const bDate = bSafe ? new Date(String(bSafe)).getTime() : 0;
          return aDate - bDate;
        default:
          return 0;
      }
    };
  }
}

// Column configuration following SRP
const EXPENSE_PLAN_COLUMNS = {
  code: { key: 'code' as keyof ExpensePlan, type: 'string' as const },
  title: { key: 'title' as keyof ExpensePlan, type: 'string' as const },
  startDate: { key: 'startDate' as keyof ExpensePlan, type: 'date' as const, nullable: true },
  endDate: { key: 'endDate' as keyof ExpensePlan, type: 'date' as const, nullable: true },
  status: { key: 'status' as keyof ExpensePlan, type: 'string' as const },
  reimbursableAmount: { key: 'reimbursableAmount' as keyof ExpensePlan, type: 'number' as const, nullable: true },
  advancePaymentPaidAmount: { key: 'advancePaymentPaidAmount' as keyof ExpensePlan, type: 'number' as const, nullable: true },
} as const;

export interface ExpensePlansTableProps extends BusinessAppContextProps {
  items: ExpensePlan[] | undefined;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onTableChange: (pagination: any, filters: any, sorter: any) => void;
  search: string;
  onSearchChange: (search: string) => void;
  selectedFilters: string[];
  setFilters: (filters: string[]) => void;
  filterGroups: DataFilterGroup[];
  handleFilterChange: (filterId: string, selected: boolean) => void;
  clearFilters: () => void;
}

const ExpensePlansTable: React.FC<ExpensePlansTableProps> = React.memo((props) => {
  const {
    items: plans,
    isLoading,
    error,
    totalCount,
    currentPage,
    pageSize,
    onTableChange,
    ...contextProps
  } = props;

  // Internal sorting state - managed locally like expense items table
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend');

  const [selectedItem, setSelectedItem] = useState<ExpensePlan | null>(null);
  const [selectedExpenseRequest, setSelectedExpenseRequest] = useState<any>(null);
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [printPdfUrl, setPrintPdfUrl] = useState<string>('');
  const [printLoading, setPrintLoading] = useState<boolean>(false);
  
  // Use the file service hook
  const { printExpensePlan, isMounted } = useExpensePlanFileService(props);

  const handleSelectItem = useCallback((item: ExpensePlan) => {
    setSelectedItem(item);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
    setSelectedExpenseRequest(null);
  }, []);

  const handlePrintPlan = useCallback(async (record: ExpensePlan) => {
    setPrintLoading(true);
    setPrintModalOpen(true);

    try {
      const result = await printExpensePlan(record);
      
      if (result.success && result.pdfUrl && isMounted.current) {
        setPrintPdfUrl(result.pdfUrl);
      } else if (!result.success) {
        console.error('Error printing plan:', result.error);
      }
    } catch (error) {
      console.error('Error fetching print PDF:', error);
    } finally {
      if (isMounted.current) {
        setPrintLoading(false);
      }
    }
  }, [printExpensePlan, isMounted]);

  const handleAddExpensePlan = useCallback(() => {
    if (contextProps.userInfo?.employeeDetails?.employeeId) {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeExpensePlan',
        payload: {
          employeeId: contextProps.userInfo.employeeDetails.employeeId,
        },
      });
    }
  }, [contextProps.userInfo]);
  
  const handleViewExpenseRequestDetails = useCallback((record: ExpensePlan) => {
    if (record.expenseRequest) {
      setSelectedExpenseRequest(record.expenseRequest);
    }
  }, []);

  // Enhanced table change handler for sorting - manages state internally
  const handleEnhancedTableChange = useCallback((pagination: any, _filters: any, sorter: any) => {
    // Handle pagination
    onTableChange(pagination, _filters, sorter);
    
    // Handle sorting - update internal state only
    if (sorter && sorter.field) {
      setSortField(sorter.field);
      setSortOrder(sorter.order);
    } else {
      // Reset to default sorting (creation date descending)
      setSortField('createdAt');
      setSortOrder('descend');
    }
  }, [onTableChange]);

  // Column factory following OCP
  const createColumn = useCallback((key: keyof typeof EXPENSE_PLAN_COLUMNS, title: string, render?: (value: any, record: ExpensePlan) => React.ReactNode) => {
    const field = EXPENSE_PLAN_COLUMNS[key];
    return {
      title,
      dataIndex: field.key,
      key: field.key,
      sorter: SortingService.createSorter(field),
      sortOrder: sortField === field.key ? sortOrder : null,
      render,
    };
  }, [sortField, sortOrder]);

  const renderDataBody = useMemo(() => {
    if (isLoading) {
      return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>;
    }

    if (error) {
      return <Alert message="Error Loading Expense Plans" description={error} type="error" showIcon />;
    }

    if (!plans || plans.length === 0) {
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Text>No expense plans found. Create your first expense plan to get started.</Text>
        </div>
      );
    }

    return (
      <DataTable
        dataSource={plans}
        rowKey="id"
        loading={isLoading}
        onRow={(record: any) => ({
          onClick: () => handleSelectItem(record),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: totalCount,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total: number, range: [number, number]) => `${range[0]}-${range[1]} of ${total} items`,
        }}
        onChange={handleEnhancedTableChange}
        data-testid="expense-plans-data-table"
        columns={[
          {
            title: '',
            key: 'actions',
            align: 'center',
            width: 60,
            render: (_: any, record: ExpensePlan) => (
              <ActionButton
                onClick={(e) => e.stopPropagation()}
                flowData={[
                  ...(record.status === 'CREATED' || record.status === 'REJECTED') ? [
                        {
                          category: 'Actions',
                          key: 'update-plan',
                          label: 'Update Plan',
                          onClick: () => {
                            startProcess({
                              domain: 'employee-expense',
                              processName: 'changeExpensePlan',
                              payload: {
                                employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
                                expensePlanId: record.id
                              },
                            });
                          }
                        }] : [],
                        ...(record.status === 'APPROVED' || record.status === 'CLOSED' || record.employeeDocumentId !== null) ? [
                           {
                          category: 'Actions',
                          key: 'print',
                          label: 'Print',
                          onClick: () => {
                            handlePrintPlan(record);
                          }
                        }] : [],
                        ...(record.status === 'CREATED' || record.status === 'CLOSED') ? [
                        {
                          category: 'Actions',
                          key: 'request-advance',
                          label: 'Request Advance Payment',
                          onClick: () => {
                            startProcess({
                              domain: 'employee-expense',
                              processName: 'changeAdvancePayment',
                              payload: {
                                employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
                                expensePlan: record.id
                              },
                            });
                          }
                        }] : [],
                        ...(record.status === 'APPROVED' || record.expenseRequest.id !== null) ? [
                        {
                          category: 'Actions',
                          key: 'create-expense-request',
                          label: 'Create Expense Request',
                          onClick: () => {
                            startProcess({
                              domain: 'employee-expense',
                              processName: 'changeExpenseRequest',
                              payload: {
                                employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
                                expensePlanId: record.id
                              },
                            });
                          }
                        }] : [],
                    {
                    category: 'Navigations',
                    key: 'view-plan-details',
                    label: 'View Plan Details',
                    onClick: (e?: React.MouseEvent) => {
                      e?.stopPropagation();
                      handleSelectItem(record);
                    },
                  },
                  ...(record.expenseRequest && (record.expenseRequest as unknown as any[]).length > 0 && (record.expenseRequest as unknown as any[])[0].id !== null) ? [ {
                    category: 'Navigations',
                    key: 'view-request-details',
                    label: 'View Request Details',
                    onClick: (e?: React.MouseEvent) => {
                      console.log('View request details for plan:', (record.expenseRequest as unknown as any[])[0].id);
                      e?.stopPropagation();
                      handleViewExpenseRequestDetails(record);
                    },
                  }] : [],
                ]}
                portalContainer={document.body}
                data-testid={`actions-${record.id}`}
                size="md"
              />
            ),
          },
          createColumn('code', 'Plan Number'),
          createColumn('title', 'Title'),
          createColumn('startDate', 'Start Date', (date: string) => (date ? formatDate(date, 'date.long') : '-')),
          createColumn('endDate', 'End Date', (date: string) => (date ? formatDate(date, 'date.long') : '-')),
          createColumn('status', 'Status', (status: string) => {
            const statusConfig = getExpensePlanStatusDisplay(status);
            return <Pill type={statusConfig.type} label={statusConfig.label} />;
          }),
          createColumn('reimbursableAmount', 'Reimbursable Amount', (amount: number, record: ExpensePlan) => {
            const currencyCode = record.currency?.code || '';
            return `${formatNumberFunction(String(amount ?? '0'))} ${currencyCode}`;
          }),
          createColumn('advancePaymentPaidAmount', 'Paid Advance', (amount: number, record: ExpensePlan) => {
            const currencyCode = record.currency?.code || '';
            return `${formatNumberFunction(String(amount ?? '0'))} ${currencyCode}`;
          }),
        ] as any}
      />
    );
  }, [plans, isLoading, error, currentPage, pageSize, totalCount, handleEnhancedTableChange, handleSelectItem, createColumn, contextProps.userInfo, handlePrintPlan, handleViewExpenseRequestDetails]);

  const renderExpensePlanDetails = useMemo(() => {
    if (!selectedItem) return null;

    return (
      <ExpensePlanDetails
        selectedItem={selectedItem}
        onClose={handleCloseDetails}
        accessToken={props.accessToken}
        userInfo={props.userInfo}
      />
    );
  }, [selectedItem, handleCloseDetails, props.accessToken, props.userInfo]);

  const renderExpenseRequestDetails = useMemo(() => {
    if (!selectedExpenseRequest) return null;

    return (
      <ExpenseRequestDetails
        selectedItem={selectedExpenseRequest}
        onClose={handleCloseDetails}
        accessToken={props.accessToken}
        userInfo={props.userInfo}
      />
    );
  }, [selectedExpenseRequest, handleCloseDetails, props.accessToken, props.userInfo]);
  
  

  return (
    <div>
      <DataContainer
        dataControllerProps={{
          search: props.search,
          setSearch: props.onSearchChange,
          filter: props.selectedFilters,
          setFilter: props.setFilters,
          addButton: {
            onClick: handleAddExpensePlan,
            label: 'Add',
            'data-testid': 'add-expense-plan-button',
          },
          listTitle: 'My Expense Plans',
          listAmount: totalCount ? `${totalCount}` : undefined,
        }}
        dataFilterProps={{
          filterGroups: props.filterGroups,
          onFilterChange: props.handleFilterChange,

        }}
        hideFilter={false}
        floatingDetails={true}
        dataBody={renderDataBody}
        contentBackground="white"
        dataDetails={selectedItem ? {
          title: selectedItem.title,
          icon: <FileTextOutlined />,
          content: renderExpensePlanDetails,
          onClose: handleCloseDetails,
        } : selectedExpenseRequest ? {
          title: selectedExpenseRequest.title || 'Expense Request Details',
          icon: <FileTextOutlined />,
          content: renderExpenseRequestDetails,
          onClose: handleCloseDetails,
        } : undefined}
      />

      {/* Print Modal */}
      <Modal
        open={printModalOpen}
        title="Print Expense Plan"
        footer={null}
        onCancel={() => {
          setPrintModalOpen(false);
          setPrintPdfUrl('');
        }}
        width="90vw"
        style={{ top: 20 }}
        destroyOnHidden={true}
        data-testid="print-plan-modal"
      >
        {printLoading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Spin size="large" />
          </div>
        ) : (
          <iframe
            src={printPdfUrl}
            style={{ width: '100%', height: 'calc(90vh - 55px)', border: 'none' }}
            title="Print Preview"
            data-testid="print-plan-iframe"
          />
        )}
      </Modal>
    </div>
  );
});

export default ExpensePlansTable;
