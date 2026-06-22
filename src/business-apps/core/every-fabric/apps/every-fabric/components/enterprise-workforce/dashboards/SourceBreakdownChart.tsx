// Where an agent's work comes from, charted as runs-per-trigger-source.
// Replaces the previous inline-style (`style={{ width }}`) progress bars,
// which violated the design-system "no inline styles" rule, with a proper
// DS BarChart.

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  useTranslation
} from '@newwork/nw-design-system'
import { TreeStructureIcon } from '@phosphor-icons/react'
import React, { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { WorkforceSourceBreakdownEntry } from '../workforceTypes'
import translations from '../../../_i18n'

export interface SourceBreakdownChartProps {
  entries: readonly WorkforceSourceBreakdownEntry[]
}

const SOURCE_LABEL_KEYS: Record<string, string> = {
  manual: 'runs-filter-manual',
  schedule: 'runs-filter-schedule',
  webhook: 'runs-filter-webhook',
  inbound_email: 'runs-filter-inbound-email'
}

export const SourceBreakdownChart: React.FC<SourceBreakdownChartProps> = ({ entries }) => {
  const { t } = useTranslation(translations)
  const chartConfig = useMemo(
    () => ({
      runs: { label: t('chart-source-runs-label'), color: 'var(--nw-color-chart-2, var(--primary))' }
    }),
    [t]
  )

  const data = useMemo(
    () =>
      entries
        .filter(entry => entry.runs > 0)
        .map(entry => ({
          source: entry.source,
          label: SOURCE_LABEL_KEYS[entry.source] ? t(SOURCE_LABEL_KEYS[entry.source]) : entry.source,
          runs: entry.runs,
          credits: entry.credits
        })),
    [entries, t]
  )

  return (
    <Card data-testid="workforce-source-breakdown-chart">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
          <TreeStructureIcon className="gba:h-4 gba:w-4 gba:text-primary" />
          {t('chart-source-title')}
        </CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">{t('chart-source-desc')}</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p
            className="gba:py-8 gba:text-center gba:text-xs gba:text-muted-foreground"
            data-testid="workforce-source-breakdown-empty"
          >
            {t('chart-source-empty')}
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="gba:h-[200px] gba:w-full gba:aspect-auto">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} fontSize={11} width={90} />
              <ChartTooltip content={<ChartTooltipContent labelKey="label" />} />
              <Bar dataKey="runs" name="runs" fill="var(--color-runs)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
