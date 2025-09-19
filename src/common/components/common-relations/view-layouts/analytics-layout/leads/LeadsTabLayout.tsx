import React, { useMemo } from "react";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { TeamOutlined, PercentageOutlined, ClockCircleOutlined, RiseOutlined } from "@ant-design/icons";
import { LeadLifecycleChart, TimeFilter } from "./widgets/LeadLifecycleChart";
import { LeadVelocityAnalysis } from "./widgets/LeadVelocityAnalysis";
import { LeadsBySourcePie } from "./widgets/LeadsBySourcePie";
import { LeadsBySourceTypePie } from "./widgets/LeadsBySourceTypePie";
import { LeadsByStatusPie } from "./widgets/LeadsByStatusPie";
import TopLeadOwners from "./widgets/TopLeadOwners";
import { LeadQualityMatrix } from "./widgets/LeadQualityMatrix";
import { LeadEngagementInsights } from "./widgets/LeadEngagementInsights";

// Leads-specific trend data interface (matching archived version)
interface LeadsTrendData {
  currentMonthLeads: number;
  previousMonthLeads: number;
  currentMonthConvertedLeads: number;
  previousMonthConvertedLeads: number;
  totalLeadsThisMonth: number;
  totalLeadsLastMonth: number;
  actualConversionRateThisMonth: number;
  actualConversionRateLastMonth: number;
  actualAvgConversionTimeThisMonth: number;
  actualAvgConversionTimeLastMonth: number;
  currentPeriodLeads: number;
  previousPeriodLeads: number;
}

export interface LeadsTabLayoutProps {
  title?: string;
  totalLeads: number;
  conversionRate: number;
  avgTimeToConversion: number;
  trendData?: LeadsTrendData | null;
  trendLoading?: boolean;
  leadsOverTime: Array<{ date: string; count: number; leadsCreated: number; leadsConverted: number; leadsLost: number }>;
  selectedTimeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  leadsBySource: Array<{ source: string; count: number; percentage?: number }>;
  leadsBySourceType: Array<{ sourceType: string; count: number }>;
  leadsByStatus: Array<{ status: string; count: number }>;
  topOwners: Array<{ employeeId: string; employeeName: string; leadCount: number; conversionRate: number }>;
  leadsByRating?: Array<{ rating: string; count: number; percentage?: number }>;
  leadHealthIndicators?: Array<{ label: string; value: number; status?: 'good' | 'warning' | 'bad' }>;
  moduleColor?: string;
}

export const LeadsTabLayout: React.FC<LeadsTabLayoutProps> = ({
  title = "Leads Analytics",
  totalLeads,
  conversionRate,
  avgTimeToConversion,
  trendData,
  trendLoading = false,
  leadsOverTime,
  selectedTimeFilter,
  onTimeFilterChange,
  leadsBySource,
  leadsBySourceType,
  leadsByStatus,
  topOwners,
  leadsByRating,
  leadHealthIndicators,
  moduleColor = "default",
}) => {
  // Helper function to calculate trend with total description (matching archived version)
  const calculateTrendWithTotalDescription = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) {
      return {
        value: currentValue > 0 ? "100%" : "0%",
        positive: currentValue >= 0,
        description: `${currentValue} total vs ${previousValue} last month`,
      };
    }
    const change = ((currentValue - previousValue) / previousValue) * 100;
    return {
      value: `${Math.abs(change).toFixed(1)}%`,
      positive: change >= 0,
      description: `${currentValue} total vs ${previousValue} last month`,
    };
  };

  // Helper function to calculate trend (matching archived version)
  const calculateTrend = (currentValue: number, previousValue: number) => {
    const difference = currentValue - previousValue;
    const percentageChange = previousValue > 0 ? Math.abs(difference / previousValue * 100) : 0;
    
    return {
      value: `${percentageChange.toFixed(1)}%`,
      positive: difference >= 0,
      description: `${Math.abs(difference)} ${difference >= 0 ? 'more' : 'fewer'} than last month`,
    };
  };

  // Widget configuration for key metrics (matching archived version)
  const keyMetricsWidgets: WidgetItem[] = [
    {
      key: "total-leads",
      title: "Total Leads",
      value: totalLeads || 0,
      prefix: <TeamOutlined />,
      description: "All leads in the system",
      // Add trend data for total leads with custom description format
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrendWithTotalDescription(
              totalLeads || 0,
              trendData.totalLeadsLastMonth
            ),
          }
        : {}),
    },
    {
      key: "conversion-rate",
      title: "Conversion Rate",
      value: conversionRate || 0,
      suffix: "%",
      prefix: <PercentageOutlined />,
      description: "Leads converted to opportunities",
      // Compare current conversion rate to last month's conversion rate
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: `${Math.abs(
                (conversionRate || 0) - trendData.actualConversionRateLastMonth
              ).toFixed(1)}%`,
              positive: (conversionRate || 0) >= trendData.actualConversionRateLastMonth,
              description: `${(conversionRate || 0).toFixed(1)}% this month vs ${trendData.actualConversionRateLastMonth.toFixed(1)}% last month`,
            },
          }
        : {}),
    },
         {
       key: "avg-conversion-time",
       title: "Avg. Conversion Time",
       value: avgTimeToConversion || 0,
       suffix: " days",
       prefix: <ClockCircleOutlined />,
       description: "Average time to convert leads",
       // Compare current conversion time to last month's conversion time
       ...(trendData && !trendLoading
         ? {
             trend: {
               value: `${Math.abs(
                 (avgTimeToConversion || 0) - trendData.actualAvgConversionTimeLastMonth
               ).toFixed(1)} days`,
               positive: (avgTimeToConversion || 0) <= trendData.actualAvgConversionTimeLastMonth, // Lower time is better
               description: `${(avgTimeToConversion || 0).toFixed(1)} days this month vs ${trendData.actualAvgConversionTimeLastMonth.toFixed(1)} days last month`,
             },
           }
         : {}),
     },
     {
       key: "leads-this-period",
       title: "New This Month",
       value: trendData?.currentMonthLeads || 
         leadsOverTime.reduce((sum, item) => sum + item.leadsCreated, 0),
       prefix: <RiseOutlined />,
       description: "Leads created this month",
       // Add trend data for new leads this month vs last month
       ...(trendData && !trendLoading
         ? {
             trend: calculateTrend(
               trendData.currentMonthLeads,
               trendData.previousMonthLeads
             ),
           }
         : {}),
     },
     ];

  // Generate lead lifecycle data based on selected time filter (from archived LeadTab)
  const leadsOverTimeFiltered = useMemo(() => {
    if (!leadsOverTime) return [];

    // Calculate date range based on selected time filter
    const endDate = new Date();
    const startDate = new Date();

    switch (selectedTimeFilter) {
      case "month":
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case "sixMonths":
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case "year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case "historical":
        startDate.setFullYear(endDate.getFullYear() - 3); // 3 years of historical data
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 3);
    }

    // For month filter: return daily data, for others: aggregate into monthly periods
    if (selectedTimeFilter === "month") {
      // Filter daily data for the last month
      const startDateStr = startDate.toISOString().split("T")[0];
      return leadsOverTime.filter((item) => item.date >= startDateStr);
    } else {
      // Aggregate daily data into monthly periods
      const monthlyData = new Map<
        string,
        {
          date: string;
          count: number;
          leadsCreated: number;
          leadsConverted: number;
          leadsLost: number;
        }
      >();

      const current = new Date(startDate);
      const end = new Date(endDate);

      // Initialize monthly buckets
      while (current <= end) {
        const key = `${current.getFullYear()}-${String(
          current.getMonth() + 1
        ).padStart(2, "0")}-01`;
        monthlyData.set(key, {
          date: key,
          count: 0,
          leadsCreated: 0,
          leadsConverted: 0,
          leadsLost: 0,
        });
        current.setMonth(current.getMonth() + 1);
      }

      // Filter data by date range first
      const startDateStr = startDate.toISOString().split("T")[0];
      const filteredData = leadsOverTime.filter(
        (item) => item.date >= startDateStr
      );

      // Aggregate the filtered daily data into monthly buckets
      filteredData.forEach((daily) => {
        const d = new Date(daily.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}-01`;
        const monthlyEntry = monthlyData.get(key);
        if (monthlyEntry) {
          monthlyEntry.count += daily.count;
          monthlyEntry.leadsCreated += daily.leadsCreated;
          monthlyEntry.leadsConverted += daily.leadsConverted;
          monthlyEntry.leadsLost += daily.leadsLost;
        }
      });

      return Array.from(monthlyData.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    }
  }, [leadsOverTime, selectedTimeFilter]);

 return (
    <div className="gba:space-y-6" data-testid="leads-analytics-tab">
      <div>
        <h2 className="gba:text-2xl gba:font-bold gba:mb-4">{title}</h2>
        <WidgetGroup widgets={keyMetricsWidgets} isLoading={trendLoading} data-testid="leads-key-metrics" />
      </div>

      <LeadLifecycleChart
        data={leadsOverTimeFiltered}
        selectedTimeFilter={selectedTimeFilter}
        onTimeFilterChange={onTimeFilterChange}
        moduleColor={moduleColor}
      />

      <div className="gba:grid gba:grid-cols-1 xl:gba:grid-cols-2 gba:gap-6">
        <LeadVelocityAnalysis
          data={{
            avgTimeToConversion,
            conversionRate,
            leadsOverTime,
          }}
          moduleColor={moduleColor}
        />
        <LeadQualityMatrix 
          data={{ totalLeads, conversionRate, leadsBySource: leadsBySource.map(s => ({ source: s.source, count: s.count, percentage: s.percentage || 0 })) }} 
          moduleColor={moduleColor}
        />
      </div>

      <LeadEngagementInsights 
        leadsByRating={(leadsByRating || []).map(r => ({ rating: r.rating, count: r.count, percentage: r.percentage || 0 }))}
        leadHealthIndicators={leadHealthIndicators || []}
        conversionRate={conversionRate}
        avgTimeToConversion={avgTimeToConversion}
        leadsOverTime={leadsOverTime}
        moduleColor={moduleColor}
      />

      <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2 gba:lg:grid-cols-3">
        <LeadsBySourcePie data={leadsBySource.map(s => ({ source: s.source, count: s.count }))} moduleColor={moduleColor} />
        <LeadsBySourceTypePie data={leadsBySourceType} moduleColor={moduleColor} />
        <LeadsByStatusPie data={leadsByStatus} moduleColor={moduleColor} />
      </div>

      <TopLeadOwners owners={topOwners} moduleColor={moduleColor} />
    </div>
  );
};

export default LeadsTabLayout;


