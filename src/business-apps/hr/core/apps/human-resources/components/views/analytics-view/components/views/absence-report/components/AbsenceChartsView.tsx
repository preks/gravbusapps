import React from 'react'
import { Card, Row, Col, Typography, Tag } from 'antd'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { AbsenceChartData } from '../../../../hooks/useAbsenceDataIntegration'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Text } = Typography

interface AbsenceChartsViewProps {
  chartData: AbsenceChartData
  isLoading: boolean
  dataTestId: string
}

const AbsenceChartsView: React.FC<AbsenceChartsViewProps> = ({ chartData, isLoading, dataTestId }) => {
  const { t } = useTranslation(hrTranslations)
  // Color schemes for charts - using design system chart tokens
  const colors = {
    primary: 'var(--nw-chart-1)',
    success: 'var(--nw-success)',
    warning: 'var(--nw-warning)',
    error: 'var(--nw-destructive)',
    secondary: 'var(--nw-chart-3)',
    tertiary: 'var(--nw-chart-4)'
  }

  const pieColors = [colors.primary, colors.error, colors.secondary, colors.success, colors.warning, colors.tertiary]

  // Transform monthly data for multi-line chart
  const transformedMonthlyData = chartData.monthlyUsageByGroup.map(item => ({
    month: item.month,
    [t('hr-analytics-absence-vacation')]: item.vacation || 0,
    [t('hr-analytics-absence-sick-leave')]: item.sickLeave || 0,
    [t('hr-analytics-absence-special-leave')]: item.specialLeave || 0,
    [t('hr-analytics-absence-other')]: item.other || 0
  }))

  return (
    <div data-testid={`${dataTestId}-charts-view`}>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{t('hr-analytics-absence-monthly-usage-trend')}</span>
                <Tag color="var(--nw-info)">{t('hr-analytics-months', { count: chartData.monthlyUsageByGroup.length })}</Tag>
              </div>
            }
            loading={isLoading}
            data-testid={`${dataTestId}-monthly-usage-chart`}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={transformedMonthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey={t('hr-analytics-absence-vacation')} stroke={colors.primary} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey={t('hr-analytics-absence-sick-leave')} stroke={colors.error} strokeWidth={2} dot={{ r: 4 }} />
                <Line
                  type="monotone"
                  dataKey={t('hr-analytics-absence-special-leave')}
                  stroke={colors.secondary}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line type="monotone" dataKey={t('hr-analytics-absence-other')} stroke={colors.success} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{t('hr-analytics-absence-total-days-title')}</span>
                <Tag color="var(--nw-success)">
                  {chartData.totalAbsenceDays.reduce((sum, item) => sum + item.days, 0)} {t('hr-analytics-days')}
                </Tag>
              </div>
            }
            loading={isLoading}
            data-testid={`${dataTestId}-total-absence-chart`}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.totalAbsenceDays}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="days" fill={colors.primary} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{t('hr-analytics-absence-by-group')}</span>
                <Tag color="var(--nw-info)">{t('hr-analytics-groups', { count: chartData.absenceByGroup.length })}</Tag>
              </div>
            }
            loading={isLoading}
            data-testid={`${dataTestId}-absence-by-group-chart`}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.absenceByGroup}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ group, percent }) => `${group} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="var(--nw-chart-1)"
                  dataKey="days"
                  nameKey="group"
                >
                  {chartData.absenceByGroup.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{t('hr-analytics-top-absence-types')}</span>
                <Tag color="var(--nw-warning)">{t('hr-analytics-types', { count: chartData.absenceByType.length })}</Tag>
              </div>
            }
            loading={isLoading}
            data-testid={`${dataTestId}-absence-by-type-chart`}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.absenceByType.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="var(--nw-chart-3)"
                  dataKey="days"
                  nameKey="type"
                >
                  {chartData.absenceByType.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{t('hr-analytics-department-breakdown')}</span>
                <Tag color="var(--nw-destructive)">{t('hr-analytics-departments', { count: chartData.departmentBreakdown.length })}</Tag>
              </div>
            }
            loading={isLoading}
            data-testid={`${dataTestId}-department-breakdown-chart`}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.departmentBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="days" fill={colors.primary} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24}>
          <Card title={t('hr-analytics-chart-summary')} data-testid={`${dataTestId}-chart-summary`}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <div className="gba:text-center gba:p-4">
                  <div className="gba:text-2xl gba:font-semibold" style={{ color: colors.primary }}>
                    {chartData.absenceByGroup.length}
                  </div>
                  <Text type="secondary">{t('hr-analytics-active-groups')}</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className="gba:text-center gba:p-4">
                  <div className="gba:text-2xl gba:font-semibold" style={{ color: colors.error }}>
                    {chartData.absenceByType.length}
                  </div>
                  <Text type="secondary">{t('hr-analytics-absence-types')}</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className="gba:text-center gba:p-4">
                  <div className="gba:text-2xl gba:font-semibold" style={{ color: colors.secondary }}>
                    {chartData.departmentBreakdown.length}
                  </div>
                  <Text type="secondary">{t('hr-analytics-departments-label')}</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div className="gba:text-center gba:p-4">
                  <div className="gba:text-2xl gba:font-semibold" style={{ color: colors.success }}>
                    {chartData.totalAbsenceDays.reduce((sum, item) => sum + item.days, 0)}
                  </div>
                  <Text type="secondary">{t('hr-analytics-total-days')}</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AbsenceChartsView
