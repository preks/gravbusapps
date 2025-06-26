/**
 * Expense Requests Table Component
 * Displays a table of expense requests with filtering and view capabilities
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useExpenseRequests } from '../../../hooks/useExpenseRequests';
import {
  Button,
  Tooltip,
  Alert,
  Typography,
  Select,
} from 'antd';
import { DataTable } from '@newwork/gravity-ui-catalog';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import {
  EyeOutlined,
} from '@ant-design/icons';
import { ExpenseData } from '../../../types';
import ExpenseDetailDrawer from '../../details/ExpenseDetailDrawer';
import Pill from '@/components/pill/Pill';
import { getExpenseRequestStatusDisplay } from '../../../utils/utils';

const { Text } = Typography;
const { Option } = Select;

interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
}

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = (props) => {
  const { search, onSearchChange, accessToken } = props;
  
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(() => ({
    accessToken: props.accessToken,
  }), [props.accessToken]);
  
  // Local state management
  const [searchText, setSearchText] = useState<string>(search ?? '');
  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  
  // Get expense requests data using the hook
  const { 
    expenses, 
    loading, 
    error,
    departments,
    handleTableChange,
    totalItems,
    currentPage,
    pageSize,
  } = useExpenseRequests(contextProps);

  // Sync with parent search prop if provided
  useEffect(() => {
    if (search !== undefined && search !== searchText) {
      setSearchText(search);
    }
  }, [search, searchText]);

  // Handle search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    
    // Notify parent if callback exists
    if (onSearchChange) {
      onSearchChange(value);
    }
  }, [onSearchChange]);

  // Handle status filter change
  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    // Add filter logic here
  }, []);

  // Handle department filter change
  const handleDepartmentChange = useCallback((value: string) => {
    setDepartmentFilter(value);
    // Add filter logic here
  }, []);

  // Handle expense selection
  const handleSelectExpense = useCallback((expense: ExpenseData) => {
    setSelectedExpense(expense);
    setSelectedRowKeys([expense.id]);
  }, []);

  // Handle row selection change
  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
    
    // If a single row is selected, find and set the selected expense
    if (newSelectedRowKeys.length === 1) {
      const selectedExpenseId = newSelectedRowKeys[0];
      const expense = expenses?.find(expense => expense.id === selectedExpenseId);
      if (expense) {
        setSelectedExpense(expense);
      }
    } else {
      // If multiple or no rows selected, clear the selected expense
      setSelectedExpense(null);
    }
  }, [expenses]);

  const handleViewDetails = useCallback((record: ExpenseData) => {
    setSelectedExpense(record);
    setSelectedRowKeys([record.id]);
  }, []);

  const columns = [
    {
      title: 'Request Number',
      dataIndex: 'code',
      key: 'code',
      sortable: true,
      data_testid: 'expense-request-code',
    },
    {
      title: 'Employee',
      dataIndex: 'employee',
      key: 'employee',
      sortable: true,
      data_testid: 'expense-request-employee',
    },
    {
      title: 'SAP Number',
      dataIndex: 'sapNumber',
      key: 'sapNumber',
      data_testid: 'expense-request-sap',
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      data_testid: 'expense-request-title',
      render: (title: string) => (
        <Tooltip title={title}>
          <div className="gba:max-w-[200px] gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap">
            {title}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      data_testid: 'expense-request-status',
      render: (status: string) => {
        const { label, type } = getExpenseRequestStatusDisplay(status);
        return (
          <Pill label={label} type={type} className="gba:text-center" data-testid={`status-pill-${status?.toLowerCase()}`} />
        );
      },
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      sortable: true,
      data_testid: 'expense-request-department',
    },
    {
      title: 'Total Amount',
      dataIndex: 'amount',
      key: 'amount',
      sortable: true,
      data_testid: 'expense-request-amount',
    },
    {
      title: 'Actions',
      key: 'actions',
      data_testid: 'expense-request-actions',
      render: (_: any, record: ExpenseData) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={(e) => { e.stopPropagation(); handleViewDetails(record); }}
          title="View Details"
          aria-label="View expense details"
          data-testid={`view-expense-${record.id}`}
        />
      ),
    },
  ] as any;

  // Render data body with DataTable
  const renderDataBody = () => {
    if (error) {
      return (
        <Alert
          message="API Error"
          description={String(error)}
          type="error"
          showIcon
          data-testid="expense-request-error-alert"
        />
      );
    }

    if (!expenses || expenses.length === 0 && !loading) {
      return (
        <div className="gba:text-center gba:p-5" data-testid="expense-requests-empty">
          <Text>No expense requests found.</Text>
        </div>
      );
    }

    return (
      <DataTable
        dataSource={expenses}
        columns={columns}
        loading={loading}
        rowKey="id"
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys,
          onChange: handleRowSelectionChange,
          columnWidth: 48,
        }}
        onRow={(record: any) => ({
          onClick: () => handleSelectExpense(record as ExpenseData),
          className: 'gba:cursor-pointer',
        })}
        pagination={{
          current: currentPage,
          pageSize,
          total: totalItems,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total: number, range: [number, number]) => `${range[0]}-${range[1]} of ${total} items`,
        }}
        onChange={handleTableChange}
        data-testid="expense-requests-table"
      />
    );
  };

  // Filter controls
  const filterControlsNode = (
    <div className="gba:flex gba:flex-wrap gba:gap-4">
      <div className="gba:w-64">
        <Text strong>Status</Text>
        <Select 
          className="gba:w-full gba:mt-1"
          value={statusFilter}
          onChange={handleStatusChange}
          data-testid="status-filter-select"
        >
          <Option value="all">All Statuses</Option>
          <Option value="PENDING">Pending</Option>
          <Option value="APPROVED">Approved</Option>
          <Option value="REJECTED">Rejected</Option>
          <Option value="BOOKED">Booked</Option>
        </Select>
      </div>
      <div className="gba:w-64">
        <Text strong>Department</Text>
        <Select 
          className="gba:w-full gba:mt-1"
          value={departmentFilter}
          onChange={handleDepartmentChange}
          data-testid="department-filter-select"
        >
          <Option value="all">All Departments</Option>
          {departments.map(dept => (
            <Option key={dept} value={dept}>{dept}</Option>
          ))}
        </Select>
      </div>
    </div>
  );

  return (
    <DataContainer
      dataControllerProps={{
        search: searchText,
        setSearch: handleSearchChange,
        placeholder: 'Search by request number, employee, title...',
        filter: [],
        setFilter: () => { /* Placeholder for DataContainer prop */ },
        listTitle: 'Expense Requests',
        listAmount: totalItems,
        debounceDelay: 300,
      }}
      dataFilterProps={{
        filterGroups: [],
        children: filterControlsNode,
        onFilterChange: () => {},
      }}
      dataBody={renderDataBody()}
      contentBackground="white"
      dataDetails={selectedExpense ? {
        title: 'Expense Request Details',
        content: (
          <ExpenseDetailDrawer
            visible={true}
            onClose={() => {
              setSelectedExpense(null);
              setSelectedRowKeys([]);
            }}
            expenseId={selectedExpense.id}
            accessToken={accessToken}
          />
        ),
      } : undefined}
      onDetailsPanelClose={() => {
        setSelectedExpense(null);
        setSelectedRowKeys([]);
      }}
      data-testid="expense-requests-container"
    />
  );
};

export default ExpenseRequestsTable;
