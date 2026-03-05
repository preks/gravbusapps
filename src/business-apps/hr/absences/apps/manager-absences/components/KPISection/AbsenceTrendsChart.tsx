import React from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@newwork/nw-design-system'
import { ChartBarIcon } from '@phosphor-icons/react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface AbsenceTrendsChartProps {
  barChartData: any[]
  totalAbsenceDays: number
  uniqueGroups: string[]
  groupColors: { [key: string]: string }
}

export const AbsenceTrendsChart: React.FC<AbsenceTrendsChartProps> = ({
  barChartData,
  totalAbsenceDays,
  uniqueGroups,
  groupColors
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.absence_trends',
                'Absence Trends'
              )}
            </CardTitle>
            <p className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.absence_days_group',
                'Monthly absence days by group'
              )}
            </p>
            <div className="gba:text-2xl gba:font-bold gba:pt-2">{totalAbsenceDays}</div>
            <div className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.total_absence_days_manager',
                'Total Absence Days'
              )}
            </div>
          </div>
          <ChartBarIcon size={24} className="gba:h-6 gba:w-6 gba:text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barChartData}
              margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
              barCategoryGap={0}
              barSize={40}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fontSize: 12 }} />
              <YAxis />
              <RechartsTooltip
                cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                allowEscapeViewBox={{ x: false, y: false }}
                content={({ active, payload, label }) => {
                  if (active && label) {
                    const allTypes = uniqueGroups

                    return (
                      <div className="gba:bg-card gba:rounded-lg gba:shadow-lg gba:p-3 gba:text-sm">
                        <div className="gba:font-semibold gba:mb-2">{label}</div>
                        {allTypes.map(type => {
                          const entry = payload?.find(p => p.dataKey === type)
                          const value = entry?.value ?? 0
                          const color = groupColors[type] || undefined

                          return (
                            <div key={type} className="gba:flex gba:items-center gba:mb-1">
                              <span
                                className="gba:w-3 gba:h-3 gba:inline-block gba:rounded-sm gba:mr-2"
                                style={{ background: color }}
                              />
                              <span>
                                {type}: {value} {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.days', 'days')}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  }
                  return null
                }}
              />
              {uniqueGroups.map(group => (
                <Bar key={group} dataKey={group} fill={groupColors[group] || undefined} stackId="a" maxBarSize={40} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-4 gba:mt-4">
          {uniqueGroups.map(group => (
            <div key={group} className="gba:flex gba:items-center gba:gap-2">
              <div
                className="gba:w-3 gba:h-3 gba:rounded-sm"
                style={{ backgroundColor: groupColors[group] || undefined }}
              />
              <span className="gba:text-xs gba:text-muted-foreground">{group}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
