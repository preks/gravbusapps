import React, { useMemo } from "react";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import {
  DollarOutlined,
  RiseOutlined,
  TrophyOutlined,
  PieChartOutlined,
} from "@ant-design/icons";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useInvestmentDataIntegration } from "@/common/data/investment";

interface InvestmentStatisticsProps extends BusinessAppContextProps {}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const InvestmentStatistics: React.FC<InvestmentStatisticsProps> = ({ ...context }) => {
  const { investments, isLoading, error, stats } = useInvestmentDataIntegration(context);

  const { totalInvested, totalBookValue, changePercent, avgROI, totalCount, distinctTypes } = useMemo(() => {
    // Central hook returns enhanced Investment with investmentMarketValue field
    const invested = investments.reduce((sum, inv: any) => sum + (inv.initialInvestmentAmount || 0), 0);
    const bookValue = typeof stats?.totalMarketValue === 'number' && stats.totalMarketValue > 0
      ? stats.totalMarketValue
      : investments.reduce((sum, inv: any) => sum + (inv.investmentMarketValue || 0), 0);
    const change = invested > 0 ? ((bookValue - invested) / invested) * 100 : 0;
    const avg = investments.length > 0
      ? investments.reduce((sum, inv: any) => {
          const init = inv.initialInvestmentAmount || 0;
          const mv = inv.investmentMarketValue || 0;
          return sum + (init > 0 ? ((mv - init) / init) * 100 : 0);
        }, 0) / investments.length
      : 0;
    const types = new Set((investments as any[]).map((i) => i.investmentGroupLabel || i.investmentTypeLabel || 'Unknown')).size;
    return {
      totalInvested: invested,
      totalBookValue: bookValue,
      changePercent: change,
      avgROI: avg,
      totalCount: investments.length,
      distinctTypes: types,
    };
  }, [investments]);

  const widgets: WidgetItem[] = [
    {
      key: "total-invested",
      title: "Total Invested",
      value: formatCurrency(totalInvested),
      prefix: <DollarOutlined />,
      color: "#1677ff",
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: "Committed capital",
    },
    {
      key: "book-value",
      title: "Book Value",
      value: formatCurrency(totalBookValue),
      prefix: <RiseOutlined />,
      color: "#52c41a",
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}% vs invested`,
      trend: {
        value: `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`,
        positive: changePercent >= 0,
        description: "Change vs invested",
      },
    },
    {
      key: "avg-roi",
      title: "Avg. Expected ROI",
      value: `${avgROI.toFixed(1)}%`,
      prefix: <TrophyOutlined />,
      color: "#faad14",
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: `across ${totalCount} investments`,
      trend: {
        value: `${avgROI.toFixed(1)}%`,
        positive: avgROI >= 0,
        description: "Expected return",
      },
    },
    {
      key: "asset-types",
      title: "Asset Types",
      value: distinctTypes,
      prefix: <PieChartOutlined />,
      color: "#722ed1",
      span: { xs: 24, sm: 12, lg: 6 },
      description: `${totalCount} total investments`,
    },
  ];

  return (
    <div data-testid="investment-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error ? new Error(error) : null}
        skeletonCount={4}
        emptyText="No investment statistics available."
        data-testid="investment-statistics"
      />
    </div>
  );
};

export default InvestmentStatistics;


