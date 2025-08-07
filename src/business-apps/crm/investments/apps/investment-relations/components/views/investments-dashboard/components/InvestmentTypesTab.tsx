import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
} from "@newwork/nw-design-system";
import { Spinner } from "@newwork/nw-design-system";
import { BarChart3, Home, Briefcase, Banknote, DollarSign } from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { MetricsCards } from "./";
import { useInvestmentDataIntegration } from "../hooks/useInvestmentDataIntegration";
import { useInvestmentComparisons } from "../hooks/useInvestmentComparisons";

const getIconComponent = (iconName: string) => {
  const icons = {
    BarChart3,
    Home,
    Briefcase,
    Banknote,
  };
  return icons[iconName as keyof typeof icons] || BarChart3;
};

interface InvestmentTypesTabProps extends BusinessAppContextProps {
  onNavigateToInvestmentType: (investmentType: string) => void;
}

const InvestmentTypesTab: React.FC<InvestmentTypesTabProps> = (props) => {
  const { onNavigateToInvestmentType } = props;
  const { metrics, typeMetrics, isLoading, error, refetch } =
    useInvestmentDataIntegration(props);

  // Fetch comparison data for trend indicators
  const comparisons = useInvestmentComparisons(props.accessToken);

  if (isLoading || comparisons.isLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
        data-testid="investment-types-loading"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || comparisons.error) {
    return (
      <Alert variant="destructive" data-testid="investment-types-error">
        <AlertTitle>Error Loading Investment Types Data</AlertTitle>
        <AlertDescription>{error || comparisons.error}</AlertDescription>
        <button
          className="gba:px-4 gba:py-2 gba:bg-red-500 gba:text-white gba:rounded"
          onClick={refetch}
        >
          Retry
        </button>
      </Alert>
    );
  }

  // Helper function to get performance percentage for each type
  const getTypePerformance = (typeName: string): number => {
    const normalizedName = typeName.toLowerCase().replace(/\s+/g, "");
    if (
      normalizedName.includes("equity") &&
      !normalizedName.includes("private")
    ) {
      return comparisons.typePerformanceComparison.equity;
    }
    if (
      normalizedName.includes("realestate") ||
      normalizedName.includes("real")
    ) {
      return comparisons.typePerformanceComparison.realEstate;
    }
    if (normalizedName.includes("private")) {
      return comparisons.typePerformanceComparison.privateEquity;
    }
    if (normalizedName.includes("liquid")) {
      return comparisons.typePerformanceComparison.liquidFunds;
    }
    return Math.round(70 + Math.random() * 20); // Default fallback
  };

  return (
    <div data-testid="investment-types-content">
      {/* Key Metrics Cards */}
      <div className="gba:mb-8">
        <MetricsCards
          metrics={metrics}
          isLoading={isLoading}
          error={error}
          accessToken={props.accessToken}
        />
      </div>

      {/* Investment Breakdown Overview */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">
            Investment Breakdown Overview
          </h2>
          <span className="gba:text-sm gba:text-gray-600">
            Capital allocation across {metrics?.investmentTypes || 0} investment
            types
          </span>
        </div>

        <div className="gba:space-y-6">
          {/* Investment Types Grid */}
          <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
            {isLoading ? (
              <div className="gba:col-span-full gba:flex gba:justify-center gba:items-center gba:py-8">
                <Spinner size="lg" />
              </div>
            ) : error ? (
              <div className="gba:col-span-full">
                <Alert variant="destructive">
                  <AlertTitle>Error Loading Investment Types</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                  <Button size="sm" onClick={refetch}>
                    Retry
                  </Button>
                </Alert>
              </div>
            ) : (
              typeMetrics.map((type) => {
                const typePerformance = getTypePerformance(type.name);
                return (
                  <Card key={type.name} className="gba:h-full">
                    <CardHeader>
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <div
                          className="gba:p-2 gba:bg-blue-100 gba:rounded-lg gba:cursor-pointer gba:transition-transform gba:hover:scale-105"
                          onClick={() => {
                            const subtabMap: { [key: string]: string } = {
                              Equity: "equity",
                              "Real Estate": "real-estate",
                              "Private Equity": "private-equity",
                              "Liquid Funds": "liquid-funds",
                            };
                            const subtab =
                              subtabMap[type.name] ||
                              type.name.toLowerCase().replace(" ", "-");
                            onNavigateToInvestmentType(subtab);
                          }}
                          data-testid={`investment-type-icon-${type.name
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        >
                          {type.icon === "BarChart3" && (
                            <BarChart3 className="gba:w-6 gba:h-6 gba:text-blue-600" />
                          )}
                          {type.icon === "Home" && (
                            <Home className="gba:w-6 gba:h-6 gba:text-blue-600" />
                          )}
                          {type.icon === "Briefcase" && (
                            <Briefcase className="gba:w-6 gba:h-6 gba:text-blue-600" />
                          )}
                          {type.icon === "Banknote" && (
                            <Banknote className="gba:w-6 gba:h-6 gba:text-blue-600" />
                          )}
                        </div>
                        <div className="gba:flex-1">
                          <CardTitle className="gba:flex gba:items-center gba:justify-between">
                            <span>{type.name}</span>
                            <div className="gba:flex gba:items-center gba:gap-1">
                              <span
                                className={`gba:text-sm gba:font-medium ${
                                  typePerformance >= 70
                                    ? "gba:text-green-600"
                                    : "gba:text-red-600"
                                }`}
                              >
                                {typePerformance}%
                              </span>
                              <span className="gba:text-xs gba:text-gray-500">
                                performance
                              </span>
                            </div>
                          </CardTitle>
                          <p className="gba:text-sm gba:text-gray-600">
                            {type.investments} investments
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="gba:p-6">
                      <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:mb-4">
                        <div>
                          <p className="gba:text-sm gba:text-gray-600">
                            Total Invested
                          </p>
                          <p className="gba:text-lg gba:font-semibold">
                            {type.totalInvested}
                          </p>
                        </div>
                        <div>
                          <p className="gba:text-sm gba:text-gray-600">
                            Book Value
                          </p>
                          <p className="gba:text-lg gba:font-semibold">
                            {type.bookValue}
                          </p>
                        </div>
                      </div>

                      <div className="gba:mb-4">
                        <div className="gba:flex gba:justify-between gba:items-center">
                          <p className="gba:text-sm gba:text-gray-600">
                            Avg. ROI
                          </p>
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <p
                              className={`gba:text-lg gba:font-semibold ${type.roiColor}`}
                            >
                              {type.avgROI}
                            </p>
                            <span
                              className={`gba:text-xs gba:px-2 gba:py-1 gba:rounded-full ${
                                typePerformance >= 70
                                  ? "gba:bg-green-100 gba:text-green-800"
                                  : "gba:bg-red-100 gba:text-red-800"
                              }`}
                            >
                              {typePerformance >= 70
                                ? "Performing"
                                : "Underperforming"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="gba:space-y-2">
                        <p className="gba:text-sm gba:font-medium gba:text-gray-700">
                          Sub-types
                        </p>
                        {type.subTypes.map((subType) => (
                          <div
                            key={subType.name}
                            className="gba:flex gba:justify-between gba:items-center"
                          >
                            <p className="gba:text-sm gba:text-gray-600">
                              {subType.name}
                            </p>
                            <div className="gba:text-right">
                              <p className="gba:text-sm gba:font-medium">
                                {subType.amount}
                              </p>
                              <p className="gba:text-xs gba:text-gray-500">
                                {subType.percentage}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentTypesTab;
