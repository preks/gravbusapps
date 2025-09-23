import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingDown,
  DollarSign,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestments } from "@/common/data/investment";
import { formatCurrencyCompact } from "../../../../../utils/currencyUtils";
import { extractCurrencyCode } from "@/business-apps/crm/common/utils/currencyUtils";

interface PlannedExitsMetrics {
  totalCount: number;
  totalMarketValue: number;
  totalInvestmentValue: number;
  averagePerformance: number;
  currencyCode: string; // Extracted currency code for formatting
  // Period-over-period changes
  countChange: number;
  marketValueChange: number;
  investmentValueChange: number;
  performanceChange: number;
}

interface PlannedExitsMetricsProps {
  context: BusinessAppContextProps;
}

const PlannedExitsMetrics: React.FC<PlannedExitsMetricsProps> = ({ context }) => {
  const [metrics, setMetrics] = useState<PlannedExitsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchInvestments } = useGetInvestments(context);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current date and 30 days ago for comparison
      const currentDate = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(currentDate.getDate() - 30);

      // Use central hook to get all investments, then filter for planned exits
      const response = await fetchInvestments({ limit: 1000 });

      // Helper function to filter and calculate metrics
      const calculateMetrics = (beforeDate?: Date) => {
        const allInvestments = response.Investment || [];
        
        // Filter for planned exits (not EXITED)
        const filteredInvestments = allInvestments.filter((inv: any) => {
          const isPlannedExit = inv.planedExit === true && inv.investmentStatus?.code !== 'EXITED';
          if (!isPlannedExit) return false;
          
          // Apply date filter for historical data
          if (beforeDate) {
            const updatedAt = new Date(inv.updatedAt);
            return updatedAt <= beforeDate;
          }
          
          return true;
        });

        // Extract currency code from the first investment that has currency data
        let currencyCode = 'EUR'; // Default to EUR
        for (const inv of filteredInvestments) {
          if (inv.investmentCurrency?.id) {
            currencyCode = extractCurrencyCode(inv.investmentCurrency.id);
            break;
          } else if (inv.currency?.id) {
            currencyCode = extractCurrencyCode(inv.currency.id);
            break;
          }
        }

        const totalCount = filteredInvestments.length;
        const totalMarketValue = filteredInvestments.reduce(
          (sum: number, inv: any) => sum + (inv.investmentMarketValue || 0), 
          0
        );
        const totalInvestmentValue = filteredInvestments.reduce(
          (sum: number, inv: any) => sum + (inv.totalInvestmentAmount || 0), 
          0
        );
        const averagePerformance = totalCount > 0 
          ? filteredInvestments.reduce((sum: number, inv: any) => {
              const currentValue = inv.investmentMarketValue || 0;
              const totalInvestmentValue = inv.totalInvestmentAmount || 0;
              const performancePercentage = totalInvestmentValue > 0 ? ((currentValue - totalInvestmentValue) / totalInvestmentValue) * 100 : 0;
              return sum + performancePercentage;
            }, 0) / totalCount
          : 0;

        return { totalCount, totalMarketValue, totalInvestmentValue, averagePerformance, currencyCode };
      };

      // Calculate current and historical metrics
      const current = calculateMetrics();
      const historical = calculateMetrics(thirtyDaysAgo);

      // Calculate percentage changes
      const calculatePercentageChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const countChange = calculatePercentageChange(current.totalCount, historical.totalCount);
      const marketValueChange = calculatePercentageChange(current.totalMarketValue, historical.totalMarketValue);
      const investmentValueChange = calculatePercentageChange(current.totalInvestmentValue, historical.totalInvestmentValue);
      const performanceChange = calculatePercentageChange(current.averagePerformance, historical.averagePerformance);

      setMetrics({
        ...current,
        countChange,
        marketValueChange,
        investmentValueChange,
        performanceChange,
      });
    } catch (err) {
      console.error('Error fetching planned exits metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      setMetrics({
        totalCount: 0,
        totalMarketValue: 0,
        totalInvestmentValue: 0,
        averagePerformance: 0,
        currencyCode: 'EUR',
        countChange: 0,
        marketValueChange: 0,
        investmentValueChange: 0,
        performanceChange: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchInvestments]);

  useEffect(() => {
    if (context.accessToken) {
      fetchMetrics();
    }
  }, [fetchMetrics, context.accessToken]);

  // Removed formatCurrency - now using formatCurrencyCompact utility

  // Helper function to format percentage change
  const formatPercentageChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  // Create widget items for the WidgetGroup component
  // Order: 1) Total Planned Exits, 2) Total Investment Value, 3) Total Market Value, 4) Average Performance
  const widgets: WidgetItem[] = metrics ? [
    {
      key: "total-planned-exits",
      title: getTranslationFromI18nKeyAndLabel("total_planned_exits", "Total Planned Exits"),
      value: metrics.totalCount,
      prefix: <TrendingDown className="gba:h-5 gba:w-5 gba:text-red-600" />,
      color: '#f5222d', // Red theme for exits
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel("investments_planned_for_exit", "Investments planned for exit"),
      trend: {
        value: formatPercentageChange(metrics.countChange),
        positive: metrics.countChange < 0, // Fewer exits is positive from portfolio perspective
        description: getTranslationFromI18nKeyAndLabel("vs_previous_period", "vs previous period")
      }
    },
    {
      key: "total-investment-value", 
      title: getTranslationFromI18nKeyAndLabel("total_investment_value", "Total Investment Value"),
      value: formatCurrencyCompact(metrics.totalInvestmentValue, metrics.currencyCode),
      valueIsString: true,
      prefix: <TrendingUp className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#1677ff', // Blue theme for investments
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel("total_invested_capital", "Total invested capital"),
      trend: {
        value: formatPercentageChange(metrics.investmentValueChange),
        positive: metrics.investmentValueChange >= 0,
        description: getTranslationFromI18nKeyAndLabel("vs_previous_period", "vs previous period")
      }
    },
    {
      key: "total-market-value", 
      title: getTranslationFromI18nKeyAndLabel("total_market_value", "Total Market Value"),
      value: formatCurrencyCompact(metrics.totalMarketValue, metrics.currencyCode),
      valueIsString: true,
      prefix: <DollarSign className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#52c41a', // Green theme for money
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel("current_market_value", "Current market value"),
      trend: {
        value: formatPercentageChange(metrics.marketValueChange),
        positive: metrics.marketValueChange >= 0,
        description: getTranslationFromI18nKeyAndLabel("vs_previous_period", "vs previous period")
      }
    },
    {
      key: "avg-performance",
      title: getTranslationFromI18nKeyAndLabel("avg_performance", "Average Performance"),
      value: metrics.averagePerformance,
      suffix: "%",
      precision: 1,
      prefix: <BarChart3 className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: '#722ed1', // Purple theme for performance
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel("average_investment_performance", "Average investment performance"),
      trend: {
        value: formatPercentageChange(metrics.performanceChange),
        positive: metrics.performanceChange >= 0,
        description: getTranslationFromI18nKeyAndLabel("vs_previous_period", "vs previous period")
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
