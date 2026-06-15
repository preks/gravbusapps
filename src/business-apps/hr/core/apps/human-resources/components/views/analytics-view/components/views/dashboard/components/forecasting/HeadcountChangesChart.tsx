import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Spinner } from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useMonthlyHeadcountChanges } from '../../../../../hooks/useMonthlyHeadcountChanges'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

const HeadcountChangesChart: React.FC<BusinessAppContextProps> = props => {
  const year = new Date().getFullYear()
  const { data, loading } = useMonthlyHeadcountChanges(props, year)
  const { t } = useTranslation(hrTranslations)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="gba:bg-primary-foreground gba:shadow-lg gba:rounded gba:p-4" data-testid="headcount-tooltip">
          <div className="gba:font-semibold gba:text-base gba:mb-1">
            {d.month &&
              new Date(d.month + '-01').toLocaleString(getCurrentActiveUserLocale() ?? 'en-US', {
                month: 'short',
                year: 'numeric'
              })}
          </div>
          <div className="gba:text-success gba:text-sm">
            <span className="gba:font-medium">{t('hr-analytics-new-hires')}:</span> +{d.newHires}
          </div>
          <div className="gba:text-destructive gba:text-sm">
            <span className="gba:font-medium">{t('hr-analytics-departures')}:</span>{' '}
            {d.departures === 0 ? '0' : '-' + d.departures}
          </div>
          <div className="gba:text-foreground gba:text-sm">
            <span className="gba:font-medium">{t('hr-analytics-net-change')}:</span> {d.netChange > 0 ? '+' : ''}
            {d.netChange}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card
      className="gba:shadow gba:rounded gba:mb-6"
      data-testid="headcount-changes-chart"
    >
      <CardHeader>
        <CardTitle>{t('hr-analytics-headcount-changes-chart')}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="gba:flex gba:h-72 gba:items-center gba:justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="gba:w-full gba:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" className="gba:text-xs" />
                <YAxis className="gba:text-xs" domain={[0, 'dataMax + 2']} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="newHires"
                  fill="var(--nw-chart-1)"
                  name={t('hr-analytics-new-hires')}
                  data-testid="bar-new-hires"
                />
                <Bar
                  dataKey="departures"
                  fill="var(--nw-chart-2)"
                  name={t('hr-analytics-departures')}
                  data-testid="bar-departures"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default HeadcountChangesChart
export { HeadcountChangesChart }
