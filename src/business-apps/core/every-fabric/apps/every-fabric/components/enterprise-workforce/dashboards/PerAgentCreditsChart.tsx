// Per-agent credit comparison for the workforce overview hub. Ranks agents by
// credits consumed in the window so an admin can spot the heavy hitters. Names
// are resolved from a passed id->name map; unknown ids fall back to a short id.

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
import { UsersThreeIcon } from '@phosphor-icons/react'
import React, { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import translations from '../../../_i18n'
import type { WorkforceWorkspaceAgentBreakdown } from '../workforceTypes'

export interface PerAgentCreditsChartProps {
  breakdown: readonly WorkforceWorkspaceAgentBreakdown[]
  nameById: Record<string, string>
  maxAgents?: number
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

export const PerAgentCreditsChart: React.FC<PerAgentCreditsChartProps> = ({ breakdown, nameById, maxAgents = 8 }) => {
  const { t } = useTranslation(translations)
  const chartConfig = useMemo(
    () => ({
      credits: { label: t('chart-credits-label'), color: 'var(--nw-color-chart-3, var(--primary))' }
    }),
    [t]
  )

  const data = useMemo(() => {
    return breakdown
      .map(row => ({
        agentId: row.agent_id,
        label: nameById[row.agent_id] ?? shortId(row.agent_id),
        credits: row.totals.total_credits
      }))
      .filter(row => row.credits > 0)
      .sort((a, b) => b.credits - a.credits)
      .slice(0, maxAgents)
  }, [breakdown, nameById, maxAgents])

  return (
    <Card data-testid="workforce-per-agent-chart">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
          <UsersThreeIcon className="gba:h-4 gba:w-4 gba:text-primary" />
          {t('per-agent-chart-title')}
        </CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">{t('per-agent-chart-subtitle')}</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="gba:py-8 gba:text-center gba:text-xs gba:text-muted-foreground">{t('per-agent-chart-empty')}</p>
        ) : (
          <ChartContainer config={chartConfig} className="gba:h-[240px] gba:w-full gba:aspect-auto">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} fontSize={11} width={120} />
              <ChartTooltip content={<ChartTooltipContent labelKey="label" />} />
              <Bar dataKey="credits" name="credits" fill="var(--color-credits)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
