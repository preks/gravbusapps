import React from 'react'
import { ChartPieIcon } from '@phosphor-icons/react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface AbsenceDistributionChartProps {
  pieChartData: { name: string; value: number }[]
  totalAbsenceDays: number
  vacationShare: string
  groupColors: { [key: string]: string }
}

export const AbsenceDistributionChart: React.FC<AbsenceDistributionChartProps> = ({
  pieChartData,
  vacationShare,
  groupColors
}) => {
  const currentYear = new Date().getFullYear()

  const currentYearVacationShare = pieChartData.length > 0 ? vacationShare : '0'

  const renderLabel = (entry: any) => {
    const currentYearTotal = pieChartData.reduce((sum, item) => sum + item.value, 0)
    const percent = currentYearTotal > 0 ? ((entry.value / currentYearTotal) * 100).toFixed(1) : '0.0'

    // Check if this is the vacation entry by looking for the translated vacation name
    const vacationName = getTranslationFromI18nKeyAndLabel(
      'lowcoder:absence_management_hub_manager.vacation',
      'Vacation'
    )

    if (entry.name === vacationName) {
      return (
        <text
          x={entry.cx + entry.outerRadius * 1.3 * Math.cos((-entry.midAngle * Math.PI) / 180) + 15}
          y={entry.cy + entry.outerRadius * 1.3 * Math.sin((-entry.midAngle * Math.PI) / 180) + 15}
          fill={groupColors[entry.name] || 'var(--nw-chart-3)'}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={14}
          fontWeight="bold"
        >
          {`${percent}%`}
        </text>
      )
    }

    return `${percent}%`
  }

  return (
    <>
      <div className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-1 gba:p-6">
        <div>
          <h5 className="gba:text-sm gba:font-medium">
            {' '}
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.absence_distribution',
              'Absence Distribution'
            )}
          </h5>
          <p className="gba:text-xs gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.distribution_for',
              'Distribution for '
            )}{' '}
            {currentYear}
          </p>
          <div className="gba:text-2xl gba:font-bold gba:pt-2 gba:text-left">{currentYearVacationShare}%</div>
          <div className="gba:text-xs gba:text-muted-foreground gba:text-left gba:pb-3">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.vacation_share',
              'Vacation Share'
            )}
          </div>
        </div>
        <ChartPieIcon size={24} className="gba:h-6 gba:w-6 gba:text-muted-foreground" />
      </div>
      <div className="gba:h-[415px] gba:w-full gba:px-6 gba:pb-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 35, right: 20, bottom: 20, left: 20 }}>
            <Pie
              data={pieChartData}
              cx="50%"
              cy="45%"
              labelLine={false}
              label={renderLabel}
              outerRadius={100}
              innerRadius={0}
              fill="var(--nw-chart-1)"
              dataKey="value"
              stroke="none"
              fontSize={14}
              fontWeight="bold"
            >
              {pieChartData.map(entry => (
                <Cell key={`cell-${entry.name}`} fill={groupColors[entry.name] || undefined} />
              ))}
            </Pie>
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0]
                  const name = data.name
                  const value = data.value
                  const color = groupColors[name as string] || undefined
                  const currentYearTotal = pieChartData.reduce((sum, item) => sum + item.value, 0)
                  const percentage =
                    currentYearTotal > 0 ? (((value as number) / currentYearTotal) * 100).toFixed(1) : '0.0'

                  return (
                    <div className="gba:bg-card gba:rounded-lg gba:shadow-lg gba:p-3 gba:text-sm gba:border gba:border-border">
                      <div className="gba:flex gba:items-center gba:mb-1">
                        <span
                          className="gba:w-3 gba:h-3 gba:inline-block gba:rounded-sm gba:mr-2"
                          style={{ background: color }}
                        />
                        <span className="gba:font-semibold">{name}</span>
                      </div>
                      <div className="gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_manager.dashboard.days',
                          'days'
                        )}{' '}
                        {value}
                      </div>
                      <div className="gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_manager.dashboard.of_total',
                          'of total'
                        )}{' '}
                        {percentage}%
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-4 gba:mt-4">
          {pieChartData.map(entry => (
            <div key={entry.name} className="gba:flex gba:items-center gba:gap-2">
              <div
                className="gba:w-3 gba:h-3 gba:rounded-sm"
                style={{ backgroundColor: groupColors[entry.name] || undefined }}
              />
              <span className="gba:text-xs gba:text-muted-foreground">{entry.name}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
