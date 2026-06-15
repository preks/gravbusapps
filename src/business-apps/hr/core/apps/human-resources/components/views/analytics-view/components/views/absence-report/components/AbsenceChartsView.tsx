import React from 'react'
import { Badge, Card, Spinner, useTranslation } from '@newwork/nw-design-system'
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
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

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
      <div className="gba:mb-6 gba:grid gba:grid-cols-1 gba:gap-4 lg:gba:grid-cols-2">
        <div>
          <Card className="gba:p-4" data-testid={`${dataTestId}-monthly-usage-chart`}>
            <div className="gba:mb-4 gba:flex gba:items-center gba:gap-2 gba:font-semibold">
              <span>{t('hr-analytics-absence-monthly-usage-trend')}</span>
              <Badge variant="secondary">{t('hr-analytics-months', { count: chartData.monthlyUsageByGroup.length })}</Badge>
            </div>
            {isLoading ? <Spinner /> : (
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
            )}
          </Card>
        </div>
        <div>
          <Card className="gba:p-4" data-testid={`${dataTestId}-total-absence-chart`}>
            <div className="gba:mb-4 gba:flex gba:items-center gba:gap-2 gba:font-semibold">
                <span>{t('hr-analytics-absence-total-days-title')}</span>
                <Badge variant="secondary">
                  {chartData.totalAbsenceDays.reduce((sum, item) => sum + item.days, 0)} {t('hr-analytics-days')}
                </Badge>
            </div>
            {isLoading ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.totalAbsenceDays}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="days" fill={colors.primary} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>

      <div className="gba:mb-6 gba:grid gba:grid-cols-1 gba:gap-4 lg:gba:grid-cols-2">
        <div>
          <Card className="gba:p-4" data-testid={`${dataTestId}-absence-by-group-chart`}>
              <div className="gba:mb-4 gba:flex gba:items-center gba:gap-2 gba:font-semibold">
                <span>{t('hr-analytics-absence-by-group')}</span>
                <Badge variant="secondary">{t('hr-analytics-groups', { count: chartData.absenceByGroup.length })}</Badge>
              </div>
            {isLoading ? <Spinner /> : (
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
            )}
          </Card>
        </div>
        <div>
          <Card className="gba:p-4" data-testid={`${dataTestId}-absence-by-type-chart`}>
              <div className="gba:mb-4 gba:flex gba:items-center gba:gap-2 gba:font-semibold">
                <span>{t('hr-analytics-top-absence-types')}</span>
                <Badge variant="warning">{t('hr-analytics-types', { count: chartData.absenceByType.length })}</Badge>
              </div>
            {isLoading ? <Spinner /> : (
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
            )}
          </Card>
        </div>
      </div>

      <div>
          <Card className="gba:p-4" data-testid={`${dataTestId}-department-breakdown-chart`}>
              <div className="gba:mb-4 gba:flex gba:items-center gba:gap-2 gba:font-semibold">
                <span>{t('hr-analytics-department-breakdown')}</span>
                <Badge variant="destructive">{t('hr-analytics-departments', { count: chartData.departmentBreakdown.length })}</Badge>
              </div>
            {isLoading ? <Spinner /> : (
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
            )}
          </Card>
      </div>

      {/* Summary Statistics */}
      <div className="gba:mt-6">
          <Card className="gba:p-4" data-testid={`${dataTestId}-chart-summary`}>
            <h4 className="gba:mb-4 gba:text-lg gba:font-semibold">{t('hr-analytics-chart-summary')}</h4>
            <div className="gba:grid gba:grid-cols-1 gba:gap-4 sm:gba:grid-cols-2 md:gba:grid-cols-4">
              <div>
                <div className="gba:text-center gba:p-4">
                  <div className="gba:text-2xl gba:font-semibold gba:text-info">{chartData.absenceByGroup.length}</div>
                  <span className="gba:text-sm gba:text-muted-foreground">{t('hr-analytics-active-groups')}</span>
                </div>
              </div>
              <div>
                <div className="gba:text-center gba:p-4">
                  <div className="gba:text-2xl gba:font-semibold gba:text-destructive">
                    {chartData.absenceByType.length}
                  </div>
                  <span className="gba:text-sm gba:text-muted-foreground">{t('hr-analytics-absence-types')}</span>
                </div>
              </div>
              <div>
                <div className="gba:text-center gba:p-4">
                  <div className="gba:text-2xl gba:font-semibold gba:text-warning">
                    {chartData.departmentBreakdown.length}
                  </div>
                  <span className="gba:text-sm gba:text-muted-foreground">{t('hr-analytics-departments-label')}</span>
                </div>
              </div>
              <div>
                <div className="gba:text-center gba:p-4">
                  <div className="gba:text-2xl gba:font-semibold gba:text-success">
                    {chartData.totalAbsenceDays.reduce((sum, item) => sum + item.days, 0)}
                  </div>
                  <span className="gba:text-sm gba:text-muted-foreground">{t('hr-analytics-total-days')}</span>
                </div>
              </div>
            </div>
          </Card>
      </div>
    </div>
  )
}

export default AbsenceChartsView
