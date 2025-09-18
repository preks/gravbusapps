import React from "react";
import { AdvancePaymentStatistics as AdvancePaymentStatisticsData } from "../../../hooks/useMainViewAdvancePayments";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { useCurrencyStore } from "../../../store/useCurrencyStore";
import { formatCurrencyDisplay } from "../../../../personal-expenses/utils";

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
  // Use the global currency store - use primary currency (user's selection) for both cards
  const { primaryCurrency } = useCurrencyStore();

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = advancePaymentStats
    ? [
        {
          key: "total-advance-payment",
          title: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments",
            "Total Advance Payment",
          ),
          value: advancePaymentStats.sumAmount
            ? formatCurrencyDisplay(advancePaymentStats.sumAmount, primaryCurrency)
            : formatCurrencyDisplay(0, primaryCurrency),
          color: "#52c41a",
          valueIsString: true, // Mark as pre-formatted string
          span: { xs: 24, sm: 12, lg: 6 },
          description: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments",
            "Total Advance Payments",
          ),
        },
        {
          key: "pending-amount",
          title: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_plans_tab.pending_amount",
            "Pending Amount",
          ),
          value: advancePaymentStats.pendingAmount
            ? formatCurrencyDisplay(advancePaymentStats.pendingAmount, primaryCurrency)
            : formatCurrencyDisplay(0, primaryCurrency),
          color: "#ff4d4f",
          valueIsString: true, // Mark as pre-formatted string
          span: { xs: 24, sm: 12, lg: 6 },
          description: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_plans_tab.awaiting_approval",
            "Awaiting approval",
          ),
        },
      ]
    : [];

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={statsLoading}
      error={statsError ? "Failed to load statistics" : undefined}
      onRetry={fetchAdvancePaymentStatistics}
      skeletonCount={4}
      emptyText="No advance payment statistics available."
      cardBackground="transparent"
      className="gba:py-0"
    />
  );
};

export default AdvancePaymentStatistics;
