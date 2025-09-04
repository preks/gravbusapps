import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, IconAvatar, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@newwork/nw-design-system";
import { BarChart, Bar, XAxis, YAxis } from "recharts";
import { ClockIcon } from "@phosphor-icons/react";
import { SupportedVariant } from "@/common/constants/ui";

export interface LeadOverTimePoint {
  date: string;
  leadsCreated: number;
  leadsConverted: number;
}

export interface LeadVelocityAnalysisProps {
  data: {
    avgTimeToConversion: number;
    conversionRate: number;
    leadsOverTime: LeadOverTimePoint[];
  };
  variant?: SupportedVariant;
}

export const LeadVelocityAnalysis: React.FC<LeadVelocityAnalysisProps> = ({ data, variant = 'default' }) => {
  const aggregateDataByMonth = (dailyData: LeadOverTimePoint[]) => {
    const monthMap = new Map<string, { leadsCreated: number; leadsConverted: number; date: string }>();

    dailyData.forEach((item) => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          leadsCreated: 0,
          leadsConverted: 0,
          date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`,
        });
      }
      const m = monthMap.get(monthKey)!;
      m.leadsCreated += item.leadsCreated || 0;
      m.leadsConverted += item.leadsConverted || 0;
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  };

  const monthlyData = aggregateDataByMonth(data?.leadsOverTime || []);
  const recentLeadsData = monthlyData.slice(-12);
  const velocityTrendData = recentLeadsData.slice(-6).map((item) => {
    const d = new Date(item.date);
    const monthYear = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const conversionVelocity = item.leadsCreated > 0 ? Math.round((item.leadsConverted / item.leadsCreated) * 100) : 0;
    return { month: monthYear, date: item.date, leadsCreated: item.leadsCreated, leadsConverted: item.leadsConverted, conversionVelocity };
  });

  const velocityScore = data?.conversionRate ? Math.round(data.conversionRate * 10) / 10 : 0;

  const recentVolume = recentLeadsData.slice(-3).reduce((s, x) => s + x.leadsCreated, 0);
  const previousVolume = recentLeadsData.slice(-6, -3).reduce((s, x) => s + x.leadsCreated, 0);
  const volumeTrend = previousVolume > 0 ? Math.round(((recentVolume - previousVolume) / previousVolume) * 100) : 0;

  return (
    <Card data-testid="lead-velocity-analysis">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <IconAvatar icon={ClockIcon} variant={variant} size="md" decorative />
          Lead Velocity Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:text-center">
            <div className="gba:p-3 gba:bg-blue-50 gba:rounded-lg">
              <div className="gba:text-2xl gba:font-bold gba:text-blue-600">{data?.avgTimeToConversion}</div>
              <div className="gba:text-sm gba:text-gray-600">Avg Days to Convert</div>
              <div className="gba:text-xs gba:text-gray-500">Real conversion timeline</div>
            </div>
            <div className="gba:p-3 gba:bg-green-50 gba:rounded-lg">
              <div className="gba:text-2xl gba:font-bold gba:text-green-600">{velocityScore}%</div>
              <div className="gba:text-sm gba:text-gray-600">Conversion Rate</div>
              <div className="gba:text-xs gba:text-gray-500">Lead to conversion success</div>
            </div>
          </div>

          <div className="gba:p-3 gba:bg-orange-50 gba:rounded-lg gba:text-center">
            <div className="gba:text-xl gba:font-bold gba:text-orange-600">{volumeTrend > 0 ? "+" : ""}{volumeTrend}%</div>
            <div className="gba:text-sm gba:text-gray-600">Lead Volume Trend</div>
            <div className="gba:text-xs gba:text-gray-500">Recent vs previous quarter</div>
          </div>

          {velocityTrendData.length > 0 ? (
            <div className="gba:h-56">
              <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Conversion Velocity Trend (Monthly)</h4>
              <ChartContainer
                config={useMemo(() => ({
                  leadsCreated: { label: "Leads Created" },
                  leadsConverted: { label: "Leads Converted" },
                }), [])}
                className="gba:w-full gba:h-full"
              >
                <BarChart data={velocityTrendData} maxBarSize={30} barCategoryGap="25%" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} height={40} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent labelKey="month" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="leadsCreated" name="leadsCreated" fill={`var(--color-leadsCreated)`} />
                  <Bar dataKey="leadsConverted" name="leadsConverted" fill={`var(--color-leadsConverted)`} />
                </BarChart>
              </ChartContainer>
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


