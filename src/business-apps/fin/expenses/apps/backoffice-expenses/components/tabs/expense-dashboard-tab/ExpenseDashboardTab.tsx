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
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface ExpenseDashboardTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const ExpenseDashboardTab: React.FC<ExpenseDashboardTabProps> = (props) => {
  const { accessToken, prefixDataTestId = 'expense-dashboard-tab' } = props;
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>({
    department: '',
    currency: 'Currency:v1:RON',
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

     const getTranslatedQuarter = (quarterNumber: number): string => {
       return getTranslationFromI18nKeyAndLabel(
         `lowcoder:cards.quarter_${quarterNumber}`,
         `Q${quarterNumber}`
       );
     };

     const getTranslatedMonth = (monthIndex: number): string => {
       const monthNames = [
         'lowcoder:absence_report.employee_table.january',
         'lowcoder:absence_report.employee_table.february', 
         'lowcoder:absence_report.employee_table.march',
         'lowcoder:absence_report.employee_table.april',
         'lowcoder:absence_report.employee_table.may',
         'lowcoder:absence_report.employee_table.june',
         'lowcoder:absence_report.employee_table.july',
         'lowcoder:absence_report.employee_table.august',
         'lowcoder:absence_report.employee_table.september',
         'lowcoder:absence_report.employee_table.october',
         'lowcoder:absence_report.employee_table.november',
         'lowcoder:absence_report.employee_table.december'
       ];
       
       const fallbackNames = [
         'January', 'February', 'March', 'April', 'May', 'June',
         'July', 'August', 'September', 'October', 'November', 'December'
       ];
       
       return getTranslationFromI18nKeyAndLabel(
         monthNames[monthIndex],
         fallbackNames[monthIndex]
       );
     };

     const getCurrentPeriodName = (): string => {
       const date = new Date();
       switch (currentFilters.period) {
         case 'yearly':
           return date.getFullYear().toString();
         case 'quarterly':
           const quarter = Math.floor(date.getMonth() / 3) + 1;
           return `${getTranslatedQuarter(quarter)} ${date.getFullYear()}`;
         default:
           return getTranslatedMonth(date.getMonth());
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
           return `${getTranslatedQuarter(previousQuarter + 1)} ${previousYear}`;
         default:
           const previousMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
           return getTranslatedMonth(previousMonth.getMonth());
       }
     };

  const extractCurrencyCode = (currencyRef: string): string => {
    return currencyRef.split(':').pop() || 'RON';
  };

  const selectedCurrencyCode = extractCurrencyCode(currentFilters.currency || 'Currency:v1:RON');

  const kpiCards = useMemo(() => {
    
    const cards: KpiCardData[] = [];

    const getTotalCompanySpendTitle = () => {
      const title = (() => {
        switch (currentFilters.period) {
          case 'yearly':
            return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.total_company_spend_ytd', "Total Company Spend YTD")} (${selectedCurrencyCode})`;
          case 'quarterly':
            return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.total_company_spend_qtd', "Total Company Spend QTD")} (${selectedCurrencyCode})`;
          default:
            return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.total_company_spend_mtd', "Total Company Spend MTD")} (${selectedCurrencyCode})`;
        }
      })();
      return title;
    };

    const getTotalCompanySpendFooter = () => {
      const currentPeriodName = getCurrentPeriodName();
      const previousPeriodName = getPreviousPeriodName();
      const footer = `${currentPeriodName}: ${formatCurrency(stats.totalCompanySpend.currentPeriodTotal, selectedCurrencyCode)} (${stats.totalCompanySpend.currentPeriodCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:cards.expenses', 'expenses')}) | ${previousPeriodName}: ${formatCurrency(stats.totalCompanySpend.previousPeriodTotal, selectedCurrencyCode)} (${stats.totalCompanySpend.previousPeriodCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:cards.expenses', 'expenses')})`;
      return footer;
    };

    const getTotalCompanySpendDescription = () => {
      switch (currentFilters.period) {
        case 'yearly':
          return stats.totalCompanySpend.isIncrease ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.increase_vs_last_ytd', "Increase vs Last YTD") : getTranslationFromI18nKeyAndLabel('lowcoder:cards.decrease_vs_last_ytd', "Decrease vs Last YTD");
        case 'quarterly':
          return stats.totalCompanySpend.isIncrease ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.increase_vs_last_qtd', "Increase vs Last QTD") : getTranslationFromI18nKeyAndLabel('lowcoder:cards.decrease_vs_last_qtd', "Decrease vs Last QTD");
        default:
          return stats.totalCompanySpend.isIncrease ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.increase_vs_last_mtd', "Increase vs Last MTD") : getTranslationFromI18nKeyAndLabel('lowcoder:cards.decrease_vs_last_mtd', "Decrease vs Last MTD");
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
           return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.actual_vs_planned', "Actual vs Planned")} ${new Date().getFullYear()} (${selectedCurrencyCode})`;
         case 'quarterly':
           const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
           return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.actual_vs_planned', "Actual vs Planned")} ${getTranslatedQuarter(currentQuarter)} ${new Date().getFullYear()} (${selectedCurrencyCode})`;
         default:
           const currentMonth = new Date().toLocaleString('default', { month: 'long' });
           return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.actual_vs_planned', "Actual vs Planned")} ${currentMonth} ${new Date().getFullYear()} (${selectedCurrencyCode})`;
       }
     };
    
    cards.push({
      id: 'actual-vs-planned',
      title: getActualVsPlannedTitle(),
      value: actualVsPlannedPercentage.toFixed(1),
      suffix: '%',
      decimalPlaces: 1,
             footer: `${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.planned', 'Planned')}: ${formatCurrency(plannedAmount, selectedCurrencyCode)} (${plannedCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:employee_landing_page.plans', 'plans')}) | ${getTranslationFromI18nKeyAndLabel('lowcoder:new_goal.achieved', 'Actual')}: ${formatCurrency(actualAmount, selectedCurrencyCode)} (${actualCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:cards.expenses', 'expenses')})`,
      trend: {
        value: actualVsPlannedPercentage.toFixed(1),
        positive: actualVsPlannedPercentage <= 100,
        description: actualVsPlannedPercentage <= 100 ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.within_budget', "Within Budget") : getTranslationFromI18nKeyAndLabel('lowcoder:cards.over_budget', "Over Budget")
      },
      icon: 'target',
      iconColor: actualVsPlannedPercentage <= 100 ? '#52c41a' : '#ff4d4f'
    });

         // 3. Spend Comparison Card
     const monthlyComparison = stats.monthlySpendComparison;
     const getComparisonTitle = () => {
       switch (currentFilters.period) {
         case 'yearly':
           return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.yearly_spend_comparison', "Yearly Spend Comparison")} (${selectedCurrencyCode})`;
         case 'quarterly':
           return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.quarterly_spend_comparison', "Quarterly Spend Comparison")} (${selectedCurrencyCode})`;
         default:
           return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.monthly_spend_comparison', "Monthly Spend Comparison")} (${selectedCurrencyCode})`;
       }
     };

     const getComparisonDescription = () => {
       switch (currentFilters.period) {
         case 'yearly':
           return monthlyComparison.isIncrease ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.increase_vs_last_year', "Increase vs Last Year") : getTranslationFromI18nKeyAndLabel('lowcoder:cards.decrease_vs_last_year', "Decrease vs Last Year");
         case 'quarterly':
           return monthlyComparison.isIncrease ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.increase_vs_last_quarter', "Increase vs Last Quarter") : getTranslationFromI18nKeyAndLabel('lowcoder:cards.decrease_vs_last_quarter', "Decrease vs Last Quarter");
         default:
           return monthlyComparison.isIncrease ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.increase_vs_last_month', "Increase vs Last Month") : getTranslationFromI18nKeyAndLabel('lowcoder:cards.decrease_vs_last_month', "Decrease vs Last Month");
       }
     };

     cards.push({
       id: 'monthly-spend-comparison',
       title: getComparisonTitle(),
       value: Math.abs(monthlyComparison.percentChange).toFixed(1) + ' %',
       decimalPlaces: 1,
               footer: `${getCurrentPeriodName()}: ${formatCurrency(monthlyComparison.currentMonthTotal, selectedCurrencyCode)} (${monthlyComparison.currentMonthCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:cards.expenses', 'expenses')}) | ${getPreviousPeriodName()}: ${formatCurrency(monthlyComparison.previousMonthTotal, selectedCurrencyCode)} (${monthlyComparison.previousMonthCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:cards.expenses', 'expenses')})`,
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
          return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.pending_transfers_ytd_in', "Pending Transfers This Year In")} ${selectedCurrencyCode}`;
        case 'quarterly':
          return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.pending_transfers_qtd_in', "Pending Transfers This Quarter In")} ${selectedCurrencyCode}`;
        default:
          return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.pending_transfers_mtd_in', "Pending Transfers This Month In")} ${selectedCurrencyCode}`;
      }
    };
    
    cards.push({
      id: 'transfer-required',
      title: `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.transfer_required', "Transfer Required")} (${selectedCurrencyCode})`,
      value: formatCurrency(stats.transferRequired, selectedCurrencyCode),
      footer: getTransferRequiredFooter()
    });

    // 5. Pending Requests Card
    const getPendingRequestsFooter = () => {
      switch (currentFilters.period) {
        case 'yearly':
          return getTranslationFromI18nKeyAndLabel('lowcoder:cards.requests_awaiting_approval_ytd', "Requests Awaiting Approval This Year");
        case 'quarterly':
          return getTranslationFromI18nKeyAndLabel('lowcoder:cards.requests_awaiting_approval_qtd', "Requests Awaiting Approval This Quarter");
        default:
          return getTranslationFromI18nKeyAndLabel('lowcoder:cards.requests_awaiting_approval_mtd', "Requests Awaiting Approval This Month");
      }
    };

    const getAdvancePaymentFooter = () => {
      switch (currentFilters.period) {
        case 'yearly':
          return getTranslationFromI18nKeyAndLabel('lowcoder:cards.approved_waiting_to_pay_ytd', "Approved - Waiting to Pay This Year");
        case 'quarterly':
          return getTranslationFromI18nKeyAndLabel('lowcoder:cards.approved_waiting_to_pay_qtd', "Approved - Waiting to Pay This Quarter");
        default:
          return getTranslationFromI18nKeyAndLabel('lowcoder:cards.approved_waiting_to_pay_mtd', "Approved - Waiting to Pay This Month");
      }
    };
    
    cards.push({
      id: 'pending-requests',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:cards.pending_requests', "Pending Requests"),
      value: stats.pendingRequestsCount.toString(),
      footer: getPendingRequestsFooter()
    });

    // 6. Advance Payment Card
    cards.push({
      id: 'advance-payment',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.advance_payment', "Advance Payment"),
      value: stats.advancePaymentsApproved.count.toString(),
      footer: getAdvancePaymentFooter()
    });

    // 7. Average Spend Per Trip Card
    const getPeriodText = () => {
      switch (currentFilters.period) {
        case 'yearly':
          return getTranslationFromI18nKeyAndLabel('lowcoder:cards.average_spend_per_trip_footer_year', "Based on completed trips this year");
        case 'quarterly':
          return getTranslationFromI18nKeyAndLabel('lowcoder:cards.average_spend_per_trip_footer_quarter', "Based on completed trips this quarter");
        default:
          return getTranslationFromI18nKeyAndLabel('lowcoder:cards.average_spend_per_trip_footer_month', "Based on completed trips this month");
      }
    };
    
    cards.push({
      id: 'avg-spend-per-trip',
      title: `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.average_spend_per_trip', "Average Spend Per Trip (Based on Completed Trips)")} (${selectedCurrencyCode})`,
      value: formatCurrency(stats.avgSpendPerTrip, selectedCurrencyCode),
      footer: getPeriodText()
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
          selectedCurrencyCode={selectedCurrencyCode}
        />
      </div>
    </div>
  );
};

export default ExpenseDashboardTab;