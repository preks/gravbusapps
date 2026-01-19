import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { RiPieChart2Line } from '@remixicon/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface StatusPieChartProps {
  data: any[]
  totalAbsenceCount: number
  statusColors: { [key: string]: string }
  onPieClick: (data: any) => void
}

export const StatusPieChart: React.FC<StatusPieChartProps> = ({
  data,
  totalAbsenceCount,
  statusColors,
  onPieClick
}) => {
  return (
    <Card className="gba:hover:shadow-md gba:transition-shadow gba:p-4" data-testid="status-pie-chart-card">
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
        <RiPieChart2Line className="gba:text-success" size={20} />
        <div>
          <h5 className="gba:text-sm gba:font-medium gba:m-0">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.status_breakdown',
              'Status Breakdown'
            )}
          </h5>
          <p className="gba:text-xs gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.absence_approval_status',
              'Absence approval status'
            )}
          </p>
        </div>
      </div>
      <div className="gba:h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label={({ value }) => {
                if (!value || totalAbsenceCount === 0) return ''
                const percent = Math.round((value / totalAbsenceCount) * 100)
                return percent > 5 ? `${percent}%` : '' // Only show % if slice is large enough
              }}
              labelLine={false}
              onClick={onPieClick}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={statusColors[entry.status] || 'var(--nw-muted-foreground)'} />
              ))}
            </Pie>
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const entry = payload[0].payload
                  const percent = totalAbsenceCount > 0 ? Math.round((entry.value / totalAbsenceCount) * 100) : 0

                  return (
                    <div
                      className="gba:bg-card gba:p-3 gba:border gba:rounded gba:shadow"
                      style={{ pointerEvents: 'none' }}
                    >
                      <p className="gba:font-medium">{entry.name}</p>
                      <p>
                        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.count', 'Count')}
                        : {entry.value}{' '}
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_backoffice.requests',
                          'requests'
                        )}
                      </p>
                      <p>
                        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'Days')}:{' '}
                        {entry.totalDays}{' '}
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_backoffice.total_days',
                          'total days'
                        )}
                      </p>
                      <p>
                        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.share', 'Share')}
                        : {percent}%{' '}
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_backoffice.of_total_requests',
                          'of total requests'
                        )}
                      </p>
                    </div>
                  )
                }
                return null
              }}
              wrapperStyle={{ pointerEvents: 'none' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="gba:flex gba:flex-wrap gba:gap-3 gba:mt-2 gba:justify-center">
        {data.map(entry => {
          const percent = totalAbsenceCount > 0 ? Math.round((Number(entry.value) / totalAbsenceCount) * 100) : 0
          return (
            <span key={entry.name} className="gba:flex gba:items-center gba:gap-2">
              <span
                className="gba:w-3 gba:h-3 gba:rounded gba:inline-block"
                style={{ backgroundColor: statusColors[entry.status] || 'var(--nw-muted-foreground)' }}
              />
              <span className="gba:text-xs">
                {entry.name}: {percent}%
              </span>
            </span>
          )
        })}
      </div>
    </Card>
  )
}
