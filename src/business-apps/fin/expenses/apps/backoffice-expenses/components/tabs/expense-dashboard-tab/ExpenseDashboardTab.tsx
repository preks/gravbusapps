/**
 * Dashboard Tab Component for Expense Management Overview
 * Displays KPIs and statistics for expense management by composing various dashboard cards.
 */

/**
 * ExpenseDashboardTab component with integrated filter bar.
 * Displays KPIs and statistics for expense management by composing various dashboard cards.
 */

import React, { useState, useMemo } from 'react';
import { Alert, Spinner, SectionKpiCards, KpiCardData } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useDashboardStats } from '../../../hooks/useDashboardStats';
import MonthlyExpenseTrendsCard from '../../cards/MonthlyExpenseTrendsCard';
import { ExpenseFilterBar, FilterOptions } from '../../filter-bar';

interface ExpenseDashboardTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const ExpenseDashboardTab: React.FC<ExpenseDashboardTabProps> = (props) => {
  const { accessToken, prefixDataTestId = 'expense-dashboard-tab' } = props;
  
  // State for filter options - initialize with default currency
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>({
    department: '',
    currency: 'Currency:v1:RON', // Initialize with default currency
    period: 'monthly'
  });
  
  // State for currency change loading
  const [isCurrencyLoading, setIsCurrencyLoading] = useState(false);
  
  // ⚡ OPTIMIZATION: Debounce timer for currency changes
  const [currencyDebounceTimer, setCurrencyDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Use the dashboard stats hook with filters
  const { stats, loading, error } = useDashboardStats({ 
    accessToken, 
    filters: currentFilters 
  });

  // ⚡ OPTIMIZATION: Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (currencyDebounceTimer) {
        clearTimeout(currencyDebounceTimer);
      }
    };
  }, [currencyDebounceTimer]);

  // Helper functions for KPI data formatting
  const formatCurrency = (value: number, currencyCode: string = 'EUR'): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getCurrentMonthName = (): string => {
    const date = new Date();
    return date.toLocaleString('default', { month: 'long' });
  };

  const getPreviousMonthName = (): string => {
    const date = new Date();
    const previousMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    return previousMonth.toLocaleString('default', { month: 'long' });
  };

  // Helper function to extract currency code from currencyRef
  const extractCurrencyCode = (currencyRef: string): string => {
    return currencyRef.split(':').pop() || 'RON';
  };

  // Get the current selected currency code
  const selectedCurrencyCode = extractCurrencyCode(currentFilters.currency || 'Currency:v1:RON');

  // ⚡ PERFORMANCE: Memoize KPI cards creation to prevent unnecessary recalculations
  const kpiCards = useMemo((): KpiCardData[] => {
    const cards: KpiCardData[] = [];

    // 1. Total Spend YTD Card
    const ytdCalculation = () => {
      let percentChange = 0;
      if (stats.ytdStats.previousTotalAmount > 0) {
        percentChange = ((stats.ytdStats.totalAmount - stats.ytdStats.previousTotalAmount) / stats.ytdStats.previousTotalAmount) * 100;
      } else if (stats.ytdStats.totalAmount > 0) {
        percentChange = 100;
      }
      const isIncrease = stats.ytdStats.totalAmount > stats.ytdStats.previousTotalAmount;
      return { percentChange, isIncrease };
    };
    const { percentChange: ytdPercentChange, isIncrease: ytdIsIncrease } = ytdCalculation();
    
    cards.push({
      id: 'total-spend-ytd',
      title: 'Total Company Spend YTD (EUR, Paid Status)',
      value: stats.ytdStats.totalAmount.toString(),
      suffix: 'EUR',
      decimalPlaces: 2,
      footer: `Based on ${stats.ytdStats.count} expense requests this year vs ${stats.ytdStats.previousCount} last year`,
      trend: {
        value: Math.abs(ytdPercentChange).toFixed(1),
        positive: !ytdIsIncrease,
        description: 'vs last year'
      },
      icon: 'euro',
      iconColor: '#1890ff'
    });

    // 2. Actual vs Planned Card
    const actualVsPlanned = stats.ytdStats.totalAmount;
    const plannedAmount = stats.expensePlanYearly.totalAmount;
    const actualVsPlannedPercentage = plannedAmount > 0 
      ? ((actualVsPlanned / plannedAmount) * 100) 
      : 0;
    
    cards.push({
      id: 'actual-vs-planned',
      title: 'Actual vs Planned',
      value: actualVsPlannedPercentage.toFixed(1),
      suffix: '%',
      decimalPlaces: 1,
      footer: `Actual: ${formatCurrency(actualVsPlanned)} | Planned: ${formatCurrency(plannedAmount)}`,
      trend: {
        value: actualVsPlannedPercentage.toFixed(1),
        positive: actualVsPlannedPercentage <= 100,
        description: actualVsPlannedPercentage <= 100 ? 'within budget' : 'over budget'
      },
      icon: 'target',
      iconColor: actualVsPlannedPercentage <= 100 ? '#52c41a' : '#ff4d4f'
    });

    // 3. Monthly Spend Comparison Card
    const monthlyComparison = stats.monthlySpendComparison;
    cards.push({
      id: 'monthly-spend-comparison',
      title: `Monthly Spend Comparison (${selectedCurrencyCode})`,
      value: Math.abs(monthlyComparison.percentChange).toFixed(1) + ' %',
      decimalPlaces: 1,
      footer: `${getCurrentMonthName()}: ${formatCurrency(monthlyComparison.currentMonthTotal, selectedCurrencyCode)} (${monthlyComparison.currentMonthCount} expenses) | ${getPreviousMonthName()}: ${formatCurrency(monthlyComparison.previousMonthTotal, selectedCurrencyCode)} (${monthlyComparison.previousMonthCount} expenses)`,
      trend: {
        value: Math.abs(monthlyComparison.percentChange).toFixed(1),
        positive: monthlyComparison.isIncrease,
        description: monthlyComparison.isIncrease ? 'increase vs last month' : 'decrease vs last month'
      },
      icon: 'calendar',
      iconColor: monthlyComparison.isIncrease ? '#ff4d4f' : '#52c41a'
    });

    // 4. Transfer Required Card
    const getTransferRequiredFooter = () => {
      switch (currentFilters.period) {
        case 'yearly':
          return `Pending transfers this year in ${selectedCurrencyCode}`;
        case 'quarterly':
          return `Pending transfers this quarter in ${selectedCurrencyCode}`;
        default:
          return `Pending transfers this month in ${selectedCurrencyCode}`;
      }
    };
    
    cards.push({
      id: 'transfer-required',
      title: `Transfer Required (${selectedCurrencyCode})`,
      value: formatCurrency(stats.transferRequired, selectedCurrencyCode),
      footer: getTransferRequiredFooter(),
      icon: 'exclamation',
      iconColor: '#ff4d4f'
    });

    // 5. Pending Requests Card
    const getPendingRequestsFooter = () => {
      switch (currentFilters.period) {
        case 'yearly':
          return 'Requests awaiting approval this year';
        case 'quarterly':
          return 'Requests awaiting approval this quarter';
        default:
          return 'Requests awaiting approval this month';
      }
    };
    
    cards.push({
      id: 'pending-requests',
      title: 'Pending Requests',
      value: stats.pendingRequestsCount.toString(),
      footer: getPendingRequestsFooter(),
      icon: 'clock',
      iconColor: '#faad14'
    });

    // 6. Average Spend Per Trip Card
    const getPeriodText = () => {
      switch (currentFilters.period) {
        case 'yearly':
          return 'year';
        case 'quarterly':
          return 'quarter';
        default:
          return 'month';
      }
    };
    
    cards.push({
      id: 'avg-spend-per-trip',
      title: `Average Spend Per Trip (${selectedCurrencyCode})`,
      value: formatCurrency(stats.avgSpendPerTrip, selectedCurrencyCode),
      footer: `Based on completed trips this ${getPeriodText()}`,
      icon: 'car',
      iconColor: '#722ed1'
    });

    return cards;
  }, [stats, currentFilters]); // Recalculate when stats or filters change

  // Handle filter changes and update dashboard stats with debouncing
  const handleFiltersChange = (newFilters: FilterOptions) => {
    // Debounce currency changes to prevent rate limiting
    if (newFilters.currency !== currentFilters.currency) {
      setIsCurrencyLoading(true);
      
      // ⚡ OPTIMIZATION: Clear existing timer and set new one
      if (currencyDebounceTimer) {
        clearTimeout(currencyDebounceTimer);
      }
      
      const newTimer = setTimeout(() => {
        setCurrentFilters(newFilters);
        setIsCurrencyLoading(false);
        setCurrencyDebounceTimer(null);
      }, 500); // Increased delay to 500ms
      
      setCurrencyDebounceTimer(newTimer);
    } else {
      // For non-currency changes, update immediately
      setCurrentFilters(newFilters);
    }
  };

  if (loading && !isCurrencyLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-64" data-testid="expense-dashboard-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="gba:mb-4" data-testid="expense-dashboard-error">
        <div>
          <h4 className="gba:font-semibold">Error Loading Dashboard Data</h4>
          <p className="gba:text-sm gba:mt-1">
            {error.message || 'An error occurred while loading dashboard data'}
          </p>
        </div>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-64" data-testid={`${prefixDataTestId}-loading`}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid={`${prefixDataTestId}-error`}>
        <Alert
          variant="destructive"
          className="gba:mb-4"
        >
          <div>
            <h4 className="gba:font-semibold">Error Loading Dashboard Data</h4>
            <p className="gba:text-sm gba:mt-1">
              An error occurred while loading dashboard data
            </p>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      {/* Filter Bar */}
      <ExpenseFilterBar
        accessToken={accessToken}
        onFiltersChange={handleFiltersChange}
        currentFilters={currentFilters}
        data-testid="expense-dashboard-filter-bar"
      />

      {/* KPI Cards Section */}
      <div data-testid={`${prefixDataTestId}-kpi-section`}>
        <SectionKpiCards 
          cards={kpiCards} 
          data-testid={`${prefixDataTestId}-kpi-cards`}
        />
      </div>

      {/* Monthly Expense Trends Chart */}
      <div className="gba:px-6" data-testid={`${prefixDataTestId}-chart-section`}>
        <MonthlyExpenseTrendsCard
          loading={loading}
          error={error}
          monthlyTrends={stats.monthlyTrends}
        />
      </div>
    </div>
  );
};

export default ExpenseDashboardTab;
