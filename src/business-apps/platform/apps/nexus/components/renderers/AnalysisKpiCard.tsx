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
      ? 'gba:text-success'
      : kpi.trend === 'down'
        ? 'gba:text-destructive'
        : 'gba:text-muted-foreground'

  const accentBorder =
    kpi.trend === 'up'
      ? 'gba:border-t-2 gba:border-t-success'
      : kpi.trend === 'down'
        ? 'gba:border-t-2 gba:border-t-destructive'
        : 'gba:border-t-2 gba:border-t-muted-foreground'

  return (
    <Card className={`gba:overflow-hidden ${accentBorder}`} data-testid={testId}>
      <CardContent className="gba:p-5">
        <div className="gba:space-y-1.5">
          <p className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider">
            {kpi.label}
          </p>
          <div className="gba:flex gba:items-baseline gba:gap-1.5">
            <span className="gba:text-2xl gba:font-bold gba:text-foreground gba:tracking-tight">{kpi.value}</span>
            {kpi.unit && <span className="gba:text-sm gba:text-muted-foreground">{kpi.unit}</span>}
          </div>
          {kpi.trend && (
            <div className={`gba:flex gba:items-center gba:gap-1 ${trendColor}`}>
              <TrendIcon className="gba:h-3.5 gba:w-3.5" />
              {kpi.trendValue && <span className="gba:text-xs gba:font-medium">{kpi.trendValue}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
