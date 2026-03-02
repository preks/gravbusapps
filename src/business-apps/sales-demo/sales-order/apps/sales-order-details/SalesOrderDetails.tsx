import React, { useState } from 'react'
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Table,
  Descriptions,
  Alert,
  Spin,
  Space,
  Tag,
  Tabs,
  Statistic,
  Dropdown
} from 'antd'
import {
  ArrowLeftIcon,
  ShoppingCartIcon,
  UserIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  EyeIcon,
  GearIcon,
  DotsThreeIcon,
  CaretDownIcon,
  PlusIcon,
  ChatCircleIcon
} from '@phosphor-icons/react'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
// ActionButton not available, using Ant Design Dropdown instead

import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import { useSalesOrderDetails } from './hooks/useSalesOrderDetails'
import { SalesOrderItem } from './types'
import Pill from '../../../../../components/pill/Pill'
import StatusChangeModal from './components/StatusChangeModal'
import LineItemDetailDrawer from './components/LineItemDetailDrawer'

// Extend dayjs with plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

const { Title, Text } = Typography

interface SalesOrderDetailsProps extends BusinessAppContextProps {
  orderId: string
  onBack?: () => void
}

const SalesOrderDetails: React.FC<SalesOrderDetailsProps> = ({ accessToken, orderId, onBack }) => {
  // State
  const [activeTab, setActiveTab] = useState('overview')
  const [isLineItemDrawerVisible, setIsLineItemDrawerVisible] = useState(false)
  const [selectedLineItem, setSelectedLineItem] = useState<SalesOrderItem | null>(null)
  const [isStatusChangeModalVisible, setIsStatusChangeModalVisible] = useState(false)
  const [isLineItemStatusChangeModalVisible, setIsLineItemStatusChangeModalVisible] = useState(false)
  const [selectedLineItemForStatus, setSelectedLineItemForStatus] = useState<SalesOrderItem | null>(null)

  // Hooks
  const { order, loading, error, isUsingDemoData, refreshData } = useSalesOrderDetails({
    accessToken,
    orderId
  })

  // Actions dropdown configuration
  const actionItems = [
    { key: 'edit', label: 'Edit Sales Order' },
    { key: 'change-status', label: 'Change Status' },
    { key: 'send-out', label: 'Send to Csutomer' },
    { key: 'approve', label: 'Approve' },
    { key: 'reject', label: 'Reject' },
    { key: 'convert-invoice', label: 'Convert to Invoice' }
  ]

  // Helper functions
  const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const getStatusPillType = (status: string): 'completed' | 'draft' | 'error' | 'waiting' => {
    switch (status?.toUpperCase()) {
      case 'RELEASED':
        return 'completed'
      case 'DRAFT':
        return 'draft'
      case 'CANCELLED':
        return 'error'
      case 'INVOICED':
        return 'waiting'
      default:
        return 'waiting'
    }
  }

  // Helper function to determine if a line item is a comment
  const isCommentLineItem = (record: SalesOrderItem) => {
    // Debug logging to see what data we're getting
    console.log('🔍 Checking line item:', {
      lineNumber: record.lineItemNumber,
      type: record.type,
      commentShort: record.commentShort,
      commentLong: record.commentLong,
      taxAmount: record.taxAmount,
      description: record.description,
      id: record.id
    })

    // Check if it's explicitly marked as comment type
    if (record.type === 'comment') {
      console.log('✅ Line', record.lineItemNumber, 'is COMMENT type')
      return true
    }

    // Check if it has comment fields populated
    if (record.commentShort || record.commentLong) {
      console.log('✅ Line', record.lineItemNumber, 'has comment fields')
      return true
    }

    // Check if it has taxAmount = 0 AND has comment-like characteristics
    if (record.taxAmount === 0 && (record.commentShort || record.commentLong)) {
      console.log('✅ Line', record.lineItemNumber, 'has zero tax and comment fields')
      return true
    }

    console.log('❌ Line', record.lineItemNumber, 'is NOT a comment')
    return false
  }

  // Helper function to render comment content with proper typography hierarchy
  const renderCommentContent = (record: SalesOrderItem) => {
    const { commentShort, commentLong, description } = record

    // Priority 1: Use commentShort and commentLong if available
    if (commentShort && commentLong) {
      return (
        <div style={{ lineHeight: '1.6' }}>
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#1f2937',
              marginBottom: '8px'
            }}
          >
            {commentShort}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#4b5563',
              whiteSpace: 'pre-wrap'
            }}
          >
            {commentLong.split('\n').map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        </div>
      )
    }

    // Priority 2: Use commentShort only
    if (commentShort) {
      return (
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '14px',
            color: '#1f2937'
          }}
        >
          {commentShort}
        </div>
      )
    }

    // Priority 3: Use commentLong only
    if (commentLong) {
      return (
        <div
          style={{
            fontSize: '13px',
            color: '#4b5563',
            whiteSpace: 'pre-wrap'
          }}
        >
          {commentLong.split('\n').map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )
    }

    // Priority 4: Fall back to description for legacy comment items
    if (description) {
      return (
        <div
          style={{
            fontSize: '13px',
            color: '#6b7280',
            fontStyle: 'italic'
          }}
        >
          {description}
        </div>
      )
    }

    // Default fallback
    return (
      <div
        style={{
          fontSize: '13px',
          color: '#9ca3af',
          fontStyle: 'italic'
        }}
      >
        Comment line item
      </div>
    )
  }

  // Table columns for line items
  const itemColumns: ColumnsType<SalesOrderItem> = [
    {
      title: 'Line #',
      dataIndex: 'lineItemNumber',
      key: 'lineItemNumber',
      width: 80,
      render: (text, record) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          {isCommentLineItem(record) && <ChatCircleIcon size={16} className="gba:text-blue-500" />}
          <Text strong>{text}</Text>
        </div>
      )
    },
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => {
        if (isCommentLineItem(record)) {
          // Comment rows use custom rendering, return null to hide this cell
          return null
        }

        // For product items, show the actual product name
        const productName = record.product?.name || record.description || 'N/A'
        const productCode = record.product?.code

        return (
          <div>
            <Text strong>{productName}</Text>
            {productCode && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {productCode}
                </Text>
              </div>
            )}
          </div>
        )
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text, record) => {
        if (isCommentLineItem(record)) {
          // Comment rows use custom rendering, return null to hide this cell
          return null
        }
        return text
      }
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (quantity, record) => {
        if (isCommentLineItem(record)) {
          return null // Comment rows use custom rendering
        }
        return quantity?.toLocaleString()
      }
    },
    {
      title: 'Unit Price',
      dataIndex: 'pricePerUnit',
      key: 'pricePerUnit',
      width: 120,
      align: 'right',
      render: (price, record) => {
        if (isCommentLineItem(record)) {
          return null // Comment rows use custom rendering
        }
        return formatCurrency(price || record.unitPrice || 0, order?.currency)
      }
    },
    {
      title: 'Tax Amount',
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      width: 120,
      align: 'right',
      render: (taxAmount, record) => {
        if (isCommentLineItem(record)) {
          return null // Comment rows use custom rendering
        }
        return formatCurrency(taxAmount || 0, order?.currency)
      }
    },
    {
      title: 'Extended Amount',
      dataIndex: 'extendedAmount',
      key: 'extendedAmount',
      width: 140,
      align: 'right',
      render: (amount, record) => {
        if (isCommentLineItem(record)) {
          return null // Comment rows use custom rendering
        }
        return <Text strong>{formatCurrency(amount, order?.currency)}</Text>
      }
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) => {
        if (isCommentLineItem(record)) {
          return null // Comment rows use custom rendering
        }
        if (record.quantityCancelled && record.quantityCancelled > 0) {
          return <Tag color="red">Cancelled</Tag>
        }
        if (record.quantityShipped && record.quantityShipped >= record.quantity) {
          return <Tag color="green">Shipped</Tag>
        }
        if (record.quantityShipped && record.quantityShipped > 0) {
          return <Tag color="orange">Partial</Tag>
        }
        return <Tag color="blue">New</Tag>
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => {
        if (isCommentLineItem(record)) {
          return null // Comment rows use custom rendering
        }
        return (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'details',
                  label: 'Details',
                  onClick: () => handleLineItemAction('details', record)
                },
                {
                  key: 'change-status',
                  label: 'Change Status',
                  onClick: () => handleLineItemAction('change-status', record)
                },
                {
                  key: 'edit',
                  label: 'Edit',
                  onClick: () => handleLineItemAction('edit', record)
                },
                {
                  key: 'remove',
                  label: 'Remove',
                  onClick: () => handleLineItemAction('remove', record)
                },
                {
                  key: 'duplicate',
                  label: 'Duplicate',
                  onClick: () => handleLineItemAction('duplicate', record)
                }
              ]
            }}
            trigger={['click']}
          >
            <Button
              type="text"
              icon={<DotsThreeIcon size={16} />}
              data-testid={`line-item-actions-${record.id}`}
              style={{
                backgroundColor: '#f5f5f5',
                color: '#595959',
                border: '1px solid #d9d9d9'
              }}
              className="gba:hover:bg-gray-200 gba:hover:border-gray-400 gba:hover:text-gray-700"
            />
          </Dropdown>
        )
      }
    }
  ]

  // Handle back navigation
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      // Default back behavior - could navigate to overview
      window.history.back()
    }
  }

  // Handle action selection
  const handleActionSelect = ({ key }: { key: string }) => {
    console.log('Action selected:', key)
    switch (key) {
      case 'change-status':
        setIsStatusChangeModalVisible(true)
        break
      default:
        // TODO: Implement other action handlers
        break
    }
  }

  // Handle tab change
  const handleTabChange = (key: string) => {
    setActiveTab(key)
    // TODO: Consider updating URL query parameter
  }

  // Handle line item actions
  const handleLineItemAction = (action: string, lineItem: SalesOrderItem) => {
    switch (action) {
      case 'details':
        setSelectedLineItem(lineItem)
        setIsLineItemDrawerVisible(true)
        break
      case 'edit':
        console.log('Edit line item:', lineItem.id)
        // TODO: Implement edit functionality
        break
      case 'change-status':
        setSelectedLineItemForStatus(lineItem)
        setIsLineItemStatusChangeModalVisible(true)
        break
      case 'remove':
        console.log('Remove line item:', lineItem.id)
        // TODO: Implement remove functionality
        break
      case 'duplicate':
        console.log('Duplicate line item:', lineItem.id)
        // TODO: Implement duplicate functionality
        break
      default:
        break
    }
  }

  // Handle drawer close
  const handleLineItemDrawerClose = () => {
    setIsLineItemDrawerVisible(false)
    setSelectedLineItem(null)
  }

  // Handle status change modal close
  const handleStatusChangeModalClose = () => {
    setIsStatusChangeModalVisible(false)
  }

  // Handle status change success
  const handleStatusChangeSuccess = () => {
    refreshData() // Refresh the order data to show updated status
  }

  // Handle line item status change modal close
  const handleLineItemStatusChangeModalClose = () => {
    setIsLineItemStatusChangeModalVisible(false)
    setSelectedLineItemForStatus(null)
  }

  // Handle line item status change success
  const handleLineItemStatusChangeSuccess = () => {
    refreshData() // Refresh the order data to show updated line item status
  }

  // Handle line item drawer actions
  const handleLineItemDrawerAction = ({ key }: { key: string }) => {
    console.log('Line item drawer action selected:', key)
    // TODO: Implement drawer action handlers
    switch (key) {
      case 'go-to-product':
        console.log('Navigate to product details')
        break
      case 'go-to-pricing':
        console.log('Navigate to pricing details')
        break
      case 'check-stock':
        console.log('Check stock information')
        break
      default:
        break
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-screen" data-testid="loading-spinner">
        <Spin size="large" tip="Loading sales order details..." />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="gba:p-6" data-testid="error-container">
        <Alert
          message="Error Loading Sales Order"
          description={error.message}
          type="error"
          showIcon
          action={
            <Space>
              <Button size="small" onClick={refreshData}>
                Retry
              </Button>
              <Button size="small" onClick={handleBack}>
                Go Back
              </Button>
            </Space>
          }
        />
      </div>
    )
  }

  // No order found
  if (!order) {
    return (
      <div className="gba:p-6" data-testid="no-order-container">
        <Alert
          message="Sales Order Not Found"
          description="The requested sales order could not be found."
          type="warning"
          showIcon
          action={
            <Button size="small" onClick={handleBack}>
              Go Back
            </Button>
          }
        />
      </div>
    )
  }

  // Debug logging for order data
  console.log('📊 Order data loaded:', {
    orderNumber: order?.orderNumber,
    itemsCount: order?.items?.length,
    items: order?.items?.map(item => ({
      lineNumber: item.lineItemNumber,
      type: item.type,
      commentShort: item.commentShort,
      commentLong: item.commentLong,
      taxAmount: item.taxAmount,
      description: item.description
    }))
  })

  return (
    <div className="gba:p-6 gba:bg-gray-50 gba:min-h-screen" data-testid="sales-order-details">
      {/* Add CSS styles for comment rows */}
      <style>{`
        .comment-row-style {
          background-color: #f8fafc !important;
          border-left: 4px solid #3b82f6 !important;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
        }
        .comment-row-style:hover {
          background-color: #f1f5f9 !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        }
        .comment-row-style .ant-table-cell {
          border-bottom: 1px solid #e2e8f0 !important;
        }
      `}</style>

      {/* Back Navigation with Actions */}
      <div className="gba:mb-6 gba:flex gba:justify-between gba:items-center" data-testid="back-navigation">
        <Button
          type="text"
          icon={<ArrowLeftIcon size={16} />}
          onClick={handleBack}
          className="gba:flex gba:items-center gba:p-0 gba:h-auto"
          data-testid="back-button"
        >
          <span className="gba:ml-2">Back to Sales Orders</span>
        </Button>

        <Dropdown
          menu={{
            items: actionItems,
            onClick: handleActionSelect
          }}
          trigger={['click']}
        >
          <Button
            type="primary"
            icon={<PlusIcon size={16} />}
            data-testid="actions-dropdown"
            style={{ backgroundColor: '#000000', borderColor: '#000000', color: '#ffffff' }}
            className="gba:hover:bg-gray-800 gba:hover:border-gray-800"
          >
            Actions <CaretDownIcon size={16} />
          </Button>
        </Dropdown>
      </div>

      {/* Tabbed Interface */}
      <Card className="gba:mb-6" data-testid="details-tabs-card">
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: 'overview',
              label: (
                <Space>
                  <EyeIcon size={16} />
                  <span>Overview</span>
                </Space>
              ),
              children: (
                <div data-testid="overview-tab">
                  {/* KPI Cards Grid */}
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={8} lg={4}>
                      <Card
                        className={`gba:text-center gba:h-full ${isUsingDemoData ? 'gba:border-blue-300 gba:bg-blue-50' : ''}`}
                        data-testid="order-number-kpi"
                      >
                        <Statistic
                          title={
                            <Space>
                              <span>Order Number</span>
                              {isUsingDemoData && (
                                <Tag color="blue" size="small">
                                  DEMO
                                </Tag>
                              )}
                            </Space>
                          }
                          value={order.orderNumber}
                          valueStyle={{ fontSize: '16px', fontWeight: 'bold' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={4}>
                      <Card className="gba:text-center gba:h-full" data-testid="status-kpi">
                        <Statistic
                          title="Status"
                          value=""
                          formatter={() => (
                            <Pill
                              label={order.status}
                              type={getStatusPillType(order.status)}
                              className="gba:inline-block"
                            />
                          )}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={4}>
                      <Card className="gba:text-center gba:h-full" data-testid="total-amount-kpi">
                        <Statistic
                          title="Total Amount"
                          value={order.totalAmount}
                          formatter={value => formatCurrency(Number(value), order.currency)}
                          valueStyle={{ color: '#1890ff', fontSize: '24px', fontWeight: 'bold' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={4}>
                      <Card className="gba:text-center gba:h-full" data-testid="customer-kpi">
                        <Statistic title="Customer" value={order.customer.name} valueStyle={{ fontSize: '16px' }} />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={4}>
                      <Card className="gba:text-center gba:h-full" data-testid="salesperson-kpi">
                        <Statistic
                          title="Salesperson"
                          value={order.salesperson.name || 'N/A'}
                          valueStyle={{ fontSize: '16px' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={4}>
                      <Card className="gba:text-center gba:h-full" data-testid="order-date-kpi">
                        <Statistic
                          title="Order Date"
                          value={order.orderDate ? dayjs(order.orderDate).format('MMM D, YYYY') : 'N/A'}
                          valueStyle={{ fontSize: '16px' }}
                        />
                      </Card>
                    </Col>
                  </Row>
                </div>
              )
            },
            {
              key: 'order-info',
              label: (
                <Space>
                  <ShoppingCartIcon size={16} />
                  <span>Order Information</span>
                </Space>
              ),
              children: (
                <div data-testid="order-info-tab">
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="Order Number">
                      <Text strong>{order.orderNumber}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Pill label={order.status} type={getStatusPillType(order.status)} className="gba:inline-block" />
                    </Descriptions.Item>
                    <Descriptions.Item label="Order Date">
                      {order.orderDate ? dayjs(order.orderDate).format('MMM D, YYYY') : 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Requested Shipping Date">
                      {order.requestedShippingDate ? dayjs(order.requestedShippingDate).format('MMM D, YYYY') : 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Requested Receipt Date">
                      {order.requestedReceiptDate ? dayjs(order.requestedReceiptDate).format('MMM D, YYYY') : 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Total Amount">
                      <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                        {formatCurrency(order.totalAmount, order.currency)}
                      </Text>
                    </Descriptions.Item>

                    {/* Financial Breakdown */}
                    {order.totalTaxAmount && (
                      <Descriptions.Item label="Tax Amount">
                        <Text>{formatCurrency(order.totalTaxAmount, order.currency)}</Text>
                      </Descriptions.Item>
                    )}
                    {order.totalDiscountAmount && (
                      <Descriptions.Item label="Discount Amount">
                        <Text style={{ color: '#52c41a' }}>
                          -{formatCurrency(order.totalDiscountAmount, order.currency)}
                        </Text>
                      </Descriptions.Item>
                    )}
                    {order.totalChargesAmount && (
                      <Descriptions.Item label="Charges Amount">
                        <Text>{formatCurrency(order.totalChargesAmount, order.currency)}</Text>
                      </Descriptions.Item>
                    )}

                    <Descriptions.Item label="Salesperson">
                      <Space>
                        <UserIcon size={16} />
                        <Text>{order.salesperson.name || 'N/A'}</Text>
                      </Space>
                    </Descriptions.Item>

                    {/* Payment and Delivery Information */}
                    {order.paymentTermsName && (
                      <Descriptions.Item label="Payment Terms">
                        <Text>{order.paymentTermsName}</Text>
                      </Descriptions.Item>
                    )}

                    {order.deliveryModeCode && (
                      <Descriptions.Item label="Delivery Mode">
                        <Text>{order.deliveryModeCode}</Text>
                      </Descriptions.Item>
                    )}

                    {order.deliveryTermsCode && (
                      <Descriptions.Item label="Delivery Terms">
                        <Text>{order.deliveryTermsCode}</Text>
                      </Descriptions.Item>
                    )}

                    {order.quotationNumber && (
                      <Descriptions.Item label="Quotation Number">
                        <Text>{order.quotationNumber}</Text>
                      </Descriptions.Item>
                    )}

                    {order.owner && (
                      <Descriptions.Item label="Owner">
                        <Space>
                          <UserIcon size={16} />
                          <Text>
                            {order.owner.fullName ||
                              `${order.owner.firstName || ''} ${order.owner.lastName || ''}`.trim() ||
                              'N/A'}
                          </Text>
                        </Space>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </div>
              )
            },
            {
              key: 'customer-info',
              label: (
                <Space>
                  <UserIcon size={16} />
                  <span>Customer Information</span>
                </Space>
              ),
              children: (
                <div data-testid="customer-info-tab">
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="Customer Name">
                      <Text strong>{order.customer.name}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Contact Person">{order.customer.contactName || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Email">
                      {order.customer.email ? (
                        <Space>
                          <EnvelopeIcon size={16} />
                          <Text>{order.customer.email}</Text>
                        </Space>
                      ) : (
                        'N/A'
                      )}
                    </Descriptions.Item>

                    {/* Additional Contact Details */}
                    {order.contact?.jobTitle && (
                      <Descriptions.Item label="Job Title">
                        <Text>{order.contact.jobTitle}</Text>
                      </Descriptions.Item>
                    )}
                    {order.contact?.phone && (
                      <Descriptions.Item label="Phone">
                        <Space>
                          <PhoneIcon size={16} />
                          <Text>{order.contact.phone}</Text>
                        </Space>
                      </Descriptions.Item>
                    )}

                    {/* Billing Address */}
                    {order.customer.billingAddress && (
                      <Descriptions.Item label="Billing Address" span={2}>
                        <Space direction="vertical" size={0}>
                          {order.customer.billingAddress.line1 && <Text>{order.customer.billingAddress.line1}</Text>}
                          {order.customer.billingAddress.line2 && <Text>{order.customer.billingAddress.line2}</Text>}
                          <Text>
                            {[
                              order.customer.billingAddress.city,
                              order.customer.billingAddress.stateOrProvince,
                              order.customer.billingAddress.postalCode
                            ]
                              .filter(Boolean)
                              .join(', ')}
                          </Text>
                          {order.customer.billingAddress.country && (
                            <Text>{order.customer.billingAddress.country}</Text>
                          )}
                        </Space>
                      </Descriptions.Item>
                    )}

                    {/* Delivery Address Information */}
                    {order.deliveryAddressStreet && (
                      <Descriptions.Item label="Delivery Address">
                        <Space>
                          <EnvironmentOutlined />
                          <Text>{order.deliveryAddressStreet}</Text>
                        </Space>
                      </Descriptions.Item>
                    )}
                    {order.invoiceAddressStreet && (
                      <Descriptions.Item label="Invoice Address">
                        <Space>
                          <EnvironmentOutlined />
                          <Text>{order.invoiceAddressStreet}</Text>
                        </Space>
                      </Descriptions.Item>
                    )}
                    {order.isDeliveryAddressOrderSpecific !== undefined && (
                      <Descriptions.Item label="Order-Specific Delivery">
                        <Text>{order.isDeliveryAddressOrderSpecific ? 'Yes' : 'No'}</Text>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </div>
              )
            },
            {
              key: 'metadata',
              label: (
                <Space>
                  <GearIcon size={16} />
                  <span>Order Metadata</span>
                </Space>
              ),
              children: (
                <div data-testid="metadata-tab">
                  <Row gutter={[24, 16]}>
                    <Col xs={24} md={12}>
                      <Descriptions column={1} size="small" title="System Information">
                        <Descriptions.Item label="Created At">
                          {order.createdAt ? dayjs(order.createdAt).format('MMM D, YYYY HH:mm') : 'N/A'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Updated At">
                          {order.updatedAt ? dayjs(order.updatedAt).format('MMM D, YYYY HH:mm') : 'N/A'}
                        </Descriptions.Item>
                        {order.updatedBy && (
                          <Descriptions.Item label="Updated By">
                            <Text>{order.updatedBy.name}</Text>
                          </Descriptions.Item>
                        )}
                        {order.version !== undefined && (
                          <Descriptions.Item label="Version">
                            <Text>{order.version}</Text>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </Col>
                    <Col xs={24} md={12}>
                      <Descriptions column={1} size="small" title="Status Information">
                        {order.recordState && (
                          <Descriptions.Item label="Record State">
                            <Pill
                              label={order.recordState}
                              type={order.recordState === 'ACTIVE' ? 'completed' : 'waiting'}
                              className="gba:inline-block"
                            />
                          </Descriptions.Item>
                        )}
                        {order.processingStatus && (
                          <Descriptions.Item label="Processing Status">
                            <Text>{order.processingStatus}</Text>
                          </Descriptions.Item>
                        )}
                        {order.areTotalsUpdated !== undefined && (
                          <Descriptions.Item label="Totals Updated">
                            <Text>{order.areTotalsUpdated ? 'Yes' : 'No'}</Text>
                          </Descriptions.Item>
                        )}
                        {order.processInstanceId && (
                          <Descriptions.Item label="Process Instance">
                            <Text style={{ fontFamily: 'monospace', fontSize: '12px' }}>{order.processInstanceId}</Text>
                          </Descriptions.Item>
                        )}
                        {order.url && (
                          <Descriptions.Item label="URL">
                            <a href={order.url} target="_blank" rel="noopener noreferrer">
                              <Text>{order.url}</Text>
                            </a>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </Col>
                  </Row>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Line Items Section */}
      <Card
        title={
          <Space>
            <ShoppingCartIcon size={16} />
            <span>Line Items ({order.items.length})</span>
          </Space>
        }
        data-testid="line-items-card"
      >
        <Table
          columns={itemColumns}
          dataSource={order.items}
          rowKey="id"
          pagination={false}
          scroll={{ x: true }}
          components={{
            body: {
              row: ({ children, ...props }: any) => {
                const record = order.items.find(item => props['data-row-key'] === item.id)

                if (record && isCommentLineItem(record)) {
                  // Full-width comment row design
                  return (
                    <tr {...props} className="comment-row-style" data-testid={`comment-row-${record.id}`}>
                      {/* Line # column */}
                      <td
                        className="ant-table-cell"
                        style={{
                          padding: '16px 12px',
                          verticalAlign: 'top',
                          borderRight: '1px solid #f0f0f0'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <ChatCircleIcon
                            size={16}
                            style={{
                              color: '#3b82f6'
                            }}
                          />
                          <Text strong style={{ color: '#1f2937' }}>
                            {record.lineItemNumber}
                          </Text>
                        </div>
                      </td>

                      {/* Full-width comment content spanning all middle columns */}
                      <td
                        colSpan={7}
                        className="ant-table-cell"
                        style={{
                          padding: '16px 20px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px'
                        }}
                      >
                        <div
                          style={{
                            fontStyle: 'italic',
                            lineHeight: '1.6'
                          }}
                        >
                          {renderCommentContent(record)}
                        </div>
                      </td>

                      {/* Actions column */}
                      <td
                        className="ant-table-cell"
                        style={{
                          padding: '16px 12px',
                          verticalAlign: 'top',
                          borderLeft: '1px solid #f0f0f0'
                        }}
                      >
                        <Dropdown
                          menu={{
                            items: [
                              {
                                key: 'details',
                                label: 'Details',
                                onClick: () => handleLineItemAction('details', record)
                              },
                              {
                                key: 'edit',
                                label: 'Edit',
                                onClick: () => handleLineItemAction('edit', record)
                              },
                              {
                                key: 'remove',
                                label: 'Remove',
                                onClick: () => handleLineItemAction('remove', record)
                              },
                              {
                                key: 'duplicate',
                                label: 'Duplicate',
                                onClick: () => handleLineItemAction('duplicate', record)
                              }
                            ]
                          }}
                          trigger={['click']}
                        >
                          <Button
                            type="text"
                            icon={<DotsThreeIcon size={16} />}
                            data-testid={`line-item-actions-${record.id}`}
                            style={{
                              backgroundColor: '#f5f5f5',
                              color: '#595959',
                              border: '1px solid #d9d9d9'
                            }}
                            className="gba:hover:bg-gray-200 gba:hover:border-gray-400 gba:hover:text-gray-700"
                          />
                        </Dropdown>
                      </td>
                    </tr>
                  )
                }

                // Regular product rows use default rendering
                return (
                  <tr {...props} data-testid={`product-row-${record?.id}`}>
                    {children}
                  </tr>
                )
              }
            }
          }}
          summary={pageData => {
            const totalAmount = pageData
              .filter(item => !isCommentLineItem(item))
              .reduce((sum, item) => sum + (item.extendedAmount || 0), 0)
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6}>
                  <Text strong>Total</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Text strong style={{ fontSize: '16px' }}>
                    {formatCurrency(totalAmount, order.currency)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} />
              </Table.Summary.Row>
            )
          }}
          data-testid="line-items-table"
        />
      </Card>

      {/* Line Item Details Drawer */}
      <LineItemDetailDrawer
        visible={isLineItemDrawerVisible}
        lineItem={selectedLineItem}
        onClose={handleLineItemDrawerClose}
        onAction={handleLineItemDrawerAction}
        orderCurrency={order?.currency}
      />

      {/* Status Change Modal */}
      {order && (
        <StatusChangeModal
          visible={isStatusChangeModalVisible}
          type="order"
          currentStatus={order.status}
          orderId={orderId}
          accessToken={accessToken}
          onCancel={handleStatusChangeModalClose}
          onSuccess={handleStatusChangeSuccess}
        />
      )}

      {/* Line Item Status Change Modal */}
      {selectedLineItemForStatus && (
        <StatusChangeModal
          visible={isLineItemStatusChangeModalVisible}
          type="lineItem"
          currentStatus={selectedLineItemForStatus.status || 'NEW'} // Default to NEW if no status
          orderId={orderId}
          lineItemId={selectedLineItemForStatus.id}
          accessToken={accessToken}
          onCancel={handleLineItemStatusChangeModalClose}
          onSuccess={handleLineItemStatusChangeSuccess}
        />
      )}
    </div>
  )
}

export default SalesOrderDetails
