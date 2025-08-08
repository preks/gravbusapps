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
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>({
    department: '',
    currency: 'Currency:v1:RON', // Initialize with default currency
    period: 'monthly'
  });
  
  const [isCurrencyLoading, setIsCurrencyLoading] = useState(false);
  
  const [currencyDebounceTimer, setCurrencyDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  
  const { stats, loading, error } = useDashboardStats({ 
    accessToken, 
    filters: currentFilters 
  });


  React.useEffect(() => {
    return () => {
      if (currencyDebounceTimer) {
        clearTimeout(currencyDebounceTimer);
      }
    };
  }, [currencyDebounceTimer]);

  const formatCurrency = (value: number, currencyCode: string = 'EUR'): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

     const getCurrentPeriodName = (): string => {
     const date = new Date();
     switch (currentFilters.period) {
       case 'yearly':
         return date.getFullYear().toString();
       case 'quarterly':
         const quarter = Math.floor(date.getMonth() / 3) + 1;
         return `Q${quarter} ${date.getFullYear()}`;
       default:
         return date.toLocaleString('default', { month: 'long' });
     }
   };

   const getPreviousPeriodName = (): string => {
     const date = new Date();
     switch (currentFilters.period) {
       case 'yearly':
         return (date.getFullYear() - 1).toString();
       case 'quarterly':
         const currentQuarter = Math.floor(date.getMonth() / 3);
         let previousQuarter = currentQuarter - 1;
         let previousYear = date.getFullYear();
         if (previousQuarter < 0) {
           previousQuarter = 3;
           previousYear = previousYear - 1;
         }
         return `Q${previousQuarter + 1} ${previousYear}`;
       default:
         const previousMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
         return previousMonth.toLocaleString('default', { month: 'long' });
     }
   };

  const extractCurrencyCode = (currencyRef: string): string => {
    return currencyRef.split(':').pop() || 'RON';
  };

  const kpiCards = useMemo(() => {

    const selectedCurrencyCode = extractCurrencyCode(currentFilters.currency || 'Currency:v1:RON');
    
    const cards: KpiCardData[] = [];

    const getTotalCompanySpendTitle = () => {
      const title = (() => {
        switch (currentFilters.period) {
          case 'yearly':
            return `Total Company Spend YTD (${selectedCurrencyCode})`;
          case 'quarterly':
            return `Total Company Spend QTD (${selectedCurrencyCode})`;
          default:
            return `Total Company Spend MTD (${selectedCurrencyCode})`;
        }
      })();
      return title;
    };

    const getTotalCompanySpendFooter = () => {
      const currentPeriodName = getCurrentPeriodName();
      const previousPeriodName = getPreviousPeriodName();
      const footer = `${currentPeriodName}: ${formatCurrency(stats.totalCompanySpend.currentPeriodTotal, selectedCurrencyCode)} (${stats.totalCompanySpend.currentPeriodCount} expenses) | ${previousPeriodName}: ${formatCurrency(stats.totalCompanySpend.previousPeriodTotal, selectedCurrencyCode)} (${stats.totalCompanySpend.previousPeriodCount} expenses)`;
      return footer;
    };

    const getTotalCompanySpendDescription = () => {
      switch (currentFilters.period) {
        case 'yearly':
          return stats.totalCompanySpend.isIncrease ? 'increase vs last YTD' : 'decrease vs last YTD';
        case 'quarterly':
          return stats.totalCompanySpend.isIncrease ? 'increase vs last QTD' : 'decrease vs last QTD';
        default:
          return stats.totalCompanySpend.isIncrease ? 'increase vs last MTD' : 'decrease vs last MTD';
      }
    };

    cards.push({
      id: 'total-company-spend',
      title: getTotalCompanySpendTitle(),
      value: formatCurrency(stats.totalCompanySpend.currentPeriodTotal, selectedCurrencyCode),
      footer: getTotalCompanySpendFooter(),
      trend: {
        value: Math.abs(stats.totalCompanySpend.percentChange).toFixed(1),
        positive: stats.totalCompanySpend.isIncrease,
        description: getTotalCompanySpendDescription()
      },
      icon: 'building',
      iconColor: stats.totalCompanySpend.isIncrease ? '#ff4d4f' : '#52c41a'
    });

    // 2. Actual vs Planned Card
    const actualVsPlannedData = stats.actualVsPlanned;
    const actualAmount = actualVsPlannedData.actualExpenses.totalAmount;
    const plannedAmount = actualVsPlannedData.plannedExpenses.totalAmount;
    const actualCount = actualVsPlannedData.actualExpenses.count;
    const plannedCount = actualVsPlannedData.plannedExpenses.count;
    
    const actualVsPlannedPercentage = plannedAmount > 0 
      ? ((actualAmount / plannedAmount) * 100) 
      : 0;
    
    const getActualVsPlannedTitle = () => {
      switch (currentFilters.period) {
        case 'yearly':
          return `Actual vs Planned ${new Date().getFullYear()} (${selectedCurrencyCode})`;
        case 'quarterly':
          const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
          return `Actual vs Planned Q${currentQuarter} ${new Date().getFullYear()} (${selectedCurrencyCode})`;
        default:
          const currentMonth = new Date().toLocaleString('default', { month: 'long' });
          return `Actual vs Planned ${currentMonth} ${new Date().getFullYear()} (${selectedCurrencyCode})`;
      }
    };
    
    cards.push({
      id: 'actual-vs-planned',
      title: getActualVsPlannedTitle(),
      value: actualVsPlannedPercentage.toFixed(1),
      suffix: '%',
      decimalPlaces: 1,
      footer: `Planned: ${formatCurrency(plannedAmount, selectedCurrencyCode)} (${plannedCount} plans) | Actual: ${formatCurrency(actualAmount, selectedCurrencyCode)} (${actualCount} expenses)`,
      trend: {
        value: actualVsPlannedPercentage.toFixed(1),
        positive: actualVsPlannedPercentage <= 100,
        description: actualVsPlannedPercentage <= 100 ? 'within budget' : 'over budget'
      },
      icon: 'target',
      iconColor: actualVsPlannedPercentage <= 100 ? '#52c41a' : '#ff4d4f'
    });

         // 3. Spend Comparison Card
     const monthlyComparison = stats.monthlySpendComparison;
     const getComparisonTitle = () => {
       switch (currentFilters.period) {
         case 'yearly':
           return `Yearly Spend Comparison (${selectedCurrencyCode})`;
         case 'quarterly':
           return `Quarterly Spend Comparison (${selectedCurrencyCode})`;
         default:
           return `Monthly Spend Comparison (${selectedCurrencyCode})`;
       }
     };

     const getComparisonDescription = () => {
       switch (currentFilters.period) {
         case 'yearly':
           return monthlyComparison.isIncrease ? 'increase vs last year' : 'decrease vs last year';
         case 'quarterly':
           return monthlyComparison.isIncrease ? 'increase vs last quarter' : 'decrease vs last quarter';
         default:
           return monthlyComparison.isIncrease ? 'increase vs last month' : 'decrease vs last month';
       }
     };

     cards.push({
       id: 'monthly-spend-comparison',
       title: getComparisonTitle(),
       value: Math.abs(monthlyComparison.percentChange).toFixed(1) + ' %',
       decimalPlaces: 1,
       footer: `${getCurrentPeriodName()}: ${formatCurrency(monthlyComparison.currentMonthTotal, selectedCurrencyCode)} (${monthlyComparison.currentMonthCount} expenses) | ${getPreviousPeriodName()}: ${formatCurrency(monthlyComparison.previousMonthTotal, selectedCurrencyCode)} (${monthlyComparison.previousMonthCount} expenses)`,
       trend: {
         value: Math.abs(monthlyComparison.percentChange).toFixed(1),
         positive: monthlyComparison.isIncrease,
         description: getComparisonDescription()
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

    const getAdvancePaymentFooter = () => {
      switch (currentFilters.period) {
        case 'yearly':
          return 'Approved - waiting to pay this year';
        case 'quarterly':
          return 'Approved - waiting to pay this quarter';
        default:
          return 'Approved - waiting to pay this month';
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

    // 6. Advance Payment Card
    cards.push({
      id: 'advance-payment',
      title: 'Advance Payment',
      value: stats.advancePaymentsApproved.count.toString(),
      footer: getAdvancePaymentFooter(),
      icon: 'credit-card',
      iconColor: '#52c41a'
    });

    // 7. Average Spend Per Trip Card
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
    
    if (newFilters.currency !== currentFilters.currency) {
      setIsCurrencyLoading(true);
      
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