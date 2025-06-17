/**
 * Expense Request Management Tab Component
 * Displays a table of expense requests with filtering and view capabilities
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useExpenseRequests } from '../../hooks/useExpenseRequests';
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
import { ExpenseData } from '../../types';
import ExpenseDetailDrawer from '../details/ExpenseDetailDrawer';
import Pill from '@/components/pill/Pill';
import { getExpenseRequestStatusDisplay } from '../../utils/utils';

const { Text } = Typography;
const { Option } = Select;

interface ExpenseRequestTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: React.ReactNode) => void;
}


const ExpenseRequestTab: React.FC<ExpenseRequestTabProps> = (props) => {
  const { accessToken, onContentHeaderChange } = props;
  
  const { 
    expenses, 
    loading, 
    error,
    departments,
    handleTableChange,
    totalItems,
    currentPage,
    pageSize,
  } = useExpenseRequests(props);

  const [searchText, setSearchText] = useState<string>('');
  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Create statistics header and pass to parent via onContentHeaderChange
  useEffect(() => {
    if (onContentHeaderChange) {
      const header = (
        <div className="gba:mb-4" data-testid="expense-request-stats-header">
          <Alert
            message={`${totalItems || 0} Total Expense Requests`}
            type="info"
            showIcon
          />
        </div>
      );
      onContentHeaderChange(header);
    }
  }, [onContentHeaderChange, totalItems]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    // Add search logic here if supported by the hook
  }, []);

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
  }, []);

  const handleViewDetails = (record: ExpenseData) => {
    setSelectedExpense(record);
    setSelectedRowKeys([record.id]);
  };

  const columns = [
    {
      title: 'Request Number',
      dataIndex: 'code',
      key: 'code',
      sortable: true,
    },
    {
      title: 'Employee',
      dataIndex: 'employeeName',
      key: 'employee',
      sortable: true,
    },
    {
      title: 'SAP Number',
      dataIndex: 'sapNumber',
      key: 'sapNumber',
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => (
        <Tooltip title={title}>
          <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const { label, type } = getExpenseRequestStatusDisplay(status);
        return (
          <Pill label={label} type={type} className="gba:text-center" />
        );
      },
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      sortable: true,
    },
    {
      title: 'Total Amount',
      dataIndex: 'amount',
      key: 'amount',
      sortable: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ExpenseData) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
          title="View Details"
          aria-label="View expense details"
        />
      ),
    },
  ] as any;

  // Render data body with DataTable
  const renderDataBody = useMemo(() => {
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
          style: { cursor: 'pointer' }
        })}
        pagination={{
          current: currentPage,
          pageSize,
          total: totalItems,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total: number) => `Total ${total} requests`
        }}
        onChange={handleTableChange}
      />
    );
  }, [
    error, expenses, columns, loading, selectedRowKeys, handleRowSelectionChange,
    handleSelectExpense, currentPage, pageSize, totalItems, handleTableChange
  ]);

  // Filter controls
  const filterControlsNode = useMemo(() => (
    <div className="gba:flex gba:flex-wrap gba:gap-4">
      <div className="gba:w-64">
        <Text strong>Status</Text>
        <Select 
          className="gba:w-full gba:mt-1"
          value={statusFilter}
          onChange={handleStatusChange}
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
        >
          <Option value="all">All Departments</Option>
          {departments.map(dept => (
            <Option key={dept} value={dept}>{dept}</Option>
          ))}
        </Select>
      </div>
    </div>
  ), [statusFilter, handleStatusChange, departmentFilter, handleDepartmentChange, departments]);

  return (
    <DataContainer
      dataControllerProps={{
        search: searchText,
        setSearch: handleSearchChange,
        placeholder: 'Search by request number, employee, title...',
        filter: [],
        setFilter: () => { /* Placeholder for DataContainer prop */ },
        listTitle: 'Expense Requests',
        listAmount: totalItems
      }}
      dataFilterProps={{
        filterGroups: [],
        children: filterControlsNode
      }}
      dataBody={renderDataBody}
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
    />
  );
};

export default ExpenseRequestTab;
