import React, { useMemo } from 'react';
import { 
  FileTextOutlined, 
  DollarOutlined, 
  CalendarOutlined 
} from '@ant-design/icons';
import { ExpenseRequest } from '../../../hooks/useGetExpenseRequests';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';

interface ExpenseRequestStatisticsProps {
  items: ExpenseRequest[];
  statsLoading?: boolean;
  statsError?: string | null;
  fetchRequestStatistics?: () => Promise<void>;
}

const ExpenseRequestStatistics: React.FC<ExpenseRequestStatisticsProps> = ({ 
  items,
  statsLoading = false,
  statsError = null,
  fetchRequestStatistics = () => Promise.resolve()
}) => {
  // Calculate summary statistics with memoization
  const totalRequests = useMemo(() => items?.length ?? 0, [items]);
  
  const totalAmount = useMemo(() => 
    items?.reduce((sum, request) => sum + (request.totalAmount || 0), 0) ?? 0, 
  [items]);
  
  const pendingApproval = useMemo(() => 
    items?.filter(request => request.status === 'PENDING').length ?? 0, 
  [items]);
  
  const reimbursableAmount = useMemo(() => 
    items?.reduce((sum, request) => sum + (request.reimbursableAmount || 0), 0) ?? 0, 
  [items]);

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'total-requests',
      title: 'Total Requests',
      value: totalRequests,
      prefix: <FileTextOutlined />,
      color: '#1677ff',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Submitted expense requests',
      trend: {
        value: '+8%',
        positive: true,
        description: 'from last month'
      }
    },
    {
      key: 'total-amount',
      title: 'Total Amount',
      value: totalAmount,
      prefix: <DollarOutlined />,
      suffix: '€',
      color: '#3f8600',
      precision: 2,
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Across all requests'
    },
    {
      key: 'pending-approval',
      title: 'Pending Approval',
      value: pendingApproval,
      prefix: <CalendarOutlined />,
      color: '#faad14',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Requires action'
    },
    {
      key: 'reimbursable',
      title: 'Reimbursable',
      value: reimbursableAmount,
      prefix: <DollarOutlined />,
      suffix: '€',
      color: '#722ed1',
      precision: 2,
      span: { xs: 24, sm: 12, md: 6 },
      description: 'To be reimbursed'
    }
  ];

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={statsLoading}
      error={statsError}
      onRetry={fetchRequestStatistics}
      skeletonCount={4}
      emptyText="No expense request statistics available."
      data-testid="expense-request-statistics"
    />
  );
};

export default ExpenseRequestStatistics;