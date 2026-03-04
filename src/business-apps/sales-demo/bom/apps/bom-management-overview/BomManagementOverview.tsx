import React, { useState, useCallback } from 'react'
import { Row, Col, Card, Table, Statistic, Tag, Space, Typography, Select, Button } from 'antd'
import {
  CubeIcon,
  StackIcon,
  GearIcon,
  ChartLineIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  CalendarIcon,
  TagIcon
} from '@phosphor-icons/react'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import { useBomData } from './hooks/useBomData'
import { BillOfMaterials } from './types'
import { generateDemoBoms, generateDemoBomKPIData } from './hooks/demoData'
import BomDetailView from '../bom-detail-view/BomDetailView'

// Extend dayjs with plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

const { Title, Text } = Typography
const { Option } = Select

export interface BomManagementOverviewProps extends BusinessAppContextProps {}

const BomManagementOverview: React.FC<BomManagementOverviewProps> = ({ accessToken, userInfo, additionalData }) => {
  // State for selected BOM and view mode
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null)
  const [showDetailView, setShowDetailView] = useState(false)

  // Hooks
  const {
    boms,
    kpiData,
    loading,
    error,
    isUsingDemoData,
    filters,
    pagination,
    setFilters,
    setPagination,
    refreshData
  } = useBomData({ accessToken })

  // Debug logging
  console.log('BomManagementOverview render:', {
    accessToken: accessToken ? 'present' : 'missing',
    bomsCount: boms.length,
    kpiData: kpiData ? 'present' : 'missing',
    loading,
    isUsingDemoData,
    error: error ? error.message : 'none',
    filters,
    pagination
  })

  // Test demo data generation on first render
  React.useEffect(() => {
    console.log('Testing demo data generation...')
    const testData = generateDemoBoms(1, 20)
    console.log('Demo data test:', testData)
    const testKPIs = generateDemoBomKPIData()
    console.log('Demo KPI test:', testKPIs)
  }, [])

  // Extract filter values for UI
  const searchTerm = filters.search || ''
  const bomTypeFilter = filters.bomType
  const bomStatusFilter = filters.bomStatus
  const activeOnlyFilter = filters.activeOnly

  // Helper function to get trend icon
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUpIcon className="gba:text-green-500" />
    if (trend < 0) return <ArrowDownIcon className="gba:text-red-500" />
    return <MinusIcon className="gba:text-gray-400" />
  }

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('MMM DD, YYYY')
  }

  // Helper function to get BOM status color
  const getBomStatusColor = (status: string, activeFrom?: string, activeTo?: string) => {
    const now = dayjs()
    const isCurrentlyActive =
      (!activeFrom || dayjs(activeFrom).isBefore(now)) && (!activeTo || dayjs(activeTo).isAfter(now))

    switch (status) {
      case 'ACTIVE':
        return isCurrentlyActive ? 'green' : 'orange'
      case 'INACTIVE':
        return 'red'
      case 'PENDING':
        return 'blue'
      case 'OBSOLETE':
        return 'gray'
      default:
        return 'default'
    }
  }

  // Helper function to get BOM type color
  const getBomTypeColor = (type: string) => {
    switch (type) {
      case 'PRODUCTION':
        return 'blue'
      case 'ENGINEERING':
        return 'purple'
      case 'SALES':
        return 'green'
      case 'COSTING':
        return 'orange'
      default:
        return 'default'
    }
  }

  // Helper function to get complexity level
  const getComplexityLevel = (componentCount: number) => {
    if (componentCount < 20) return { level: 'Low', color: 'green' }
    if (componentCount < 50) return { level: 'Medium', color: 'blue' }
    if (componentCount < 100) return { level: 'High', color: 'orange' }
    return { level: 'Very High', color: 'red' }
  }

  // Handle search
  const handleSearch = useCallback(
    (value: string) => {
      setFilters({
        ...filters,
        search: value
      })
      // Reset pagination to first page when searching
      setPagination({
        ...pagination,
        page: 1
      })
    },
    [filters, setFilters, pagination, setPagination]
  )

  // Handle filter changes
  const handleBomTypeChange = useCallback(
    (value: string) => {
      setFilters({
        ...filters,
        bomType: value as any
      })
      // Reset pagination to first page when filtering
      setPagination({
        ...pagination,
        page: 1
      })
    },
    [filters, setFilters, pagination, setPagination]
  )

  const handleBomStatusChange = useCallback(
    (value: string) => {
      setFilters({
        ...filters,
        bomStatus: value as any
      })
      // Reset pagination to first page when filtering
      setPagination({
        ...pagination,
        page: 1
      })
    },
    [filters, setFilters, pagination, setPagination]
  )

  const handleActiveOnlyChange = useCallback(
    (value: boolean) => {
      setFilters({
        ...filters,
        activeOnly: value
      })
      // Reset pagination to first page when filtering
      setPagination({
        ...pagination,
        page: 1
      })
    },
    [filters, setFilters, pagination, setPagination]
  )

  // Handle table changes (pagination, sorting)
  const handleTableChange = useCallback(
    (page: number, pageSize?: number) => {
      setPagination({
        ...pagination,
        page,
        pageSize: pageSize || pagination.pageSize
      })
    },
    [pagination, setPagination]
  )

  // Handle row click
  const handleRowClick = useCallback((record: BillOfMaterials) => {
    console.log('Row clicked:', record)
    setSelectedBomId(record.id)
    setShowDetailView(true)
    console.log('Detail view should show for BOM ID:', record.id)
  }, [])

  // Handle back from detail view
  const handleBackFromDetail = useCallback(() => {
    setShowDetailView(false)
    setSelectedBomId(null)
  }, [])

  // Handle create BOM
  const handleOpenCreateBomModal = useCallback(() => {
    // TODO: Implement BOM creation modal
    console.log('Create BOM clicked')
  }, [])

  // Table columns
  const columns = [
    {
      title: 'BOM ID',
      dataIndex: 'businessKey',
      key: 'businessKey',
      width: 150,
      fixed: 'left' as const,
      render: (text: string, record: BillOfMaterials) => (
        <div>
          <Text strong className="gba:text-blue-600">
            {text}
          </Text>
          <br />
          <Text className="gba:text-xs gba:text-gray-500">v{record.version}</Text>
        </div>
      )
    },
    {
      title: 'BOM Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: BillOfMaterials) => (
        <div>
          <Text strong>{text}</Text>
          {record.description && (
            <>
              <br />
              <Text className="gba:text-sm gba:text-gray-500" ellipsis>
                {record.description}
              </Text>
            </>
          )}
        </div>
      )
    },
    {
      title: 'Parent Product',
      dataIndex: 'parentProduct',
      key: 'parentProduct',
      width: 200,
      render: (parentProduct: any) => (
        <div>
          <Text strong>{parentProduct?.name || 'N/A'}</Text>
          <br />
          <Text className="gba:text-sm gba:text-gray-500">{parentProduct?.productNumber || 'N/A'}</Text>
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'bomType',
      key: 'bomType',
      width: 120,
      render: (type: string) => (
        <Tag color={getBomTypeColor(type)} icon={<GearIcon />}>
          {type}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'bomStatus',
      key: 'bomStatus',
      width: 120,
      render: (status: string, record: BillOfMaterials) => (
        <Tag color={getBomStatusColor(status, record.activeFrom, record.activeTo)} icon={<TagIcon />}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Components',
      dataIndex: 'componentCount',
      key: 'componentCount',
      width: 120,
      render: (count: number, record: BillOfMaterials) => {
        const complexity = getComplexityLevel(count)
        return (
          <div className="gba:text-center">
            <Text strong className="gba:text-lg">
              {count}
            </Text>
            <br />
            <Tag color={complexity.color} size="small">
              {complexity.level}
            </Tag>
          </div>
        )
      }
    },
    {
      title: 'Validity Period',
      key: 'validity',
      width: 180,
      render: (record: BillOfMaterials) => (
        <div>
          {record.activeFrom && (
            <div className="gba:flex gba:items-center gba:gap-1">
              <CalendarIcon className="gba:text-gray-400" />
              <Text className="gba:text-sm">{formatDate(record.activeFrom)}</Text>
            </div>
          )}
          {record.activeTo && (
            <div className="gba:flex gba:items-center gba:gap-1 gba:mt-1">
              <CalendarIcon className="gba:text-gray-400" />
              <Text className="gba:text-sm">to {formatDate(record.activeTo)}</Text>
            </div>
          )}
          {!record.activeFrom && !record.activeTo && <Text className="gba:text-gray-400">No limits</Text>}
        </div>
      )
    },
    {
      title: 'Last Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
      render: (date: string) => <Text className="gba:text-sm">{formatDate(date)}</Text>
    }
  ]

  // Show detail view if a BOM is selected
  console.log('Detail view check:', { showDetailView, selectedBomId })
  if (showDetailView && selectedBomId) {
    console.log('Rendering BOM detail view for:', selectedBomId)
    return (
      <BomDetailView
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
        bomId={selectedBomId}
        onBack={handleBackFromDetail}
      />
    )
  }

  return (
    <PageLayout
      headerIcon={<CubeIcon color="#c92559" />}
      headerLabel="BOM Management"
      headerActions={
        <AppActionButton
          variant="primary"
          size="sm"
          accessToken={accessToken}
          staticFlowData={[
            {
              id: 'create-bom',
              label: 'Create BOM',
              icon: 'plus',
              onClick: handleOpenCreateBomModal
            }
          ]}
          prefixDataTestId="bom-management-overview"
          data-testid="bom-management-actions"
        >
          Actions
        </AppActionButton>
      }
      contentContainer={
        <div className="gba:p-6" data-testid="bom-management-overview">
          {/* KPI Cards */}
          <Row gutter={[16, 16]} className="gba:mb-6">
            <Col xs={24} sm={12} md={6}>
              <Card className="gba:text-center gba:h-full" data-testid="total-boms-kpi">
                <Statistic
                  title="Total BOMs"
                  value={kpiData?.totalBoms.value || 0}
                  prefix={<CubeIcon />}
                  suffix={
                    <Space>
                      {getTrendIcon(kpiData?.totalBoms.trend || 0)}
                      <Text className="gba:text-sm gba:text-gray-500">{Math.abs(kpiData?.totalBoms.trend || 0)}%</Text>
                    </Space>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="gba:text-center gba:h-full" data-testid="active-boms-kpi">
                <Statistic
                  title="Active BOMs"
                  value={kpiData?.activeBoms.value || 0}
                  prefix={<StackIcon />}
                  suffix={
                    <Space>
                      {getTrendIcon(kpiData?.activeBoms.trend || 0)}
                      <Text className="gba:text-sm gba:text-gray-500">{Math.abs(kpiData?.activeBoms.trend || 0)}%</Text>
                    </Space>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="gba:text-center gba:h-full" data-testid="total-components-kpi">
                <Statistic
                  title="Total Components"
                  value={kpiData?.totalComponents.value || 0}
                  prefix={<GearIcon />}
                  suffix={
                    <Space>
                      {getTrendIcon(kpiData?.totalComponents.trend || 0)}
                      <Text className="gba:text-sm gba:text-gray-500">
                        {Math.abs(kpiData?.totalComponents.trend || 0)}%
                      </Text>
                    </Space>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="gba:text-center gba:h-full" data-testid="average-complexity-kpi">
                <Statistic
                  title="Avg Complexity"
                  value={kpiData?.averageComplexity.value || 0}
                  prefix={<ChartLineIcon />}
                  precision={1}
                  suffix={
                    <Space>
                      {getTrendIcon(kpiData?.averageComplexity.trend || 0)}
                      <Text className="gba:text-sm gba:text-gray-500">
                        {Math.abs(kpiData?.averageComplexity.trend || 0)}%
                      </Text>
                    </Space>
                  }
                />
              </Card>
            </Col>
          </Row>

          {/* Filters */}
          <Card className="gba:mb-6" data-testid="bom-filters-card">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <DebouncedInput
                  placeholder="Search BOMs..."
                  prefix={<MagnifyingGlassIcon />}
                  value={searchTerm}
                  onChange={handleSearch}
                  data-testid="bom-search-input"
                />
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Select
                  placeholder="BOM Type"
                  value={bomTypeFilter}
                  onChange={handleBomTypeChange}
                  allowClear
                  className="gba:w-full"
                  data-testid="bom-type-filter"
                >
                  <Option value="PRODUCTION">Production</Option>
                  <Option value="ENGINEERING">Engineering</Option>
                  <Option value="SALES">Sales</Option>
                  <Option value="COSTING">Costing</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Select
                  placeholder="Status"
                  value={bomStatusFilter}
                  onChange={handleBomStatusChange}
                  allowClear
                  className="gba:w-full"
                  data-testid="bom-status-filter"
                >
                  <Option value="ACTIVE">Active</Option>
                  <Option value="INACTIVE">Inactive</Option>
                  <Option value="PENDING">Pending</Option>
                  <Option value="OBSOLETE">Obsolete</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Select
                  placeholder="Active Only"
                  value={activeOnlyFilter}
                  onChange={handleActiveOnlyChange}
                  allowClear
                  className="gba:w-full"
                  data-testid="bom-active-filter"
                >
                  <Option value={true}>Active Only</Option>
                  <Option value={false}>All BOMs</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Button onClick={refreshData} loading={loading} className="gba:w-full" data-testid="refresh-button">
                  Refresh
                </Button>
              </Col>
            </Row>
          </Card>

          {/* BOMs Table */}
          <Card title="Bill of Materials" data-testid="boms-table-card">
            <Table
              columns={columns}
              dataSource={boms}
              rowKey="id"
              loading={loading}
              pagination={{
                current: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} BOMs`,
                onChange: handleTableChange,
                onShowSizeChange: handleTableChange
              }}
              onRow={record => ({
                onClick: () => handleRowClick(record),
                className: selectedBomId === record.id ? 'gba:bg-blue-50' : '',
                style: { cursor: 'pointer' },
                'data-testid': `bom-row-${record.id}`
              })}
              scroll={{ x: true }}
              data-testid="boms-table"
            />
          </Card>
        </div>
      }
    />
  )
}

export default BomManagementOverview
