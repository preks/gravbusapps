import React, { useMemo } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import dayjs from 'dayjs'

interface OrgYearComparisonCardProps {
  absences: any[]
  accessToken?: string
}

export const OrgYearComparisonCard: React.FC<OrgYearComparisonCardProps> = ({ absences }) => {
  const rows = useMemo(() => {
    const approved = (absences || []).filter((a: any) => String(a.status || '').toUpperCase() === 'APPROVED')
    const yearly: Record<number, number> = {}
    approved.forEach((a: any) => {
      const y = dayjs(a.startDate).year()
      yearly[y] = (yearly[y] || 0) + 1
    })
    const years = Object.keys(yearly)
      .map(Number)
      .sort((a, b) => b - a)
    return years.map((y, idx) => {
      const total = Math.round(Number(yearly[y] || 0))
      const prev = Number(yearly[years[idx + 1] ?? -1] || 0)
      let changePercent: number | null = null
      let label = '0%'
      let badgeClass = 'gba:text-muted-foreground gba:bg-muted'

      if (prev === 0) {
        if (total > 0) {
          // New requests vs zero baseline
          label = `+${total} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.new_requests', 'New requests')}`
          badgeClass = 'gba:text-info gba:bg-info-secondary'
        } else {
          label = '0%'
          badgeClass = 'gba:text-muted-foreground gba:bg-muted'
        }
      } else {
        // Use precise float, then format to 2 decimals for display
        changePercent = ((total - prev) / prev) * 100
        if (total === 0) {
          // Exact elimination only when zero
          label = '↘-100%'
          badgeClass = 'gba:text-success gba:bg-success-secondary'
        } else {
          const formatted = Math.abs(changePercent).toFixed(2)
          const sign = changePercent > 0 ? '↗+' : changePercent < 0 ? '↘-' : ''
          label = `${sign}${formatted}%`
        }
        if (changePercent > 0) {
          badgeClass = 'gba:text-destructive gba:bg-destructive-secondary'
        } else if (changePercent < 0) {
          badgeClass = 'gba:text-success gba:bg-success-secondary'
        } else {
          badgeClass = 'gba:text-muted-foreground gba:bg-muted'
        }
      }

      return { year: y, total, changePercent, label, badgeClass }
    })
  }, [absences])

  return (
    <Card>
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-sm">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.yoy_title', 'Year-over-Year Comparison')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:pt-0">
        {rows.length === 0 ? (
          <div className="gba:text-sm gba:text-gray-muted-foreground">No data available</div>
        ) : (
          <div className="gba:flex gba:flex-col gba:gap-2.5">
            {(() => {
              const maxVal = Math.max(...rows.map(r => r.total))
              return rows.map(row => {
                const pct = maxVal > 0 ? Math.max(4, Math.round((row.total / maxVal) * 100)) : 0
                return (
                  <div key={row.year} className="gba:flex gba:items-center">
                    <div className="gba:w-20 gba:text-sm gba:text-foreground">{row.year}</div>
                    <div className="gba:flex-1 gba:px-3">
                      <div className="gba:bg-muted gba:rounded">
                        <div
                          style={{ width: `${pct}%`, height: 10, background: 'var(--nw-chart-4)', borderRadius: 6 }}
                        />
                      </div>
                    </div>
                    <div className="gba:w-20 gba:text-right gba:text-sm gba:text-foreground">{row.total}</div>
                    <div className="gba:w-32 gba:text-right gba:text-xs gba:font-medium gba:whitespace-nowrap">
                      <span
                        className={row.badgeClass
                          .replace('gba:bg-', 'gba:text-')
                          .replace('-50', '')
                          .replace('-100', '')}
                      >
                        {row.label}
                      </span>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}
        <div className="gba:mt-2 gba:text-xs gba:text-gray-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_hub.statuses_considered_approved',
            'Statuses considered: Approved'
          )}
        </div>
      </CardContent>
    </Card>
  )
}
