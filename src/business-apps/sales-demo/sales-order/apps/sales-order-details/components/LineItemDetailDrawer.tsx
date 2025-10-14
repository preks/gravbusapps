/**
 * Line Item Detail Drawer Component
 *
 * Displays detailed information about a selected sales order line item in a side drawer.
 * Includes product information, inventory, pricing, shipping, and system details.
 */

import React from 'react'
import { Drawer, Typography, Descriptions, Divider, Empty, Dropdown, Button } from 'antd'
import {
  ShoppingCartOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  DownOutlined,
  EnvironmentOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { SalesOrderItem } from '../types'

const { Title, Text } = Typography

interface LineItemDetailDrawerProps {
  visible: boolean
  lineItem: SalesOrderItem | null
  onClose: () => void
  onAction?: (action: { key: string }) => void
  orderCurrency?: string
}

const LineItemDetailDrawer: React.FC<LineItemDetailDrawerProps> = ({
  visible,
  lineItem,
  onClose,
  onAction,
  orderCurrency = 'EUR'
}) => {
  // Format currency amount
  const formatCurrency = (amount: number, currencyCode: string = orderCurrency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return dayjs(dateString).format('MMM D, YYYY HH:mm')
  }

  // Actions dropdown items
  const actionItems = [
    {
      key: 'go-to-product',
      label: 'Go To Product'
    },
    {
      key: 'go-to-pricing',
      label: 'Go To Pricing'
    },
    {
      key: 'check-stock',
      label: 'Check Stock'
    }
  ]

  // Drawer title with actions
  const drawerTitle = (
    <div className="gba:flex gba:justify-between gba:items-center gba:w-full" data-testid="drawer-header">
      <span>{lineItem ? `Line Item #${lineItem.lineItemNumber} Details` : 'Line Item Details'}</span>
      <Dropdown
        menu={{
          items: actionItems,
          onClick: onAction
        }}
        trigger={['click']}
      >
        <Button
          type="primary"
          size="small"
          data-testid="drawer-actions-dropdown"
          style={{ backgroundColor: '#000000', borderColor: '#000000', color: '#ffffff' }}
          className="gba:hover:bg-gray-800 gba:hover:border-gray-800"
        >
          Actions <DownOutlined />
        </Button>
      </Dropdown>
    </div>
  )

  // Helper function to render the main content
  const renderContent = () => {
    if (!lineItem) {
      return <Empty description="No line item details available" />
    }

    return (
      <div className="gba:space-y-4">
        {/* Product Information */}
        <div data-testid="product-info-section">
          <Title level={5} className="gba:mb-3 gba:flex gba:items-center gba:gap-2">
            <ShoppingCartOutlined />
            Product Information
          </Title>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Product Number">
              <Text strong>{lineItem.product?.code || 'N/A'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Product Name">
              <Text strong>{lineItem.product?.name || 'N/A'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Description">
              <Text>{lineItem.description || 'N/A'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Product Type Code">{lineItem.productTypeCode || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="State Code">{lineItem.salesOrderStateCode || 'N/A'}</Descriptions.Item>
          </Descriptions>
        </div>

        <Divider />

        {/* Inventory & Stock */}
        <div data-testid="inventory-section">
          <Title level={5} className="gba:mb-3 gba:flex gba:items-center gba:gap-2">
            <InfoCircleOutlined />
            Inventory & Stock
          </Title>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Quantity">
              <Text strong>{lineItem.quantity?.toLocaleString() || 'N/A'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Quantity Shipped">
              {lineItem.quantityShipped?.toLocaleString() || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Quantity Backordered">
              {lineItem.quantityBackordered?.toLocaleString() || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Quantity Cancelled">
              {lineItem.quantityCancelled?.toLocaleString() || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Is Price Overridden">
              {lineItem.isPriceOverridden !== undefined ? (lineItem.isPriceOverridden ? 'Yes' : 'No') : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Is Product Overridden">
              {lineItem.isProductOverridden !== undefined ? (lineItem.isProductOverridden ? 'Yes' : 'No') : 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Divider />

        {/* Pricing & Costs */}
        <div data-testid="pricing-section">
          <Title level={5} className="gba:mb-3 gba:flex gba:items-center gba:gap-2">
            <DollarOutlined />
            Pricing & Costs
          </Title>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Unit Price">
              <Text strong>
                {formatCurrency(
                  lineItem.pricePerUnit || lineItem.unitPrice || 0,
                  lineItem.currencyCode || orderCurrency
                )}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Base Amount">
              {formatCurrency(lineItem.baseAmount || 0, lineItem.currencyCode || orderCurrency)}
            </Descriptions.Item>
            <Descriptions.Item label="Extended Amount">
              <Text strong style={{ color: '#1890ff' }}>
                {formatCurrency(lineItem.extendedAmount || 0, lineItem.currencyCode || orderCurrency)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Manual Discount">
              {lineItem.manualDiscountAmount
                ? formatCurrency(lineItem.manualDiscountAmount, lineItem.currencyCode || orderCurrency)
                : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Tax Amount">
              {lineItem.taxAmount ? formatCurrency(lineItem.taxAmount, lineItem.currencyCode || orderCurrency) : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Currency">{lineItem.currencyCode || orderCurrency || 'N/A'}</Descriptions.Item>
          </Descriptions>
        </div>

        <Divider />

        {/* Shipping Information */}
        {lineItem.shipToAddress && (
          <>
            <div data-testid="shipping-section">
              <Title level={5} className="gba:mb-3 gba:flex gba:items-center gba:gap-2">
                <EnvironmentOutlined />
                Shipping Information
              </Title>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Ship To Name">{lineItem.shipToAddress.name || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Contact Name">
                  {lineItem.shipToAddress.contactName || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Address">
                  <div>
                    {lineItem.shipToAddress.line1 && <div>{lineItem.shipToAddress.line1}</div>}
                    {lineItem.shipToAddress.line2 && <div>{lineItem.shipToAddress.line2}</div>}
                    {lineItem.shipToAddress.line3 && <div>{lineItem.shipToAddress.line3}</div>}
                    <div>
                      {[
                        lineItem.shipToAddress.city,
                        lineItem.shipToAddress.stateOrProvince,
                        lineItem.shipToAddress.postalCode
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                    {lineItem.shipToAddress.country && <div>{lineItem.shipToAddress.country}</div>}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Telephone">{lineItem.shipToAddress.telephone || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Freight Terms">
                  {lineItem.shipToAddress.freightTermsCode || 'N/A'}
                </Descriptions.Item>
              </Descriptions>
            </div>
            <Divider />
          </>
        )}

        {/* System Information */}
        <div data-testid="system-info-section">
          <Title level={5} className="gba:mb-3 gba:flex gba:items-center gba:gap-2">
            <SettingOutlined />
            System Information
          </Title>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Line Item ID">
              <Text style={{ fontFamily: 'monospace', fontSize: '12px' }}>{lineItem.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Sequence Number">{lineItem.sequenceNumber || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Created At">{formatDate(lineItem.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Updated At">{formatDate(lineItem.updatedAt)}</Descriptions.Item>
            <Descriptions.Item label="Version">{lineItem.version || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Is Deleted">
              {lineItem.isDeleted !== undefined ? (lineItem.isDeleted ? 'Yes' : 'No') : 'N/A'}
            </Descriptions.Item>
            {lineItem.processInstanceId && (
              <Descriptions.Item label="Process Instance">
                <Text style={{ fontFamily: 'monospace', fontSize: '12px' }}>{lineItem.processInstanceId}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </div>

        {/* Additional Details */}
        {(lineItem.requestDeliveryBy || lineItem.quoteDetailId || lineItem.parentBundleId) && (
          <>
            <Divider />
            <div data-testid="additional-details-section">
              <Title level={5} className="gba:mb-3">
                Additional Details
              </Title>
              <Descriptions column={1} size="small" bordered>
                {lineItem.requestDeliveryBy && (
                  <Descriptions.Item label="Request Delivery By">
                    {dayjs(lineItem.requestDeliveryBy).format('MMM D, YYYY')}
                  </Descriptions.Item>
                )}
                {lineItem.quoteDetailId && (
                  <Descriptions.Item label="Quote Detail ID">
                    <Text style={{ fontFamily: 'monospace', fontSize: '12px' }}>{lineItem.quoteDetailId}</Text>
                  </Descriptions.Item>
                )}
                {lineItem.parentBundleId && (
                  <Descriptions.Item label="Parent Bundle ID">
                    <Text style={{ fontFamily: 'monospace', fontSize: '12px' }}>{lineItem.parentBundleId}</Text>
                  </Descriptions.Item>
                )}
                {lineItem.salesRepId && (
                  <Descriptions.Item label="Sales Rep ID">
                    <Text style={{ fontFamily: 'monospace', fontSize: '12px' }}>{lineItem.salesRepId}</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <Drawer
      title={drawerTitle}
      placement="right"
      onClose={onClose}
      open={visible}
      width={500}
      data-testid="line-item-detail-drawer"
    >
      {renderContent()}
    </Drawer>
  )
}

export default LineItemDetailDrawer
