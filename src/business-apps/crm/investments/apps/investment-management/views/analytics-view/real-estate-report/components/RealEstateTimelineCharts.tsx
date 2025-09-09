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
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, LineChart, AreaChart, Area } from 'recharts';
import { ChartLineUpIcon, TrendUpIcon, CalendarIcon } from '@phosphor-icons/react';
import { formatCurrency, formatNumber } from '@/common/data/investment';

interface RealEstateTimelineChartsProps {
  chartData: {
    timelineData: any[];
    performanceData: any[];
    buildingYearData: any[];
  };
}

export const RealEstateTimelineCharts: React.FC<RealEstateTimelineChartsProps> = ({ chartData }) => {
  const {
    timelineData,
    performanceData,
    buildingYearData
  } = chartData;

  // Timeline Config
  const timelineConfig = useMemo(() => ({
    investmentcount: { label: "Investment Count" },
    totalinvestmentamount: { label: "Total Investment Amount" },
    cumulativeinvestments: { label: "Cumulative Investments" }
  }), []);

  // Performance Config
  const performanceConfig = useMemo(() => ({
    averageoccupancyrate: { label: "Average Occupancy Rate" },
    totalpropertyvalue: { label: "Total Property Value" }
  }), []);

  // Building Year Config
  const buildingYearConfig = useMemo(() => ({
    averagevalue: { label: "Average Value" },
    propertycount: { label: "Property Count" }
  }), []);

  return (
    <div className="gba:space-y-6">
      {/* Investment Timeline */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineUpIcon} variant="default" />
            <div>
              <CardTitle>Real Estate Investment Timeline</CardTitle>
              <CardDescription>Investment count and amounts over time</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={timelineConfig}>
            <ComposedChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value: any, name: string) => {
                    if (name.includes('amount') || name.includes('value')) {
                      return [formatCurrency(value), name];
                    }
                    return [formatNumber(value), name];
                  }}
                />} 
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar 
                yAxisId="left"
                dataKey="investmentCount"
                fill="var(--color-investmentcount)"
                name="Investment Count"
              />
              <Line 
                yAxisId="right"
                type="monotone"
                dataKey="totalInvestmentAmount"
                stroke="var(--color-totalinvestmentamount)"
                strokeWidth={3}
                name="Total Investment Amount"
              />
              <Line 
                yAxisId="left"
                type="monotone"
                dataKey="cumulativeInvestments"
                stroke="var(--color-cumulativeinvestments)"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Cumulative Investments"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Performance Over Time */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={TrendUpIcon} variant="success" />
            <div>
              <CardTitle>Property Performance Over Time</CardTitle>
              <CardDescription>Occupancy rates and property values over time</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={performanceConfig}>
            <ComposedChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value: any, name: string) => {
                    if (name.includes('rate')) {
                      return [`${value}%`, name];
                    }
                    if (name.includes('value')) {
                      return [formatCurrency(value), name];
                    }
                    return [formatNumber(value), name];
                  }}
                />} 
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line 
                yAxisId="left"
                type="monotone"
                dataKey="averageOccupancyRate"
                stroke="var(--color-averageoccupancyrate)"
                strokeWidth={3}
                name="Average Occupancy Rate"
              />
              <Line 
                yAxisId="right"
                type="monotone"
                dataKey="totalPropertyValue"
                stroke="var(--color-totalpropertyvalue)"
                strokeWidth={3}
                name="Total Property Value"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Building Year Analysis */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={CalendarIcon} variant="secondary" />
            <div>
              <CardTitle>Building Year Analysis</CardTitle>
              <CardDescription>Property values by construction year</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={buildingYearConfig}>
            <ComposedChart data={buildingYearData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="yearRange" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value: any, name: string) => {
                    if (name.includes('value')) {
                      return [formatCurrency(value), name];
                    }
                    return [formatNumber(value), name];
                  }}
                />} 
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar 
                yAxisId="left"
                dataKey="propertyCount"
                fill="var(--color-propertycount)"
                name="Property Count"
              />
              <Line 
                yAxisId="right"
                type="monotone"
                dataKey="averageValue"
                stroke="var(--color-averagevalue)"
                strokeWidth={3}
                name="Average Value"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};
