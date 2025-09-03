import React from "react";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { RevenueTrendChart, RevenueTrendData, TimeFilter } from "@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/RevenueTrendChart";
import { PipelineHealthOverview, PipelineHealthMetrics } from "@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/PipelineHealthOverview";
import { GeographicChart, GeographicData } from "@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/GeographicChart";
import { ActivityHeatmapChart, ActivityHeatmapData } from "@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/ActivityHeatmapChart";
import { TopPerformers, TopPerformerItem } from "@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/TopPerformers";
import { 
  TrophyOutlined,
  BankOutlined,
  DollarCircleOutlined,
  ContactsOutlined,
  PercentageOutlined,
  UserOutlined
} from "@ant-design/icons";

export interface OverviewCounts {
  leads: number;
  accounts: number;
  opportunities: number;
  contacts: number;
}

export interface ConversionMetrics {
  leadToOpportunityRate: number;
  opportunityWinRate: number;
  avgDealSize: number;
  salesCycleLength: number;
}

export interface TrendData {
  totalLeadsThisMonth: number;
  totalLeadsLastMonth: number;
  totalAccountsThisMonth: number;
  totalAccountsLastMonth: number;
  totalOpportunitiesThisMonth: number;
  totalOpportunitiesLastMonth: number;
  totalContactsThisMonth: number;
  totalContactsLastMonth: number;
  currentMonthWonOpportunities: number;
  previousMonthWonOpportunities: number;
}

export interface OverviewTabLayoutProps {
  title?: string;
  counts: OverviewCounts;
  conversionMetrics: ConversionMetrics;
  trendData?: TrendData | null;
  trendLoading?: boolean;

  pipelines: Array<{ id: string; name: string }>;
  selectedPipelineId?: string;
  onPipelineChange?: (pipelineId: string | undefined) => void;
  revenueTimeFilter?: TimeFilter;
  onRevenueTimeFilterChange?: (timeFilter: TimeFilter) => void;
  revenueTrends: RevenueTrendData[];
  revenueLoading?: boolean;

  pipelineHealth: {
    data?: PipelineHealthMetrics | null;
    isLoading?: boolean;
    error?: string | null;
  };

  geographicDistribution: {
    data: GeographicData[];
    isLoading?: boolean;
  };

  activityHeatmap: {
    data: ActivityHeatmapData[];
    isLoading?: boolean;
  };

  topPerformers: TopPerformerItem[];
}

const calculateTrend = (current: number, previous: number) => {
  if (previous === 0) return { value: "0%", positive: true, description: "No previous data" };
  const change = ((current - previous) / previous) * 100;
  return {
    value: `${Math.abs(change).toFixed(1)}%`,
    positive: change >= 0,
    description: `${change >= 0 ? "Increase" : "Decrease"} from last period`,
  };
};

export const OverviewTabLayout: React.FC<OverviewTabLayoutProps> = ({
  title = "CRM Overview",
  counts,
  conversionMetrics,
  trendData,
  trendLoading = false,
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  revenueTimeFilter = 'sixMonths',
  onRevenueTimeFilterChange,
  revenueTrends,
  revenueLoading = false,
  pipelineHealth,
  geographicDistribution,
  activityHeatmap,
  topPerformers,
}) => {
  const keyMetricsWidgets: WidgetItem[] = [
    {
      key: "total-leads",
      title: "Total Leads",
      value: counts.leads,
      prefix: <UserOutlined />,
      description: "Active leads in system",
      ...(trendData && !trendLoading ? { trend: calculateTrend(trendData.totalLeadsThisMonth, trendData.totalLeadsLastMonth) } : {}),
    },
    {
      key: "total-accounts",
      title: "Total Accounts",
      value: counts.accounts,
      prefix: <BankOutlined />,
      description: "Active accounts in system",
      ...(trendData && !trendLoading ? { trend: calculateTrend(trendData.totalAccountsThisMonth, trendData.totalAccountsLastMonth) } : {}),
    },
    {
      key: "total-opportunities",
      title: "Total Opportunities",
      value: counts.opportunities,
      prefix: <DollarCircleOutlined />,
      description: "Active opportunities in pipeline",
      ...(trendData && !trendLoading ? { trend: calculateTrend(trendData.totalOpportunitiesThisMonth, trendData.totalOpportunitiesLastMonth) } : {}),
    },
    {
      key: "total-contacts",
      title: "Total Contacts",
      value: counts.contacts,
      prefix: <ContactsOutlined />,
      description: "Active contacts in system",
      ...(trendData && !trendLoading ? { trend: calculateTrend(trendData.totalContactsThisMonth, trendData.totalContactsLastMonth) } : {}),
    },
  ];

  const conversionWidgets: WidgetItem[] = [
    {
      key: "lead-conversion-rate",
      title: "Lead to Opportunity Rate",
      value: `${conversionMetrics.leadToOpportunityRate}%`,
      valueIsString: true,
      prefix: <PercentageOutlined />,
      description: "Lead conversion efficiency",
    },
    {
      key: "opportunity-win-rate",
      title: "Opportunity Win Rate",
      value: `${conversionMetrics.opportunityWinRate}%`,
      valueIsString: true,
      prefix: <TrophyOutlined />,
      description: "Deal closing success rate",
      ...(trendData && !trendLoading ? { trend: calculateTrend(trendData.currentMonthWonOpportunities, trendData.previousMonthWonOpportunities) } : {}),
    },
    {
      key: "avg-deal-size",
      title: "Avg Deal Size",
      value: conversionMetrics.avgDealSize,
      prefix: <DollarCircleOutlined />,
      description: "Average opportunity value",
      precision: 0,
    },
    {
      key: "sales-cycle-length",
      title: "Sales Cycle Length",
      value: `${conversionMetrics.salesCycleLength} days`,
      valueIsString: true,
      prefix: <UserOutlined />,
      description: "Average time to close deals",
    },
  ];

  const allKpiWidgets = [...keyMetricsWidgets, ...conversionWidgets];

  return (
    <div className="gba:space-y-6" data-testid="overview-analytics-tab">
      <div>
        <h2 className="gba:text-2xl gba:font-bold gba:mb-4">{title}</h2>
        <WidgetGroup widgets={allKpiWidgets} isLoading={trendLoading} data-testid="overview-all-kpis" />
      </div>

      <RevenueTrendChart 
        data={revenueTrends}
        isLoading={revenueLoading}
        pipelines={pipelines}
        selectedPipelineId={selectedPipelineId}
        onPipelineChange={onPipelineChange}
        selectedTimeFilter={revenueTimeFilter}
        onTimeFilterChange={onRevenueTimeFilterChange}
      />

      <div className="gba:flex gba:gap-6" data-testid="analytics-charts-container">
        <div className="gba:min-w-0 gba:w-full lg:gba:w-2/3" data-testid="pipeline-health-container">
          <PipelineHealthOverview 
            isLoading={pipelineHealth?.isLoading}
            error={pipelineHealth?.error ?? null}
            data={pipelineHealth?.data ?? null}
          />
        </div>
        <div className="gba:min-w-0 gba:w-full lg:gba:w-1/3" data-testid="geographic-chart-container">
          <GeographicChart data={geographicDistribution.data} isLoading={geographicDistribution?.isLoading} />
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:gap-6">
        <ActivityHeatmapChart data={activityHeatmap.data} isLoading={activityHeatmap?.isLoading} />
      </div>

      <TopPerformers performers={topPerformers} />
    </div>
  );
};

export default OverviewTabLayout;

