import React from "react";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import {
  DollarCircleOutlined,
  RiseOutlined,
  BankOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useEquityKPIIntegration } from "../../analytics-view/equity-investments-report/hooks/useEquityKPIIntegration";
import { formatCurrency, calculateChange } from "../../analytics-view/shared/utils";

interface EquityInvestmentStatisticsProps extends BusinessAppContextProps {}

export const EquityInvestmentStatistics: React.FC<EquityInvestmentStatisticsProps> = ({ ...context }) => {
  const { current: kpis, previous: previousKpis, isLoading, error, refetch } = useEquityKPIIntegration(context);

  const widgets: WidgetItem[] = [
    {
      key: "total-investments",
      title: "Total Investments",
      value: kpis.totalInvestments,
      prefix: <TeamOutlined />,
      color: "#1677ff",
      span: { xs: 24, sm: 12, lg: 6 },
      description: "Total number of equity investments",
      trend: {
        value: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).value,
        positive: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).positive,
        description: "vs 7 days ago",
      },
    },
    {
      key: "total-amount-invested",
      title: "Total Amount Invested",
      value: formatCurrency(kpis.totalAmountInvested),
      prefix: <DollarCircleOutlined />,
      color: "#52c41a",
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: "Sum of all equity investment amounts",
      trend: {
        value: calculateChange(kpis.totalAmountInvested, previousKpis.totalAmountInvested).value,
        positive: calculateChange(kpis.totalAmountInvested, previousKpis.totalAmountInvested).positive,
        description: "vs 7 days ago",
      },
    },
    {
      key: "total-market-value",
      title: "Total Market Value",
      value: formatCurrency(kpis.totalMarketValue),
      prefix: <RiseOutlined />,
      color: "#faad14",
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: "Current total market value of equity positions",
      trend: {
        value: calculateChange(kpis.totalMarketValue, previousKpis.totalMarketValue).value,
        positive: calculateChange(kpis.totalMarketValue, previousKpis.totalMarketValue).positive,
        description: "vs 7 days ago",
      },
    },
    {
      key: "average-company-valuation",
      title: "Average Company Valuation",
      value: formatCurrency(kpis.averageCompanyValuation),
      prefix: <BankOutlined />,
      color: "#722ed1",
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: "Average valuation across all companies",
      trend: {
        value: calculateChange(kpis.averageCompanyValuation, previousKpis.averageCompanyValuation).value,
        positive: calculateChange(kpis.averageCompanyValuation, previousKpis.averageCompanyValuation).positive,
        description: "vs 7 days ago",
      },
    },
  ];

  return (
    <div data-testid="equity-investment-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error ? new Error(error) : null}
        onRetry={refetch}
        skeletonCount={4}
        emptyText="No equity investment statistics available."
        data-testid="equity-investment-statistics"
      />
    </div>
  );
};

export default EquityInvestmentStatistics;
