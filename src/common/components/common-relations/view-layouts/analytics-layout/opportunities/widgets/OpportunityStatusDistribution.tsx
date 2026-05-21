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
  onStatusClick?: (status: 'Open' | 'Won' | 'Lost') => void
  selectedStatus?: 'Open' | 'Won' | 'Lost' | null
}

export const OpportunityStatusDistribution: React.FC<OpportunityStatusDistributionProps> = ({
  data,
  moduleColor = 'default',
  currency = 'EUR',
  onStatusClick,
  selectedStatus
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
            <button
              key={item.status}
              type="button"
              className={`gba:p-3 gba:rounded-lg gba:transition-colors gba:w-full gba:text-left ${
                selectedStatus === item.status ? 'gba:bg-primary/10 gba:ring-2 gba:ring-primary' : 'gba:bg-muted'
              } ${
                selectedStatus !== item.status && onStatusClick
                  ? 'gba:cursor-pointer hover:gba:bg-muted/70'
                  : 'gba:cursor-default'
              }`}
              data-testid={`status-${item.status}`}
              onClick={() => onStatusClick?.(item.status)}
              disabled={!onStatusClick}
            >
              <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">{item.status}</div>
              <div className="gba:text-2xl gba:font-bold">{item.count}</div>
              <div className="gba:text-xs gba:text-muted-foreground">
                {formatCurrencyCompact(item.value, currency, undefined, 1, true)}
              </div>
            </button>
          ))}
        </div>
        <ChartContainer
          config={chartConfig}
          className={`gba:h-64 gba:w-full ${onStatusClick ? 'gba:cursor-pointer' : ''}`}
        >
          <BarChart
            data={data}
            margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
            onClick={
              onStatusClick
                ? (chartData: any) => {
                    const status = chartData?.activePayload?.[0]?.payload?.status ?? (chartData?.activeLabel as string)
                    if (status) onStatusClick(status)
                  }
                : undefined
            }
          >
            <XAxis dataKey="status" />
            <YAxis />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value: number, _name: string, item: any) => {
                    const status = item?.payload?.status ?? ''
                    return status ? [`${status} ${value}`, ''] : [`${value}`, '']
                  }}
                />
              }
            />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[3, 3, 0, 0]}
              style={onStatusClick ? { cursor: 'pointer' } : undefined}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default OpportunityStatusDistribution
