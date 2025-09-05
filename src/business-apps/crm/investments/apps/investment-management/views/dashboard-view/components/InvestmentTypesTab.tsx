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
import { BarChart3, Home, Briefcase, Banknote, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { InvestmentStatistics } from ".";
import { useGetInvestments } from "@/common/data/investment/hooks/useInvestments";
import { Investment } from "@/common/data/investment/types/investmentTypes";
import { useInvestmentGroupsAndTypes } from "../hooks/useInvestmentGroupsAndTypes";

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Helper function to calculate month-over-month change
const calculateMonthOverMonthChange = (currentValue: number, previousValue: number): { percentage: number; trend: 'up' | 'down' | 'neutral' } => {
  if (previousValue === 0) {
    return { percentage: 0, trend: 'neutral' };
  }
  
  const change = ((currentValue - previousValue) / previousValue) * 100;
  
  if (Math.abs(change) < 0.1) {
    return { percentage: change, trend: 'neutral' };
  }
  
  return {
    percentage: change,
    trend: change > 0 ? 'up' : 'down'
  };
};

// Helper function to get trend icon and color
const getTrendDisplay = (trend: 'up' | 'down' | 'neutral', percentage: number) => {
  const formattedPercentage = `${Math.abs(percentage).toFixed(1)}%`;
  
  switch (trend) {
    case 'up':
      return {
        icon: <TrendingUp className="gba:w-3 gba:h-3" />,
        color: 'gba:text-green-600',
        text: `+${formattedPercentage}`
      };
    case 'down':
      return {
        icon: <TrendingDown className="gba:w-3 gba:h-3" />,
        color: 'gba:text-red-600',
        text: `-${formattedPercentage}`
      };
    case 'neutral':
    default:
      return {
        icon: <Minus className="gba:w-3 gba:h-3" />,
        color: 'gba:text-gray-500',
        text: '0.0%'
      };
  }
};

// Helper function to format group names for display
const formatGroupName = (groupName: string): string => {
  // Handle specific cases for better display
  if (groupName === 'RealEstate') {
    return 'Real Estate';
  }
  if (groupName === 'LiquidFund' || groupName === 'LiquidFunds') {
    return 'Liquid Fund';
  }
  if (groupName === 'PrivateEquity') {
    return 'Private Equity';
  }
  
  // For other cases, add spaces before capital letters (camelCase to Title Case)
  return groupName.replace(/([A-Z])/g, ' $1').trim();
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

  // Get investment groups and types from catalog
  const { data: groupsData, isLoading: groupsLoading, error: groupsError } = useInvestmentGroupsAndTypes(props.accessToken);

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

  // Calculate investment groups count for the breakdown overview
  const investmentGroupsCount = React.useMemo(() => {
    if (!investments.length) return 0;

    const validInvestments = investments.filter(inv => 
      inv.investmentGroup?.value
    );

    return new Set(
      validInvestments.map(inv => inv.investmentGroup?.value)
        .filter(group => group) // Remove any undefined/null values
    ).size;
  }, [investments]);

  // Calculate investment group metrics from centralized data using catalog structure
  const investmentGroupMetrics = React.useMemo(() => {
    if (!investments.length || !groupsData.groups.length) return [];

    // Create a map of group values to group info for easier lookup
    const groupMap = new Map(groupsData.groups.map(group => [group.value, group]));
    
    // Create a map of investment type values to their parent group
    const typeToGroupMap = new Map<string, string>();
    groupsData.groups.forEach(group => {
      group.types.forEach(type => {
        typeToGroupMap.set(type.value, group.value);
      });
    });
    
    // Group investments by their investment type's correct parent group (catalog as source of truth)
    const groupGroups = investments.reduce((groups, inv) => {
      const investmentTypeValue = inv.investmentType?.value;
      const actualGroupValue = inv.investmentGroup?.value;
      
      // Determine the correct group based on catalog (investment type's parent)
      const correctGroupValue = investmentTypeValue ? typeToGroupMap.get(investmentTypeValue) : null;
      
      // Use catalog-based grouping if available, otherwise fall back to assigned group
      const finalGroupValue = correctGroupValue || actualGroupValue;
      
      if (!finalGroupValue) {
        console.warn('Investment without proper type or group found:', {
          id: inv.id,
          name: inv.name,
          investmentType: investmentTypeValue,
          investmentGroup: actualGroupValue
        });
        return groups; // Skip investments without proper classification
      }
      
      // Log data quality issues
      if (actualGroupValue && correctGroupValue && actualGroupValue !== correctGroupValue) {
        console.warn(`Investment data mismatch: "${inv.name}" assigned to "${actualGroupValue}" but type "${investmentTypeValue}" belongs to "${correctGroupValue}" per catalog. Using catalog group.`);
      } else if (!investmentTypeValue && actualGroupValue) {
        console.info(`Investment "${inv.name}" has no type, using assigned group "${actualGroupValue}"`);
      }
      
      if (!groups[finalGroupValue]) groups[finalGroupValue] = [];
      groups[finalGroupValue].push(inv);
      return groups;
    }, {} as Record<string, Investment[]>);

    // Define preferred order for investment groups (using actual values from data)
    const groupOrder = ['RealEstate', 'Equity', 'Liquid Fund', 'Liquid Funds'];
    
    // Ensure all catalog groups are represented, even if empty
    groupsData.groups.forEach(catalogGroup => {
      if (!groupGroups[catalogGroup.value]) {
        groupGroups[catalogGroup.value] = [];
      }
    });
    
    // Return all groups (including empty ones to show catalog structure)
    return Object.entries(groupGroups)
      .sort(([groupA], [groupB]) => {
        const indexA = groupOrder.indexOf(groupA);
        const indexB = groupOrder.indexOf(groupB);
        
        // If both groups are in the preferred order, sort by that order
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        // If only one is in the preferred order, prioritize it
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        // If neither is in the preferred order, sort alphabetically
        return groupA.localeCompare(groupB);
      })
      .map(([group, groupInvestments]) => {
      const totalInvested = groupInvestments.reduce((sum, inv) => 
        sum + (inv.initialInvestmentAmount || 0), 0
      );
      const totalMarketValue = groupInvestments.reduce((sum, inv) => 
        sum + (inv.investmentMarketValue || 0), 0
      );


      // Initialize all catalog types for this group with empty arrays
      const catalogGroup = groupMap.get(group);
      const subTypeGroups: Record<string, Investment[]> = {};
      
      // First, create entries for all catalog types in this group
      if (catalogGroup) {
        catalogGroup.types.forEach(type => {
          subTypeGroups[type.value] = [];
        });
      }
      
      // Then, assign investments to their correct types
      groupInvestments.forEach(inv => {
        const investmentTypeValue = inv.investmentType?.value;
        
        if (investmentTypeValue && subTypeGroups[investmentTypeValue]) {
          subTypeGroups[investmentTypeValue].push(inv);
        } else if (investmentTypeValue) {
          // Investment type exists but not in this group's catalog - log warning
          console.warn(`Investment type "${investmentTypeValue}" not found in catalog for group "${group}"`);
        }
        // Skip investments without investment types
      });

      const subTypes = Object.entries(subTypeGroups).map(([subType, subTypeInvestments]) => {
        const subTypeTotalInvested = subTypeInvestments.reduce((sum, inv) => 
          sum + (inv.initialInvestmentAmount || 0), 0
        );
        const percentage = totalInvested > 0 ? (subTypeTotalInvested / totalInvested) * 100 : 0;
        
        // Note: Some investment types may have 0€ invested amounts but still have market value
        
        return {
          name: subType,
          amount: formatCurrency(subTypeTotalInvested),
          percentage: `${percentage.toFixed(1)}%`
        };
      });

      const getGroupConfig = (groupName: string) => {
        const groupLower = groupName.toLowerCase();
        if (groupLower.includes('equity') && !groupLower.includes('private')) {
          return { icon: 'BarChart3', color: 'gba:bg-blue-500' };
        } else if (groupLower.includes('real') || groupLower.includes('estate')) {
          return { icon: 'Home', color: 'gba:bg-green-500' };
        } else if (groupLower.includes('liquid') || groupLower.includes('fund')) {
          return { icon: 'Banknote', color: 'gba:bg-amber-500' };
        } else {
          return { icon: 'DollarSign', color: 'gba:bg-gray-500' };
        }
      };

      const config = getGroupConfig(group);

      return {
        name: group,
        icon: config.icon,
        color: config.color,
        investments: groupInvestments.length,
        totalInvested: formatCurrency(totalInvested),
        marketValue: formatCurrency(totalMarketValue),
        subTypes
      };
    });
    
    return result;
  }, [investments, groupsData.groups]);

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

  if (error || groupsError) {
    return (
      <Alert variant="destructive" data-testid="investment-types-error">
        <AlertTitle>Error Loading Investment Data</AlertTitle>
        <AlertDescription>{error || groupsError}</AlertDescription>
        <button
          className="gba:px-4 gba:py-2 gba:bg-red-500 gba:text-white gba:rounded"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </Alert>
    );
  }



  return (
    <div data-testid="investment-types-content">
      {/* Key Metrics Cards */}
      <div className="gba:mb-8">
        <InvestmentStatistics
          accessToken={props.accessToken}
          userInfo={props.userInfo}
        />
      </div>

      {/* Investment Breakdown Overview */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">
            Investment Breakdown Overview
          </h2>
          <span className="gba:text-sm gba:text-gray-600">
            Capital allocation across {investmentGroupsCount} investment
            groups
          </span>
        </div>

        <div className="gba:space-y-6">
          {/* Investment Groups Grid */}
          <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3">
            {groupsLoading ? (
              <div className="gba:col-span-full gba:flex gba:justify-center gba:items-center gba:py-8">
                <Spinner size="lg" />
              </div>
            ) : groupsError ? (
              <div className="gba:col-span-full">
                <Alert variant="destructive">
                  <AlertTitle>Error Loading Investment Groups</AlertTitle>
                  <AlertDescription>{groupsError}</AlertDescription>
                  <Button size="sm" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </Alert>
              </div>
            ) : investmentGroupMetrics.length === 0 ? (
              <div className="gba:col-span-full gba:text-center gba:py-8">
                <p className="gba:text-gray-500">No investment groups found</p>
                <p className="gba:text-sm gba:text-gray-400 gba:mt-2">
                  {investments.length} investments available, {groupsData.groups.length} groups in catalog
                </p>
              </div>
            ) : (
              investmentGroupMetrics.map((group) => {
                return (
                  <Card key={group.name} className="gba:h-full">
                    <CardHeader>
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <div
                          className="gba:p-2 gba:bg-blue-100 gba:rounded-lg gba:cursor-pointer gba:transition-transform gba:hover:scale-105"
                          onClick={() => {
                            const subtabMap: { [key: string]: string } = {
                              Equity: "equity",
                              "Real Estate": "real-estate",
                              RealEstate: "real-estate",
                              "Liquid Fund": "liquid-funds",
                              "Liquid Funds": "liquid-funds",
                              LiquidFund: "liquid-funds",
                              LiquidFunds: "liquid-funds",
                            };
                            const subtab =
                              subtabMap[group.name] ||
                              formatGroupName(group.name).toLowerCase().replace(" ", "-");
                            onNavigateToInvestmentType(subtab);
                          }}
                          data-testid={`investment-group-icon-${group.name
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        >
                          {group.icon === "BarChart3" && (
                            <BarChart3 className="gba:w-6 gba:h-6 gba:text-blue-600" />
                          )}
                          {group.icon === "Home" && (
                            <Home className="gba:w-6 gba:h-6 gba:text-blue-600" />
                          )}
                          {group.icon === "Briefcase" && (
                            <Briefcase className="gba:w-6 gba:h-6 gba:text-blue-600" />
                          )}
                          {group.icon === "Banknote" && (
                            <Banknote className="gba:w-6 gba:h-6 gba:text-blue-600" />
                          )}
                        </div>
                        <div className="gba:flex-1">
                          <CardTitle>
                            <span>{formatGroupName(group.name)}</span>
                          </CardTitle>
                          <p className="gba:text-sm gba:text-gray-600">
                            {group.investments} investments
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="gba:p-6">
                      <div className="gba:flex gba:justify-between gba:items-start gba:mb-4">
                        <div>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                            <p className="gba:text-sm gba:text-gray-600">
                              Total Invested
                            </p>
                            {(() => {
                              // Mock previous month data for Total Invested
                              const totalInvestedNum = parseFloat(group.totalInvested.replace(/[€.,]/g, ''));
                              const mockPreviousTotalInvested = totalInvestedNum * 0.97; // Mock 3% previous value
                              
                              const change = calculateMonthOverMonthChange(totalInvestedNum, mockPreviousTotalInvested);
                              const trendDisplay = getTrendDisplay(change.trend, change.percentage);
                              
                              return (
                                <div className={`gba:flex gba:items-center gba:gap-1 gba:text-xs ${trendDisplay.color}`}>
                                  {trendDisplay.icon}
                                  <span>{trendDisplay.text}</span>
                                </div>
                              );
                            })()}
                          </div>
                          <p className="gba:text-lg gba:font-semibold">
                            {group.totalInvested}
                          </p>
                        </div>
                        <div className="gba:text-right">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:justify-end gba:mb-1">
                            <p className="gba:text-sm gba:text-gray-600">
                              Market Value
                            </p>
                            {(() => {
                              // Mock previous month data for Market Value
                              const marketValueNum = parseFloat(group.marketValue.replace(/[€.,]/g, ''));
                              const mockPreviousMarketValue = marketValueNum * 0.95; // Mock 5% previous value
                              
                              const change = calculateMonthOverMonthChange(marketValueNum, mockPreviousMarketValue);
                              const trendDisplay = getTrendDisplay(change.trend, change.percentage);
                              
                              return (
                                <div className={`gba:flex gba:items-center gba:gap-1 gba:text-xs ${trendDisplay.color}`}>
                                  {trendDisplay.icon}
                                  <span>{trendDisplay.text}</span>
                                </div>
                              );
                            })()}
                          </div>
                          <p className="gba:text-lg gba:font-semibold">
                            {group.marketValue}
                          </p>
                        </div>
                      </div>

                      <div className="gba:space-y-2">
                        <p className="gba:text-sm gba:font-medium gba:text-gray-700">
                          Investment Types
                        </p>
                        {group.subTypes.map((subType) => (
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
