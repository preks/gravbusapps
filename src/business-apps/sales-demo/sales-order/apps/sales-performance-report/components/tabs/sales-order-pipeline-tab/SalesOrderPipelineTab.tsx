import React from 'react'
import { Card, Row, Col, Statistic, Alert, Typography, Spin, Progress, Table } from 'antd'
import { FunnelIcon, ClockIcon, ChartBarIcon, TrendUpIcon, WarningIcon } from '@phosphor-icons/react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line
} from 'recharts'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSalesPerformanceData } from '../../../hooks/useSalesPerformanceData'

const { Text } = Typography

export interface SalesOrderPipelineTabProps extends BusinessAppContextProps {}

const SalesOrderPipelineTab: React.FC<SalesOrderPipelineTabProps> = ({ accessToken, userInfo, additionalData }) => {
  const { pipelineMetrics, loading, error } = useSalesPerformanceData({ accessToken })

  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Generate aging orders mock data
  const agingOrdersData = [
    { ageRange: '0-7 days', count: 45, value: 128250, percentage: 35, status: 'normal' },
    { ageRange: '8-14 days', count: 32, value: 91200, percentage: 25, status: 'normal' },
    { ageRange: '15-30 days', count: 28, value: 79800, percentage: 22, status: 'warning' },
    { ageRange: '31-60 days', count: 15, value: 42750, percentage: 12, status: 'warning' },
    { ageRange: '60+ days', count: 8, value: 22800, percentage: 6, status: 'critical' }
  ]

  // Pipeline conversion data for visualization
  const conversionData =
    pipelineMetrics?.stagesData.map(stage => ({
      stage: stage.stage,
      conversionRate: stage.conversionRate,
      dropOffRate: stage.dropOffRate,
      count: stage.count
    })) || []

  // Table columns for pipeline stages
  const pipelineColumns = [
    {
      title: 'Pipeline Stage',
      dataIndex: 'stage',
      key: 'stage',
      render: (stage: string) => <Text strong>{stage}</Text>
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => count.toLocaleString()
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (value: number) => formatCurrency(value)
    },
    {
      title: 'Avg Time (days)',
      dataIndex: 'averageTime',
      key: 'averageTime',
      render: (time: number) => `${time} days`
    },
    {
      title: 'Conversion Rate',
      dataIndex: 'conversionRate',
      key: 'conversionRate',
      render: (rate: number) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <Progress
            percent={rate}
            size="small"
            strokeColor={rate >= 90 ? '#0DBC7B' : rate >= 70 ? '#faad14' : '#D3004F'}
            showInfo={false}
            style={{ width: '60px' }}
          />
          <Text>{rate}%</Text>
        </div>
      )
    },
    {
      title: 'Drop-off Rate',
      dataIndex: 'dropOffRate',
      key: 'dropOffRate',
      render: (rate: number) => (
        <Text style={{ color: rate > 10 ? '#D3004F' : rate > 5 ? '#faad14' : '#0DBC7B' }}>{rate}%</Text>
      )
    }
  ]

  // Aging orders table columns
  const agingColumns = [
    {
      title: 'Age Range',
      dataIndex: 'ageRange',
      key: 'ageRange'
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => count.toLocaleString()
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (value: number) => formatCurrency(value)
    },
    {
      title: 'Percentage',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage: number) => `${percentage}%`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          normal: '#0DBC7B',
          warning: '#faad14',
          critical: '#D3004F'
        }
        return (
          <div className="gba:flex gba:items-center gba:gap-1">
            {status === 'critical' && <WarningIcon size={16} style={{ color: colors[status] }} />}
            <Text style={{ color: colors[status] }}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
          </div>
        )
      }
    }
  ]

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-96" data-testid="sales-pipeline-loading">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid="sales-pipeline-error">
        <Alert message="Error Loading Pipeline Data" description={error.message} type="error" showIcon />
      </div>
    )
  }

  if (!pipelineMetrics) {
    return (
      <div className="gba:p-6" data-testid="sales-pipeline-no-data">
        <Alert
          message="No Pipeline Data Available"
          description="Sales pipeline data is not available at this time."
          type="info"
          showIcon
        />
      </div>
    )
  }

  return (
    <div className="gba:p-6" data-testid="sales-order-pipeline-tab">
      {/* Pipeline Overview KPIs */}
      <Row gutter={[16, 16]} className="gba:mb-6" data-testid="pipeline-kpi-cards">
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable className="gba:h-full" data-testid="total-pipeline-value-card">
            <Statistic
              title="Total Pipeline Value"
              value={pipelineMetrics.totalPipelineValue}
              prefix={<FunnelIcon size={16} />}
              valueStyle={{ fontSize: '24px' }}
              formatter={value => formatCurrency(Number(value))}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Across all pipeline stages
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable className="gba:h-full" data-testid="average-deal-size-card">
            <Statistic
              title="Average Deal Size"
              value={pipelineMetrics.averageDealSize}
              prefix={<TrendUpIcon size={16} />}
              valueStyle={{ fontSize: '24px' }}
              formatter={value => formatCurrency(Number(value))}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Per order average value
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable className="gba:h-full" data-testid="conversion-rate-card">
            <Statistic
              title="Overall Conversion Rate"
              value={pipelineMetrics.conversionRate}
              prefix={<ChartBarIcon />}
              suffix="%"
              valueStyle={{
                fontSize: '24px',
                color: pipelineMetrics.conversionRate >= 70 ? '#3f8600' : '#cf1322'
              }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Draft to closed conversion
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable className="gba:h-full" data-testid="average-sales-cycle-card">
            <Statistic
              title="Average Sales Cycle"
              value={pipelineMetrics.averageSalesCycle}
              prefix={<ClockIcon size={16} />}
              suffix=" days"
              valueStyle={{ fontSize: '24px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              From draft to delivery
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Pipeline Funnel Visualization */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24} lg={16}>
          <Card title="Pipeline Stage Funnel" data-testid="pipeline-funnel-chart">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={pipelineMetrics.stagesData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={value => value.toLocaleString()} />
                <YAxis dataKey="stage" type="category" width={100} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'count' ? value.toLocaleString() : formatCurrency(value),
                    name === 'count' ? 'Orders' : 'Value'
                  ]}
                />
                <Legend />
                <Bar dataKey="count" fill="#376399" name="Order Count" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Conversion Rates by Stage" data-testid="conversion-rates-chart">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Line
                  type="monotone"
                  dataKey="conversionRate"
                  stroke="#0DBC7B"
                  strokeWidth={3}
                  name="Conversion Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Detailed Pipeline Table */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        <Col xs={24}>
          <Card title="Pipeline Stage Details" data-testid="pipeline-details-table">
            <Table
              dataSource={pipelineMetrics.stagesData}
              columns={pipelineColumns}
              rowKey="stage"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>

      {/* Aging Orders Analysis */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="Aging Orders Analysis" data-testid="aging-orders-card">
            <Alert
              message="Orders requiring attention"
              description="18% of orders are aging beyond 30 days and may need intervention"
              type="warning"
              showIcon
              className="gba:mb-4"
            />
            <Table
              dataSource={agingOrdersData}
              columns={agingColumns}
              rowKey="ageRange"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default SalesOrderPipelineTab
