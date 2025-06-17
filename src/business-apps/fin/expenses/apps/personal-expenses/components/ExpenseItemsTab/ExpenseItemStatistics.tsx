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
      description: '+12.5% from last month'
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
      description: isNoReceiptFilterActive ? 'Filter active' : 'Action required'
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

  // No need for handleWidgetClick function as we're using direct onClick handler

  return (
    <div className="gba:relative" data-testid="expense-item-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={statsLoading}
        error={statsError}
        onRetry={fetchItemStatistics}
        skeletonCount={4}
        emptyText="No expense item statistics available."
        data-testid="expense-item-statistics"
      />
      {/* Overlay for clickable widgets */}
      <div className="gba:absolute gba:top-0 gba:left-0 gba:right-0 gba:bottom-0 gba:grid gba:grid-cols-1 gba:grid-cols-2 sm:gba:grid-cols-2 md:gba:grid-cols-4" style={{ pointerEvents: 'none' }}>
        <div className="gba:col-span-1" /> {/* Total Expenses - not clickable */}
        <div className="gba:col-span-1" /> {/* Pending Reimbursement - not clickable */}
        <button 
          className="gba:col-span-1 gba:cursor-pointer gba:border-0 gba:bg-transparent" 
          style={{ 
            pointerEvents: onMissingReceiptsClick ? 'auto' : 'none',
            background: isNoReceiptFilterActive ? 'rgba(24, 144, 255, 0.05)' : 'transparent',
            outline: isNoReceiptFilterActive ? '2px solid rgba(24, 144, 255, 0.2)' : 'none',
            borderRadius: '8px'
          }}
          onClick={() => onMissingReceiptsClick && onMissingReceiptsClick()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onMissingReceiptsClick && onMissingReceiptsClick();
            }
          }}
          disabled={!onMissingReceiptsClick}
          aria-label="Filter by missing receipts"
          data-testid="missing-receipts-widget"
        />
        <div className="gba:col-span-1" /> {/* Categories Used - not clickable */}
      </div>
    </div>
  );
};

export default ExpenseItemStatistics;
