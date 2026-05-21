import React, { useMemo } from 'react'
import { AnalyticsChartTooltip } from '../../shared/components'
import type { InvestmentGroupMonthlyTimelineDatum } from '../queries/shared'
import { formatCompactCurrency, formatCompactNumber } from './chartFormatters'

interface PlannedExitCalendarHeatmapProps {
  data: InvestmentGroupMonthlyTimelineDatum[]
  currencyCode: string
}

const getIntensityClass = (count: number, maxCount: number): string => {
  if (count === 0 || maxCount === 0) {
    return 'gba:bg-muted gba:text-muted-foreground'
  }

  const ratio = count / maxCount

  if (ratio <= 0.25) return 'gba:bg-primary/10 gba:text-primary'
  if (ratio <= 0.5) return 'gba:bg-primary/30 gba:text-primary'
  if (ratio <= 0.75) return 'gba:bg-primary/60 gba:text-primary-foreground'

  return 'gba:bg-primary gba:text-primary-foreground'
}

export const PlannedExitCalendarHeatmap: React.FC<PlannedExitCalendarHeatmapProps> = ({ data, currencyCode }) => {
  const years = useMemo(() => Array.from(new Set(data.map(item => item.year))), [data])
  const months = useMemo(
    () =>
      Array.from(new Map(data.map(item => [item.month, { month: item.month, monthLabel: item.monthLabel }])).values()),
    [data]
  )
  const dataByPeriod = useMemo(() => new Map(data.map(item => [item.period, item])), [data])
  const maxCount = useMemo(() => Math.max(0, ...data.map(item => item.count)), [data])

  return (
    <div className="gba:space-y-4">
      <div className="gba:overflow-x-auto">
        <table className="gba:w-full gba:min-w-full gba:border-separate gba:border-spacing-2">
          <thead>
            <tr>
              <th className="gba:w-16" />
              {months.map(month => (
                <th
                  key={month.month}
                  scope="col"
                  className="gba:px-2 gba:py-1 gba:text-center gba:text-xs gba:font-medium gba:text-muted-foreground"
                >
                  {month.monthLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((year, yearIndex) => (
              <tr key={year}>
                <th
                  scope="row"
                  className="gba:px-2 gba:py-2 gba:text-left gba:text-sm gba:font-medium gba:text-muted-foreground"
                >
                  {year}
                </th>
                {months.map((month, monthIndex) => {
                  const period = `${year}-${String(month.month).padStart(2, '0')}`
                  const item = dataByPeriod.get(period)
                  const count = item?.count ?? 0
                  const totalAmount = item?.totalAmount ?? 0

                  // First row: show tooltip below to avoid clipping above the thead
                  const tooltipVertical = yearIndex === 0 ? 'gba:top-full gba:mt-2' : 'gba:bottom-full gba:mb-2'
                  // Edge columns: pin tooltip to avoid overflow outside the scroll container
                  const tooltipHorizontalCenter = monthIndex <= 2 ? 'gba:left-0' : 'gba:left-1/2 gba:-translate-x-1/2'
                  const tooltipHorizontal = monthIndex >= months.length - 3 ? 'gba:right-0' : tooltipHorizontalCenter

                  return (
                    <td key={period} className="gba:p-0">
                      <div
                        className={`gba:group gba:relative gba:flex gba:h-14 gba:min-w-16 gba:flex-col gba:items-center gba:justify-center gba:rounded-md gba:border gba:border-border gba:text-center gba:transition-colors ${getIntensityClass(
                          count,
                          maxCount
                        )}`}
                      >
                        <span className="gba:text-sm gba:font-semibold">{formatCompactNumber(count)}</span>
                        <span className="gba:text-xs gba:opacity-80">
                          {formatCompactCurrency(totalAmount, currencyCode)}
                        </span>
                        <div
                          className={`gba:pointer-events-none gba:absolute gba:z-10 gba:hidden gba:w-max gba:group-hover:block ${tooltipVertical} ${tooltipHorizontal}`}
                        >
                          <AnalyticsChartTooltip
                            title={`${month.monthLabel} ${year}`}
                            metrics={[
                              { label: 'Planned exits', value: formatCompactNumber(count) },
                              { label: 'Total amount', value: formatCompactCurrency(totalAmount, currencyCode) }
                            ]}
                          />
                        </div>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
        <span>Fewer exits</span>
        <span className="gba:h-3 gba:w-8 gba:rounded-sm gba:bg-muted" />
        <span className="gba:h-3 gba:w-8 gba:rounded-sm gba:bg-primary/10" />
        <span className="gba:h-3 gba:w-8 gba:rounded-sm gba:bg-primary/30" />
        <span className="gba:h-3 gba:w-8 gba:rounded-sm gba:bg-primary/60" />
        <span className="gba:h-3 gba:w-8 gba:rounded-sm gba:bg-primary" />
        <span>More exits</span>
      </div>
    </div>
  )
}
