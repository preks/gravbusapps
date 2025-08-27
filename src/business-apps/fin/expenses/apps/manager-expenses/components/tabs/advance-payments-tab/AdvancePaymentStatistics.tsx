import React from 'react';
import { AdvancePaymentStatistics as AdvancePaymentStatisticsData } from '../../../hooks/useMainViewAdvancePayments';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useCurrencyStore } from '../../../store/useCurrencyStore';
import { formatCurrency } from '../../../utils/currencyUtils';

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
  // Use the global currency store
  const { primaryCurrency } = useCurrencyStore();
  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = advancePaymentStats ? [
    {
      key: 'total-count',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments', 'Total Advance Payments'),
      value: formatCurrency(advancePaymentStats.totalCount, primaryCurrency),
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
      error={statsError ? 'Failed to load statistics' : undefined}
      onRetry={fetchAdvancePaymentStatistics}
      skeletonCount={4}
      emptyText="No advance payment statistics available."
      cardBackground="transparent"
      className="gba:py-0"
    />
  );
};

export default AdvancePaymentStatistics;
