import React from 'react'
import { Card, Row, Col, Statistic, Alert, Typography, Spin, Progress, Table } from 'antd'
import { TruckOutlined, ClockCircleOutlined, CheckCircleOutlined, GlobalOutlined } from '@ant-design/icons'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter
} from 'recharts'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSalesPerformanceData } from '../../../hooks/useSalesPerformanceData'

const { Text } = Typography

export interface FulfillmentDeliveryTabProps extends BusinessAppContextProps {}

const FulfillmentDeliveryTab: React.FC<FulfillmentDeliveryTabProps> = ({ accessToken, userInfo, additionalData }) => {
  const { fulfillmentMetrics, loading, error } = useSalesPerformanceData({ accessToken })

  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Mock data for delivery mode performance
  const deliveryModeData = [
    {
      mode: 'Standard',
      onTimeRate: 89.2,
      averageTime: 7.5,
      cost: 45,
      volume: 856,
      customerSatisfaction: 4.2
    },
    {
      mode: 'Express',
      onTimeRate: 94.1,
      averageTime: 3.2,
      cost: 85,
      volume: 324,
      customerSatisfaction: 4.6
    },
    {
      mode: 'Rush',
      onTimeRate: 96.8,
      averageTime: 1.8,
      cost: 150,
      volume: 89,
      customerSatisfaction: 4.8
    },
    {
      mode: 'Overnight',
      onTimeRate: 98.2,
      averageTime: 1.0,
      cost: 220,
      volume: 45,
      customerSatisfaction: 4.9
    },
    {
      mode: 'Freight',
      onTimeRate: 82.5,
      averageTime: 12.3,
      cost: 125,
      volume: 156,
      customerSatisfaction: 3.8
    }
  ]

  // Mock data for carrier performance
  const carrierData = [
    {
      carrier: 'AutoParts Express',
      onTimeRate: 91.5,
      averageTime: 5.2,
      cost: 68,
      volume: 445,
      damageRate: 0.8
    },
    {
      carrier: 'FastTrack Logistics',
      onTimeRate: 88.3,
      averageTime: 6.1,
      cost: 72,
      volume: 389,
      damageRate: 1.2
    },
    {
      carrier: 'Global Auto Freight',
      onTimeRate: 85.7,
      averageTime: 7.8,
      cost: 58,
      volume: 298,
      damageRate: 2.1
    },
    {
      carrier: 'Premium Parts Delivery',
      onTimeRate: 94.2,
      averageTime: 4.3,
      cost: 95,
      volume: 234,
      damageRate: 0.3
    }
  ]

  // Mock data for geographic performance
  const geographicData = [
    {
      region: 'North America',
      onTimeRate: 92.1,
      averageTime: 4.8,
      volume: 678,
      challenges: ['Weather delays', 'Border crossings']
    },
    {
      region: 'Europe',
      onTimeRate: 89.4,
      averageTime: 6.2,
      volume: 445,
      challenges: ['Customs clearance', 'Multi-country routing']
    },
    {
      region: 'Asia Pacific',
      onTimeRate: 86.7,
      averageTime: 8.5,
      volume: 298,
      challenges: ['Port congestion', 'Distance']
    },
    {
      region: 'Latin America',
      onTimeRate: 83.2,
      averageTime: 9.8,
      volume: 156,
      challenges: ['Infrastructure', 'Documentation']
    }
  ]

  // Mock data for manufacturing lead time correlation
  const leadTimeCorrelationData = [
    {
      productCategory: 'Engine Components',
      manufacturingTime: 14,
      deliveryTime: 5.2,
      totalLeadTime: 19.2,
      onTimeRate: 88.5
    },
    {
      productCategory: 'Brake Systems',
      manufacturingTime: 8,
      deliveryTime: 4.1,
      totalLeadTime: 12.1,
      onTimeRate: 92.3
    },
    {
      productCategory: 'Suspension Parts',
      manufacturingTime: 12,
      deliveryTime: 6.8,
      totalLeadTime: 18.8,
      onTimeRate: 85.7
    },
    {
      productCategory: 'Electrical Components',
      manufacturingTime: 6,
      deliveryTime: 3.5,
      totalLeadTime: 9.5,
      onTimeRate: 94.1
    },
    { productCategory: 'Body Parts', manufacturingTime: 18, deliveryTime: 7.2, totalLeadTime: 25.2, onTimeRate: 82.4 }
  ]

  // Table columns for delivery modes
  const deliveryModeColumns = [
    {
      title: 'Delivery Mode',
      dataIndex: 'mode',
      key: 'mode',
      render: (mode: string) => <Text strong>{mode}</Text>
    },
    {
      title: 'On-Time Rate',
      dataIndex: 'onTimeRate',
      key: 'onTimeRate',
      render: (rate: number) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <Progress
            percent={rate}
            size="small"
            strokeColor={rate >= 95 ? '#0DBC7B' : rate >= 85 ? '#faad14' : '#D3004F'}
            showInfo={false}
            style={{ width: '60px' }}
          />
          <Text>{rate}%</Text>
        </div>
      )
    },
    {
      title: 'Avg Time (days)',
      dataIndex: 'averageTime',
      key: 'averageTime',
      render: (time: number) => `${time} days`
    },
    {
      title: 'Cost',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost: number) => formatCurrency(cost)
    },
    {
      title: 'Volume',
      dataIndex: 'volume',
      key: 'volume',
      render: (volume: number) => volume.toLocaleString()
    },
    {
      title: 'Satisfaction',
      dataIndex: 'customerSatisfaction',
      key: 'customerSatisfaction',
      render: (rating: number) => `${rating}/5.0`
    }
  ]

  // Table columns for carriers
  const carrierColumns = [
    {
      title: 'Carrier',
      dataIndex: 'carrier',
      key: 'carrier',
      render: (carrier: string) => <Text strong>{carrier}</Text>
    },
    {
      title: 'On-Time Rate',
      dataIndex: 'onTimeRate',
      key: 'onTimeRate',
      render: (rate: number) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <Progress
            percent={rate}
            size="small"
            strokeColor={rate >= 90 ? '#0DBC7B' : rate >= 80 ? '#faad14' : '#D3004F'}
            showInfo={false}
            style={{ width: '60px' }}
          />
          <Text>{rate}%</Text>
        </div>
      )
    },
    {
      title: 'Avg Time (days)',
      dataIndex: 'averageTime',
      key: 'averageTime',
      render: (time: number) => `${time} days`
    },
    {
      title: 'Cost',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost: number) => formatCurrency(cost)
    },
    {
      title: 'Volume',
      dataIndex: 'volume',
      key: 'volume',
      render: (volume: number) => volume.toLocaleString()
    },
    {
      title: 'Damage Rate',
      dataIndex: 'damageRate',
      key: 'damageRate',
      render: (rate: number) => (
        <Text style={{ color: rate > 2 ? '#D3004F' : rate > 1 ? '#faad14' : '#0DBC7B' }}>{rate}%</Text>
      )
    }
  ]

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-96" data-testid="fulfillment-delivery-loading">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid="fulfillment-delivery-error">
        <Alert message="Error Loading Fulfillment Data" description={error.message} type="error" showIcon />
      </div>
    )
  }

  if (!fulfillmentMetrics) {
    return (
      <div className="gba:p-6" data-testid="fulfillment-delivery-no-data">
        <Alert
          message="No Fulfillment Data Available"
          description="Fulfillment and delivery data is not available at this time."
          type="info"
          showIcon
        />
      </div>
    )
  }

  return (
    <div className="gba:p-6" data-testid="fulfillment-delivery-tab">
      {/* Fulfillment Overview KPIs */}
      <Row gutter={[16, 16]} className="gba:mb-6" data-testid="fulfillment-kpi-cards">
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable className="gba:h-full" data-testid="on-time-delivery-card">
            <Statistic
              title="On-Time Delivery Rate"
              value={fulfillmentMetrics.onTimeDeliveryRate}
              prefix={<CheckCircleOutlined />}
              suffix="%"
              valueStyle={{
                fontSize: '24px',
                color: fulfillmentMetrics.onTimeDeliveryRate >= 90 ? '#3f8600' : '#cf1322'
              }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Target: 95%
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable className="gba:h-full" data-testid="average-lead-time-card">
            <Statistic
              title="Average Lead Time"
              value={fulfillmentMetrics.averageLeadTime}
              prefix={<ClockCircleOutlined />}
              suffix=" days"
              valueStyle={{ fontSize: '24px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Manufacturing + delivery
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable className="gba:h-full" data-testid="fulfillment-time-card">
            <Statistic
              title="Avg Fulfillment Time"
              value={fulfillmentMetrics.averageFulfillmentTime}
              prefix={<TruckOutlined />}
              suffix=" days"
              valueStyle={{ fontSize: '24px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Order to shipment
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable className="gba:h-full" data-testid="orders-delivered-card">
            <Statistic
              title="Orders Delivered"
              value={fulfillmentMetrics.totalOrdersDelivered}
              prefix={<GlobalOutlined />}
              valueStyle={{ fontSize: '24px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Out of {fulfillmentMetrics.totalOrdersShipped} shipped
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Delivery Mode Performance */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24}>
          <Card title="Delivery Mode Performance Comparison" data-testid="delivery-mode-performance-card">
            <Table
              dataSource={deliveryModeData}
              columns={deliveryModeColumns}
              rowKey="mode"
              pagination={false}
              size="middle"
              className="gba:mb-4"
            />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deliveryModeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mode" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="onTimeRate" fill="#0DBC7B" name="On-Time Rate (%)" />
                <Bar dataKey="customerSatisfaction" fill="#376399" name="Customer Satisfaction" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Carrier Performance */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24}>
          <Card title="Carrier Performance Analysis" data-testid="carrier-performance-card">
            <Table
              dataSource={carrierData}
              columns={carrierColumns}
              rowKey="carrier"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>

      {/* Geographic Performance & Manufacturing Correlation */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Performance by Geographic Region" data-testid="geographic-performance-card">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={geographicData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="onTimeRate" fill="#376399" name="On-Time Rate (%)" />
                <Bar dataKey="volume" fill="#0DBC7B" name="Volume" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Manufacturing vs Delivery Lead Time" data-testid="lead-time-correlation-card">
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={leadTimeCorrelationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="manufacturingTime" name="Manufacturing Time" unit=" days" />
                <YAxis dataKey="deliveryTime" name="Delivery Time" unit=" days" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value, name) => [
                    `${value} days`,
                    name === 'deliveryTime' ? 'Delivery Time' : 'Manufacturing Time'
                  ]}
                />
                <Scatter dataKey="deliveryTime" fill="#376399" />
              </ScatterChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default FulfillmentDeliveryTab
