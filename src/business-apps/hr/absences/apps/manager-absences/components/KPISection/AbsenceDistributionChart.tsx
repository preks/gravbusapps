import React from 'react'
import { ChartPieIcon } from '@phosphor-icons/react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { translateManagerAbsencesText } from '../../utils/managerAbsencesI18n'

interface AbsenceDistributionChartProps {
  pieChartData: { code: string; name: string; value: number; parentEntryId?: string }[]
  totalAbsenceDays: number
  vacationShare: string
  groupColors: { [key: string]: string }
  vacationGroupId: string
}

export const AbsenceDistributionChart: React.FC<AbsenceDistributionChartProps> = ({
  pieChartData,
  vacationShare,
  groupColors,
  vacationGroupId
}) => {
  const currentYear = new Date().getFullYear()
  const formatNumericValue = (value: number, maximumFractionDigits = 2): string => {
    if (Number.isNaN(value)) {
      return '0'
    }

    return Number(value.toFixed(maximumFractionDigits)).toString()
  }
  const currentYearTotal = pieChartData.reduce((sum, item) => sum + item.value, 0)

  const currentYearVacationShare = pieChartData.length > 0 ? vacationShare : '0'

  const renderLabel = (entry: any) => {
    const percent = currentYearTotal > 0 ? formatNumericValue((entry.value / currentYearTotal) * 100, 1) : '0'
    const angle = (-entry.midAngle * Math.PI) / 180
    const cosine = Math.cos(angle)
    const sine = Math.sin(angle)
    const labelRadius = entry.outerRadius + 18
    const x = entry.cx + labelRadius * cosine
    const y = entry.cy + labelRadius * sine + (sine < -0.35 ? 6 : sine > 0.35 ? -4 : 0)
    const textAnchor = cosine > 0.35 ? 'start' : cosine < -0.35 ? 'end' : 'middle'
    const fill =
      groupColors[entry.payload?.code || ''] ||
      (entry.payload?.parentEntryId === vacationGroupId ? 'var(--nw-chart-3)' : 'var(--nw-chart-1)')

    return (
      <text x={x} y={y} fill={fill} textAnchor={textAnchor} dominantBaseline="central" fontSize={14} fontWeight="bold">
        {`${percent}%`}
      </text>
    )
  }

  return (
    <div className="gba:flex gba:h-full gba:flex-col">
      <div className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-1 gba:p-6 gba:flex-shrink-0">
        <div>
          <h5 className="gba:text-sm gba:font-medium">
            {' '}
            {translateManagerAbsencesText('lowcoder:absence_management_hub_manager.absence_distribution', {
              en: 'Absence Distribution',
              de: 'Abwesenheitsverteilung',
              ro: 'Distributia Absentelor'
            })}
          </h5>
          <p className="gba:text-xs gba:text-muted-foreground">
            {translateManagerAbsencesText('lowcoder:absence_management_hub_manager.distribution_for', {
              en: 'Distribution for',
              de: 'Verteilung fur',
              ro: 'Distributia pentru'
            })}{' '}
            {currentYear}
          </p>
          <div className="gba:text-2xl gba:font-bold gba:pt-2 gba:text-left">{currentYearVacationShare}%</div>
          <div className="gba:text-xs gba:text-muted-foreground gba:text-left gba:pb-3">
            {translateManagerAbsencesText('lowcoder:absence_management_hub_manager.vacation_share', {
              en: 'Vacation Share',
              de: 'Urlaubsanteil',
              ro: 'Ponderea Concediilor'
            })}
          </div>
        </div>
        <ChartPieIcon size={24} className="gba:h-6 gba:w-6 gba:text-muted-foreground" />
      </div>
      <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col gba:px-6 gba:pb-6">
        <div className="gba:min-h-0 gba:flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 48, right: 28, bottom: 24, left: 28 }}>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="48%"
                labelLine={false}
                label={renderLabel}
                outerRadius={96}
                innerRadius={0}
                fill="var(--nw-chart-1)"
                dataKey="value"
                stroke="none"
                fontSize={14}
                fontWeight="bold"
              >
                {pieChartData.map(entry => (
                  <Cell key={`cell-${entry.code}`} fill={groupColors[entry.code] || undefined} />
                ))}
              </Pie>
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0]
                    const name = data.name
                    const numericValue = Number(data.value || 0)
                    const formattedValue = formatNumericValue(numericValue)
                    const code = String(data.payload?.code || '')
                    const color = groupColors[code] || undefined
                    const percentage =
                      currentYearTotal > 0 ? formatNumericValue((numericValue / currentYearTotal) * 100, 1) : '0'

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
                          {translateManagerAbsencesText('lowcoder:absence_management_hub_manager.dashboard.days', {
                            en: 'days',
                            de: 'Tage',
                            ro: 'zile'
                          })}{' '}
                          {formattedValue}
                        </div>
                        <div className="gba:text-muted-foreground">
                          {translateManagerAbsencesText('lowcoder:absence_management_hub_manager.dashboard.of_total', {
                            en: 'of total',
                            de: 'vom Gesamtwert',
                            ro: 'din total'
                          })}{' '}
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
        </div>
        <div className="gba:mt-4 gba:max-h-20 gba:flex-shrink-0 gba:overflow-y-auto gba:px-1">
          <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-x-4 gba:gap-y-2">
            {pieChartData.map(entry => (
              <div key={entry.name} className="gba:flex gba:items-center gba:gap-2">
                <div
                  className="gba:w-3 gba:h-3 gba:flex-shrink-0 gba:rounded-sm"
                  style={{ backgroundColor: groupColors[entry.code] || undefined }}
                />
                <span className="gba:text-xs gba:text-muted-foreground">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
