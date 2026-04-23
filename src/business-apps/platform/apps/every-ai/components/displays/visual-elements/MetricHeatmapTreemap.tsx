import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts'
import type { HeatmapData, MetricCardsData, TreemapData } from '../../../types/models'

function heatColor(v: number, min: number, max: number): string {
  if (max <= min) {
    return 'color-mix(in oklch, var(--nw-chart-1) 35%, transparent)'
  }
  const t = (v - min) / (max - min)
  const intensityPercent = 15 + t * 75
  return `color-mix(in oklch, var(--nw-chart-1) ${intensityPercent.toFixed(0)}%, transparent)`
}

export const MetricCardsDisplay: React.FC<{ data: MetricCardsData }> = ({ data }) => {
  const cols = data.columns && data.columns >= 1 && data.columns <= 4 ? data.columns : 3
  const gridClass =
    cols === 1
      ? 'gba:grid-cols-1'
      : cols === 2
        ? 'gba:grid-cols-1 sm:gba:grid-cols-2'
        : cols === 4
          ? 'gba:grid-cols-1 sm:gba:grid-cols-2 lg:gba:grid-cols-4'
          : 'gba:grid-cols-1 sm:gba:grid-cols-2 lg:gba:grid-cols-3'

  return (
    <Card className="gba:border-2 gba:shadow-lg" data-testid="metric-cards-display">
      <CardHeader>
        <CardTitle className="gba:text-lg">{data.title}</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p>
      </CardHeader>
      <CardContent>
        <div className={`gba:grid gba:gap-3 ${gridClass}`}>
          {data.cards.map(card => (
            <div
              key={card.label}
              className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:p-4 gba:hover:gba:bg-muted/50 gba:transition-colors"
              title={card.hint ?? undefined}
              data-testid={`metric-card-${card.label.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                {card.label}
              </p>
              <p className="gba:mt-1 gba:text-2xl gba:font-semibold gba:text-foreground">{card.value}</p>
              {card.delta && (
                <p
                  className={`gba:mt-1 gba:text-sm ${
                    card.deltaDirection === 'up'
                      ? 'gba:text-success'
                      : card.deltaDirection === 'down'
                        ? 'gba:text-destructive'
                        : 'gba:text-muted-foreground'
                  }`}
                >
                  {card.delta}
                </p>
              )}
              {card.hint && <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground">{card.hint}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export const HeatmapDisplay: React.FC<{ data: HeatmapData }> = ({ data }) => {
  const { min, max } = useMemo(() => {
    let minV = Number.POSITIVE_INFINITY
    let maxV = Number.NEGATIVE_INFINITY
    for (const row of data.values) {
      for (const cell of row) {
        if (cell != null && !Number.isNaN(cell)) {
          minV = Math.min(minV, cell)
          maxV = Math.max(maxV, cell)
        }
      }
    }
    if (!Number.isFinite(minV)) {
      minV = 0
      maxV = 1
    }
    return { min: minV, max: maxV }
  }, [data.values])

  return (
    <Card className="gba:border-2 gba:shadow-lg gba:overflow-x-auto" data-testid="heatmap-display">
      <CardHeader>
        <CardTitle className="gba:text-lg">{data.title}</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p>
      </CardHeader>
      <CardContent>
        <div
          className="gba:grid gba:gap-px gba:rounded-md gba:overflow-hidden gba:border gba:border-border"
          style={{
            gridTemplateColumns: `minmax(4rem,auto) repeat(${data.columnLabels.length}, minmax(2.5rem,1fr))`
          }}
        >
          <div className="gba:bg-muted/50" />
          {data.columnLabels.map(cl => (
            <div
              key={cl}
              className="gba:bg-muted/50 gba:p-1 gba:text-center gba:text-xs gba:font-medium gba:text-muted-foreground"
            >
              {cl}
            </div>
          ))}
          {data.rowLabels.map((rl, ri) => (
            <React.Fragment key={rl}>
              <div className="gba:flex gba:items-center gba:bg-muted/30 gba:px-2 gba:text-xs gba:font-medium gba:text-foreground">
                {rl}
              </div>
              {data.columnLabels.map((_, ci) => {
                const v = data.values[ri]?.[ci]
                const label = data.cellLabels?.[ri]?.[ci]
                const display = v != null && !Number.isNaN(v) ? v : null
                return (
                  <div
                    key={`${ri}-${ci}`}
                    className="gba:min-h-10 gba:flex gba:items-center gba:justify-center gba:text-xs gba:cursor-default"
                    style={{
                      backgroundColor:
                        display != null
                          ? heatColor(display, min, max)
                          : 'color-mix(in oklch, var(--nw-muted) 30%, transparent)'
                    }}
                    title={label ?? (display != null ? String(display) : '')}
                  >
                    {display != null ? display.toFixed(display % 1 === 0 ? 0 : 1) : ''}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export const TreemapDisplay: React.FC<{ data: TreemapData }> = ({ data }) => {
  return (
    <Card className="gba:border-2 gba:shadow-lg" data-testid="treemap-display">
      <CardHeader>
        <CardTitle className="gba:text-lg">{data.title}</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <Treemap
            data={[data.root]}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="var(--nw-border)"
            fill="var(--nw-chart-1)"
            isAnimationActive={false}
          >
            <Tooltip
              formatter={(v: number) =>
                data.valueFormat === 'currency'
                  ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(v)
                  : String(v)
              }
            />
          </Treemap>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
