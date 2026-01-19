### Chart Card Example (Phosphoricons + ChartContainer + Legend + Tooltip)

This example shows the canonical pattern for building a chart card using the NEWWORK design system, Phosphoricons, and Recharts. It matches the approach used in `src/common/components/common-relations/view-layouts/dashboard-layout/overview/widgets/LeadSourceChart.tsx`.

Key rules:

- Use Icon components from Phosphoricons only.
- Provide a stable name key and data key. These must be identical across all data items.
- Build `chartData` with `fill: var(--color-<key>)`. The design system resolves colors automatically.
- Build `chartConfig` with:
  - A root entry for the data key (no color needed)
  - One entry per series key with a human-readable label only (no color)
- Add `<ChartTooltip>` and `<ChartLegend>` bound to the same keys.

```tsx
import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from '@newwork/nw-design-system'
import { PieChart, Pie } from 'recharts'
import { ChartPie } from '@phosphor-icons/react'

type Item = { label: string; value: number }

const toKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

interface ExampleChartCardProps {
  items: Item[]
  title?: string
  subtitle?: string
}

export const ExampleChartCard: React.FC<ExampleChartCardProps> = ({
  items,
  title = 'Lead Sources - Open Leads',
  subtitle = 'Distribution by source'
}) => {
  // Required keys (must be consistent across data and config)
  const dataKey = 'leads'
  const nameKey = 'source'

  // 1) Create chart data: { [nameKey]: key, [dataKey]: number, fill: var(--color-<key>) }
  const chartData = useMemo(
    () =>
      items.map(item => ({
        [nameKey]: toKey(item.label),
        [dataKey]: item.value,
        fill: `var(--color-${toKey(item.label)})`
      })),
    [items]
  )

  // 2) Create chart config: data key + one entry per series key (labels only)
  const chartConfig = useMemo(() => {
    const cfg: Record<string, { label?: string }> = { [dataKey]: {} }
    items.forEach(item => {
      cfg[toKey(item.label)] = { label: item.label }
    })
    return cfg as ChartConfig
  }, [items])

  return (
    <Card data-testid="example-chart-card">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartPie} variant="default" size="md" decorative />
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="gba:w-[300px] gba:h-[300px]">
          <PieChart width={300} height={300}>
            <Pie data={chartData} dataKey={dataKey} nameKey={nameKey} innerRadius="60%" outerRadius="80%" />
            <ChartTooltip content={<ChartTooltipContent hideLabel labelKey={dataKey} nameKey={nameKey} />} />
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
```

Notes:

- `toKey()` normalizes labels into kebab-case keys used by both `chartData` and `chartConfig`.
- Do NOT hardcode colors; the design system applies them based on the generated keys.
- Use Phosphoricons for the `IconAvatar` (e.g., `ChartPie`).
