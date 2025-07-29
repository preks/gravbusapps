import React from "react";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import {
  DollarOutlined,
  RiseOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { EnhancedInvestment } from "../hooks";

interface EquityMetricsCardsProps {
  investments: EnhancedInvestment[];
}

/**
 * Component displaying key equity metrics cards for the equity tab
 */
const EquityMetricsCards: React.FC<EquityMetricsCardsProps> = ({
  investments,
}) => {
  // Filter equity investments
  const equityInvestments = investments.filter((inv) => inv.type === "Equity");

  // Calculate metrics
  const totalInvested = equityInvestments.reduce(
    (sum, inv) => sum + inv.rawData.investment.initialInvestmentAmount,
    0
  );

  const totalBookValue = equityInvestments.reduce(
    (sum, inv) => sum + inv.rawData.investment.bookValue,
    0
  );

  const bookValueChange = totalBookValue - totalInvested;
  const changePercent =
    totalInvested > 0 ? (bookValueChange / totalInvested) * 100 : 0;

  const avgROI =
    equityInvestments.length > 0
      ? equityInvestments.reduce((sum, inv) => {
          const roi =
            ((inv.rawData.investment.bookValue -
              inv.rawData.investment.initialInvestmentAmount) /
              inv.rawData.investment.initialInvestmentAmount) *
            100;
          return sum + roi;
        }, 0) / equityInvestments.length
      : 0;

  const activeInvestments = equityInvestments.filter(
    (inv) => inv.status === "active" || inv.status === "Active"
  ).length;

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: "total-invested",
      title: "Total Invested",
      value: formatCurrency(totalInvested),
      prefix: <DollarOutlined />,
      color: "#1677ff",
      valueIsString: true,
      span: { xs: 24, sm: 12, md: 6, lg: 6 },
      description: `${formatCurrency(bookValueChange)} (${
        changePercent >= 0 ? "+" : ""
      }${changePercent.toFixed(1)}%)`,
      trend: {
        value: `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`,
        positive: changePercent >= 0,
        description: `${formatCurrency(bookValueChange)} change`,
      },
    },
    {
      key: "book-value",
      title: "Book Value",
      value: formatCurrency(totalBookValue),
      prefix: <RiseOutlined />,
      color: "#52c41a",
      valueIsString: true,
      span: { xs: 24, sm: 12, md: 6, lg: 6 },
      description: `${formatCurrency(bookValueChange)} (${
        changePercent >= 0 ? "+" : ""
      }${changePercent.toFixed(1)}%)`,
      trend: {
        value: `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`,
        positive: changePercent >= 0,
        description: `${formatCurrency(bookValueChange)} change`,
      },
    },
    {
      key: "avg-roi",
      title: "Avg. Expected ROI",
      value: `${avgROI.toFixed(1)}%`,
      prefix: <TrophyOutlined />,
      color: "#faad14",
      valueIsString: true,
      span: { xs: 24, sm: 12, md: 6, lg: 6 },
      description: `across ${equityInvestments.length} equity investments`,
      trend: {
        value: `${avgROI.toFixed(1)}%`,
        positive: avgROI >= 0,
        description: `Expected return rate`,
      },
    },
    {
      key: "active-investments",
      title: "Active Investments",
      value: activeInvestments,
      prefix: <ClockCircleOutlined />,
      color: "#722ed1",
      span: { xs: 24, sm: 12, md: 6, lg: 6 },
      description: `of ${equityInvestments.length} total`,
      trend: {
        value: `${Math.round(
          (activeInvestments / Math.max(equityInvestments.length, 1)) * 100
        )}%`,
        positive: activeInvestments > 0,
        description: `Active rate`,
      },
    },
  ];

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={false}
      error={null}
      skeletonCount={4}
      emptyText="No equity metrics available."
    />
  );
};

export default EquityMetricsCards;
