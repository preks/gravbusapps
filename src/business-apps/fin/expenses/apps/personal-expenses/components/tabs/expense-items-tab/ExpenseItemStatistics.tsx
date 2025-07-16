import React, { useMemo } from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { EuroOutlined, FileExclamationOutlined, AppstoreOutlined, WalletOutlined } from '@ant-design/icons';

interface ExpenseItemStatisticsProps {
  items: any[];
  onMissingReceiptsClick?: () => void;
  isNoReceiptFilterActive?: boolean;
  statsLoading?: boolean;
  statsError?: string | null;
  fetchItemStatistics?: () => Promise<void>;
}

const ExpenseItemStatistics: React.FC<ExpenseItemStatisticsProps> = ({ 
  items, 
  onMissingReceiptsClick,
  isNoReceiptFilterActive = false,
  statsLoading = false,
  statsError = null,
  fetchItemStatistics = () => Promise.resolve()
}) => {
  // Calculate summary statistics
  const totalExpenses = useMemo(() => items?.reduce((sum: number, item) => sum + (item.reimbursableAmount ?? 0), 0) ?? 0, [items]);
  
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

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'total-expenses',
      title: 'Total Expenses',
      value: totalExpenses,
      prefix: <EuroOutlined />,
      color: '#3f8600',
      precision: 2,
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Total reimbursable amount',
      trend: {
        value: '+12.5%',
        positive: true,
        description: 'from last month'
      }
    },
    {
      key: 'pending-reimbursement',
      title: 'Pending Reimbursement',
      value: pendingReimbursement,
      prefix: <WalletOutlined />,
      color: '#1677ff',
      precision: 2,
      span: { xs: 24, sm: 12, md: 6 },
      description: `${pendingItemCount} items pending`
    },
    {
      key: 'missing-receipts',
      title: 'Missing Receipts',
      value: missingReceipts,
      prefix: <FileExclamationOutlined />,
      color: isNoReceiptFilterActive ? '#1890ff' : '#faad14',
      span: { xs: 24, sm: 12, md: 6 },
      description: isNoReceiptFilterActive ? 'Filter active' : 'Action required',
      onClick: onMissingReceiptsClick
    },
    {
      key: 'categories-used',
      title: 'Categories Used',
      value: categoriesCount,
      prefix: <AppstoreOutlined />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Across all expenses'
    }
  ];

  const handleWidgetClick = (widgetKey: string) => {
    if (widgetKey === 'missing-receipts' && onMissingReceiptsClick) {
      onMissingReceiptsClick();
    }
  };

  return (
    <div data-testid="expense-item-statistics-container">
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
