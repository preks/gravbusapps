import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@newwork/nw-design-system';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent,
  IconAvatar
} from '@newwork/nw-design-system';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, BarChart, Bar, ComposedChart } from 'recharts';
import { ChartScatterIcon, ChartBarIcon, PercentIcon } from '@phosphor-icons/react';
import { formatCurrency, formatPercentage, formatNumber } from '@/common/data/investment';

interface RealEstateAnalyticsChartsProps {
  chartData: {
    roiSizeData: any[];
    occupancyData: any[];
    expensesValueData: any[];
  };
}

export const RealEstateAnalyticsCharts: React.FC<RealEstateAnalyticsChartsProps> = ({ chartData }) => {
  const {
    roiSizeData,
    occupancyData,
    expensesValueData
  } = chartData;

  // Property Size vs Investment Config
  const sizeInvestmentConfig = useMemo(() => ({
    propertysize: { label: "Property Size" },
    totalinvestment: { label: "Total Investment" }
  }), []);

  // Occupancy Analysis Config
  const occupancyConfig = useMemo(() => ({
    occupancyrate: { label: "Occupancy Rate" },
    propertyvalue: { label: "Property Value" }
  }), []);

  // Expenses vs Value Config
  const expensesValueConfig = useMemo(() => ({
    annualexpenses: { label: "Annual Expenses" },
    propertyvalue: { label: "Property Value" },
    expenseefficiency: { label: "Expense Efficiency" }
  }), []);

  return (
    <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
      {/* Property Size vs Total Investment */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartScatterIcon} variant="default" />
            <div>
              <CardTitle>Property Size vs Total Investment</CardTitle>
              <CardDescription>Investment correlation by property size</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={sizeInvestmentConfig}>
            <ScatterChart data={roiSizeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="propertySize" 
                name="Property Size"
                type="number"
              />
              <YAxis 
                dataKey="investmentAmount" 
                name="Total Investment"
                type="number"
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value: any, name: string) => {
                    if (name.includes('investment') || name.includes('amount')) {
                      return [formatCurrency(value), 'Total Investment'];
                    }
                    if (name.includes('size')) {
                      return [`${formatNumber(value)}`, 'Property Size'];
                    }
                    return [value, name];
                  }}
                />} 
              />
              <Scatter 
                dataKey="investmentAmount"
                fill="var(--color-totalinvestment)"
                name="Properties"
              />
            </ScatterChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Occupancy Rate Distribution */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={PercentIcon} variant="success" />
            <div>
              <CardTitle>Occupancy Rate Distribution</CardTitle>
              <CardDescription>Properties grouped by occupancy rate ranges</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={occupancyConfig}>
            <ComposedChart data={occupancyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value: any, name: string) => {
                    if (name.includes('value')) {
                      return [formatCurrency(value), name];
                    }
                    if (name.includes('rate')) {
                      return [`${value}%`, name];
                    }
                    return [formatNumber(value), name];
                  }}
                />} 
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar 
                yAxisId="left"
                dataKey="count"
                fill="var(--color-occupancyrate)"
                name="Property Count"
              />
              <Bar 
                yAxisId="right"
                dataKey="totalValue"
                fill="var(--color-propertyvalue)"
                name="Total Property Value"
                opacity={0.8}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Expenses vs Property Value */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartBarIcon} variant="warning" />
            <div>
              <CardTitle>Expenses vs Property Value</CardTitle>
              <CardDescription>Annual expenses correlation with property values</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={expensesValueConfig}>
            <ScatterChart data={expensesValueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="propertyValue" 
                name="Property Value"
                type="number"
              />
              <YAxis 
                dataKey="annualExpenses" 
                name="Annual Expenses"
                type="number"
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value: any, name: string) => {
                    if (name.includes('value') || name.includes('expenses')) {
                      return [formatCurrency(value), name];
                    }
                    return [value, name];
                  }}
                />} 
              />
              <Scatter 
                dataKey="annualExpenses"
                fill="var(--color-annualexpenses)"
                name="Properties"
              />
            </ScatterChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};
