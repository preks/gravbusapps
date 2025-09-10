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
import { ScatterChart, Scatter, XAxis, YAxis, BarChart, Bar, ComposedChart } from 'recharts';
import { ChartBarIcon, PercentIcon } from '@phosphor-icons/react';
import { formatCurrency, formatPercentage, formatNumber } from '@/common/data/investment';

interface RealEstateAnalyticsChartsProps {
  chartData: {
    occupancyData: any[];
    expensesValueData: any[];
  };
}

export const RealEstateAnalyticsCharts: React.FC<RealEstateAnalyticsChartsProps> = ({ chartData }) => {
  const {
    occupancyData,
    expensesValueData
  } = chartData;


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
              <XAxis dataKey="range" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <ChartTooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">
                          {label}
                        </div>
                        {payload.map((entry, index) => {
                          let properLabel = '';
                          let formattedValue = '';
                          let dotColor = '';
                          
                          if (entry.dataKey === 'count') {
                            properLabel = 'Property Count';
                            formattedValue = `${entry.value}`;
                            dotColor = 'var(--color-occupancyrate)';
                          } else if (entry.dataKey === 'totalValue') {
                            properLabel = 'Total Property Value';
                            formattedValue = formatCurrency(entry.value as number);
                            dotColor = 'var(--color-propertyvalue)';
                          }
                          
                          return (
                            <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                              <div 
                                className="gba:w-3 gba:h-3 gba:rounded-full" 
                                style={{ backgroundColor: dotColor }}
                              />
                              <span className="gba:font-medium">{properLabel}:</span>
                              <span className="gba:font-semibold">{formattedValue}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
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
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">
                          {data.name || 'Property'}
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                          <div 
                            className="gba:w-3 gba:h-3 gba:rounded-full" 
                            style={{ backgroundColor: 'var(--color-propertyvalue)' }}
                          />
                          <span className="gba:font-medium">Property Value:</span>
                          <span className="gba:font-semibold">{formatCurrency(data.propertyValue)}</span>
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                          <div 
                            className="gba:w-3 gba:h-3 gba:rounded-full" 
                            style={{ backgroundColor: 'var(--color-annualexpenses)' }}
                          />
                          <span className="gba:font-medium">Annual Expenses:</span>
                          <span className="gba:font-semibold">{formatCurrency(data.annualExpenses)}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
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
