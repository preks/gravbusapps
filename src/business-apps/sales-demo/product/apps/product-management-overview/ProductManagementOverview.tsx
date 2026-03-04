import React, { useState, useCallback } from 'react'
import { Row, Col, Card, Table, Statistic, Tag, Space, Typography, Alert, Select, Button, Tooltip, Modal } from 'antd'
import { PackageIcon, ShoppingCartIcon, TagIcon, CurrencyEurIcon, ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@phosphor-icons/react'
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import { useProductData } from './hooks/useProductData'
import { Product, ProductFilters } from './types'
import ProductDetailView from '../product-detail-view/ProductDetailView'
import ProductForm from '../../forms/product-form/ProductForm'

// Extend dayjs with plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

const { Title, Text } = Typography
const { Option } = Select

export interface ProductManagementOverviewProps extends BusinessAppContextProps {}

const ProductManagementOverview: React.FC<ProductManagementOverviewProps> = props => {
  const { accessToken, userInfo, additionalData } = props

  // Early return if no accessToken is provided
  if (!accessToken) {
    return (
      <div className="gba:p-6" data-testid="no-access-token">
        <Alert
          message="Access Token Required"
          description="This component requires an access token to function properly."
          type="warning"
          showIcon
        />
      </div>
    )
  }

  // State for selected product and view mode
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [showDetailView, setShowDetailView] = useState(false)

  // State for product form modal
  const [isProductFormModalOpen, setIsProductFormModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isNewProduct, setIsNewProduct] = useState(true)

  // Hooks
  const {
    products,
    kpiData,
    loading,
    error,
    isUsingDemoData,
    filters,
    pagination,
    setFilters,
    setPagination,
    refreshData
  } = useProductData({ accessToken })

  // Handle search
  const handleSearch = useCallback(
    (searchValue: string) => {
      setFilters({ ...filters, search: searchValue })
      setPagination({ ...pagination, page: 1 })
    },
    [filters, pagination, setFilters, setPagination]
  )

  // Handle filter changes
  const handleFilterChange = useCallback(
    (key: keyof ProductFilters, value: any) => {
      setFilters({ ...filters, [key]: value })
      setPagination({ ...pagination, page: 1 })
    },
    [filters, pagination, setFilters, setPagination]
  )

  // Handle table pagination
  const handleTableChange = useCallback(
    (page: number, pageSize: number) => {
      setPagination({ ...pagination, page, pageSize })
    },
    [pagination, setPagination]
  )

  // Handle row click
  const handleRowClick = useCallback((product: Product) => {
    setSelectedProductId(product.id)
    setShowDetailView(true)
  }, [])

  // Handle back from detail view
  const handleBackFromDetail = useCallback(() => {
    setShowDetailView(false)
    setSelectedProductId(null)
  }, [])

  // Handle product form modal
  const handleOpenCreateProductModal = useCallback(() => {
    setIsNewProduct(true)
    setEditingProduct(null)
    setIsProductFormModalOpen(true)
  }, [])

  const handleOpenEditProductModal = useCallback((product: Product) => {
    setIsNewProduct(false)
    setEditingProduct(product)
    setIsProductFormModalOpen(true)
  }, [])

  const handleCloseProductFormModal = useCallback(() => {
    setIsProductFormModalOpen(false)
    setEditingProduct(null)
    setIsNewProduct(true)
  }, [])

  const handleProductFormSuccess = useCallback(
    (productId: string) => {
      setIsProductFormModalOpen(false)
      setEditingProduct(null)
      setIsNewProduct(true)
      // Refresh the data
      refreshData()
    },
    [refreshData]
  )

  // Handle product deletion
  const handleDeleteProduct = useCallback(
    (product: Product) => {
      Modal.confirm({
        title: 'Delete Product',
        content: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
        okText: 'Delete',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: () => {
          // TODO: Implement actual delete functionality when API is available
          console.log('Delete product:', product.id)
          // For now, just refresh the data to simulate deletion
          refreshData()
        }
      })
    },
    [refreshData]
  )

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
    if (trend > 0) return <ArrowUpIcon className="gba:text-green-500" />
    if (trend < 0) return <ArrowDownIcon className="gba:text-red-500" />
    return <MinusIcon className="gba:text-gray-400" />
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

  // Table columns
  const columns = [
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: Product) => (
        <Space size="small">
          <Tooltip title="Edit Product">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={e => {
                e.stopPropagation()
                handleOpenEditProductModal(record)
              }}
              data-testid={`product-edit-button-${record.id}`}
            />
          </Tooltip>
          <Tooltip title="Delete Product">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={e => {
                e.stopPropagation()
                handleDeleteProduct(record)
              }}
              data-testid={`product-delete-button-${record.id}`}
            />
          </Tooltip>
        </Space>
      )
    },
    {
      title: 'Product Number',
      dataIndex: 'productNumber',
      key: 'productNumber',
      width: 150,
      render: (text: string) => (
        <Text strong className="gba:text-blue-600">
          {text}
        </Text>
      )
    },
    {
      title: 'Product Name',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (text: string) => <Text className="gba:font-medium">{text}</Text>
    },
    {
      title: 'Type',
      dataIndex: 'productTypeCode',
      key: 'productTypeCode',
      width: 120,
      render: (type: string) => <Tag color="blue">{type || 'N/A'}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'stateCode',
      key: 'stateCode',
      width: 100,
      render: (status: string) => <Tag color={getStatusColor(status)}>{status || 'N/A'}</Tag>
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      align: 'right' as const,
      render: (price: number) => <Text className="gba:font-medium">{price ? formatCurrency(price) : 'N/A'}</Text>
    },
    {
      title: 'Stock',
      dataIndex: 'quantityOnHand',
      key: 'quantityOnHand',
      width: 100,
      align: 'right' as const,
      render: (quantity: number, record: Product) => <Text>{record.isStockItem ? quantity || 0 : 'N/A'}</Text>
    },
    {
      title: 'Supplier',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 180,
      render: (supplier: string) => <Text>{supplier || 'N/A'}</Text>
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
      render: (date: string) => <Text className="gba:text-gray-500">{formatDate(date)}</Text>
    }
  ]

  // Show detail view if a product is selected
  if (showDetailView && selectedProductId) {
    return (
      <ProductDetailView
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
        productId={selectedProductId}
        onBack={handleBackFromDetail}
      />
    )
  }

  return (
    <PageLayout
      headerIcon={<PackageIcon color="#c92559" />}
      headerLabel="Product Management"
      pageHeaderRight={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreateProductModal}
          data-testid="create-product-button"
        >
          Create Product
        </Button>
      }
      contentContainer={
        <div className="gba:p-6" data-testid="product-management-overview">
          {/* KPI Cards */}
          <Row gutter={[16, 16]} className="gba:mb-6">
            <Col xs={24} sm={12} md={6}>
              <Card className="gba:text-center gba:h-full" data-testid="total-products-kpi">
                <Statistic
                  title="Total Products"
                  value={kpiData?.totalProducts.value || 0}
                  prefix={<PackageIcon />}
                  suffix={
                    <Space>
                      {getTrendIcon(kpiData?.totalProducts.trend || 0)}
                      <Text className="gba:text-sm gba:text-gray-500">
                        {Math.abs(kpiData?.totalProducts.trend || 0)}%
                      </Text>
                    </Space>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="gba:text-center gba:h-full" data-testid="active-products-kpi">
                <Statistic
                  title="Active Products"
                  value={kpiData?.activeProducts.value || 0}
                  prefix={<ShoppingCartIcon />}
                  suffix={
                    <Space>
                      {getTrendIcon(kpiData?.activeProducts.trend || 0)}
                      <Text className="gba:text-sm gba:text-gray-500">
                        {Math.abs(kpiData?.activeProducts.trend || 0)}%
                      </Text>
                    </Space>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="gba:text-center gba:h-full" data-testid="product-categories-kpi">
                <Statistic
                  title="Categories"
                  value={kpiData?.productCategories.value || 0}
                  prefix={<TagIcon />}
                  suffix={
                    <Space>
                      {getTrendIcon(kpiData?.productCategories.trend || 0)}
                      <Text className="gba:text-sm gba:text-gray-500">
                        {Math.abs(kpiData?.productCategories.trend || 0)}%
                      </Text>
                    </Space>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="gba:text-center gba:h-full" data-testid="average-price-kpi">
                <Statistic
                  title="Average Price"
                  value={kpiData?.averagePrice.value || 0}
                  prefix={<CurrencyEurIcon />}
                  precision={2}
                  suffix={
                    <Space>
                      {getTrendIcon(kpiData?.averagePrice.trend || 0)}
                      <Text className="gba:text-sm gba:text-gray-500">
                        {Math.abs(kpiData?.averagePrice.trend || 0)}%
                      </Text>
                    </Space>
                  }
                />
              </Card>
            </Col>
          </Row>

          {/* Filters and Search */}
          <Card className="gba:mb-6" data-testid="filters-card">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <DebouncedInput
                  value={filters.search || ''}
                  onChange={handleSearch}
                  placeholder="Search products..."
                  className="gba:w-full gba:p-2 gba:border gba:rounded"
                  data-testid="product-search-input"
                />
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Select
                  placeholder="Product Type"
                  value={filters.productType}
                  onChange={value => handleFilterChange('productType', value)}
                  allowClear
                  className="gba:w-full"
                  data-testid="product-type-filter"
                >
                  <Option value="Service">Service</Option>
                  <Option value="Goods">Goods</Option>
                  <Option value="License">License</Option>
                  <Option value="Bundle">Bundle</Option>
                  <Option value="Kit">Kit</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Select
                  placeholder="Status"
                  value={filters.stateCode}
                  onChange={value => handleFilterChange('stateCode', value)}
                  allowClear
                  className="gba:w-full"
                  data-testid="status-filter"
                >
                  <Option value="Active">Active</Option>
                  <Option value="Inactive">Inactive</Option>
                  <Option value="Draft">Draft</Option>
                  <Option value="Discontinued">Discontinued</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Button onClick={refreshData} loading={loading} className="gba:w-full" data-testid="refresh-button">
                  Refresh
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Products Table */}
          <Card title="Products" data-testid="products-table-card">
            <Table
              columns={columns}
              dataSource={products}
              rowKey="id"
              loading={loading}
              pagination={{
                current: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} products`,
                onChange: handleTableChange,
                onShowSizeChange: handleTableChange
              }}
              onRow={record => ({
                onClick: () => handleRowClick(record),
                className: selectedProductId === record.id ? 'gba:bg-blue-50' : '',
                style: { cursor: 'pointer' },
                'data-testid': `product-row-${record.id}`
              })}
              scroll={{ x: true }}
              data-testid="products-table"
            />
          </Card>

          {/* Product Form Modal */}
          <Modal
            title={isNewProduct ? 'Create New Product' : 'Edit Product'}
            open={isProductFormModalOpen}
            onCancel={handleCloseProductFormModal}
            footer={null}
            width={800}
            style={{ top: 20 }}
            maskClosable={false}
            data-testid="product-form-modal"
          >
            <ProductForm
              accessToken={accessToken}
              userInfo={userInfo}
              additionalData={additionalData}
              onCancel={handleCloseProductFormModal}
              onSuccess={handleProductFormSuccess}
              initialData={editingProduct}
              isEditing={!isNewProduct}
              inModal={true}
            />
          </Modal>
        </div>
      }
    />
  )
}

export default ProductManagementOverview
