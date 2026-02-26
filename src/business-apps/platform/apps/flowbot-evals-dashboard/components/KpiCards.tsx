import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, IconAvatar } from '@newwork/nw-design-system'
import { ActivityIcon, WarningIcon, TimerIcon, ClockIcon, HashIcon, WrenchIcon } from '@phosphor-icons/react'
import type { DashboardCard } from '../types'

const formatNumber = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)
const formatMs = (value: number) => `${formatNumber(value)} ms`
const formatTokens = (value: number) => `${formatNumber(value)}`
const formatRatioPct = (value: number) => `${(value * 100).toFixed(2)}%`
const formatOneDecimal = (value: number) => `${value.toFixed(1)}`

const getCardPresentation = (key: string) => {
  switch (key) {
    case 'runs':
      return { icon: ActivityIcon, variant: 'info' as const, formatter: formatNumber, unitLabel: null }
    case 'error_rate':
      return { icon: WarningIcon, variant: 'warning' as const, formatter: formatRatioPct, unitLabel: 'rate' }
    case 'p95_total_ms':
      return { icon: TimerIcon, variant: 'secondary' as const, formatter: formatMs, unitLabel: 'ms' }
    case 'p50_ttft_ms':
      return { icon: ClockIcon, variant: 'secondary' as const, formatter: formatMs, unitLabel: 'ms' }
    case 'p95_tokens':
      return { icon: HashIcon, variant: 'secondary' as const, formatter: formatTokens, unitLabel: 'tokens' }
    case 'avg_tool_calls':
      return { icon: WrenchIcon, variant: 'secondary' as const, formatter: formatOneDecimal, unitLabel: 'calls' }
    default:
      return { icon: ActivityIcon, variant: 'secondary' as const, formatter: (v: number) => String(v), unitLabel: null }
  }
}

export interface KpiCardsProps {
  cards: DashboardCard[]
  'data-testid'?: string
}

export function KpiCards({ cards, 'data-testid': testId = 'flowbot-evals-kpis' }: Readonly<KpiCardsProps>) {
  const topCards = useMemo(() => cards.slice(0, 6), [cards])

  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2 gba:xl:grid-cols-3" data-testid={testId}>
      {topCards.map(card => {
        const pres = getCardPresentation(card.key)
        const valueText = card.value == null ? '—' : pres.formatter(card.value)
        return (
          <Card key={card.key}>
            <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-3">
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={pres.icon} variant={pres.variant as any} size="md" decorative />
                <div className="gba:min-w-0">
                  <CardTitle className="gba:text-sm gba:font-semibold gba:truncate">{card.label}</CardTitle>
                  <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{card.key}</div>
                </div>
              </div>
              {card.unit && (
                <Badge variant="secondary" className="gba:shrink-0">
                  {card.unit}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="gba:pt-0">
              <div className="gba:text-2xl gba:font-semibold">{valueText}</div>
              {pres.unitLabel && <div className="gba:text-xs gba:text-muted-foreground">{pres.unitLabel}</div>}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default KpiCards
