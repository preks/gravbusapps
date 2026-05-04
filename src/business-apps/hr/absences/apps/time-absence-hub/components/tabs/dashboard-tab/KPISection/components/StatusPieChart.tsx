import React, { useMemo } from 'react'
import { Card } from '@newwork/nw-design-system'
import { PieChart, Pie, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { ChartPieIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { LegendMarker } from '../../shared/LegendMarker'

interface StatusPieChartProps {
  data: any[]
  totalAbsenceCount: number
  statusColors: { [key: string]: string }
  onPieClick: (data: any) => void
}

interface StatusPieTooltipContentProps {
  active?: boolean
  payload?: Array<{ payload: any }>
  totalAbsenceCount: number
}

const StatusPieTooltipContent: React.FC<StatusPieTooltipContentProps> = ({ active, payload, totalAbsenceCount }) => {
  if (!active || !payload?.length) {
    return null
  }

  const entry = payload[0].payload
  const percent = totalAbsenceCount > 0 ? Math.round((entry.value / totalAbsenceCount) * 100) : 0

  return (
    <div className="gba:pointer-events-none gba:bg-card gba:p-3 gba:border gba:rounded gba:shadow">
      <p className="gba:font-medium">{entry.name}</p>
      <p>
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.count', 'Count')}: {entry.value}{' '}
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.requests', 'requests')}
      </p>
      <p>
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'Days')}:{' '}
        {entry.totalDays}{' '}
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.total_days', 'total days')}
      </p>
      <p>
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.share', 'Share')}: {percent}%{' '}
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.of_total_requests',
          'of total requests'
        )}
      </p>
    </div>
  )
}

export const StatusPieChart: React.FC<StatusPieChartProps> = ({
  data,
  totalAbsenceCount,
  statusColors,
  onPieClick
}) => {
  const pieData = useMemo(
    () =>
      data.map(entry => ({
        ...entry,
        fill: statusColors[entry.status] ?? 'var(--nw-muted-foreground)'
      })),
    [data, statusColors]
  )

  return (
    <Card className="gba:hover:shadow-md gba:transition-shadow gba:p-4" data-testid="status-pie-chart-card">
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
        <ChartPieIcon size={20} className="gba:text-success" />
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
      <div className="gba:h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
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
            />
            <RechartsTooltip
              content={<StatusPieTooltipContent totalAbsenceCount={totalAbsenceCount} />}
              wrapperStyle={{ pointerEvents: 'none' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="gba:flex gba:flex-wrap gba:gap-3 gba:mt-2 gba:justify-center">
        {pieData.map(entry => {
          const percent = totalAbsenceCount > 0 ? Math.round((Number(entry.value) / totalAbsenceCount) * 100) : 0
          const color = entry.fill ?? 'var(--nw-muted-foreground)'

          return (
            <span key={entry.name} className="gba:flex gba:items-center gba:gap-2">
              <LegendMarker color={color} />
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
