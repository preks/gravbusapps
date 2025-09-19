import React from "react";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { 
  UserOutlined, 
  BankOutlined, 
  DollarCircleOutlined, 
  ContactsOutlined,
  PercentageOutlined,
  TrophyOutlined 
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

export interface OverviewMetricsWidgetsProps {
  counts: OverviewCounts;
  conversionMetrics: ConversionMetrics;
  trendData?: TrendData | null;
  trendLoading?: boolean;
}

const calculateTrend = (current: number, previous: number) => {
  const change = ((current - previous) / Math.max(previous, 1)) * 100;
  return {
    value: `${Math.abs(change).toFixed(1)}%`,
    positive: change >= 0,
    description: `${change >= 0 ? "Increase" : "Decrease"} from last period`,
  };
};

export const OverviewMetricsWidgets: React.FC<OverviewMetricsWidgetsProps> = ({
  counts,
  conversionMetrics,
  trendData,
  trendLoading = false,
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
    <WidgetGroup 
      widgets={allKpiWidgets} 
      isLoading={trendLoading} 
      data-testid="overview-all-kpis" 
    />
  );
};

export default OverviewMetricsWidgets;
