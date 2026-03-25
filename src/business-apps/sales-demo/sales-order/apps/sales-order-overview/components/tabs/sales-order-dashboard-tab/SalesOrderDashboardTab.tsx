import React from 'react'
import { Card, Row, Col, Statistic, Alert, Typography } from 'antd'
import {
  ShoppingCartIcon,
  CurrencyEurIcon,
  FileTextIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@phosphor-icons/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSalesOrderData } from '../../../hooks/useSalesOrderData'

const { Text } = Typography

export interface SalesOrderDashboardTabProps extends BusinessAppContextProps {}

const SalesOrderDashboardTab: React.FC<SalesOrderDashboardTabProps> = ({
  accessToken,
  userInfo,
  additionalData,
  activeStructureId
}) => {
  // Hooks
  const { kpiData, loading, error, isUsingDemoData } = useSalesOrderData({ accessToken })

  // Demo data for sales performance chart (6 months current + 6 months previous)
  const salesPerformanceData = [
    { month: 'Jul 2024', currentPeriod: 385420, previousPeriod: 342180, target: 400000 },
    { month: 'Aug 2024', currentPeriod: 412350, previousPeriod: 378920, target: 400000 },
    { month: 'Sep 2024', currentPeriod: 398760, previousPeriod: 365440, target: 400000 },
    { month: 'Oct 2024', currentPeriod: 445280, previousPeriod: 398650, target: 400000 },
    { month: 'Nov 2024', currentPeriod: 423190, previousPeriod: 387230, target: 400000 },
    { month: 'Dec 2024', currentPeriod: 386483, previousPeriod: 359580, target: 400000 }
  ]

  // Format currency
  const formatCurrency = (value: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Get trend color and icon
  const getTrendDisplay = (trend: number) => {
    const isPositive = trend > 0
    const color = isPositive ? '#52c41a' : trend < 0 ? '#ff4d4f' : '#faad14'
    const icon = isPositive ? <ArrowUpIcon size={16} /> : trend < 0 ? <ArrowDownIcon size={16} /> : null
    return { color, icon, text: `${Math.abs(trend).toFixed(1)}%` }
  }

  const handleKPIClick = (kpiType: string) => {
    console.log('KPI clicked:', kpiType)
    // Navigate to orders tab with filter
    if (window.salesOrderTabNavigationAPI) {
      window.salesOrderTabNavigationAPI.setActiveTab('orders')
    }
  }

  // Render KPI Cards
  const renderKPICards = () => {
    if (!kpiData) return null

    const kpis = [
      {
        title: 'My Total Sales Orders',
        subtitle: 'Orders you are responsible for',
        value: kpiData.totalSalesOrders.value,
        trend: kpiData.totalSalesOrders.trend,
        period: kpiData.totalSalesOrders.period,
        icon: <ShoppingCartIcon size={16} />,
        onClick: () => handleKPIClick('totalOrders')
      },
      {
        title: 'My Total Order Value',
        subtitle: 'Value of your managed orders',
        value: formatCurrency(kpiData.totalOrderValue.value, kpiData.totalOrderValue.currency),
        trend: kpiData.totalOrderValue.trend,
        period: kpiData.totalOrderValue.period,
        icon: <CurrencyEurIcon size={16} />,
        onClick: () => handleKPIClick('totalValue')
      },
      {
        title: 'My Open Orders',
        subtitle: 'Active orders in progress',
        value: kpiData.openOrders.value,
        trend: kpiData.openOrders.trend,
        period: kpiData.openOrders.period,
        icon: <FileTextIcon size={16} />,
        onClick: () => handleKPIClick('openOrders')
      },
      {
        title: 'Pending My Approval',
        subtitle: 'Orders awaiting your approval',
        value: kpiData.pendingApproval.value,
        trend: kpiData.pendingApproval.trend,
        period: kpiData.pendingApproval.period,
        icon: <ClockIcon size={16} />,
        onClick: () => handleKPIClick('pendingApproval')
      }
    ]

    return (
      <Row gutter={[16, 16]} className="gba:mb-6" data-testid="kpi-cards-row">
        {kpis.map((kpi, index) => {
          const trendDisplay = getTrendDisplay(kpi.trend)
          return (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card
                hoverable
                className="gba:h-full gba:cursor-pointer"
                onClick={kpi.onClick}
                data-testid={`kpi-card-${index}`}
              >
                <Statistic
                  title={kpi.title}
                  value={typeof kpi.value === 'string' ? kpi.value : kpi.value}
                  prefix={kpi.icon}
                  valueStyle={{ fontSize: '24px' }}
                />
                <div className="gba:mt-1">
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {kpi.subtitle}
                  </Text>
                </div>
                <div className="gba:mt-2 gba:flex gba:items-center" style={{ color: trendDisplay.color }}>
                  {trendDisplay.icon}
                  <span className="gba:ml-1">
                    {trendDisplay.text} {kpi.period}
                  </span>
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid="error-container">
        <Alert message="Error Loading Sales Order Data" description={error.message} type="error" showIcon />
      </div>
    )
  }

  return (
    <div className="gba:p-6" data-testid="sales-order-dashboard-tab">
      {/* KPI Cards */}
      {renderKPICards()}

      {/* Sales Performance Chart */}
      <div className="gba:mt-6">
        <Card
          title="Sales Performance Overview"
          data-testid="performance-overview-card"
          extra={
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Last 6 months comparison
            </Text>
          }
        >
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={{ stroke: '#d9d9d9' }} />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#d9d9d9' }}
                  tickFormatter={value => `€${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `€${value.toLocaleString()}`,
                    name === 'currentPeriod' ? 'Current Period' : name === 'previousPeriod' ? 'Previous Year' : 'Target'
                  ]}
                  labelFormatter={label => `Month: ${label}`}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px'
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={value =>
                    value === 'currentPeriod'
                      ? 'Current Period'
                      : value === 'previousPeriod'
                        ? 'Previous Year'
                        : 'Target'
                  }
                />
                <Line
                  type="monotone"
                  dataKey="currentPeriod"
                  stroke="#1890ff"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#1890ff' }}
                  activeDot={{ r: 6, fill: '#1890ff' }}
                />
                <Line
                  type="monotone"
                  dataKey="previousPeriod"
                  stroke="#52c41a"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: '#52c41a' }}
                  activeDot={{ r: 5, fill: '#52c41a' }}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#faad14"
                  strokeWidth={2}
                  strokeDasharray="10 5"
                  dot={{ r: 2, fill: '#faad14' }}
                  activeDot={{ r: 4, fill: '#faad14' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="gba:mt-4 gba:text-center">
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Performance tracking for your managed sales orders. Current period shows strong growth compared to
              previous year.
            </Text>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default SalesOrderDashboardTab
