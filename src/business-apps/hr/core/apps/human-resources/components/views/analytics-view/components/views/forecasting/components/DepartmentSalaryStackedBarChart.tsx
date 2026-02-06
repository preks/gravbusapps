import React, { useMemo } from 'react'
import { Card, Typography } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useTranslation } from '@newwork/nw-design-system'
import translations from './_i18n'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useMonthlySalaryByDepartment } from '../../../../hooks/useMonthlySalaryByDepartment'
import dayjs from 'dayjs'

const { Text } = Typography

const DepartmentSalaryStackedBarChart: React.FC<BusinessAppContextProps> = props => {
  const year = new Date().getFullYear()
  const startDate = dayjs(`${year}-01-01`).format('YYYY-MM-DD')
  const endDate = dayjs(`${year}-12-31`).format('YYYY-MM-DD')
  const { data, loading, error } = useMonthlySalaryByDepartment(props.accessToken, startDate, endDate)
  const { t } = useTranslation(translations)
  const millionSuffix = t('suffix-million')
  const thousandSuffix = t('suffix-thousand')
  const locale = getCurrentActiveUserLocale() ?? 'en-US'

  // Get all unique departments across all months
  const departments = useMemo(() => {
    if (!data || data.length === 0) return []
    const deptMap = new Map<string, { id: string; name: string; color: string }>()
    data.forEach(month => {
      month.departments.forEach(dept => {
        if (!deptMap.has(dept.id)) {
          deptMap.set(dept.id, {
            id: dept.id,
            name: dept.name,
            color: dept.color
          })
        }
      })
    })
    return Array.from(deptMap.values())
  }, [data])

  // Prepare recharts data format
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map(month => {
      const entry: any = { month: month.month, totalSalary: month.totalSalary }
      month.departments.forEach(dep => {
        entry[dep.id] = dep.salary
      })
      // Ensure all departments are represented (even if 0 for that month)
      departments.forEach(dept => {
        if (entry[dept.id] === undefined) {
          entry[dept.id] = 0
        }
      })
      return entry
    })
  }, [data, departments])

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const idx = data.findIndex(m => m.month === payload[0].payload.month)
    const monthData = data[idx]
    if (!monthData) return null
    const prev = idx > 0 ? data[idx - 1] : null
    const totalChange = monthData.change
    const totalChangePct = prev && prev.totalSalary ? (totalChange / prev.totalSalary) * 100 : 0
    return (
      <div
        className="gba:bg-primary-foreground gba:shadow-lg gba:rounded gba:p-4"
        data-testid="department-salary-tooltip"
      >
        <div className="gba:font-semibold gba:text-base gba:mb-2">
          {monthData.month &&
            new Date(monthData.month + '-01').toLocaleString(locale, { month: 'short', year: 'numeric' })}
        </div>
        <div className="gba:mb-2">
          <span className="gba:font-medium">{t('total-salary')}: </span>
          <span className="gba:font-bold gba:text-lg">
            {(monthData.totalSalary / 1e6).toLocaleString(locale, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2
            })}
            {millionSuffix}
          </span>
          <span className="gba:text-destructive gba:ml-2 gba:text-base">
            {totalChange < 0
              ? `↓${Math.abs(totalChange / 1e3).toLocaleString(locale, { maximumFractionDigits: 0 })}${thousandSuffix} (${totalChangePct.toFixed(1)}%)`
              : ''}
          </span>
        </div>
        {monthData.departments.map(dep => {
          const depChange = dep.change
          return (
            <div key={dep.id} className="gba:flex gba:items-center gba:mb-1">
              <span
                className="gba:inline-block gba:w-3 gba:h-3 gba:rounded-full gba:mr-2"
                style={{ background: dep.color }}
              ></span>
              <span className="gba:font-medium gba:mr-2">{dep.name}:</span>
              <span className="gba:mr-2">
                {(dep.salary / 1e3).toLocaleString(locale, { maximumFractionDigits: 0 })}
                {thousandSuffix}
              </span>
              <span className="gba:text-muted-foreground gba:text-xs gba:mr-2">{dep.percent.toFixed(1)}%</span>
              <span className="gba:text-destructive gba:text-xs">
                {depChange < 0
                  ? `↓${Math.abs(depChange / 1e3).toLocaleString(locale, { maximumFractionDigits: 0 })}${thousandSuffix}`
                  : ''}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card
      className="gba:shadow gba:rounded gba:p-4 gba:mb-6"
      data-testid="department-salary-stacked-bar-chart"
      title={t('department-salary-stacked-bar-chart-title')}
      loading={loading}
    >
      <div className="gba:w-full gba:h-80">
        {error ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
            <Text className="gba:text-destructive">{t('hr-data-filter-error')}</Text>
          </div>
        ) : chartData.length === 0 ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
            <Text className="gba:text-muted-foreground">{t('hr-data-filter-no-data')}</Text>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                className="gba:text-xs"
                tickFormatter={month =>
                  new Date(month + '-01').toLocaleString(locale, {
                    month: 'short',
                    year: 'numeric'
                  })
                }
              />
              <YAxis
                className="gba:text-xs"
                tickFormatter={v => `${(v / 1e6).toLocaleString(locale, { maximumFractionDigits: 1 })}${millionSuffix}`}
              />
              <Tooltip content={<CustomTooltip />} />
              {departments.map(dep => (
                <Bar key={dep.id} dataKey={dep.id} stackId="a" fill={dep.color} name={dep.name} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}

export default DepartmentSalaryStackedBarChart
