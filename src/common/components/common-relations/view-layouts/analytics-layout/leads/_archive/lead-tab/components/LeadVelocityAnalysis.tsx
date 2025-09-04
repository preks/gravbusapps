import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@newwork/nw-design-system";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ClockCircleOutlined } from "@ant-design/icons";
import { LeadsAnalytics } from "../../../types/analyticsTypes";

interface LeadVelocityAnalysisProps {
  data: LeadsAnalytics;
}

export const LeadVelocityAnalysis: React.FC<LeadVelocityAnalysisProps> = ({
  data,
}) => {
  // Aggregate daily data into monthly data
  const aggregateDataByMonth = (dailyData: any[]) => {
    const monthMap = new Map<
      string,
      {
        leadsCreated: number;
        leadsConverted: number;
        date: string;
      }
    >();

    dailyData.forEach((item) => {
      const date = new Date(item.date);
      // Create month key as YYYY-MM format for proper grouping
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          leadsCreated: 0,
          leadsConverted: 0,
          date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
            2,
            "0"
          )}-01`, // Use first day of month
        });
      }

      const monthData = monthMap.get(monthKey)!;
      monthData.leadsCreated += item.leadsCreated || 0;
      monthData.leadsConverted += item.leadsConverted || 0;
    });

    // Convert to array and sort by date
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => data);
  };

  // Calculate real velocity distribution from leadsOverTime data
  const monthlyData = aggregateDataByMonth(data?.leadsOverTime || []);
  const recentLeadsData = monthlyData.slice(-12); // Last 12 months

  // Create velocity trend chart from real monthly data (last 6 months)
  const velocityTrendData = recentLeadsData.slice(-6).map((item) => {
    const date = new Date(item.date);
    // Format as Mon Year (e.g., "Jan 24")
    const monthYear = date.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    const conversionVelocity =
      item.leadsCreated > 0
        ? Math.round((item.leadsConverted / item.leadsCreated) * 100)
        : 0;

    return {
      month: monthYear,
      date: item.date,
      leadsCreated: item.leadsCreated,
      leadsConverted: item.leadsConverted,
      conversionVelocity: conversionVelocity,
    };
  });

  // Calculate velocity score based on real conversion metrics
  const velocityScore = data?.conversionRate
    ? Math.round(data.conversionRate * 10) / 10
    : 0;

  // Calculate lead volume trends
  const recentVolume = recentLeadsData
    .slice(-3)
    .reduce((sum, item) => sum + item.leadsCreated, 0);
  const previousVolume = recentLeadsData
    .slice(-6, -3)
    .reduce((sum, item) => sum + item.leadsCreated, 0);
  const volumeTrend =
    previousVolume > 0
      ? Math.round(((recentVolume - previousVolume) / previousVolume) * 100)
      : 0;

  return (
    <Card data-testid="lead-velocity-analysis">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <ClockCircleOutlined />
          Lead Velocity Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          {/* Real Velocity Metrics */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:text-center">
            <div className="gba:p-3 gba:bg-blue-50 gba:rounded-lg">
              <div className="gba:text-2xl gba:font-bold gba:text-blue-600">
                {data?.avgTimeToConversion}
              </div>
              <div className="gba:text-sm gba:text-gray-600">
                Avg Days to Convert
              </div>
              <div className="gba:text-xs gba:text-gray-500">
                Real conversion timeline
              </div>
            </div>
            <div className="gba:p-3 gba:bg-green-50 gba:rounded-lg">
              <div className="gba:text-2xl gba:font-bold gba:text-green-600">
                {velocityScore}%
              </div>
              <div className="gba:text-sm gba:text-gray-600">
                Conversion Rate
              </div>
              <div className="gba:text-xs gba:text-gray-500">
                Lead to conversion success
              </div>
            </div>
          </div>

          {/* Real Volume Trend Metric */}
          <div className="gba:p-3 gba:bg-orange-50 gba:rounded-lg gba:text-center">
            <div className="gba:text-xl gba:font-bold gba:text-orange-600">
              {volumeTrend > 0 ? "+" : ""}
              {volumeTrend}%
            </div>
            <div className="gba:text-sm gba:text-gray-600">
              Lead Volume Trend
            </div>
            <div className="gba:text-xs gba:text-gray-500">
              Recent vs previous quarter
            </div>
          </div>

          {/* Real Velocity Trend Chart */}
          {velocityTrendData.length > 0 ? (
            <div className="gba:h-56">
              <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">
                Conversion Velocity Trend (Monthly)
              </h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={velocityTrendData}
                  maxBarSize={30}
                  barCategoryGap="25%"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    angle={0}
                    textAnchor="middle"
                    height={40}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value, name) => {
                      const labelMap: Record<string, string> = {
                        leadsCreated: "Leads Created",
                        leadsConverted: "Leads Converted",
                        conversionVelocity: "Conversion Rate (%)",
                      };
                      return [value, labelMap[name] || name];
                    }}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Bar
                    dataKey="leadsCreated"
                    fill="#3B82F6"
                    name="leadsCreated"
                  />
                  <Bar
                    dataKey="leadsConverted"
                    fill="#10B981"
                    name="leadsConverted"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="gba:text-center gba:text-gray-500 gba:py-4">
              <p className="gba:text-sm">No velocity trend data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
export default LeadVelocityAnalysis;
