import React from 'react';
import { EuroCircleOutlined } from '@ant-design/icons';
import { AdvancePaymentStatistics as AdvancePaymentStatisticsData } from '../../../hooks/useMainViewAdvancePayments';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { formatNumberFunction } from '@/common/utils/windowUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface AdvancePaymentStatisticsProps {
  advancePaymentStats: AdvancePaymentStatisticsData | null;
  statsLoading: boolean;
  statsError: Error | null;
  fetchAdvancePaymentStatistics: () => Promise<void>;
}

const AdvancePaymentStatistics: React.FC<AdvancePaymentStatisticsProps> = ({
  advancePaymentStats,
  statsLoading,
  statsError,
  fetchAdvancePaymentStatistics,
}) => {
  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = advancePaymentStats ? [
    {
      key: 'total-count',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments', 'Total Advance Payments'),
      value: formatNumberFunction(advancePaymentStats.totalCount.toString(), "0.00[,]00"),
      prefix: <EuroCircleOutlined />,
      color: '#3f8600',
      valueIsString: true, // Mark as pre-formatted string
      span: { xs: 24, sm: 12, md: 8, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments', 'All advance payments')
    }
  ] : [];

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={statsLoading}
      error={statsError}
      onRetry={fetchAdvancePaymentStatistics}
      skeletonCount={1}
      emptyText="No advance payment statistics available."
    />
  );
};

export default AdvancePaymentStatistics;
