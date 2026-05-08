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
  dataTestId
}) => {
  const chartData = useMemo(() => {
    return data.map(item => {
      const key = toChartKey(item.label)
      return {
        label: key,
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
              <Pie data={chartData} cx="50%" cy="40%" outerRadius={90} dataKey="contacts" nameKey="label" />
              <ChartTooltip content={<ChartTooltipContent hideLabel labelKey="contacts" nameKey="label" />} />
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
