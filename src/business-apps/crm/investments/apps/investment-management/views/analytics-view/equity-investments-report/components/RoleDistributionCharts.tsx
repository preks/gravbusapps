import React, { useState, useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { PieChart, Pie, Cell } from 'recharts'
import { formatCurrency } from '@/common/data/investment'
import { ChartPieSliceIcon, CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { EquityInvestmentSummary } from '../../shared/types'
import { CHART_COLORS, renderCustomizedLabel, createChartConfig } from './shared/chartUtils'

interface RoleDistributionChartsProps {
  roleData: any[]
  rawInvestments: EquityInvestmentSummary[]
}

export const RoleDistributionCharts: React.FC<RoleDistributionChartsProps> = ({ roleData, rawInvestments }) => {
  const [roleCurrencyFilter, setRoleCurrencyFilter] = useState('EUR')

  // Create chart configurations
  const roleCountConfig = useMemo(() => createChartConfig(roleData), [roleData])
  const roleValueConfig = useMemo(() => createChartConfig(roleData), [roleData])

  // Filter data by currency for value chart
  const filteredRoleData = useMemo(() => {
    return roleData.map(item => {
      const totalValue = rawInvestments
        .filter(
          inv =>
            (inv.equityInvestment?.investmentRole?.value || 'Unknown') === item.name &&
            inv.currencyCode === roleCurrencyFilter
        )
        .reduce((sum, inv) => sum + (inv.investment.totalInvestmentAmount || 0), 0)

      return {
        ...item,
        totalvalue: totalValue
      }
    })
  }, [roleData, rawInvestments, roleCurrencyFilter])

  const availableCurrencies = useMemo(() => {
    const currencies = new Set(rawInvestments.map(inv => inv.currencyCode))
    return Array.from(currencies)
  }, [rawInvestments])

  return (
    <div className="gba:grid gba:grid-cols-2 gba:gap-4">
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={ChartPieSliceIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>Role Distribution</CardTitle>
                <CardDescription>Count of investments by role</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={roleCountConfig}>
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Pie
                data={roleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="var(--nw-color-primary-500)"
                dataKey="count"
              >
                {roleData.map((entry, index) => (
                  <Cell key={`role_count_${entry.name}_${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={CurrencyCircleDollarIcon} variant="secondary" size="md" decorative />
              <div>
                <CardTitle>Role Distribution by Total Amount</CardTitle>
                <CardDescription>Total investment amount by role</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <Select value={roleCurrencyFilter} onValueChange={setRoleCurrencyFilter}>
                <SelectTrigger className="gba:w-20 gba:h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map(currency => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={roleValueConfig}>
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [formatCurrency(value as number, roleCurrencyFilter), name]}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Pie
                data={filteredRoleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="var(--nw-color-primary-500)"
                dataKey="totalvalue"
              >
                {filteredRoleData.map((entry, index) => (
                  <Cell key={`role_value_${entry.name}_${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
