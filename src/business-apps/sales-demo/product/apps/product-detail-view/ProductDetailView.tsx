import React, { useState, useCallback } from 'react'
import { Row, Col, Card, Tabs, Statistic, Tag, Space, Typography, Alert, Button, Spin, Descriptions } from 'antd'
import {
  PiPackage,
  PiArrowLeft,
  PiEye,
  PiInfo,
  PiWarehouse,
  PiCurrencyEur,
  PiTruck,
  PiChartLine,
  PiFolder,
  PiArrowUp,
  PiArrowDown,
  PiMinus
} from 'react-icons/pi'
import { ActionButton } from '@newwork/gravity-ui-catalog'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import { useProductDetailData } from './hooks/useProductDetailData'
import { ProductDetailTab } from './types'

// Extend dayjs with plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

const { Title, Text } = Typography

export interface ProductDetailViewProps extends BusinessAppContextProps {
  productId: string
  onBack?: () => void
}

const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  accessToken,
  productId,
  onBack,
  userInfo,
  additionalData
}) => {
  // State
  const [activeTab, setActiveTab] = useState<ProductDetailTab>('overview')

  // Hooks
  const {
    product,
    kpiData,
    inventoryLocations,
    priceHistory,
    salesMetrics,
    suppliers,
    documents,
    stockMovements,
    loading,
    error,
    isUsingDemoData,
    refreshData
  } = useProductDetailData({ accessToken, productId })

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
    } else {
      window.history.back()
    }
  }, [onBack])

  // Handle tab change
  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key as ProductDetailTab)
  }, [])

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return dayjs(dateString).format('MMM D, YYYY')
  }

  // Get trend icon
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <PiArrowUp className="gba:text-green-500" />
    if (trend < 0) return <PiArrowDown className="gba:text-red-500" />
    return <PiMinus className="gba:text-gray-400" />
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'green'
      case 'inactive':
        return 'red'
      case 'draft':
        return 'orange'
      case 'discontinued':
        return 'gray'
      default:
        return 'default'
    }
  }

  // Actions dropdown configuration
  const actionItems = [
    {
      category: 'Product Management',
      key: 'edit-product',
      label: 'Edit Product',
      onClick: () => console.log('Edit product:', productId)
    },
    {
      category: 'Product Management',
      key: 'duplicate-product',
      label: 'Duplicate Product',
      onClick: () => console.log('Duplicate product:', productId)
    },
    {
      category: 'Inventory',
      key: 'adjust-stock',
      label: 'Adjust Stock',
      onClick: () => console.log('Adjust stock:', productId)
    },
    {
      category: 'Inventory',
      key: 'reorder-stock',
      label: 'Reorder Stock',
      onClick: () => console.log('Reorder stock:', productId)
    },
    {
      category: 'Pricing',
      key: 'update-pricing',
      label: 'Update Pricing',
      onClick: () => console.log('Update pricing:', productId)
    },
    {
      category: 'Reports',
      key: 'export-data',
      label: 'Export Product Data',
      onClick: () => console.log('Export data:', productId)
    }
  ]

  // Loading state
  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid="loading-container">
        <Spin size="large" />
      </div>
    )
  }

  // Error state
  if (error && !isUsingDemoData) {
    return (
      <div className="gba:p-6" data-testid="error-container">
        <Alert
          message="Error Loading Product"
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

  // No product found
  if (!product) {
    return (
      <div className="gba:p-6" data-testid="no-product-container">
        <Alert
          message="Product Not Found"
          description="The requested product could not be found."
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

  return (
    <div className="gba:p-6" data-testid="product-detail-view">
      {/* Back Navigation with Actions */}
      <div className="gba:mb-6 gba:flex gba:justify-between gba:items-center" data-testid="back-navigation">
        <Button
          type="text"
          icon={<PiArrowLeft />}
          onClick={handleBack}
          className="gba:flex gba:items-center gba:p-0 gba:h-auto"
          data-testid="back-button"
        >
          <span className="gba:ml-2">Back to Products</span>
        </Button>

        <ActionButton
          flowData={actionItems}
          portalContainer={document.body}
          data-testid="product-actions-dropdown"
          size="md"
        >
          Actions
        </ActionButton>
      </div>

      {/* Product Header */}
      <Card className="gba:mb-6" data-testid="product-header-card">
        <Row gutter={[24, 16]}>
          <Col xs={24} md={16}>
            <div data-testid="product-info-section">
              <Title level={2} className="gba:mb-2">
                {product.name}
              </Title>
              <Space size="large" className="gba:mb-4">
                <Text strong>Product #: {product.productNumber}</Text>
                <Tag color={getStatusColor(product.stateCode || '')} icon={<PiPackage />}>
                  {product.stateCode || 'Unknown'}
                </Tag>
                <Tag color="blue">{product.productTypeCode || 'N/A'}</Tag>
              </Space>
              <Text className="gba:text-gray-600 gba:block">{product.description || 'No description available'}</Text>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className="gba:text-right" data-testid="product-pricing-section">
              <Statistic
                title="Current Price"
                value={product.price}
                precision={2}
                prefix="€"
                valueStyle={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}
              />
              <Text className="gba:text-gray-500">Last updated: {formatDate(product.updatedAt)}</Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Tabbed Interface */}
      <Card data-testid="product-details-tabs-card">
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: 'overview',
              label: (
                <Space>
                  <PiEye />
                  <span>Overview</span>
                </Space>
              ),
              children: (
                <div data-testid="overview-tab">
                  {/* KPI Cards Grid */}
                  <Row gutter={[16, 16]} className="gba:mb-6">
                    <Col xs={24} sm={12} md={6}>
                      <Card
                        className={`gba:text-center gba:h-full ${isUsingDemoData ? 'gba:border-blue-300 gba:bg-blue-50' : ''}`}
                        data-testid="current-stock-kpi"
                      >
                        <Statistic
                          title="Current Stock"
                          value={kpiData?.currentStock.value || 0}
                          suffix={
                            <Space>
                              {getTrendIcon(kpiData?.currentStock.trend || 0)}
                              <Text className="gba:text-sm gba:text-gray-500">
                                {Math.abs(kpiData?.currentStock.trend || 0)}%
                              </Text>
                            </Space>
                          }
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card className="gba:text-center gba:h-full" data-testid="monthly-revenue-kpi">
                        <Statistic
                          title="Monthly Revenue"
                          value={kpiData?.monthlyRevenue.value || 0}
                          precision={2}
                          prefix="€"
                          suffix={
                            <Space>
                              {getTrendIcon(kpiData?.monthlyRevenue.trend || 0)}
                              <Text className="gba:text-sm gba:text-gray-500">
                                {Math.abs(kpiData?.monthlyRevenue.trend || 0)}%
                              </Text>
                            </Space>
                          }
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card className="gba:text-center gba:h-full" data-testid="average-margin-kpi">
                        <Statistic
                          title="Average Margin"
                          value={kpiData?.averageMargin.value || 0}
                          precision={1}
                          suffix={
                            <Space>
                              <span>%</span>
                              {getTrendIcon(kpiData?.averageMargin.trend || 0)}
                              <Text className="gba:text-sm gba:text-gray-500">
                                {Math.abs(kpiData?.averageMargin.trend || 0)}%
                              </Text>
                            </Space>
                          }
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card className="gba:text-center gba:h-full" data-testid="sales-velocity-kpi">
                        <Statistic
                          title="Sales Velocity"
                          value={kpiData?.salesVelocity.value || 0}
                          precision={1}
                          suffix={
                            <Space>
                              <span>{kpiData?.salesVelocity.unit || 'units/month'}</span>
                              {getTrendIcon(kpiData?.salesVelocity.trend || 0)}
                              <Text className="gba:text-sm gba:text-gray-500">
                                {Math.abs(kpiData?.salesVelocity.trend || 0)}%
                              </Text>
                            </Space>
                          }
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* Basic Product Information */}
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Card title="Product Information" data-testid="basic-product-info">
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="Product Type">{product.productTypeCode || 'N/A'}</Descriptions.Item>
                          <Descriptions.Item label="Product Structure">
                            {product.productStructure || 'N/A'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Is Kit">{product.isKit ? 'Yes' : 'No'}</Descriptions.Item>
                          <Descriptions.Item label="Stock Item">{product.isStockItem ? 'Yes' : 'No'}</Descriptions.Item>
                          <Descriptions.Item label="Supplier">{product.supplierName || 'N/A'}</Descriptions.Item>
                          <Descriptions.Item label="Valid From">
                            {formatDate(product.validFromDate || '')}
                          </Descriptions.Item>
                          <Descriptions.Item label="Valid To">
                            {formatDate(product.validToDate || '')}
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </Col>
                    <Col xs={24} md={12}>
                      <Card title="Pricing Summary" data-testid="pricing-summary">
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="List Price">{formatCurrency(product.price)}</Descriptions.Item>
                          <Descriptions.Item label="Standard Cost">
                            {formatCurrency(product.standardCost || 0)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Current Cost">
                            {formatCurrency(product.currentCost || 0)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Margin">
                            {product.price && product.currentCost
                              ? `${(((product.price - product.currentCost) / product.price) * 100).toFixed(1)}%`
                              : 'N/A'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Currency">{product.currency || 'EUR'}</Descriptions.Item>
                          <Descriptions.Item label="Exchange Rate">{product.exchangeRate || 1.0}</Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </Col>
                  </Row>
                </div>
              )
            },
            {
              key: 'product-info',
              label: (
                <Space>
                  <PiInfo />
                  <span>Product Information</span>
                </Space>
              ),
              children: (
                <div data-testid="product-info-tab">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Card title="General Information" data-testid="general-info-card">
                        <Descriptions column={1} size="small" bordered>
                          <Descriptions.Item label="Product Name">{product.name}</Descriptions.Item>
                          <Descriptions.Item label="Product Number">{product.productNumber}</Descriptions.Item>
                          <Descriptions.Item label="Description">
                            {product.description || 'No description available'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Product URL">
                            {product.productUrl ? (
                              <a href={product.productUrl} target="_blank" rel="noopener noreferrer">
                                {product.productUrl}
                              </a>
                            ) : (
                              'N/A'
                            )}
                          </Descriptions.Item>
                          <Descriptions.Item label="Size">{product.size || 'N/A'}</Descriptions.Item>
                          <Descriptions.Item label="Weight">
                            {product.stockWeight ? `${product.stockWeight} kg` : 'N/A'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Volume">
                            {product.stockVolume ? `${product.stockVolume} m³` : 'N/A'}
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </Col>
                    <Col xs={24} md={12}>
                      <Card title="Classification" data-testid="classification-card">
                        <Descriptions column={1} size="small" bordered>
                          <Descriptions.Item label="Product Type">
                            <Tag color="blue">{product.productTypeCode || 'N/A'}</Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="Product Structure">
                            <Tag color="green">{product.productStructure || 'N/A'}</Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="Status">
                            <Tag color={getStatusColor(product.stateCode || '')}>{product.stateCode || 'Unknown'}</Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="Status Code">{product.statusCode || 'N/A'}</Descriptions.Item>
                          <Descriptions.Item label="Is Kit Product">
                            <Tag color={product.isKit ? 'green' : 'gray'}>{product.isKit ? 'Yes' : 'No'}</Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="Stock Item">
                            <Tag color={product.isStockItem ? 'green' : 'gray'}>
                              {product.isStockItem ? 'Yes' : 'No'}
                            </Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="Hierarchy Path">{product.hierarchyPath || 'N/A'}</Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </Col>
                  </Row>
                </div>
              )
            },
            {
              key: 'inventory-stock',
              label: (
                <Space>
                  <PiWarehouse />
                  <span>Inventory & Stock</span>
                </Space>
              ),
              children: (
                <div data-testid="inventory-stock-tab">
                  {product.isStockItem ? (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={8}>
                        <Card title="Stock Summary" data-testid="stock-summary-card">
                          <Statistic
                            title="Total Stock"
                            value={product.quantityOnHand || 0}
                            suffix="units"
                            valueStyle={{ fontSize: '24px', fontWeight: 'bold' }}
                          />
                          <div className="gba:mt-4">
                            <Text className="gba:text-gray-600">Across {inventoryLocations.length} locations</Text>
                          </div>
                        </Card>
                      </Col>
                      <Col xs={24} md={16}>
                        <Card title="Inventory Locations" data-testid="inventory-locations-card">
                          {inventoryLocations.length > 0 ? (
                            <div className="gba:space-y-4">
                              {inventoryLocations.map(location => (
                                <div key={location.id} className="gba:border gba:rounded gba:p-4">
                                  <Row gutter={[16, 8]}>
                                    <Col xs={24} sm={12}>
                                      <Text strong>{location.locationName}</Text>
                                      <br />
                                      <Text className="gba:text-gray-500">{location.warehouseCode}</Text>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                      <Row gutter={[8, 8]}>
                                        <Col span={8}>
                                          <Statistic title="On Hand" value={location.quantityOnHand} size="small" />
                                        </Col>
                                        <Col span={8}>
                                          <Statistic
                                            title="Available"
                                            value={location.quantityAvailable}
                                            size="small"
                                          />
                                        </Col>
                                        <Col span={8}>
                                          <Statistic title="Reserved" value={location.quantityReserved} size="small" />
                                        </Col>
                                      </Row>
                                    </Col>
                                  </Row>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Text className="gba:text-gray-500">No inventory locations found</Text>
                          )}
                        </Card>
                      </Col>
                    </Row>
                  ) : (
                    <Alert
                      message="Non-Stock Item"
                      description="This product is not tracked in inventory."
                      type="info"
                      showIcon
                    />
                  )}
                </div>
              )
            },
            {
              key: 'pricing-costs',
              label: (
                <Space>
                  <PiCurrencyEur />
                  <span>Pricing & Costs</span>
                </Space>
              ),
              children: (
                <div data-testid="pricing-costs-tab">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Card title="Current Pricing" data-testid="current-pricing-card">
                        <Descriptions column={1} size="small" bordered>
                          <Descriptions.Item label="List Price">
                            <Text strong className="gba:text-lg">
                              {formatCurrency(product.price)}
                            </Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="Base Price">
                            {formatCurrency(product.priceBase || product.price)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Standard Cost">
                            {formatCurrency(product.standardCost || 0)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Current Cost">
                            {formatCurrency(product.currentCost || 0)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Gross Margin">
                            <Text
                              strong
                              className={
                                product.price &&
                                product.currentCost &&
                                (product.price - product.currentCost) / product.price > 0.3
                                  ? 'gba:text-green-600'
                                  : 'gba:text-orange-600'
                              }
                            >
                              {product.price && product.currentCost
                                ? `${(((product.price - product.currentCost) / product.price) * 100).toFixed(1)}%`
                                : 'N/A'}
                            </Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="Currency">{product.currency || 'EUR'}</Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </Col>
                    <Col xs={24} md={12}>
                      <Card title="Price History" data-testid="price-history-card">
                        {priceHistory.length > 0 ? (
                          <div className="gba:space-y-3">
                            {priceHistory.slice(0, 5).map(priceEntry => (
                              <div key={priceEntry.id} className="gba:border-b gba:pb-2">
                                <Row justify="space-between" align="middle">
                                  <Col>
                                    <Text strong>{formatCurrency(priceEntry.price)}</Text>
                                    <br />
                                    <Text className="gba:text-sm gba:text-gray-500">
                                      {formatDate(priceEntry.effectiveDate)}
                                    </Text>
                                  </Col>
                                  <Col>
                                    <Tag color="blue">{priceEntry.priceType}</Tag>
                                  </Col>
                                </Row>
                                {priceEntry.reason && (
                                  <Text className="gba:text-sm gba:text-gray-600">{priceEntry.reason}</Text>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Text className="gba:text-gray-500">No price history available</Text>
                        )}
                      </Card>
                    </Col>
                  </Row>
                </div>
              )
            },
            {
              key: 'supplier-vendor',
              label: (
                <Space>
                  <PiTruck />
                  <span>Supplier & Vendor</span>
                </Space>
              ),
              children: (
                <div data-testid="supplier-vendor-tab">
                  <Row gutter={[16, 16]}>
                    {suppliers.map(supplier => (
                      <Col xs={24} md={12} key={supplier.id}>
                        <Card
                          title={supplier.supplierName}
                          data-testid={`supplier-card-${supplier.id}`}
                          extra={<Tag color={supplier.status === 'Preferred' ? 'gold' : 'blue'}>{supplier.status}</Tag>}
                        >
                          <Descriptions column={1} size="small">
                            <Descriptions.Item label="Supplier Code">{supplier.supplierCode}</Descriptions.Item>
                            <Descriptions.Item label="Contact Person">
                              {supplier.contactPerson || 'N/A'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Email">
                              {supplier.email ? <a href={`mailto:${supplier.email}`}>{supplier.email}</a> : 'N/A'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Phone">{supplier.phone || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Lead Time">{supplier.leadTime} days</Descriptions.Item>
                            <Descriptions.Item label="Min Order Qty">
                              {supplier.minimumOrderQuantity} units
                            </Descriptions.Item>
                            <Descriptions.Item label="Performance Rating">
                              <Text
                                strong
                                className={
                                  supplier.performanceRating >= 9
                                    ? 'gba:text-green-600'
                                    : supplier.performanceRating >= 7
                                      ? 'gba:text-orange-600'
                                      : 'gba:text-red-600'
                                }
                              >
                                {supplier.performanceRating}/10
                              </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Total Purchase Value">
                              {formatCurrency(supplier.totalPurchaseValue)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Last Purchase">
                              {formatDate(supplier.lastPurchaseDate || '')}
                            </Descriptions.Item>
                          </Descriptions>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )
            },
            {
              key: 'sales-performance',
              label: (
                <Space>
                  <PiChartLine />
                  <span>Sales Performance</span>
                </Space>
              ),
              children: (
                <div data-testid="sales-performance-tab">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={8}>
                      <Card title="Sales Summary" data-testid="sales-summary-card">
                        <Statistic
                          title="Total Revenue"
                          value={salesMetrics?.totalRevenue || 0}
                          precision={2}
                          prefix="€"
                          valueStyle={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}
                        />
                        <div className="gba:mt-4 gba:space-y-2">
                          <div>
                            <Text className="gba:text-gray-600">Total Quantity Sold:</Text>
                            <Text strong className="gba:ml-2">
                              {salesMetrics?.totalQuantitySold || 0} units
                            </Text>
                          </div>
                          <div>
                            <Text className="gba:text-gray-600">Average Order Value:</Text>
                            <Text strong className="gba:ml-2">
                              {formatCurrency(salesMetrics?.averageOrderValue || 0)}
                            </Text>
                          </div>
                        </div>
                      </Card>
                    </Col>
                    <Col xs={24} md={16}>
                      <Card title="Top Customers" data-testid="top-customers-card">
                        {salesMetrics?.topCustomers && salesMetrics.topCustomers.length > 0 ? (
                          <div className="gba:space-y-3">
                            {salesMetrics.topCustomers.map(customer => (
                              <div key={customer.customerId} className="gba:border gba:rounded gba:p-3">
                                <Row justify="space-between" align="middle">
                                  <Col>
                                    <Text strong>{customer.customerName}</Text>
                                    <br />
                                    <Text className="gba:text-sm gba:text-gray-500">
                                      Last purchase: {formatDate(customer.lastPurchaseDate)}
                                    </Text>
                                  </Col>
                                  <Col>
                                    <Text strong className="gba:text-green-600">
                                      {formatCurrency(customer.totalPurchases)}
                                    </Text>
                                  </Col>
                                </Row>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Text className="gba:text-gray-500">No customer data available</Text>
                        )}
                      </Card>
                    </Col>
                  </Row>

                  {/* Sales Trend */}
                  <Row gutter={[16, 16]} className="gba:mt-4">
                    <Col xs={24}>
                      <Card title="Sales Trend" data-testid="sales-trend-card">
                        {salesMetrics?.salesTrend && salesMetrics.salesTrend.length > 0 ? (
                          <Row gutter={[16, 16]}>
                            {salesMetrics.salesTrend.map(trend => (
                              <Col xs={24} sm={8} key={trend.period}>
                                <div className="gba:text-center gba:border gba:rounded gba:p-4">
                                  <Text strong className="gba:block gba:text-lg">
                                    {trend.period}
                                  </Text>
                                  <Statistic
                                    value={trend.revenue}
                                    precision={0}
                                    prefix="€"
                                    valueStyle={{ fontSize: '16px' }}
                                  />
                                  <Text className="gba:text-gray-500">{trend.quantity} units</Text>
                                </div>
                              </Col>
                            ))}
                          </Row>
                        ) : (
                          <Text className="gba:text-gray-500">No sales trend data available</Text>
                        )}
                      </Card>
                    </Col>
                  </Row>
                </div>
              )
            },
            {
              key: 'documents-media',
              label: (
                <Space>
                  <PiFolder />
                  <span>Documents & Media</span>
                </Space>
              ),
              children: (
                <div data-testid="documents-media-tab">
                  <Row gutter={[16, 16]}>
                    {documents.length > 0 ? (
                      documents.map(document => (
                        <Col xs={24} sm={12} md={8} lg={6} key={document.id}>
                          <Card
                            hoverable
                            data-testid={`document-card-${document.id}`}
                            actions={[
                              <Button type="link" size="small" key="download">
                                Download
                              </Button>,
                              <Button type="link" size="small" key="view">
                                View
                              </Button>
                            ]}
                          >
                            <div className="gba:text-center">
                              <div className="gba:mb-3">
                                <PiFolder size={48} className="gba:text-blue-500" />
                              </div>
                              <Text strong className="gba:block gba:mb-1">
                                {document.fileName}
                              </Text>
                              <Tag color="blue" className="gba:mb-2">
                                {document.documentType}
                              </Tag>
                              <div className="gba:text-sm gba:text-gray-500">
                                <div>{(document.fileSize / 1024 / 1024).toFixed(1)} MB</div>
                                <div>{formatDate(document.uploadDate)}</div>
                              </div>
                              {document.description && (
                                <Text className="gba:text-xs gba:text-gray-600 gba:block gba:mt-2">
                                  {document.description}
                                </Text>
                              )}
                            </div>
                          </Card>
                        </Col>
                      ))
                    ) : (
                      <Col xs={24}>
                        <Alert
                          message="No Documents"
                          description="No documents or media files are available for this product."
                          type="info"
                          showIcon
                        />
                      </Col>
                    )}
                  </Row>
                </div>
              )
            }
          ]}
        />
      </Card>
    </div>
  )
}

export default ProductDetailView
