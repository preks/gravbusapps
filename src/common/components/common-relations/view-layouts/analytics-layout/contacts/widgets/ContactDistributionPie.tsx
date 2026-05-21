import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  IconAvatar,
  Spinner
} from '@newwork/nw-design-system'
import { ChartPieIcon } from '@phosphor-icons/react'
import { Pie, PieChart } from 'recharts'

export interface ContactDistributionItem {
  label: string
  count: number
}

export interface ContactDistributionPieProps {
  title: string
  description: string
  data: ContactDistributionItem[]
  isLoading?: boolean
  moduleColor?: string
  dataTestId: string
  onTypeClick?: (type: string) => void
  selectedType?: string | null
}

const toChartKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

export const ContactDistributionPie: React.FC<ContactDistributionPieProps> = ({
  title,
  description,
  data,
  isLoading = false,
  moduleColor = 'default',
  dataTestId,
  onTypeClick,
  selectedType
}) => {
  const chartData = useMemo(() => {
    return data.map(item => {
      const key = toChartKey(item.label)
      return {
        label: key,
        displayLabel: item.label,
        contacts: item.count,
        fill: `var(--color-${key})`
      }
    })
  }, [data])

  const chartConfig = useMemo(() => {
    const config: Record<string, { label?: string }> = {}
    data.forEach(item => {
      config[toChartKey(item.label)] = { label: item.label }
    })
    return config as ChartConfig
  }, [data])

  const labelByKey = useMemo(() => Object.fromEntries(data.map(item => [toChartKey(item.label), item.label])), [data])

  return (
    <Card data-testid={dataTestId} className="gba:flex gba:flex-col">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartPieIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative />
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1">
        {isLoading ? (
          <div className="gba:flex gba:h-64 gba:items-center gba:justify-center" data-testid={`${dataTestId}-loading`}>
            <Spinner size="lg" />
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="[&_.recharts-pie-label-text]:fill-foreground gba:mx-auto gba:aspect-square gba:max-h-80"
          >
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="40%"
                outerRadius={90}
                dataKey="contacts"
                nameKey="label"
                style={onTypeClick ? { cursor: 'pointer' } : undefined}
                onClick={
                  onTypeClick
                    ? (item: any) => {
                        if (item?.displayLabel) onTypeClick(item.displayLabel)
                      }
                    : undefined
                }
                strokeWidth={selectedType ? 1 : 0}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    labelKey="contacts"
                    nameKey="label"
                    formatter={(value: number, name: string) => {
                      const displayName = labelByKey[name] ?? name
                      return [`${displayName} ${value}`, '']
                    }}
                  />
                }
              />
              <ChartLegend
                content={<ChartLegendContent className="gba:flex-wrap gba:gap-4 [&>*]:whitespace-nowrap" />}
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default ContactDistributionPie
