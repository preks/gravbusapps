import React, { useState, ReactNode, useCallback, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Table,
  Form,
  Select,
  DatePicker,
  Input,
  Space,
  Typography,
  Alert,
  Button,
  Dropdown
} from 'antd'
import { SearchOutlined, MoreOutlined, PlusOutlined, DownOutlined } from '@ant-design/icons'
import Pill from '@/components/pill/Pill'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSalesOrderData } from '../../../hooks/useSalesOrderData'
import { SalesOrder } from '../../../types'
import SalesOrderCreationForm from '../../../../../forms/sales-order-creation-form'

const { RangePicker } = DatePicker
const { Option } = Select
const { Text } = Typography

export interface SalesOrderListTabProps extends BusinessAppContextProps {
  activeStructureId?: string
  onContentHeaderChange?: (header: ReactNode) => void
  onOrderSelect?: (orderId: string) => void
}

const SalesOrderListTab: React.FC<SalesOrderListTabProps> = ({
  accessToken,
  userInfo,
  additionalData,
  activeStructureId,
  onContentHeaderChange,
  onOrderSelect
}) => {
  // Modal state
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false)

  // Hooks
  const {
    orders,
    customers,
    salespersons,
    loading,
    error,
    pagination,
    isUsingDemoData,
    setFilters,
    setPagination,
    searchCustomers,
    searchSalespersons
  } = useSalesOrderData({ accessToken })

  // Local state
  const [form] = Form.useForm()

  // Status pill mapping
  const getStatusPillType = (status: string): 'draft' | 'completed' | 'waiting' | 'error' => {
    switch (status) {
      case 'Draft':
        return 'draft'
      case 'Released':
        return 'waiting'
      case 'Invoiced':
        return 'completed'
      case 'Cancelled':
        return 'error'
      default:
        return 'draft'
    }
  }

  // Format currency
  const formatCurrency = (value: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Table columns
  const columns: ColumnsType<SalesOrder> = [
    {
      title: 'Order No.',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      sorter: true,
      render: text => <Text strong>{text}</Text>
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      sorter: true,
      render: date => dayjs(date).format('MMM D, YYYY')
    },
    {
      title: 'Customer',
      dataIndex: ['customer', 'name'],
      key: 'customer',
      sorter: true
    },
    {
      title: 'Total Value',
      dataIndex: 'totalValue',
      key: 'totalValue',
      sorter: true,
      render: (value, record) => formatCurrency(value, record.currency)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: status => <Pill label={status} type={getStatusPillType(status)} className="gba:inline-block" />
    },
    {
      title: 'Salesperson',
      dataIndex: ['salesperson', 'name'],
      key: 'salesperson'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: 'View',
                onClick: () => handleViewOrder(record.id)
              },
              {
                key: 'edit',
                label: 'Edit',
                onClick: () => handleEditOrder(record.id)
              },
              {
                key: 'archive',
                label: 'Archive',
                onClick: () => handleArchiveOrder(record.id)
              }
            ]
          }}
          trigger={['click']}
        >
          <Button
            type="text"
            icon={<MoreOutlined />}
            data-testid={`actions-${record.id}`}
            style={{ backgroundColor: '#000000', color: '#ffffff' }}
            className="gba:hover:bg-gray-800"
          />
        </Dropdown>
      )
    }
  ]

  // Event handlers
  const handleViewOrder = (orderId: string) => {
    if (onOrderSelect) {
      onOrderSelect(orderId)
    }
  }

  const handleEditOrder = (orderId: string) => {
    console.log('Edit order:', orderId)
  }

  const handleArchiveOrder = (orderId: string) => {
    console.log('Archive order:', orderId)
  }

  const handleCreateNew = useCallback(() => {
    setIsCreationModalOpen(true)
  }, [])

  const handleCreationSuccess = (orderId: string) => {
    console.log('Sales order created successfully:', orderId)
    // Refresh the orders list
    window.location.reload()
  }

  const handleApplyFilters = () => {
    const values = form.getFieldsValue()
    setFilters({
      customer: values.customer,
      status: values.status,
      dateRange: values.dateRange
        ? [values.dateRange[0].format('YYYY-MM-DD'), values.dateRange[1].format('YYYY-MM-DD')]
        : undefined,
      salesperson: values.salesperson,
      searchTerm: values.searchTerm
    })
  }

  const handleClearFilters = () => {
    form.resetFields()
    setFilters({})
  }

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    setPagination({
      page: paginationConfig.current || 1,
      pageSize: paginationConfig.pageSize || 20
    })
  }

  // Handle row click to navigate to details
  const handleRowClick = (record: SalesOrder) => {
    if (onOrderSelect) {
      onOrderSelect(record.id)
    }
  }

  // Memoize the content header to prevent unnecessary re-renders
  const contentHeader = useMemo(
    () => (
      <div className="gba:flex gba:justify-between gba:items-center" data-testid="orders-content-header">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Text strong>Sales Orders</Text>
          <Text type="secondary">({pagination.total} total)</Text>
        </div>
        <Dropdown
          menu={{
            items: [
              {
                key: 'create-new',
                label: 'Create New Sales Order',
                onClick: handleCreateNew
              }
            ]
          }}
          trigger={['click']}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            data-testid="create-order-btn"
            style={{ backgroundColor: '#000000', borderColor: '#000000', color: '#ffffff' }}
            className="gba:hover:bg-gray-800 gba:hover:border-gray-800"
          >
            Actions <DownOutlined />
          </Button>
        </Dropdown>
      </div>
    ),
    [pagination.total, handleCreateNew]
  )

  // Set content header - use useRef to track if we need to update
  const prevHeaderRef = React.useRef<ReactNode>(null)

  React.useEffect(() => {
    if (onContentHeaderChange && prevHeaderRef.current !== contentHeader) {
      onContentHeaderChange(contentHeader)
      prevHeaderRef.current = contentHeader
    }
  }, [contentHeader, onContentHeaderChange])

  if (error) {
    return (
      <div className="gba:p-6" data-testid="error-container">
        <Alert message="Error Loading Sales Orders" description={error.message} type="error" showIcon />
      </div>
    )
  }

  return (
    <div className="gba:p-6" data-testid="sales-order-list-tab">
      {/* Filter Panel */}
      <Card className="gba:mb-6" data-testid="filter-panel">
        <Form form={form} layout="vertical" onFinish={handleApplyFilters}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Customer" name="customer">
                <Select
                  placeholder="Select customer"
                  showSearch
                  allowClear
                  onSearch={searchCustomers}
                  data-testid="customer-select"
                >
                  {customers.map(customer => (
                    <Option key={customer.id} value={customer.id}>
                      {customer.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Order Status" name="status">
                <Select placeholder="Select status" allowClear data-testid="status-select">
                  <Option value="Draft">Draft</Option>
                  <Option value="Released">Released</Option>
                  <Option value="Invoiced">Invoiced</Option>
                  <Option value="Cancelled">Cancelled</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Order Date" name="dateRange">
                <RangePicker className="gba:w-full" data-testid="date-range-picker" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Salesperson" name="salesperson">
                <Select
                  placeholder="Select salesperson"
                  showSearch
                  allowClear
                  onSearch={searchSalespersons}
                  data-testid="salesperson-select"
                >
                  {salespersons.map(person => (
                    <Option key={person.id} value={person.id}>
                      {person.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item label="Search by Order Number" name="searchTerm">
                <Input placeholder="Enter order number..." prefix={<SearchOutlined />} data-testid="search-input" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} className="gba:flex gba:items-end">
              <Space>
                <Button onClick={handleClearFilters} data-testid="clear-filters-btn">
                  Clear Filters
                </Button>
                <Button type="primary" htmlType="submit" data-testid="apply-filters-btn">
                  Apply Filters
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Orders Table */}
      <Card data-testid="orders-table-card">
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} orders`
          }}
          onChange={handleTableChange}
          onRow={record => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' },
            className: 'gba:hover:bg-gray-50'
          })}
          scroll={{ x: true }}
          data-testid="orders-table"
        />
      </Card>

      {/* Sales Order Creation Modal */}
      <SalesOrderCreationForm
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
        open={isCreationModalOpen}
        onClose={() => setIsCreationModalOpen(false)}
        onSuccess={handleCreationSuccess}
      />
    </div>
  )
}

export default SalesOrderListTab
