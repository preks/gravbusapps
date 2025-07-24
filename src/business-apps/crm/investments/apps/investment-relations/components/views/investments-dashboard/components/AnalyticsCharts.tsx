import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@newwork/nw-design-system";
import { Progress } from "@newwork/nw-design-system";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@newwork/nw-design-system";
import {
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Target,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

/**
 * Component displaying analytics charts and visualizations
 */
const AnalyticsCharts = () => {
  // Mock data for charts - in real implementation, this would come from props or API
  const allocationData = [
    { type: "Real Estate", value: 45.8, fill: "var(--color-real-estate)" },
    { type: "Equity", value: 33.7, fill: "var(--color-equity)" },
    {
      type: "Private Equity",
      value: 10.0,
      fill: "var(--color-private-equity)",
    },
    { type: "Liquid Funds", value: 10.5, fill: "var(--color-liquid-funds)" },
  ];

  const performanceData = [
    { quarter: "Q1 2023", value: 74.1 },
    { quarter: "Q2 2023", value: 76.8 },
    { quarter: "Q3 2023", value: 79.2 },
    { quarter: "Q4 2023", value: 80.7 },
  ];

  const roiData = [
    { type: "Equity", roi: 27.5, target: 25.0 },
    { type: "Private Equity", roi: 22.0, target: 20.0 },
    { type: "Real Estate", roi: 12.0, target: 10.0 },
    { type: "Liquid Funds", roi: 5.2, target: 4.0 },
  ];

  // Chart configurations
  const allocationChartConfig = {
    "real-estate": {
      label: "Real Estate",
      color: "#10B981",
    },
    equity: {
      label: "Equity",
      color: "#3B82F6",
    },
    "private-equity": {
      label: "Private Equity",
      color: "#8B5CF6",
    },
    "liquid-funds": {
      label: "Liquid Funds",
      color: "#F59E0B",
    },
  };

  const performanceChartConfig = {
    value: {
      label: "Portfolio Value (M€)",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2">
      {/* Portfolio Allocation Chart */}
      <Card className="gba:h-full">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-indigo-100 gba:rounded-lg">
              <PieChartIcon className="gba:h-6 gba:w-6 gba:text-indigo-600" />
            </div>
            <div>
              <CardTitle>Portfolio Allocation</CardTitle>
              <p className="gba:text-sm gba:text-gray-600">
                By investment type
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="gba:p-6">
          <div className="gba:w-full gba:flex gba:justify-center">
            <ChartContainer
              config={allocationChartConfig}
              className="gba:w-[400px] gba:h-[300px]"
            >
              <PieChart width={400} height={300}>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend />
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  nameKey="type"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Performance Trend */}
      <Card className="gba:h-full">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-green-100 gba:rounded-lg">
              <TrendingUp className="gba:h-6 gba:w-6 gba:text-green-600" />
            </div>
            <div>
              <CardTitle>Portfolio Performance</CardTitle>
              <p className="gba:text-sm gba:text-gray-600">
                Total invested over time (M€)
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="gba:p-6">
          <div className="gba:w-full gba:flex gba:justify-center">
            <ChartContainer
              config={performanceChartConfig}
              className="gba:w-[400px] gba:h-[300px]"
            >
              <LineChart width={400} height={300} data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="quarter"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  domain={["dataMin - 5", "dataMax + 5"]}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={3}
                  dot={{ fill: "var(--color-value)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: "var(--color-value)" }}
                  connectNulls={false}
                />
              </LineChart>
            </ChartContainer>
          </div>

          <div className="gba:mt-4 gba:text-center">
            <span className="gba:text-2xl gba:font-bold gba:text-green-600">
              +8.9%
            </span>
            <span className="gba:text-sm gba:text-gray-600 gba:ml-2">
              YoY Growth
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ROI Performance vs Targets */}
      <Card className="gba:lg:col-span-2 gba:h-full">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-purple-100 gba:rounded-lg">
              <Target className="gba:h-6 gba:w-6 gba:text-purple-600" />
            </div>
            <div>
              <CardTitle>ROI Performance vs Targets</CardTitle>
              <p className="gba:text-sm gba:text-gray-600">
                Actual vs target expected ROI by investment type
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="gba:p-6">
          <div className="gba:space-y-6">
            {roiData.map((item) => (
              <div key={item.type} className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                    {item.type}
                  </span>
                  <div className="gba:flex gba:items-center gba:gap-4">
                    <span className="gba:text-sm gba:text-gray-600">
                      Target: {item.target}%
                    </span>
                    <span className="gba:text-sm gba:font-semibold gba:text-green-600">
                      Actual: {item.roi}%
                    </span>
                  </div>
                </div>

                {/* Using Progress component from design system */}
                <div className="gba:relative">
                  <Progress
                    value={Math.min((item.roi / 30) * 100, 100)}
                    className="gba:h-3"
                  />
                  {/* Target indicator line */}
                  <div
                    className="gba:absolute gba:top-0 gba:h-3 gba:w-0.5 gba:bg-gray-500 gba:z-10"
                    style={{ left: `${(item.target / 30) * 100}%` }}
                  />
                </div>

                <div className="gba:flex gba:justify-between gba:text-xs gba:text-gray-500">
                  <span>0%</span>
                  <span>30%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsCharts;
