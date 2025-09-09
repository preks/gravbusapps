import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, IconAvatar, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@newwork/nw-design-system';
import {
  ComposedChart,
  ScatterChart,
  Scatter,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { formatCurrency } from '@/common/data/investment';
import { ChartScatterIcon, ChartBarIcon, TrendUpIcon } from '@phosphor-icons/react';

// Design system chart colors using CSS variables
const CHART_COLORS = [
  'var(--nw-color-primary-500)',      // Blue
  'var(--nw-color-success-500)',      // Green  
  'var(--nw-color-warning-500)',      // Yellow/Orange
  'var(--nw-color-danger-500)',       // Red
  'var(--nw-color-info-500)'          // Light Blue
];

interface EquityAnalyticsChartsProps {
  stakeVsInvestmentAmountData: any[];
  roleInvestmentAmountData: any[];
  concentrationByRoleData: any[];
}

export const EquityAnalyticsCharts: React.FC<EquityAnalyticsChartsProps> = ({
  stakeVsInvestmentAmountData,
  roleInvestmentAmountData,
  concentrationByRoleData
}) => {
  return (
    <>
      {/* Stake vs Investment Amount Correlation - Scatter Plot (Full Width) */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={ChartScatterIcon} variant="default" size="md" decorative />
            <div>
              <CardTitle>Stake vs Investment Amount Correlation</CardTitle>
              <CardDescription>Relationship between stake percentage and total investment amount</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer 
            config={useMemo(() => ({
              stakevsinvestment: { label: "Stake vs Investment" }
            }), [])} 
            className="gba:h-[350px] gba:w-full"
          >
            <ScatterChart
              data={stakeVsInvestmentAmountData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <XAxis 
                type="number" 
                dataKey="stake" 
                name="Stake %"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis 
                type="number" 
                dataKey="investmentAmount" 
                name="Investment Amount"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value, 'EUR')}
              />
              <ChartTooltip 
                content={<ChartTooltipContent formatter={(value, name) => {
                  if (name === 'Investment Amount') {
                    return [formatCurrency(value as number, 'EUR'), name];
                  }
                  if (name === 'Stake %') {
                    return [`${value}%`, name];
                  }
                  return [value, name];
                }} />}
              />
              <CartesianGrid strokeDasharray="3 3" />
              <Scatter 
                name="stakevsinvestment" 
                data={stakeVsInvestmentAmountData} 
                fill="var(--color-stakevsinvestment)"
              />
            </ScatterChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Investment Role vs Investment Amount - Scatter Plot */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={ChartScatterIcon} variant="secondary" size="md" decorative />
            <div>
              <CardTitle>Investment Role vs Investment Amount</CardTitle>
              <CardDescription>Comparison of investment amounts across different investment roles</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer 
            config={useMemo(() => ({
              rolevsinvestment: { label: "Role vs Investment" }
            }), [])} 
            className="gba:h-[350px] gba:w-full"
          >
            <ScatterChart
              data={roleInvestmentAmountData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <XAxis 
                type="number" 
                dataKey="role" 
                name="Investment Role"
                domain={[0, 4]}
                ticks={[1, 2, 3]}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value === 1 ? 'Follow-on' : value === 2 ? 'Co-Investor' : 'Lead'}
              />
              <YAxis 
                type="number" 
                dataKey="investmentAmount" 
                name="Investment Amount"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value, 'EUR')}
              />
              <ChartTooltip 
                content={<ChartTooltipContent formatter={(value, name) => {
                  if (name === 'Investment Amount') {
                    return [formatCurrency(value as number, 'EUR'), name];
                  }
                  if (name === 'Investment Role') {
                    const roleLabel = value === 1 ? 'Follow-on' : value === 2 ? 'Co-Investor' : 'Lead';
                    return [roleLabel, name];
                  }
                  return [value, name];
                }} />}
              />
              <CartesianGrid strokeDasharray="3 3" />
              <Scatter 
                name="rolevsinvestment" 
                data={roleInvestmentAmountData} 
                fill="var(--color-rolevsinvestment)"
              />
            </ScatterChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Portfolio Concentration by Role - Bar Chart */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={ChartBarIcon} variant="success" size="md" decorative />
            <div>
              <CardTitle>Portfolio Concentration by Investment Role</CardTitle>
              <CardDescription>Investment distribution and valuation metrics by role</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer 
            config={useMemo(() => ({
              investmentcount: { label: "Investment Count" },
              totalvaluation: { label: "Total Valuation" },
              averagevaluation: { label: "Average Valuation" }
            }), [])} 
            className="gba:h-[300px] gba:w-full"
          >
            <ComposedChart
              data={concentrationByRoleData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis dataKey="role" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <ChartTooltip 
                content={<ChartTooltipContent formatter={(value, name) => {
                  if (name === 'Total Valuation' || name === 'Average Valuation') {
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
                maxBarSize={60}
              />
              <Bar 
                yAxisId="right"
                dataKey="totalValuation" 
                name="totalvaluation"
                fill="var(--color-totalvaluation)"
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="averageValuation" 
                name="averagevaluation"
                stroke="var(--color-averagevaluation)"
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