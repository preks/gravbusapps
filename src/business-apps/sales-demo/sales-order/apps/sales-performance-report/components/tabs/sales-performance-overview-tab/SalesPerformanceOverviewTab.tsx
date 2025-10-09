import React from 'react'
import { Card, Row, Col, Statistic, Alert, Typography, Spin } from 'antd'
import {
  DollarOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  BarChartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSalesPerformanceData } from '../../../hooks/useSalesPerformanceData'

const { Text } = Typography

export interface SalesPerformanceOverviewTabProps extends BusinessAppContextProps {}

const SalesPerformanceOverviewTab: React.FC<SalesPerformanceOverviewTabProps> = ({
  accessToken,
  userInfo,
  additionalData
}) => {
  const { kpiData, performanceData, productCategoryData, regionalData, loading, error } = useSalesPerformanceData({
    accessToken
  })

  // Helper function to format currency
  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Helper function to get trend display
  const getTrendDisplay = (trend: number) => {
    const isPositive = trend >= 0
    return {
      icon: isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />,
      color: isPositive ? '#3f8600' : '#cf1322',
      text: `${Math.abs(trend)}%`
    }
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-96"
        data-testid="sales-performance-overview-loading"
      >
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid="sales-performance-overview-error">
        <Alert message="Error Loading Sales Performance Data" description={error.message} type="error" showIcon />
      </div>
    )
  }

  if (!kpiData) {
    return (
      <div className="gba:p-6" data-testid="sales-performance-overview-no-data">
        <Alert
          message="No Data Available"
          description="Sales performance data is not available at this time."
          type="info"
          showIcon
        />
      </div>
    )
  }

  // Prepare chart colors
  const chartColors = ['#376399', '#0DBC7B', '#A2519A', '#F5A400', '#D3004F']

  // Prepare regional data for pie chart
  const regionalChartData = regionalData.map((item, index) => ({
    ...item,
    fill: chartColors[index % chartColors.length]
  }))

  return (
    <div className="gba:p-6" data-testid="sales-performance-overview-tab">
      {/* KPI Cards */}
      <Row gutter={[16, 16]} className="gba:mb-6" data-testid="kpi-cards-row">
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable className="gba:h-full" data-testid="total-sales-kpi-card">
            <Statistic
              title="Total Sales"
              value={kpiData.totalSales.value}
              prefix={<DollarOutlined />}
              valueStyle={{ fontSize: '24px' }}
              formatter={value => formatCurrency(Number(value), kpiData.totalSales.currency)}
            />
            <div className="gba:mt-1">
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Automotive parts revenue
              </Text>
            </div>
            <div
              className="gba:mt-2 gba:flex gba:items-center"
              style={{ color: getTrendDisplay(kpiData.totalSales.trend).color }}
            >
              {getTrendDisplay(kpiData.totalSales.trend).icon}
              <span className="gba:ml-1">
                {getTrendDisplay(kpiData.totalSales.trend).text} {kpiData.totalSales.period}
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable className="gba:h-full" data-testid="average-order-value-kpi-card">
            <Statistic
              title="Average Order Value"
              value={kpiData.averageOrderValue.value}
              prefix={<BarChartOutlined />}
              valueStyle={{ fontSize: '24px' }}
              formatter={value => formatCurrency(Number(value), kpiData.averageOrderValue.currency)}
            />
            <div className="gba:mt-1">
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Per order average
              </Text>
            </div>
            <div
              className="gba:mt-2 gba:flex gba:items-center"
              style={{ color: getTrendDisplay(kpiData.averageOrderValue.trend).color }}
            >
              {getTrendDisplay(kpiData.averageOrderValue.trend).icon}
              <span className="gba:ml-1">
                {getTrendDisplay(kpiData.averageOrderValue.trend).text} {kpiData.averageOrderValue.period}
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable className="gba:h-full" data-testid="number-of-orders-kpi-card">
            <Statistic
              title="Number of Orders"
              value={kpiData.numberOfOrders.value}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ fontSize: '24px' }}
            />
            <div className="gba:mt-1">
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Total orders processed
              </Text>
            </div>
            <div
              className="gba:mt-2 gba:flex gba:items-center"
              style={{ color: getTrendDisplay(kpiData.numberOfOrders.trend).color }}
            >
              {getTrendDisplay(kpiData.numberOfOrders.trend).icon}
              <span className="gba:ml-1">
                {getTrendDisplay(kpiData.numberOfOrders.trend).text} {kpiData.numberOfOrders.period}
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable className="gba:h-full" data-testid="growth-vs-previous-kpi-card">
            <Statistic
              title="Growth vs Previous Period"
              value={kpiData.growthVsPrevious.value}
              prefix={<RiseOutlined />}
              suffix="%"
              valueStyle={{
                fontSize: '24px',
                color: kpiData.growthVsPrevious.value >= 0 ? '#3f8600' : '#cf1322'
              }}
            />
            <div className="gba:mt-1">
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Period over period
              </Text>
            </div>
            <div
              className="gba:mt-2 gba:flex gba:items-center"
              style={{ color: getTrendDisplay(kpiData.growthVsPrevious.trend).color }}
            >
              {getTrendDisplay(kpiData.growthVsPrevious.trend).icon}
              <span className="gba:ml-1">
                {getTrendDisplay(kpiData.growthVsPrevious.trend).text} {kpiData.growthVsPrevious.period}
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Section */}
      <Row gutter={[16, 16]} className="gba:mb-6">
        {/* Sales Trends Chart */}
        <Col xs={24} lg={16}>
          <Card
            title="6-Month Sales Performance Comparison"
            className="gba:h-full"
            data-testid="sales-trends-chart-card"
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={value => formatCurrency(value)} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'currentPeriod' ? 'Current Period' : 'Previous Period'
                  ]}
                />
                <Legend />
                <Line type="monotone" dataKey="currentPeriod" stroke="#376399" strokeWidth={3} name="Current Period" />
                <Line
                  type="monotone"
                  dataKey="previousPeriod"
                  stroke="#0DBC7B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Previous Period"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Regional Sales Distribution */}
        <Col xs={24} lg={8}>
          <Card title="Sales by Region" className="gba:h-full" data-testid="regional-sales-chart-card">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={regionalChartData} cx="50%" cy="50%" outerRadius={80} dataKey="sales" nameKey="region">
                  {regionalChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Product Category Performance */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="Product Category Performance" data-testid="product-category-chart-card">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productCategoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
                <YAxis tickFormatter={value => formatCurrency(value)} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'sales' ? formatCurrency(value) : value,
                    name === 'sales' ? 'Sales' : 'Orders'
                  ]}
                />
                <Legend />
                <Bar dataKey="sales" fill="#376399" name="Sales" />
                <Bar dataKey="orders" fill="#0DBC7B" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default SalesPerformanceOverviewTab
