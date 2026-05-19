import React, { useMemo } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Card, CardHeader, CardTitle, CardContent, Progress } from '@newwork/nw-design-system'
import dayjs from 'dayjs'

interface OrgYearComparisonCardProps {
  absences: any[]
}

const DEFAULT_BADGE_CLASS = 'gba:text-muted-foreground gba:bg-muted'

const getChangeBadgeClass = (changePercent: number): string => {
  if (changePercent > 0) {
    return 'gba:text-destructive gba:bg-destructive-secondary'
  }
  if (changePercent < 0) {
    return 'gba:text-success gba:bg-success-secondary'
  }
  return DEFAULT_BADGE_CLASS
}

const getChangeLabel = (changePercent: number): string => {
  const formatted = Math.abs(changePercent).toFixed(2)

  if (changePercent > 0) {
    return `↗+${formatted}%`
  }
  if (changePercent < 0) {
    return `↘-${formatted}%`
  }
  return `${formatted}%`
}

const resolveYearComparisonMeta = (
  total: number,
  previousTotal: number
): { changePercent: number | null; label: string; badgeClass: string } => {
  if (previousTotal === 0) {
    if (total === 0) {
      return { changePercent: null, label: '0%', badgeClass: DEFAULT_BADGE_CLASS }
    }

    return {
      changePercent: null,
      label: `+${total} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.new_requests', 'New requests')}`,
      badgeClass: 'gba:text-info gba:bg-info-secondary'
    }
  }

  if (total === 0) {
    return {
      changePercent: -100,
      label: '↘-100%',
      badgeClass: 'gba:text-success gba:bg-success-secondary'
    }
  }

  const changePercent = ((total - previousTotal) / previousTotal) * 100

  return {
    changePercent,
    label: getChangeLabel(changePercent),
    badgeClass: getChangeBadgeClass(changePercent)
  }
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
      const { changePercent, label, badgeClass } = resolveYearComparisonMeta(total, prev)

      return { year: y, total, changePercent, label, badgeClass }
    })
  }, [absences])

  const maxRowTotal = useMemo(() => Math.max(...rows.map(row => row.total), 0), [rows])

  return (
    <Card className="gba:shadow-none">
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
            {rows.map(row => {
              const pct = maxRowTotal > 0 ? Math.max(4, Math.round((row.total / maxRowTotal) * 100)) : 0

              return (
                <div key={row.year} className="gba:flex gba:items-center">
                  <div className="gba:w-20 gba:text-sm gba:text-foreground">{row.year}</div>
                  <div className="gba:flex-1 gba:px-3">
                    <Progress value={pct} className="gba:h-2.5" />
                  </div>
                  <div className="gba:w-20 gba:text-right gba:text-sm gba:text-foreground">{row.total}</div>
                  <div className="gba:w-32 gba:text-right gba:text-xs gba:font-medium gba:whitespace-nowrap">
                    <span
                      className={row.badgeClass.replace('gba:bg-', 'gba:text-').replace('-50', '').replace('-100', '')}
                    >
                      {row.label}
                    </span>
                  </div>
                </div>
              )
            })}
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
