import React, { useEffect, useMemo, useState } from "react";
import { AdvancePaymentStatistics as AdvancePaymentStatisticsData } from "../../../hooks/useMainViewAdvancePayments";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { Spinner } from "@newwork/nw-design-system";
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

  // Transform the stats data into widgets format (memoized to avoid infinite effect loops)
  const widgets: WidgetItem[] = useMemo(() => {
    if (!advancePaymentStats) return [];
    return [
      {
        key: "total-advance-payment",
        title: getTranslationFromI18nKeyAndLabel(
          "lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments",
          "Total Advance Payment",
        ),
        value: advancePaymentStats.sumAmount
          ? formatCurrencyDisplay(advancePaymentStats.sumAmount, primaryCurrency)
          : formatCurrencyDisplay(0, primaryCurrency),
        color: "var(--nw-success)",
        valueIsString: true,
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
        color: "var(--nw-destructive)",
        valueIsString: true,
        description: getTranslationFromI18nKeyAndLabel(
          "lowcoder:team_expenses_page.expense_plans_tab.awaiting_approval",
          "Awaiting approval",
        ),
      },
    ];
  }, [advancePaymentStats, primaryCurrency]);

  const [lastWidgets, setLastWidgets] = useState<WidgetItem[] | null>(null);
  useEffect(() => {
    if (widgets && widgets.length > 0) setLastWidgets(widgets);
  }, [widgets]);
  const renderWidgets = widgets.length > 0 ? widgets : lastWidgets || [];

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  useEffect(() => {
    if (!statsLoading) setHasLoadedOnce(true);
  }, [statsLoading]);

  return (
    <div className="gba:relative gba:min-h-[160px]">
      {(!hasLoadedOnce || statsLoading) && (
        <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center">
          <Spinner />
        </div>
      )}
      <div className={!hasLoadedOnce || statsLoading ? "gba:opacity-0" : "gba:opacity-100"}>
        <WidgetGroup
          widgets={renderWidgets}
          isLoading={false}
          error={hasLoadedOnce && statsError ? "Failed to load statistics" : undefined}
          onRetry={fetchAdvancePaymentStatistics}
          skeletonCount={4}
          emptyText={hasLoadedOnce
            ? getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.advance_payments_tab.no_statistics",
                "No advance payment statistics available."
              )
            : undefined}
          cardBackground="transparent"
          className="gba:py-0"
        />
      </div>
    </div>
  );
};

export default AdvancePaymentStatistics;
