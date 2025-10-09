import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { FileText, CurrencyDollar, TrendUp, Calendar } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import type { InvestmentReport, Investment } from '@/common/data/investment'
import dayjs from 'dayjs'

interface ReportAnalyticsProps {
  reports: InvestmentReport[]
  investments: Investment[]
  prefixDataTestId: string
}

export const ReportAnalytics: React.FC<ReportAnalyticsProps> = ({ reports, investments, prefixDataTestId }) => {
  // Calculate statistics
  const totalReports = reports.length
  const totalInvestments = investments.length
  const totalMarketValue = reports.reduce((sum, report) => sum + (report.investmentMarketValue || 0), 0)
  const averageMarketValue = totalReports > 0 ? totalMarketValue / totalReports : 0

  // Reports by month (last 12 months)
  const reportsByMonth = Array.from({ length: 12 }, (_, i) => {
    const date = dayjs().subtract(i, 'month')
    const monthKey = date.format('YYYY-MM')
    const monthLabel = date.format('MMM YYYY')

    const count = reports.filter(report => {
      if (!report.date) return false
      return dayjs(report.date).format('YYYY-MM') === monthKey
    }).length

    return { month: monthLabel, count }
  }).reverse()

  // Reports by investment type
  const reportsByType = reports.reduce(
    (acc, report) => {
      const type = report.investment?.investmentType?.value || 'Unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const typeChartData = Object.entries(reportsByType).map(([type, count]) => ({
    type,
    count
  }))

  // Reports by scope
  const reportsByScope = reports.reduce(
    (acc, report) => {
      const scope = report.scope || 'Unknown'
      acc[scope] = (acc[scope] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const scopeChartData = Object.entries(reportsByScope).map(([scope, count]) => ({
    scope,
    count
  }))

  // Market value trend over time
  const marketValueTrend = reports
    .filter(report => report.date && report.investmentMarketValue)
    .sort((a, b) => dayjs(a.date!).valueOf() - dayjs(b.date!).valueOf())
    .map(report => ({
      date: dayjs(report.date!).format('MMM DD'),
      value: report.investmentMarketValue || 0
    }))

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <div data-testid={formatDataTestId(prefixDataTestId, 'ReportAnalytics')}>
      {/* Statistics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} style={{ color: '#3f8600' }} />
              {getTranslationFromI18nKeyAndLabel('analytics.totalReports', 'Total Reports')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#3f8600' }}>{totalReports}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendUp size={20} style={{ color: '#1890ff' }} />
              {getTranslationFromI18nKeyAndLabel('analytics.totalInvestments', 'Total Investments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#1890ff' }}>{totalInvestments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CurrencyDollar size={20} style={{ color: '#722ed1' }} />
              {getTranslationFromI18nKeyAndLabel('analytics.totalMarketValue', 'Total Market Value')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#722ed1' }}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                notation: 'compact',
                maximumFractionDigits: 1
              }).format(totalMarketValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CurrencyDollar size={20} style={{ color: '#fa8c16' }} />
              {getTranslationFromI18nKeyAndLabel('analytics.averageMarketValue', 'Avg Market Value')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#fa8c16' }}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                notation: 'compact',
                maximumFractionDigits: 1
              }).format(averageMarketValue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
        {/* Reports by Month Trend */}
        <Card>
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('analytics.reportsByMonth', 'Reports by Month')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#1890ff"
                  strokeWidth={2}
                  dot={{ fill: '#1890ff', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Reports by Investment Type */}
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('analytics.reportsByType', 'Reports by Investment Type')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#52c41a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Reports by Scope */}
        <Card>
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('analytics.reportsByScope', 'Reports by Scope')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={scopeChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ scope, count }) => `${scope}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {scopeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Market Value Trend */}
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('analytics.marketValueTrend', 'Market Value Trend')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={marketValueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={value =>
                    new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      notation: 'compact'
                    }).format(value as number)
                  }
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#722ed1"
                  strokeWidth={2}
                  dot={{ fill: '#722ed1', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
