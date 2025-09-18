import React from "react";
import { Spinner, Alert } from "@newwork/nw-design-system";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import {
  DollarOutlined,
  RiseOutlined,
  AimOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

// Define the metrics interface locally since we're not using the old hook
interface InvestmentMetrics {
  totalInvested: string;
  currentBookValue: string;
  bookValueChange: string;
  avgExpectedROI: string;
  totalInvestments: number;
  investmentGroups: number;
}

interface MetricsCardsProps extends BusinessAppContextProps {
  metrics: InvestmentMetrics | null;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Component displaying key investment metrics cards at the top of the dashboard
 */
const MetricsCards: React.FC<MetricsCardsProps> = ({
  metrics,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-64"
        data-testid="investment-metrics-loading"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        variant="destructive"
        className="gba:mb-4"
        data-testid="investment-metrics-error"
      >
        <div>
          <h4 className="gba:font-semibold">
            Error Loading Investment Metrics
          </h4>
          <p className="gba:text-sm gba:mt-1">
            {error || "An error occurred while loading investment metrics"}
          </p>
        </div>
      </Alert>
    );
  }

  if (!metrics) {
    return null;
  }

  const widgets: WidgetItem[] = [
    {
      key: "total-invested",
      title: "Total Invested",
      value: metrics.totalInvested,
      prefix: <DollarOutlined />,
      color: "#1890ff",
      span: { xs: 24, sm: 12, md: 6, lg: 6, xl: 6 },
      description: `Across ${metrics.investmentGroups} investment groups`,
    },
    {
      key: "current-book-value",
      title: "Current Book Value",
      value: metrics.currentBookValue,
      prefix: <RiseOutlined />,
      color: "#52c41a",
      span: { xs: 24, sm: 12, md: 6, lg: 6, xl: 6 },
      description: `${metrics.bookValueChange} from initial investment`,
    },
    {
      key: "avg-expected-roi",
      title: "Avg. Expected ROI",
      value: metrics.avgExpectedROI,
      prefix: <AimOutlined />,
      color: "#722ed1",
      span: { xs: 24, sm: 12, md: 6, lg: 6, xl: 6 },
      description: "Across all investment types",
    },
    {
      key: "total-investments",
      title: "Total Investments",
      value: metrics.totalInvestments,
      prefix: <AppstoreOutlined />,
      color: "#faad14",
      span: { xs: 24, sm: 12, md: 6, lg: 6, xl: 6 },
      description: `${metrics.investmentGroups} different groups`,
    },
  ];

  return (
    <div data-testid="investment-metrics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={
          error ? new Error(error || "Unknown error") : null
        }
        skeletonCount={4}
        emptyText="No investment metrics available."
        data-testid="investment-metrics-widget-group"
      />
    </div>
  );
};

export default MetricsCards;
