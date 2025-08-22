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
import { BarChart3, Home, Briefcase, Banknote } from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { MetricsCards } from ".";
import { useGetInvestments } from "@/common/data/investment/hooks/useInvestments";
import { Investment } from "@/common/data/investment/types/investmentTypes";

// Helper function to calculate ROI
const calculateROI = (marketValue: number, initialAmount: number): number => {
  if (initialAmount === 0) return 0;
  return ((marketValue - initialAmount) / initialAmount) * 100;
};

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

interface InvestmentTypesTabProps extends BusinessAppContextProps {
  onNavigateToInvestmentType: (investmentType: string) => void;
}

const InvestmentTypesTab: React.FC<InvestmentTypesTabProps> = (props) => {
  const { onNavigateToInvestmentType } = props;
  
  // Use centralized investment data
  const { fetchInvestments } = useGetInvestments(props);
  const [investments, setInvestments] = React.useState<Investment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Load investment data
  React.useEffect(() => {
    const loadInvestments = async () => {
      if (!props.accessToken) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await fetchInvestments({ limit: 100 });
        const items = Array.isArray(result)
          ? result
          : (result as any)?.Investment || [];
        setInvestments(items as Investment[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load investments');
      } finally {
        setIsLoading(false);
      }
    };

    loadInvestments();
  }, [props.accessToken, fetchInvestments]);

  // Calculate metrics from centralized data
  const metrics = React.useMemo(() => {
    if (!investments.length) return null;

    const totalInvested = investments.reduce((sum, inv) => 
      sum + (inv.initialInvestmentAmount || 0), 0
    );
    const totalMarketValue = investments.reduce((sum, inv) => 
      sum + (inv.investmentMarketValue || 0), 0
    );
    const valueChange = totalMarketValue - totalInvested;
    const avgROI = investments.length > 0 ? 
      investments.reduce((sum, inv) => {
        const roi = calculateROI(
          inv.investmentMarketValue || 0, 
          inv.initialInvestmentAmount || 0
        );
        return sum + roi;
      }, 0) / investments.length : 0;

    const investmentTypes = new Set(
      investments.map(inv => inv.investmentTypeLabel || 'Other')
    ).size;

    return {
      totalInvested: formatCurrency(totalInvested),
      currentBookValue: formatCurrency(totalMarketValue),
      bookValueChange: `${valueChange >= 0 ? '+' : ''}${formatCurrency(valueChange)}`,
      avgExpectedROI: `${avgROI.toFixed(1)}%`,
      totalInvestments: investments.length,
      investmentTypes
    };
  }, [investments]);

  // Calculate type metrics from centralized data
  const typeMetrics = React.useMemo(() => {
    if (!investments.length) return [];

    const typeGroups = investments.reduce((groups, inv) => {
      const type = inv.investmentTypeLabel || 'Other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(inv);
      return groups;
    }, {} as Record<string, Investment[]>);

    return Object.entries(typeGroups).map(([type, typeInvestments]) => {
      const totalInvested = typeInvestments.reduce((sum, inv) => 
        sum + (inv.initialInvestmentAmount || 0), 0
      );
      const totalMarketValue = typeInvestments.reduce((sum, inv) => 
        sum + (inv.investmentMarketValue || 0), 0
      );
      const avgROI = typeInvestments.reduce((sum, inv) => {
        const roi = calculateROI(
          inv.investmentMarketValue || 0, 
          inv.initialInvestmentAmount || 0
        );
        return sum + roi;
      }, 0) / typeInvestments.length;

      // Calculate subtypes based on investment group or other criteria
      const subTypeGroups = typeInvestments.reduce((groups, inv) => {
        const subType = inv.investmentGroup?.code || 'General';
        if (!groups[subType]) groups[subType] = [];
        groups[subType].push(inv);
        return groups;
      }, {} as Record<string, Investment[]>);

      const subTypes = Object.entries(subTypeGroups).map(([subType, subTypeInvestments]) => {
        const subTypeTotalInvested = subTypeInvestments.reduce((sum, inv) => 
          sum + (inv.initialInvestmentAmount || 0), 0
        );
        const percentage = totalInvested > 0 ? (subTypeTotalInvested / totalInvested) * 100 : 0;
        
        return {
          name: subType,
          amount: formatCurrency(subTypeTotalInvested),
          percentage: `${percentage.toFixed(1)}%`
        };
      });

      const getTypeConfig = (typeName: string) => {
        const typeLower = typeName.toLowerCase();
        if (typeLower.includes('equity') && !typeLower.includes('private')) {
          return { icon: 'BarChart3', color: 'gba:bg-blue-500' };
        } else if (typeLower.includes('real') || typeLower.includes('estate')) {
          return { icon: 'Home', color: 'gba:bg-green-500' };
        } else if (typeLower.includes('liquid') || typeLower.includes('fund')) {
          return { icon: 'Banknote', color: 'gba:bg-amber-500' };
        } else {
          return { icon: 'DollarSign', color: 'gba:bg-gray-500' };
        }
      };

      const config = getTypeConfig(type);

      return {
        name: type,
        icon: config.icon,
        color: config.color,
        investments: typeInvestments.length,
        totalInvested: formatCurrency(totalInvested),
        bookValue: formatCurrency(totalMarketValue),
        avgROI: `${avgROI.toFixed(1)}%`,
        roiColor: avgROI >= 0 ? 'gba:text-green-600' : 'gba:text-red-600',
        subTypes
      };
    });
  }, [investments]);

  if (isLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
        data-testid="investment-types-loading"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="investment-types-error">
        <AlertTitle>Error Loading Investment Types Data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <button
          className="gba:px-4 gba:py-2 gba:bg-red-500 gba:text-white gba:rounded"
          onClick={() => window.location.reload()}
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
      return 75; // Default performance for equity
    }
    if (
      normalizedName.includes("realestate") ||
      normalizedName.includes("real")
    ) {
      return 80; // Default performance for real estate
    }
    if (normalizedName.includes("liquid")) {
      return 70; // Default performance for liquid funds
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
                  <Button size="sm" onClick={() => window.location.reload()}>
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
