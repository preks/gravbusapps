import React, { useState, useCallback } from 'react'
import { Row, Col, Card, Tabs, Statistic, Tag, Space, Typography, Button, Descriptions, Table } from 'antd'
import {
  PiCube,
  PiArrowLeft,
  PiEye,
  PiTreeStructure,
  PiGear,
  PiCalendar,
  PiDatabase,
  PiArrowUp,
  PiArrowDown,
  PiMinus,
  PiWarning,
  PiCheckCircle
} from 'react-icons/pi'
// import { ActionButton } from '@newwork/gravity-ui-catalog';
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import { BomDetailTab } from '../../types'
import BomTreeView from './components/BomTreeView'
import {
  generateDemoBomDetail,
  generateDemoBomComponents,
  generateDemoBomDetailKPIData,
  generateDemoBomTree
} from './hooks/demoData'

// Extend dayjs with plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

const { Title, Text } = Typography

export interface BomDetailViewProps extends BusinessAppContextProps {
  bomId: string
  onBack?: () => void
}

const BomDetailView: React.FC<BomDetailViewProps> = ({ accessToken, bomId, onBack, userInfo, additionalData }) => {
  // State
  const [activeTab, setActiveTab] = useState<BomDetailTab>('overview')
  const [loading, setLoading] = useState(false)

  // Demo data (in real implementation, this would come from hooks)
  console.log('BomDetailView rendering for bomId:', bomId)
  const bom = generateDemoBomDetail(bomId)
  const components = generateDemoBomComponents(bomId)
  const kpiData = generateDemoBomDetailKPIData(bomId)
  const treeData = generateDemoBomTree(bomId)
  const isUsingDemoData = true

  console.log('BOM detail data:', { bom, components: components.length, kpiData, treeData: treeData.length })

  // Helper function to get trend icon
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <PiArrowUp className="gba:text-green-500" />
    if (trend < 0) return <PiArrowDown className="gba:text-red-500" />
    return <PiMinus className="gba:text-gray-400" />
  }

  // Helper function to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return dayjs(dateString).format('MMM DD, YYYY')
  }

  // Helper function to get BOM status color
  const getBomStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'green'
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

  // Helper function to get component type color
  const getComponentTypeColor = (type: string) => {
    switch (type) {
      case 'MATERIAL':
        return 'green'
      case 'PHANTOM':
        return 'purple'
      case 'REFERENCE':
        return 'gray'
      case 'TOOL':
        return 'orange'
      case 'RESOURCE':
        return 'cyan'
      default:
        return 'default'
    }
  }

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
    setActiveTab(key as BomDetailTab)
  }, [])

  // Check if BOM is currently active
  const isCurrentlyActive = () => {
    const now = dayjs()
    const activeFrom = bom.activeFrom ? dayjs(bom.activeFrom) : null
    const activeTo = bom.activeTo ? dayjs(bom.activeTo) : null

    return (
      bom.bomStatus === 'ACTIVE' && (!activeFrom || activeFrom.isBefore(now)) && (!activeTo || activeTo.isAfter(now))
    )
  }

  // Components table columns
  const componentColumns = [
    {
      title: 'Position',
      dataIndex: 'positionNumber',
      key: 'positionNumber',
      width: 80,
      sorter: true
    },
    {
      title: 'Component',
      key: 'component',
      render: (record: any) => (
        <div>
          <Text strong>{record.componentProduct?.name || 'N/A'}</Text>
          <br />
          <Text className="gba:text-sm gba:text-gray-500">{record.componentProduct?.productNumber || 'N/A'}</Text>
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'componentType',
      key: 'componentType',
      width: 100,
      render: (type: string) => (
        <Tag color={getComponentTypeColor(type)} size="small">
          {type}
        </Tag>
      )
    },
    {
      title: 'Quantity',
      key: 'quantity',
      width: 100,
      render: (record: any) => (
        <div>
          <Text>{record.quantity}</Text>
          <br />
          <Text className="gba:text-sm gba:text-gray-500">{record.uom || 'EA'}</Text>
        </div>
      )
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unitCost',
      key: 'unitCost',
      width: 100,
      render: (cost: number) => (cost ? `€${cost.toFixed(2)}` : 'N/A')
    },
    {
      title: 'Total Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 100,
      render: (cost: number) => (cost ? `€${cost.toFixed(2)}` : 'N/A')
    },
    {
      title: 'Flags',
      key: 'flags',
      width: 120,
      render: (record: any) => (
        <Space direction="vertical" size="small">
          {record.isCritical && (
            <Tag color="red" size="small" icon={<PiWarning />}>
              Critical
            </Tag>
          )}
          {record.isOptional && (
            <Tag color="orange" size="small">
              Optional
            </Tag>
          )}
        </Space>
      )
    }
  ]

  return (
    <div className="gba:p-6" data-testid="bom-detail-view">
      {/* Header */}
      <Card className="gba:mb-6" data-testid="bom-header-card">
        <Row align="middle" justify="space-between">
          <Col>
            <div className="gba:flex gba:items-center gba:gap-4">
              <Button type="text" icon={<PiArrowLeft />} onClick={handleBack} data-testid="back-button">
                Back to Overview
              </Button>
              <div>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <PiCube className="gba:text-2xl gba:text-blue-500" />
                  <Title level={3} className="gba:m-0">
                    {bom.name}
                  </Title>
                  <Tag
                    color={getBomStatusColor(bom.bomStatus)}
                    icon={isCurrentlyActive() ? <PiCheckCircle /> : <PiWarning />}
                  >
                    {bom.bomStatus}
                  </Tag>
                </div>
                <div className="gba:flex gba:items-center gba:gap-4 gba:mt-2">
                  <Text className="gba:text-gray-500">BOM ID: {bom.businessKey}</Text>
                  <Text className="gba:text-gray-500">Version: {bom.version}</Text>
                  <Text className="gba:text-gray-500">Type: {bom.bomType}</Text>
                </div>
              </div>
            </div>
          </Col>
          <Col>
            <Button type="primary" data-testid="bom-actions">
              Actions
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Parent Product Info */}
      <Card className="gba:mb-6" data-testid="parent-product-card">
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <div>
              <Text className="gba:text-gray-500 gba:block gba:mb-1">Parent Product</Text>
              <Title level={4} className="gba:m-0">
                {bom.parentProduct?.name || 'N/A'}
              </Title>
              <Text className="gba:text-gray-500">{bom.parentProduct?.productNumber || 'N/A'}</Text>
              {bom.description && (
                <div className="gba:mt-2">
                  <Text>{bom.description}</Text>
                </div>
              )}
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="gba:text-right">
              <Statistic
                title="Base Quantity"
                value={bom.baseQuantity}
                suffix={bom.baseUom || 'EA'}
                valueStyle={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}
              />
              <Text className="gba:text-gray-500">Last updated: {formatDate(bom.updatedAt)}</Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Tabbed Interface */}
      <Card data-testid="bom-details-tabs-card">
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
                      <Card className="gba:text-center gba:h-full" data-testid="total-components-kpi">
                        <Statistic
                          title="Total Components"
                          value={kpiData?.totalComponents.value || 0}
                          prefix={<PiGear />}
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
                      <Card className="gba:text-center gba:h-full" data-testid="total-cost-kpi">
                        <Statistic
                          title="Total Cost"
                          value={kpiData?.totalCost.value || 0}
                          prefix="€"
                          precision={2}
                          suffix={
                            <Space>
                              {getTrendIcon(kpiData?.totalCost.trend || 0)}
                              <Text className="gba:text-sm gba:text-gray-500">
                                {Math.abs(kpiData?.totalCost.trend || 0)}%
                              </Text>
                            </Space>
                          }
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card className="gba:text-center gba:h-full" data-testid="complexity-kpi">
                        <Statistic
                          title="Complexity"
                          value={kpiData?.complexity.value || 0}
                          precision={1}
                          suffix={
                            <Space>
                              {getTrendIcon(kpiData?.complexity.trend || 0)}
                              <Text className="gba:text-sm gba:text-gray-500">
                                {Math.abs(kpiData?.complexity.trend || 0)}%
                              </Text>
                            </Space>
                          }
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card className="gba:text-center gba:h-full" data-testid="critical-components-kpi">
                        <Statistic
                          title="Critical Components"
                          value={kpiData?.criticalComponents.value || 0}
                          prefix={<PiWarning />}
                          suffix={
                            <Space>
                              {getTrendIcon(kpiData?.criticalComponents.trend || 0)}
                              <Text className="gba:text-sm gba:text-gray-500">
                                {Math.abs(kpiData?.criticalComponents.trend || 0)}%
                              </Text>
                            </Space>
                          }
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* Basic Information */}
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                      <Card title="BOM Information" size="small">
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="Business Key">{bom.businessKey}</Descriptions.Item>
                          <Descriptions.Item label="BOM Type">
                            <Tag color="blue">{bom.bomType}</Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="BOM Level">{bom.bomLevel}</Descriptions.Item>
                          <Descriptions.Item label="Base Quantity">
                            {bom.baseQuantity} {bom.baseUom || 'EA'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Scrap Factor">
                            {bom.scrapFactor ? `${(bom.scrapFactor * 100).toFixed(1)}%` : 'N/A'}
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Card title="Validity Period" size="small">
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="Active From">{formatDate(bom.activeFrom)}</Descriptions.Item>
                          <Descriptions.Item label="Active To">{formatDate(bom.activeTo)}</Descriptions.Item>
                          <Descriptions.Item label="Valid From">{formatDate(bom.validFrom)}</Descriptions.Item>
                          <Descriptions.Item label="Valid To">{formatDate(bom.validTo)}</Descriptions.Item>
                          <Descriptions.Item label="Status">
                            <Tag
                              color={getBomStatusColor(bom.bomStatus)}
                              icon={isCurrentlyActive() ? <PiCheckCircle /> : <PiWarning />}
                            >
                              {isCurrentlyActive() ? 'Currently Active' : bom.bomStatus}
                            </Tag>
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </Col>
                  </Row>
                </div>
              )
            },
            {
              key: 'structure',
              label: (
                <Space>
                  <PiTreeStructure />
                  <span>BOM Structure</span>
                </Space>
              ),
              children: (
                <div data-testid="structure-tab">
                  <BomTreeView treeData={treeData} loading={loading} data-testid="bom-tree-view" />
                </div>
              )
            },
            {
              key: 'components',
              label: (
                <Space>
                  <PiGear />
                  <span>Components</span>
                </Space>
              ),
              children: (
                <div data-testid="components-tab">
                  <Table
                    columns={componentColumns}
                    dataSource={components}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} components`
                    }}
                    scroll={{ x: true }}
                    data-testid="components-table"
                  />
                </div>
              )
            },
            {
              key: 'validity',
              label: (
                <Space>
                  <PiCalendar />
                  <span>Validity & Lifecycle</span>
                </Space>
              ),
              children: (
                <div data-testid="validity-tab">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                      <Card title="Validity Information" size="small">
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="Active From">{formatDate(bom.activeFrom)}</Descriptions.Item>
                          <Descriptions.Item label="Active To">{formatDate(bom.activeTo)}</Descriptions.Item>
                          <Descriptions.Item label="Valid From">{formatDate(bom.validFrom)}</Descriptions.Item>
                          <Descriptions.Item label="Valid To">{formatDate(bom.validTo)}</Descriptions.Item>
                          <Descriptions.Item label="Current Status">
                            <Tag
                              color={getBomStatusColor(bom.bomStatus)}
                              icon={isCurrentlyActive() ? <PiCheckCircle /> : <PiWarning />}
                            >
                              {isCurrentlyActive() ? 'Currently Active' : bom.bomStatus}
                            </Tag>
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Card title="Lifecycle Information" size="small">
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="Version">{bom.version}</Descriptions.Item>
                          <Descriptions.Item label="Record State">{bom.recordState || 'N/A'}</Descriptions.Item>
                          <Descriptions.Item label="Created">{formatDate(bom.createdAt)}</Descriptions.Item>
                          <Descriptions.Item label="Last Updated">{formatDate(bom.updatedAt)}</Descriptions.Item>
                          <Descriptions.Item label="Created By">{bom.createdBy || 'N/A'}</Descriptions.Item>
                          <Descriptions.Item label="Updated By">{bom.updatedBy || 'N/A'}</Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </Col>
                  </Row>
                </div>
              )
            },
            {
              key: 'system',
              label: (
                <Space>
                  <PiDatabase />
                  <span>System Information</span>
                </Space>
              ),
              children: (
                <div data-testid="system-tab">
                  <Card title="System Information" size="small">
                    <Descriptions column={2} size="small">
                      <Descriptions.Item label="BOM ID">{bom.id}</Descriptions.Item>
                      <Descriptions.Item label="Business Key">{bom.businessKey}</Descriptions.Item>
                      <Descriptions.Item label="Version">{bom.version}</Descriptions.Item>
                      <Descriptions.Item label="Record State">{bom.recordState || 'N/A'}</Descriptions.Item>
                      <Descriptions.Item label="Process Instance ID">
                        {bom.processInstanceId || 'N/A'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Is Deleted">{bom.isDeleted ? 'Yes' : 'No'}</Descriptions.Item>
                      <Descriptions.Item label="Created At">{formatDate(bom.createdAt)}</Descriptions.Item>
                      <Descriptions.Item label="Updated At">{formatDate(bom.updatedAt)}</Descriptions.Item>
                      <Descriptions.Item label="Created By">{bom.createdBy || 'N/A'}</Descriptions.Item>
                      <Descriptions.Item label="Updated By">{bom.updatedBy || 'N/A'}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </div>
              )
            }
          ]}
        />
      </Card>
    </div>
  )
}

export default BomDetailView
