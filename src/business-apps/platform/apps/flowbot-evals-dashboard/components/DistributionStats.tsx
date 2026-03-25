import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
import type { DistributionBlock } from '../types'

const formatNumber = (value: number | null, suffix = '') => {
  if (value == null) return '—'
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}${suffix}`
}

interface StatColProps {
  label: string
  p50: number | null
  p95: number | null
  p99: number | null
  suffix?: string
}

function StatCol({ label, p50, p95, p99, suffix = '' }: Readonly<StatColProps>) {
  return (
    <Card>
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-sm">{label}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-xs gba:text-muted-foreground">Typical</span>
          <Badge variant="secondary">{formatNumber(p50, suffix)}</Badge>
        </div>
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-xs gba:text-muted-foreground">Peak (95%)</span>
          <Badge variant="secondary">{formatNumber(p95, suffix)}</Badge>
        </div>
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-xs gba:text-muted-foreground">Tail (99%)</span>
          <Badge variant="secondary">{formatNumber(p99, suffix)}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export interface DistributionStatsProps {
  distributions: DistributionBlock
  'data-testid'?: string
}

export function DistributionStats({
  distributions,
  'data-testid': testId = 'flowbot-evals-distributions'
}: Readonly<DistributionStatsProps>) {
  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-3" data-testid={testId}>
      <StatCol label="Total latency spread" suffix=" ms" {...distributions.total_ms} />
      <StatCol label="TTFT spread" suffix=" ms" {...distributions.ttft_ms} />
      <StatCol label="Token spread" {...distributions.total_tokens} />
    </div>
  )
}

export default DistributionStats
