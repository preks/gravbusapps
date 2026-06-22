// Daily credit-consumption trend with an estimated-cost overlay.
//
// Replaces the hand-rolled inline-SVG sparkline. Credits are charted as bars
// (the authoritative number); estimated USD is derived proportionally from the
// window totals and surfaced in the tooltip + subtitle so finance has a
// money figure without us inventing a second, unreconciled series.

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
import { CoinsIcon } from '@phosphor-icons/react'
import React, { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { formatDateOnly } from '../runDisplay'
import type { WorkforceMetricsBucket } from '../workforceTypes'
import translations from '../../../_i18n'

export interface CreditTrendChartProps {
  buckets: readonly WorkforceMetricsBucket[]
  totalCredits: number
  estimatedUsd: number
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

export const CreditTrendChart: React.FC<CreditTrendChartProps> = ({ buckets, totalCredits, estimatedUsd }) => {
  const { t } = useTranslation(translations)
  const chartConfig = useMemo(
    () => ({
      credits: { label: t('chart-credits-label'), color: 'var(--nw-color-chart-1, var(--primary))' }
    }),
    [t]
  )
  const usdPerCredit = totalCredits > 0 ? estimatedUsd / totalCredits : 0
  const data = useMemo(
    () =>
      buckets.map(bucket => ({
        date: bucket.date,
        label: formatDateOnly(bucket.date),
        credits: bucket.credits,
        usd: Number((bucket.credits * usdPerCredit).toFixed(2))
      })),
    [buckets, usdPerCredit]
  )

  return (
    <Card data-testid="workforce-credit-trend-chart">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
          <CoinsIcon className="gba:h-4 gba:w-4 gba:text-primary" />
          {t('chart-credit-title')}
        </CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">
          {t('chart-credit-subtitle', {
            credits: new Intl.NumberFormat().format(totalCredits),
            usd: formatUsd(estimatedUsd)
          })}
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="gba:py-8 gba:text-center gba:text-xs gba:text-muted-foreground">{t('chart-credit-empty')}</p>
        ) : (
          <ChartContainer config={chartConfig} className="gba:h-[200px] gba:w-full gba:aspect-auto">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={36} />
              <ChartTooltip content={<ChartTooltipContent labelKey="label" />} />
              <Bar dataKey="credits" name="credits" fill="var(--color-credits)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
