import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { Card } from '@newwork/gravity-ui-catalog'
import { Spin } from 'antd'
import { ChartsSectionProps } from '../../../queries/types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { getAbsenceStatusLabel } from '@/business-apps/hr/absences/utils/absenceStatusUtils'

const AbsenceCharts: React.FC<ChartsSectionProps> = ({ entitlements, absenceList, loading, error }) => {
  if (loading) {
    return (
      <div className="gba:loading gba:flex gba:justify-center gba:items-center gba:py-8">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:error gba:text-destructive gba:py-8 gba:text-center">
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.error_loading', 'Failed to load absence data.')}
      </div>
    )
  }

  return (
    <div className="gba:charts-section gba:mb-8" data-testid="absence-charts-section">
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-6">
        <Card
          variant="outlined"
          className="gba:border gba:border-border gba:shadow-md gba:hover:shadow-lg gba:transition-all gba:p-4"
          data-testid="annual-leave-chart"
        >
          <div className="gba:text-lg gba:font-medium gba:mb-2">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.annual_leave', 'Annual Leave')}
          </div>
          <div className="gba:text-sm gba:text-muted-foreground gba:mb-4">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_hub.annual_leave_description',
              'Used vs. Total Annual Leave'
            )}
          </div>
          {(() => {
            const annualLeaveEntitlement = Array.isArray(entitlements)
              ? entitlements.find(e => {
                  const typeId = e?.typeId || ''
                  return (
                    typeId.includes('A001') ||
                    typeId.includes('AbsenceType:v1:A001') ||
                    typeId.toLowerCase().includes('annual') ||
                    typeId.toLowerCase().includes('vacation')
                  )
                })
              : undefined

            const total = annualLeaveEntitlement?.total || 0
            const approved = annualLeaveEntitlement?.used || 0 // 'used' property contains approved absences
            const pending = annualLeaveEntitlement?.pending || 0
            const totalUsed = approved + pending
            const remaining = total - totalUsed

            const chartColors = ['var(--nw-success)', 'var(--nw-warning)']

            const data = [
              {
                name: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.remaining_days', 'Remaining Days'),
                value: remaining,
                color: chartColors[0]
              },
              {
                name: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.used_days', 'Used Days'),
                value: totalUsed,
                color: chartColors[1]
              }
            ]

            return (
              <>
                <div className="gba:h-[180px] gba:border gba:border-border gba:rounded-md">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        fill="var(--nw-color-chart-1)"
                      >
                        {data.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value, name) => [
                          `${value} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.days', 'days')}`,
                          name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="gba:flex gba:justify-center gba:items-center gba:gap-2 gba:mt-2">
                  <div className="gba:flex gba:items-center gba:gap-1.5">
                    <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-success"></div>
                    <span className="gba:text-sm">
                      {remaining} {getTranslationFromI18nKeyAndLabel('lowcoder:new_goal.remaining', 'Remaining')}
                    </span>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-1.5">
                    <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-warning"></div>
                    <span className="gba:text-sm">
                      {totalUsed} {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.used_annual_leave', 'Used')}{' '}
                      ({getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.pending', 'Pending')} +{' '}
                      {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.approved', 'Approved')})
                    </span>
                  </div>
                </div>
              </>
            )
          })()}
        </Card>

        <Card
          variant="outlined"
          className="gba:border gba:border-border gba:shadow-md gba:hover:shadow-lg gba:transition-all gba:p-4"
          data-testid="absence-distribution-chart"
        >
          <div className="gba:text-lg gba:font-medium gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.absence_distribution',
              'Absence Distribution'
            )}
          </div>
          <div className="gba:text-sm gba:text-muted-foreground gba:mb-4">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.by_type', 'By Type')}
          </div>
          {(() => {
            const absenceByTypeId: Record<string, { count: number; translatedName: string; color: string }> = {}
            absenceList.forEach(absence => {
              const originalStatus = absence.originalStatus || ''
              const isApproved =
                originalStatus.toUpperCase() === 'APPROVED' ||
                originalStatus.toUpperCase() === 'PENDING' ||
                originalStatus.toUpperCase() === 'ACTION_REQUIRED'

              if (isApproved) {
                const typeId = absence.typeId || 'other'
                const translatedName =
                  absence.type || getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.other', 'Other')

                if (!absenceByTypeId[typeId]) {
                  absenceByTypeId[typeId] = {
                    count: 0,
                    translatedName: translatedName,
                    color: 'var(--nw-color-chart-3)'
                  }
                }
                const durationMatch = absence.duration?.match(/(\d+\.?\d*)/)
                const duration = durationMatch ? parseFloat(durationMatch[1]) : 0
                absenceByTypeId[typeId].count += duration

                let color = absence.typeColor || 'var(--nw-color-chart-3)'
                if (color && typeof color === 'string') {
                  if (!color.startsWith('#') && /^([0-9A-Fa-f]{6})$/.test(color)) {
                    color = `#${color}`
                  }
                } else {
                  color = 'var(--nw-color-chart-3)'
                }
                absenceByTypeId[typeId].color = color
              }
            })

            const data = Object.keys(absenceByTypeId).map(typeId => ({
              name: absenceByTypeId[typeId].translatedName,
              value: absenceByTypeId[typeId].count,
              color: absenceByTypeId[typeId].color
            }))

            return (
              <>
                <div className="gba:h-[180px] gba:border gba:border-border gba:rounded-md">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        fill="var(--nw-color-chart-1)"
                      >
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value, name) => [
                          `${value} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.days', 'days')}`,
                          name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:mt-2">
                  {data.map((entry, index) => (
                    <div key={`legend-${index}`} className="gba:flex gba:items-center gba:gap-1.5">
                      <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: entry.color }}></div>
                      <span className="gba:text-sm">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </Card>

        <Card
          variant="outlined"
          className="gba:border gba:border-border gba:shadow-md gba:hover:shadow-lg gba:transition-all gba:p-4"
          data-testid="absences-by-status-chart"
        >
          <div className="gba:text-lg gba:font-medium gba:mb-2">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.absence_status', 'Absence Status')}
          </div>
          <div className="gba:text-sm gba:text-muted-foreground gba:mb-4">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.status_distribution', 'Status Distribution')}
          </div>
          {(() => {
            const absenceByStatus: Record<string, number> = {}
            absenceList.forEach(absence => {
              const originalStatus = absence.originalStatus || 'UNKNOWN'
              const translatedStatus = getAbsenceStatusLabel(originalStatus)
              if (!absenceByStatus[translatedStatus]) {
                absenceByStatus[translatedStatus] = 0
              }
              const durationMatch = absence.duration?.match(/(\d+\.?\d*)/)
              const duration = durationMatch ? parseFloat(durationMatch[1]) : 0
              absenceByStatus[translatedStatus] += duration
            })
            const chartColors = [
              'var(--nw-success)',
              'var(--nw-warning)',
              'var(--nw-destructive)',
              'var(--nw-muted)',
              'var(--nw-info)'
            ]
            const getStatusColorIndex = (originalStatus: string): number => {
              const statusUpper = originalStatus.toUpperCase()

              if (statusUpper === 'APPROVED') {
                return 0
              }
              if (statusUpper === 'PENDING' || statusUpper === 'ACTION_REQUIRED') {
                return 1
              }
              if (statusUpper === 'REJECTED') {
                return 2
              }
              if (statusUpper === 'CANCELLED') {
                return 3
              }

              return 4
            }

            const statusGroups: Record<string, { count: number; translatedStatus: string }> = {}
            absenceList.forEach(absence => {
              const originalStatus = absence.originalStatus || 'UNKNOWN'
              const translatedStatus = getAbsenceStatusLabel(originalStatus)

              if (!statusGroups[originalStatus]) {
                statusGroups[originalStatus] = { count: 0, translatedStatus }
              }

              const durationMatch = absence.duration?.match(/(\d+\.?\d*)/)
              const duration = durationMatch ? parseFloat(durationMatch[1]) : 0
              statusGroups[originalStatus].count += duration
            })

            const data = Object.keys(absenceByStatus).map(translatedStatus => {
              const originalStatus =
                Object.keys(statusGroups).find(key => statusGroups[key].translatedStatus === translatedStatus) ||
                'UNKNOWN'
              const colorIndex = getStatusColorIndex(originalStatus)
              return {
                name: translatedStatus,
                value: absenceByStatus[translatedStatus],
                color: chartColors[colorIndex]
              }
            })

            return (
              <>
                <div className="gba:h-[180px] gba:border gba:border-border gba:rounded-md">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        fill="var(--nw-color-chart-1)"
                      >
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value, name) => [
                          `${value} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.days', 'days')}`,
                          name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:mt-2">
                  {data.map((entry, index) => (
                    <div key={`legend-${index}`} className="gba:flex gba:items-center gba:gap-1.5">
                      <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: entry.color }}></div>
                      <span className="gba:text-sm">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </Card>
      </div>
    </div>
  )
}

export default AbsenceCharts
