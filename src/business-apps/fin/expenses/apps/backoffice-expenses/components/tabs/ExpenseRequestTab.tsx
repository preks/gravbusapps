/**
 * Expense Request Management Tab Component
 * Displays a table of expense requests with filtering and view capabilities
 */

import React, { useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useExpenseRequests } from '../../hooks/useExpenseRequests';
import {
  Card,
  Table,
  Typography,
  Button,
  Space,
  Tag,
  DatePicker,
  Select,
  Tooltip,
  Alert,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { ExpenseData } from '../../types';
import ExpenseDetailDrawer from '../details/ExpenseDetailDrawer';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface ExpenseRequestTabProps extends BusinessAppContextProps {}

const ExpenseRequestTab: React.FC<ExpenseRequestTabProps> = (props) => {
  const { accessToken } = props;
  const {
    expenses,
    loading,
    error,
    departments,
    handleTableChange,
    fetchData: onRefresh, // Renaming fetchData to onRefresh for clarity if used as such
    totalItems,
    currentPage,
    pageSize,
    setFilters, // Assuming the hook provides this directly
  } = useExpenseRequests({ accessToken });

  const paginationConfig: TablePaginationConfig = {
    current: currentPage,
    pageSize: pageSize,
    total: totalItems,
  };
  // State for drawer visibility and selected expense ID
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string>('');

  // Local state for filter controls
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(undefined);

  // Handle viewing expense details
  const handleViewDetails = (id: string) => {
    setSelectedExpenseId(id);
    setDrawerVisible(true);
  };

  // Handle status filter change
  const handleStatusChange = (value: string) => {
    const statusValue = value === 'all' ? undefined : value;
    setStatusFilter(statusValue);
    setFilters(prev => ({ ...prev, status: statusValue ? { _eq: statusValue } : undefined })); // Ensure setFilters from hook works this way
  };

  // Handle department filter change
  const handleDepartmentChange = (value: string) => {
    const departmentValue = value === 'all' ? undefined : value;
    setDepartmentFilter(departmentValue);
    setFilters(prev => ({ ...prev, department: departmentValue ? { _eq: departmentValue } : undefined })); // Ensure setFilters from hook works this way
  };

  // Handle filter reset
  const resetFilters = () => {
    setStatusFilter(undefined);
    setDepartmentFilter(undefined);
    setFilters({}); // Ensure setFilters from hook works this way
  };

  // Table columns configuration
  const columns: ColumnsType<ExpenseData> = [
    {
      title: 'Request Number',
      dataIndex: 'code',
      key: 'code',
      sorter: true,
    },
    {
      title: 'Employee',
      dataIndex: 'employee',
      key: 'employee',
      sorter: true,
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
      ellipsis: {
        showTitle: false,
      },
      render: (title) => (
        <Tooltip placement="topLeft" title={title}>
          {title}
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusLower = status?.toLowerCase() ?? '';
        switch (statusLower) {
          case 'approved':
            return <Tag color="gold" icon={<CheckCircleOutlined />}>Verification Required</Tag>;
          case 'rejected':
            return <Tag color="red" icon={<CloseCircleOutlined />}>Rejected</Tag>;
          case 'created':
            return <Tag color="default">Draft</Tag>;
          case 'pending':
            return <Tag color="orange">In Approval</Tag>;
          case 'in_review':
            return <Tag color="gold">In Review</Tag>;
          case 'booked':
            return <Tag color="blue">Transfer Required</Tag>;
          case 'verified':
            return <Tag color="cyan">Booking Required</Tag>;
          case 'paid':
            return <Tag color="green" icon={<CheckCircleOutlined />}>Paid</Tag>;
          case 'payment_pending':
            return <Tag color="purple">Payment Pending</Tag>;
          case 'cancelled':
            return <Tag color="red" icon={<CloseCircleOutlined />}>Cancelled</Tag>;
          case 'draft':
            return <Tag color="default">Draft</Tag>;
          default: {
            const displayStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Unknown';
            return <Tag>{displayStatus}</Tag>;
          }
        }
      }
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      sorter: true,
    },
    {
      title: 'Total Amount',
      dataIndex: 'amount',
      key: 'amount',
      sorter: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record.id)}
          title="View Details"
          aria-label="View expense details"
        />
      ),
    },
  ];

  return (
    <>
      {/* Filters */}
      <Card className="gba:mb-6">
        <Space size="large" wrap>
          <div>
            <Text strong>Date Range: </Text>
            <RangePicker className="gba:ml-2" />
          </div>
          <div className="gba:flex gba:justify-between gba:items-center gba:mb-4 gba:flex-wrap gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Text strong>Status: </Text>
              <Select
                value={statusFilter}
                style={{ width: 150 }}
                onChange={handleStatusChange}
                placeholder="Filter by status"
                allowClear
              >
                <Option value="all">All Statuses</Option>
                <Option value="PENDING">Pending</Option>
                <Option value="APPROVED">Approved</Option>
                <Option value="REJECTED">Rejected</Option>
                <Option value="BOOKED">Booked</Option>
              </Select>
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">
              <Text strong>Department: </Text>
              <Select
                value={departmentFilter}
                style={{ width: 180 }}
                onChange={handleDepartmentChange}
                placeholder="Filter by department"
                allowClear
              >
                <Option value="all">All Departments</Option>
                {departments.map(dept => (
                  <Option key={dept} value={dept}>{dept}</Option>
                ))}
              </Select>
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">
              <Button onClick={resetFilters} icon={<ReloadOutlined />}>
                Reset Filters
              </Button>
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                className="gba:bg-green-600"
              >
                Export to Excel
              </Button>
              <Button
                onClick={onRefresh}
                icon={<ReloadOutlined />}
                loading={loading}
              >
                Refresh Data
              </Button>
            </div>
          </div>
        </Space>
      </Card>

      {/* Error message */}
      {error && (
        <div className="gba:mb-6">
          <Alert
            message="API Error"
            description={error}
            type="error"
            showIcon
          />
        </div>
      )}

      {/* Expense Requests Table */}
      <Table
        dataSource={expenses}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={paginationConfig}
        onChange={handleTableChange}
      />

      {/* Expense Detail Drawer */}
      <ExpenseDetailDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        expenseId={selectedExpenseId}
        accessToken={accessToken}
      />
    </>
  );
};

export default ExpenseRequestTab;
