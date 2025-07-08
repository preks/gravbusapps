import { formatNumberFunction } from '@/common/utils/windowUtils';
import React, { useMemo } from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { EuroOutlined, FileExclamationOutlined, AppstoreOutlined, WalletOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface ExpenseItemStatisticsProps {
  items: any[];
  totalExpenses?: number | null;
  previousMonthTotalExpenses?: number | null;
  onMissingReceiptsClick?: () => void;
  onWidgetClick?: (widgetKey: string) => void;
  activeWidgetKey?: string;
  isNoReceiptFilterActive?: boolean;
  statsLoading?: boolean;
  statsError?: string | null;
  fetchItemStatistics?: () => Promise<void>;
}

const ExpenseItemStatistics: React.FC<ExpenseItemStatisticsProps> = ({ 
  items, 
  totalExpenses,
  previousMonthTotalExpenses,
  onMissingReceiptsClick,
  isNoReceiptFilterActive = false,
  onWidgetClick,
  activeWidgetKey,
  statsLoading = false,
  statsError = null,
  fetchItemStatistics = () => Promise.resolve()
}) => {
  const currentMonthName = dayjs().format('MMMM');
  
  const pendingReimbursement = useMemo(() => items?.filter(item => 
    item.status.toLowerCase() === 'pending' || 
    item.status.toLowerCase() === 'submitted' || 
    item.status.toLowerCase() === 'in progress'
  ).reduce((sum: number, item) => sum + (item.reimbursableAmount ?? 0), 0) ?? 0, [items]);
  
  const missingReceipts = useMemo(() => items?.filter(item => !item.expenseItemFile || item.expenseItemFile.length === 0).length ?? 0, [items]);

  // Get unique categories/types for the counter
  const categoriesCount = useMemo(() => {
    const uniqueCategories = new Set(items?.map(item => item.expenseClass?.value));
    return uniqueCategories.size;
  }, [items]);

  // Pending item count
  const pendingItemCount = useMemo(() => items?.filter(i => 
    i.status.toLowerCase() === 'pending' || 
    i.status.toLowerCase() === 'submitted' || 
    i.status.toLowerCase() === 'in progress'
  ).length ?? 0, [items]);

  const comparisonDescription = useMemo(() => {
    const previousMonthName = dayjs().subtract(1, 'month').format('MMMM');
    const current = totalExpenses ?? 0;
    const previous = previousMonthTotalExpenses ?? 0;


    if (previous === 0) {
      if (current > 0) {
        return `+100.0% from ${previousMonthName}`;
      }
      return 'No expenses recorded';
    }

    const percentageChange = ((current - previous) / previous) * 100;

    if (Math.abs(percentageChange) < 0.01) {
      return `No change vs ${previousMonthName}`;
    }

    const sign = percentageChange > 0 ? '+' : '';
    return `${sign}${percentageChange.toFixed(1)}% from ${previousMonthName}`;
  }, [totalExpenses, previousMonthTotalExpenses]);

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = useMemo(() => [
    {
      key: 'total-expenses',
      title: `Total Expenses for ${currentMonthName}`,
      value: formatNumberFunction(String(totalExpenses ?? 0)),
      valueIsString: true,
      prefix: <EuroOutlined />,
      color: '#3f8600',
      span: { xs: 24, sm: 12, md: 8, lg: 8 },
      description: comparisonDescription,
      active: activeWidgetKey === 'total-expenses'
    },
    {
      key: 'pending-reimbursement',
      title: 'Pending Reimbursement',
      value: formatNumberFunction(String(pendingReimbursement)),
      valueIsString: true,
      prefix: <WalletOutlined />,
      color: '#1677ff',
      span: { xs: 24, sm: 12, md: 8, lg: 8 },
      description: `${pendingItemCount} items pending`,
      active: activeWidgetKey === 'pending-reimbursement'
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
  ], [totalExpenses, previousMonthTotalExpenses, pendingReimbursement, pendingItemCount, activeWidgetKey, comparisonDescription]);

  const handleWidgetClick = (widgetKey: string) => {
    if (onWidgetClick) {
      onWidgetClick(widgetKey);
    }
    if (widgetKey === 'missing-receipts' && onMissingReceiptsClick) {
      onMissingReceiptsClick();
    }
  };

  return (
    <div data-testid="expense-item-statistics-container" className="gba:w-full">
      <WidgetGroup
        widgets={widgets}
        isLoading={statsLoading}
        error={statsError}
        onRetry={fetchItemStatistics}
        onWidgetClick={handleWidgetClick}
        skeletonCount={4}
        emptyText="No expense item statistics available."
        data-testid="expense-item-statistics"
      />
    </div>
  );
};

export default ExpenseItemStatistics;
