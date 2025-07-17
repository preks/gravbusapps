import React from 'react';
import { ClockCircleOutlined, FileOutlined, DollarOutlined } from '@ant-design/icons';
import { ExpenseRequestStatisticsData } from '../../../hooks/useGetExpenseRequests';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { formatAmount, formatCurrency } from '../../../utils/currencyUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface ExpenseRequestStatisticsProps {
  requestStats: ExpenseRequestStatisticsData | null;
  requestStatsLoading: boolean;
  requestStatsError: string | null;
  fetchRequestStatistics: () => Promise<void>;
}

const ExpenseRequestStatistics: React.FC<ExpenseRequestStatisticsProps> = ({
  requestStats,
  requestStatsLoading,
  requestStatsError,
  fetchRequestStatistics,
}) => {
  // Calculate total requests count (pending + approved + rejected)
  const totalRequests = requestStats ? 
    requestStats.pendingCount + requestStats.approvedCount + requestStats.rejectedCount : 0;

  // Transform stat cards to widget items
  const widgets: WidgetItem[] = requestStats ? [
    {
      key: 'pending-requests',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.pending_requests_btn', 'Pending Requests'),
      value: requestStats.pendingCount,
      color: '#faad14',
      prefix: <ClockCircleOutlined />,
      span: { xs: 24, sm: 12, md: 6, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_requests_tab.waiting_for_approval', 'Waiting for approval')
    },
    {
      key: 'pending-amount',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_plans_tab.pending_amount', 'Pending Amount'),
      value: requestStats.pendingAmount ? formatCurrency(requestStats.pendingAmount, 'EUR') : 'EUR 0,00',
      color: '#faad14',
      prefix: <DollarOutlined />,
      valueIsString: true,
      span: { xs: 24, sm: 12, md: 6, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_requests_tab.total_pending_funds', 'Total pending funds')
    },
    {
      key: 'total-requests',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_requests_tab.total_requests_submitted', 'Total Requests (Submitted)'),
      value: totalRequests,
      color: '#1890ff',
      prefix: <FileOutlined />,
      span: { xs: 24, sm: 12, md: 6, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_requests_tab.all_submitted_requests', 'All submitted requests')
    },
    {
      key: 'total-submitted-amount',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_requests_tab.total_submitted_amount', 'Total Submitted Amount'),
      value: requestStats.totalSubmittedAmount ? formatCurrency(requestStats.totalSubmittedAmount, 'EUR') : 'EUR 0,00',
      color: '#3f8600',
      prefix: <DollarOutlined />,
      valueIsString: true,
      span: { xs: 24, sm: 12, md: 6, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_requests_tab.all_expense_requests', 'All expense requests')
    }
  ] : [];

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={requestStatsLoading}
      error={requestStatsError ? 'Failed to load statistics' : undefined}
      onRetry={fetchRequestStatistics}
      skeletonCount={4}
      emptyText="No expense request statistics available."
      cardBackground="transparent"
      className="gba:py-0"
    />
  );
};

export default ExpenseRequestStatistics;
