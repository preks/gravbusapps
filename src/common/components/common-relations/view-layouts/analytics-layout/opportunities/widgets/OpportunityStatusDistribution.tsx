import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  IconAvatar
} from '@newwork/nw-design-system'
import { ChartPieIcon } from '@phosphor-icons/react'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'

export interface OpportunityStatusDistributionItem {
  status: 'Open' | 'Won' | 'Lost'
  count: number
  value: number
}

export interface OpportunityStatusDistributionProps {
  data: OpportunityStatusDistributionItem[]
  moduleColor?: string
  currency?: string
}

export const OpportunityStatusDistribution: React.FC<OpportunityStatusDistributionProps> = ({
  data,
  moduleColor = 'default',
  currency = 'EUR'
}) => {
  const chartConfig = useMemo(
    () =>
      ({
        count: {
          label: 'Opportunities'
        }
      }) satisfies ChartConfig,
    []
  )

  return (
    <Card data-testid="opportunity-status-distribution">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartPieIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative />
        <div>
          <CardTitle>Opportunity Status Distribution</CardTitle>
          <CardDescription>Opportunities grouped by backend status buckets</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 gba:gap-3 gba:mb-6">
          {data.map(item => (
            <div
              key={item.status}
              className="gba:bg-gray-50 gba:p-3 gba:rounded-lg"
              data-testid={`status-${item.status}`}
            >
              <div className="gba:text-sm gba:font-medium gba:text-gray-600">{item.status}</div>
              <div className="gba:text-2xl gba:font-bold gba:text-gray-900">{item.count}</div>
              <div className="gba:text-xs gba:text-gray-600">
                {formatCurrencyCompact(item.value, currency, undefined, 1, true)}
              </div>
            </div>
          ))}
        </div>
        <ChartContainer config={chartConfig} className="gba:h-64 gba:w-full">
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
            <XAxis dataKey="status" />
            <YAxis />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value: number) => [`${value}`, 'Opportunities']} />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default OpportunityStatusDistribution
