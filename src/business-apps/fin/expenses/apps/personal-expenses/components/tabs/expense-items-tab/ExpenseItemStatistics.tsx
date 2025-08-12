import { formatNumberFunction, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import React, { useMemo, useCallback } from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { EuroOutlined, WalletOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface ExpenseItemStatisticsProps {
  items: any[];
  totalExpenses?: number | null;
  previousMonthTotalExpenses?: number | null;
  pendingReimbursementTotal?: number;
  pendingItemCountFromApi?: number;
  onMissingReceiptsClick?: () => void;
  onWidgetClick?: (widgetKey: string) => void;
  activeWidgetKey?: string;
  isNoReceiptFilterActive?: boolean;
  statsLoading?: boolean;
  statsError?: string | null;
  fetchItemStatistics?: () => Promise<void>;
  // Add expense date range filter callback
  onExpenseDateRangeFilterChange?: (expenseDateRange: [Date | null, Date | null] | null) => void;
  // Add status filter callback
  onStatusFilterChange?: (status: string, selected: boolean) => void;
}

const ExpenseItemStatistics: React.FC<ExpenseItemStatisticsProps> = ({ 
  items, 
  totalExpenses,
  previousMonthTotalExpenses,
  pendingReimbursementTotal,
  pendingItemCountFromApi,
  onMissingReceiptsClick,
  isNoReceiptFilterActive = false,
  onWidgetClick,
  activeWidgetKey,
  statsLoading = false,
  statsError = null,
  fetchItemStatistics = () => Promise.resolve(),
  onExpenseDateRangeFilterChange,
  onStatusFilterChange
}) => {
  const currentMonthName = dayjs().format('MMMM');
  
  // Use backend aggregate for pending reimbursement total
  const pendingReimbursement = pendingReimbursementTotal ?? 0;
  
  const missingReceipts = useMemo(() => items?.filter(item => !item.expenseItemFile || item.expenseItemFile.length === 0).length ?? 0, [items]);

  // Get unique categories/types for the counter
  const categoriesCount = useMemo(() => {
    const uniqueCategories = new Set(items?.map(item => item.expenseClass?.value));
    return uniqueCategories.size;
  }, [items]);

  // Pending item count from API
  const pendingItemCount = pendingItemCountFromApi ?? 0;

  // Calculate percentage changes for trend data
  const totalExpensesPercentageChange = useMemo(() => {
    const current = totalExpenses ?? 0;
    const previous = previousMonthTotalExpenses ?? 0;

    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  }, [totalExpenses, previousMonthTotalExpenses]);

  // Generate trend data for total expenses
  const totalExpensesTrend = useMemo(() => {
    const previousMonthName = dayjs().subtract(1, 'month').format('MMMM');
    const current = totalExpenses ?? 0;
    const previous = previousMonthTotalExpenses ?? 0;

    if (previous === 0 && current > 0) {
      return {
        value: '+100%',
        positive: true,
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month','from last month')
      };
    }
    if (totalExpensesPercentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month','from last month')
      };
    }
    const sign = totalExpensesPercentageChange > 0 ? '+' : '';
    return {
      value: `${sign}${totalExpensesPercentageChange.toFixed(0)}%`,
      positive: totalExpensesPercentageChange >= 0,
      description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month','from last month')
    };
  }, [totalExpensesPercentageChange, totalExpenses, previousMonthTotalExpenses]);

  // Generate trend data for pending reimbursement (placeholder - you may want to add previous month data)
  const pendingReimbursementTrend = useMemo(() => {
    return {
      value: `${pendingItemCount} items`,
      positive: true,
      description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.pending_reimbursement','Pending reimbursement')
    };
  }, [pendingItemCount]);

  // Handle widget clicks with immediate visual feedback
  const handleWidgetClick = useCallback((widgetKey: string) => {
    // Provide immediate visual feedback
    if (onWidgetClick) {
      onWidgetClick(widgetKey);
    }
    
    // Set expense date range filters when total-expenses widget is clicked
    if (widgetKey === 'total-expenses') {
      const today = dayjs();
      const currentMonthStart = today.startOf('month').toDate();
      const currentMonthEnd = today.endOf('month').toDate();
      
      // Set expense date range to current month
      if (onExpenseDateRangeFilterChange) {
        onExpenseDateRangeFilterChange([currentMonthStart, currentMonthEnd]);
      }
      
      // Set status filters to only show PAID and CLOSED items
      if (onStatusFilterChange) {
        // First, clear any existing status filters
        const allStatuses = ['CREATED', 'ASSIGNED', 'PREPARED', 'PENDING', 'APPROVED', 'RETURNED', 'REJECTED', 'VERIFIED', 'BOOKED', 'TRANSFERRED'];
        allStatuses.forEach(status => {
          onStatusFilterChange(status, false);
        });
        // Then add only PAID and CLOSED statuses
        onStatusFilterChange('PAID', true);
        onStatusFilterChange('CLOSED', true);
      }
    }
    
    // Set filters when pending-reimbursement widget is clicked
    if (widgetKey === 'pending-reimbursement') {
      // Clear any existing expense date range filters
      if (onExpenseDateRangeFilterChange) {
        onExpenseDateRangeFilterChange(null);
      }
      
      // Set status filter to only show PENDING items
      if (onStatusFilterChange) {
        // Clear all existing status filters first
        const allStatuses = ['CREATED', 'ASSIGNED', 'PREPARED', 'PENDING', 'APPROVED', 'RETURNED', 'REJECTED', 'VERIFIED', 'BOOKED', 'PAID', 'CLOSED', 'TRANSFERRED'];
        allStatuses.forEach(status => {
          onStatusFilterChange(status, false);
        });
        // Then add only PENDING status
        onStatusFilterChange('PENDING', true);
      }
    }
  }, [onWidgetClick, onExpenseDateRangeFilterChange, onStatusFilterChange]);

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = useMemo(() => [
    {
      key: 'total-expenses',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.total_expenses_for_month','Total Expenses for') + ' ' + currentMonthName,
      value: formatNumberFunction(String(totalExpenses ?? 0)),
      suffix: '€',
      valueIsString: true,
      prefix: <EuroOutlined />,
      color: '#3f8600',
      span: { xs: 24, sm: 12, md: 8, lg: 8 },
      description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.current_month_expenses','Current month expenses'),
      trend: totalExpensesTrend,
      active: activeWidgetKey === 'total-expenses',
      onClick: () => handleWidgetClick('total-expenses')
    },
    {
      key: 'pending-reimbursement',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.pending_reimbursement','Pending Reimbursement'),
      value: formatNumberFunction(String(pendingReimbursement)),
      valueIsString: true,
      prefix: <WalletOutlined />,
      suffix: '€',
      color: '#1677ff',
      span: { xs: 24, sm: 12, md: 8, lg: 8 },
      description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.awaiting_processing','Awaiting processing'),
      trend: pendingReimbursementTrend,
      active: activeWidgetKey === 'pending-reimbursement',
      onClick: () => handleWidgetClick('pending-reimbursement')
    },
    // {
    //   key: 'missing-receipts',
    //   title: 'Missing Receipts',
    //   value: missingReceipts,
    //   prefix: <FileExclamationOutlined />,
    //   color: isNoReceiptFilterActive ? '#1890ff' : '#faad14',
    //   span: { xs: 24, sm: 12, md: 8, lg: 8 },
    //   description: isNoReceiptFilterActive ? 'Filter active' : 'Action required',
    //   onClick: onMissingReceiptsClick
    // },
    // {
    //   key: 'categories-used',
    //   title: 'Categories Used',
    //   value: categoriesCount,
    //   prefix: <AppstoreOutlined />,
    //   color: '#722ed1',
    //   span: { xs: 24, sm: 12, md: 8, lg: 8 },
    //   description: 'Across all expenses'
    // }
  ], [currentMonthName, totalExpenses, previousMonthTotalExpenses, pendingReimbursement, pendingItemCount, activeWidgetKey, totalExpensesTrend, pendingReimbursementTrend, handleWidgetClick]);

  return (
    <div data-testid="expense-item-statistics-container" className="gba:w-full">
      <WidgetGroup
        widgets={widgets}
        isLoading={statsLoading}
        error={statsError}
        onRetry={fetchItemStatistics}
        onWidgetClick={handleWidgetClick}
        skeletonCount={4}
        emptyText={getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_expense_item_statistics_available','No expense item statistics available.')}
        data-testid="expense-item-statistics"
      />
    </div>
  );
};

export default ExpenseItemStatistics;
