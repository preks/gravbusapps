import React, { useState, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ExpensePlan } from '../../../hooks/useGetExpensePlans';
import { getExpensePlanStatusDisplay } from '../../../utils';
import ExpensePlanDetails from './ExpensePlanDetails';
import { startProcess } from '@/common/utils/start-process';
import { Spin, Alert, Typography } from 'antd';
import { DataTable, ActionButton } from '@newwork/gravity-ui-catalog';
import { FileTextOutlined } from '@ant-design/icons';
import Pill from '@/components/pill/Pill';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';

const { Text } = Typography;

// Helper function to format currency values
const formatCurrency = (value: number): string => {
  if (typeof value !== 'number') {
    return '-';
  }
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export interface ExpensePlansTableProps extends BusinessAppContextProps {
  items: ExpensePlan[] | undefined;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onTableChange: (pagination: any) => void;
  search: string;
  onSearchChange: (search: string) => void;
  selectedFilters: string[];
  setFilters: (filters: string[]) => void;
  filterGroups: DataFilterGroup[];
  handleFilterChange: (filterId: string, selected: boolean) => void;
  clearFilters: () => void;
}

const ExpensePlansTable: React.FC<ExpensePlansTableProps> = (props) => {
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

  const [selectedItem, setSelectedItem] = useState<ExpensePlan | null>(null);

  const handleSelectItem = useCallback((item: ExpensePlan) => {
    setSelectedItem(item);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
  }, []);

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
        onChange={onTableChange}
        data-testid="expense-plans-data-table"
        columns={[
          {
            title: 'Plan Number',
            dataIndex: 'code',
            key: 'code',
          },
          {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
          },
          {
            title: 'Start Date',
            dataIndex: 'startDate',
            key: 'startDate',
            render: (date: string) => (date ? new Date(date).toLocaleDateString('en-GB') : '-'),
          },
          {
            title: 'End Date',
            dataIndex: 'endDate',
            key: 'endDate',
            render: (date: string) => (date ? new Date(date).toLocaleDateString('en-GB') : '-'),
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
              const statusConfig = getExpensePlanStatusDisplay(status);
              return <Pill type={statusConfig.type} label={statusConfig.label} />;
            },
          },
          {
            title: 'Reimbursable Amount',
            dataIndex: 'reimbursableAmount',
            key: 'reimbursableAmount',
            align: 'right',
            render: (amount: number, record: ExpensePlan) => {
              const currencySymbol = record.currency?.code === 'EUR' ? '€' : record.currency?.code ?? '$';
              return `${currencySymbol}${formatCurrency(amount ?? 0)}`;
            },
          },
          {
            title: 'Paid Advance',
            dataIndex: 'advancePaymentPaidAmount',
            key: 'advancePaymentPaidAmount',
            align: 'right',
            render: (amount: number, record: ExpensePlan) => {
              const currencySymbol = record.currency?.code === 'EUR' ? '€' : record.currency?.code ?? '$';
              return `${currencySymbol}${formatCurrency(amount ?? 0)}`;
            },
          },
          {
            title: '',
            key: 'actions',
            align: 'center',
            width: 60,
            render: (_: any, record: ExpensePlan) => (
              <ActionButton
                onClick={(e) => e.stopPropagation()}
                flowData={[
                  {
                    category: 'Navigations',
                    key: 'view-details',
                    label: 'View Details',
                    onClick: (e?: React.MouseEvent) => {
                      e?.stopPropagation();
                      handleSelectItem(record);
                    },
                  },
                ]}
                portalContainer={document.body}
                data-testid={`actions-${record.id}`}
                size="md"
              />
            ),
          },
        ] as any}
      />
    );
  }, [plans, isLoading, error, currentPage, pageSize, totalCount, onTableChange, handleSelectItem]);

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

  return (
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
      } : undefined}
    />
  );
};

export default ExpensePlansTable;
