import React from "react";
import {
  TrendingDown,
  DollarSign,
  Building2,
  Calendar,
} from "lucide-react";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { usePlannedExitsMetrics } from "../hooks/usePlannedExitsMetrics";

interface PlannedExitsMetricsProps {
  accessToken: string;
}

const PlannedExitsMetrics: React.FC<PlannedExitsMetricsProps> = ({ accessToken }) => {
  const { metrics, isLoading, error } = usePlannedExitsMetrics(accessToken);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Create widget items for the WidgetGroup component
  const widgets: WidgetItem[] = metrics ? [
    {
      key: "total-count",
      title: getTranslationFromI18nKeyAndLabel("total_planned_exits", "Total Planned Exits"),
      value: metrics.totalCount,
      prefix: <TrendingDown className="gba:h-5 gba:w-5 gba:text-red-600" />,
      color: '#f5222d', // Red theme for exits
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel("investments_planned_for_exit", "Investments planned for exit"),
      trend: {
        value: `${metrics.totalCount} ${getTranslationFromI18nKeyAndLabel("total", "total")}`,
        positive: false, // Exits are typically not "positive" 
        description: getTranslationFromI18nKeyAndLabel("awaiting_divestment", "awaiting divestment")
      }
    },
    {
      key: "total-value", 
      title: getTranslationFromI18nKeyAndLabel("total_value", "Total Value"),
      value: formatCurrency(metrics.totalValue),
      valueIsString: true,
      prefix: <DollarSign className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#52c41a', // Green theme for money
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel("total_market_value", "Total market value"),
      trend: {
        value: formatCurrency(metrics.totalCount > 0 ? metrics.totalValue / metrics.totalCount : 0),
        positive: true,
        description: getTranslationFromI18nKeyAndLabel("avg_per_investment", "avg per investment")
      }
    },
    {
      key: "avg-stake",
      title: getTranslationFromI18nKeyAndLabel("avg_stake", "Average Stake"),
      value: metrics.averageStakePercentage,
      suffix: "%",
      precision: 1,
      prefix: <Building2 className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#1677ff', // Blue theme for ownership
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel("average_ownership_percentage", "Average ownership percentage"),
      trend: {
        value: `${metrics.averageStakePercentage.toFixed(1)}%`,
        positive: metrics.averageStakePercentage > 50,
        description: getTranslationFromI18nKeyAndLabel("ownership_level", "ownership level")
      }
    },
    {
      key: "avg-exit-date",
      title: getTranslationFromI18nKeyAndLabel("avg_exit_date", "Average Exit Date"),
      value: metrics.averageExitDate,
      valueIsString: true,
      prefix: <Calendar className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: '#722ed1', // Purple theme for timeline
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel("average_planned_exit_date", "Average planned exit date"),
      trend: {
        value: getTranslationFromI18nKeyAndLabel("timeline", "Timeline"),
        positive: true,
        description: getTranslationFromI18nKeyAndLabel("exit_planning", "exit planning")
      }
    },
  ] : [];

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={isLoading}
      error={error}
      skeletonCount={4}
      defaultSpan={{ xs: 24, sm: 12, md: 12, lg: 6 }}
      emptyText={getTranslationFromI18nKeyAndLabel("no_metrics_available", "No metrics available")}
      data-testid="planned-exits-metrics"
    />
  );
};

export default PlannedExitsMetrics;
