import { Card, CardContent } from '@newwork/nw-design-system'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { AnalysisKpi } from '../../types/nexus.types'

interface AnalysisKpiCardProps {
  kpi: AnalysisKpi
  testId?: string
}

export const AnalysisKpiCard = ({ kpi, testId = 'nexus-kpi' }: AnalysisKpiCardProps) => {
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus

  const trendColor =
    kpi.trend === 'up'
      ? 'gba:text-success gba:bg-success/10'
      : kpi.trend === 'down'
        ? 'gba:text-destructive gba:bg-destructive/10'
        : 'gba:text-muted-foreground gba:bg-muted'

  const accentBorder =
    kpi.trend === 'up'
      ? 'gba:border-l-2 gba:border-l-success'
      : kpi.trend === 'down'
        ? 'gba:border-l-2 gba:border-l-destructive'
        : 'gba:border-l-2 gba:border-l-muted-foreground'

  return (
    <Card className={`gba:overflow-hidden ${accentBorder}`} data-testid={testId}>
      <CardContent className="gba:p-5">
        <div className="gba:space-y-2">
          <p className="gba:text-[10px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-widest">
            {kpi.label}
          </p>
          <div className="gba:flex gba:items-baseline gba:gap-1.5">
            <span className="gba:text-2xl gba:font-bold gba:text-foreground gba:tracking-tight gba:tabular-nums">
              {kpi.value}
            </span>
            {kpi.unit && <span className="gba:text-xs gba:text-muted-foreground gba:font-medium">{kpi.unit}</span>}
          </div>
          {kpi.trend && (
            <div
              className={`gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:text-[11px] gba:font-semibold ${trendColor}`}
            >
              <TrendIcon className="gba:h-3 gba:w-3" />
              {kpi.trendValue && <span>{kpi.trendValue}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
