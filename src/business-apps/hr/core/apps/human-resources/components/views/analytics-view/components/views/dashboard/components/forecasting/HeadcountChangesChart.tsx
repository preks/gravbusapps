import React from 'react'
import { Card } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useMonthlyHeadcountChanges } from '../../../../../hooks/useMonthlyHeadcountChanges'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const HeadcountChangesChart: React.FC<BusinessAppContextProps> = props => {
  const year = new Date().getFullYear()
  const { data, loading } = useMonthlyHeadcountChanges(props, year)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="gba:bg-primary-foreground gba:shadow-lg gba:rounded gba:p-4" data-testid="headcount-tooltip">
          <div className="gba:font-semibold gba:text-base gba:mb-1">
            {d.month && new Date(d.month + '-01').toLocaleString(undefined, { month: 'short', year: 'numeric' })}
          </div>
          <div className="gba:text-success gba:text-sm">
            <span className="gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('headcount_new_hires', 'New Hires')}:
            </span>{' '}
            +{d.newHires}
          </div>
          <div className="gba:text-destructive gba:text-sm">
            <span className="gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('headcount_departures', 'Departures')}:
            </span>{' '}
            {d.departures === 0 ? '0' : '-' + d.departures}
          </div>
          <div className="gba:text-foreground gba:text-sm">
            <span className="gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('headcount_net_change', 'Net Change')}:
            </span>{' '}
            {d.netChange > 0 ? '+' : ''}
            {d.netChange}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card
      className="gba:shadow gba:rounded gba:p-4 gba:mb-6"
      data-testid="headcount-changes-chart"
      title={getTranslationFromI18nKeyAndLabel('headcount_changes_chart', 'Headcount Changes')}
      loading={loading}
    >
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
              name={getTranslationFromI18nKeyAndLabel('headcount_new_hires', 'New Hires')}
              data-testid="bar-new-hires"
            />
            <Bar
              dataKey="departures"
              fill="var(--nw-chart-2)"
              name={getTranslationFromI18nKeyAndLabel('headcount_departures', 'Departures')}
              data-testid="bar-departures"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export default HeadcountChangesChart
export { HeadcountChangesChart }
