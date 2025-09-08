import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, IconAvatar, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@newwork/nw-design-system';
import { 
  ComposedChart,
  Bar,
  Line,
  BarChart,
  XAxis, 
  YAxis
} from 'recharts';
import { formatCurrency } from '@/common/data/investment';
import { ChartBarIcon, TrendUpIcon } from '@phosphor-icons/react';

interface PortfolioAnalyticsChartsProps {
  concentrationByGroupData: any[];
  valueByAccountData: any[];
}

export const PortfolioAnalyticsCharts: React.FC<PortfolioAnalyticsChartsProps> = ({
  concentrationByGroupData,
  valueByAccountData
}) => {
  return (
    <>
      <div style={{ gridColumn: '1 / -1', marginBottom: '24px' }}>
        <Card>
          <CardHeader>
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={ChartBarIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>Top Investment Accounts by Value</CardTitle>
                <CardDescription>Investment accounts ranked by total portfolio value</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer 
              config={useMemo(() => ({
                totalvalue: { label: "Total Value" }
              }), [])} 
              className="gba:h-[400px] gba:w-full"
            >
              <BarChart
                data={valueByAccountData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                maxBarSize={60}
              >
                <XAxis 
                  dataKey="account" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    if (value.length > 15) {
                      return value.substring(0, 12) + '...';
                    }
                    return value;
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatCurrency(value, 'EUR').replace('€', '')}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent formatter={(value, name) => [
                    formatCurrency(value as number, 'EUR'),
                    name
                  ]} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar 
                  dataKey="totalValue" 
                  name="totalvalue"
                  fill="var(--color-totalvalue)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={TrendUpIcon} variant="success" size="md" decorative />
            <div>
              <CardTitle>Portfolio Concentration by Investment Group</CardTitle>
              <CardDescription>Investment distribution and performance across different groups</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer 
            config={useMemo(() => ({
              investmentcount: { label: "Investment Count" },
              totalvalue: { label: "Total Value" },
              averagevalue: { label: "Average Value" }
            }), [])} 
            className="gba:h-[400px] gba:w-full"
          >
            <ComposedChart data={concentrationByGroupData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <XAxis 
                dataKey="group" 
                angle={-45} 
                textAnchor="end" 
                height={80} 
                interval={0} 
                tick={{ fontSize: 12 }}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <ChartTooltip 
                content={<ChartTooltipContent formatter={(value, name) => {
                  if (name === 'Total Value' || name === 'Average Value') {
                    return [formatCurrency(value as number, 'EUR'), name];
                  }
                  return [value, name];
                }} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar 
                yAxisId="left" 
                dataKey="count" 
                name="investmentcount"
                fill="var(--color-investmentcount)" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                yAxisId="right" 
                dataKey="totalValue" 
                name="totalvalue"
                fill="var(--color-totalvalue)" 
                radius={[4, 4, 0, 0]} 
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="averageValue" 
                name="averagevalue"
                stroke="var(--color-averagevalue)" 
                strokeWidth={3} 
                dot={{ r: 6 }} 
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  );
};


