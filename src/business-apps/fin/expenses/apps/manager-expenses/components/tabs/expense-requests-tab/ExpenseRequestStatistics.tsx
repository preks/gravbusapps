import React, { useCallback, useEffect, useState } from "react";
import { ExpenseRequestStatisticsData } from "../../../hooks/useGetExpenseRequests";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { Spinner } from "@newwork/nw-design-system";
import { formatCurrencyDisplay } from "../../../../personal-expenses/utils";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

interface ExpenseRequestStatisticsProps {
  requestStats: ExpenseRequestStatisticsData | null;
  requestStatsLoading: boolean;
  requestStatsError: string | null;
  fetchRequestStatistics: () => Promise<void>;
  currencyFilter?: string | null;
  addFilter: (filter: string) => void;
  removeFilter: (filter: string) => void;
  selectedFilters: string[];
}

const ExpenseRequestStatistics: React.FC<ExpenseRequestStatisticsProps> = ({
  requestStats,
  requestStatsLoading,
  requestStatsError,
  fetchRequestStatistics,
  currencyFilter,
  addFilter,
  removeFilter,
  selectedFilters,
}) => {
  const displayCurrency = currencyFilter || "EUR";

  // Handle card click functionality with proper filtering logic
  const handleCardClick = useCallback(
    (filterKey: string, isMultiFilter: boolean = false) => {
      if (isMultiFilter) {
        // For multi-filter cards (like "Total Requests Submitted")
        const filtersToToggle = ["PENDING", "APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED"];

        // Check if all filters are currently active
        const allFiltersActive = filtersToToggle.every((filter) =>
          selectedFilters.includes(filter),
        );

        if (allFiltersActive) {
          filtersToToggle.forEach((filter) => removeFilter(filter));
        } else {
          selectedFilters.forEach((filter) => removeFilter(filter));
          filtersToToggle.forEach((filter) => addFilter(filter));
        }
      } else {
        if (selectedFilters.includes(filterKey)) {
          removeFilter(filterKey);
        } else {
          selectedFilters.forEach((filter) => removeFilter(filter));
          addFilter(filterKey);
        }
      }
    },
    [selectedFilters, addFilter, removeFilter],
  );

  const widgets: WidgetItem[] = requestStats
    ? [
        {
          key: "pending-requests",
          title: getTranslationFromI18nKeyAndLabel(
            "lowcoder:absence_management_hub_manager.pending_requests_btn",
            "Pending Requests",
          ),
          value: requestStats.pendingCount,
          color: selectedFilters.includes("PENDING") ? "var(--nw-color-primary-500)" : "var(--nw-color-warning-500)",
          
          description: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.waiting_for_approval",
            "Waiting for approval",
          ),
          active: selectedFilters.includes("PENDING"),
          onClick: () => handleCardClick("PENDING"),
        },
        {
          key: "pending-amount",
          title: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_plans_tab.pending_amount",
            "Pending Amount",
          ),
          value: formatCurrencyDisplay(requestStats.pendingAmount || 0, displayCurrency),
          color: "var(--nw-color-success-500)",
          
          description: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.total_pending_funds",
            "Total Pending Reimbursement",
          ),
          valueIsString: true,
          // This card shows amount, not clickable for filtering
        },
        {
          key: "total-requests-submitted",
          title: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.total_requests_submitted",
            "Total Requests Submitted",
          ),
          value: requestStats.totalRequestsSubmitted,
          color: (() => {
            const multiFilters = ["PENDING", "APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED"];
            const allActive = multiFilters.every((filter) => selectedFilters.includes(filter));
            return allActive ? "var(--nw-color-primary-600)" : "var(--nw-color-primary-500)";
          })(),
          
          description: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.all_submitted_requests",
            "All Submitted Requests",
          ),
          active: (() => {
            const multiFilters = ["PENDING", "APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED"];
            return multiFilters.every((filter) => selectedFilters.includes(filter));
          })(),
          onClick: () => handleCardClick("", true), // Use multi-filter mode
        },
        {
          key: "total-submitted-amount",
          title: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.total_submitted_amount",
            "Total Submitted Amount",
          ),
          value: formatCurrencyDisplay(requestStats.totalSubmittedAmount || 0, displayCurrency),
          color: selectedFilters.length === 0 ? "var(--nw-color-primary-600)" : "var(--nw-color-accent-500)",
          
          description: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.all_expense_requests",
            "All Expense Requests",
          ),
          valueIsString: true,
          active: selectedFilters.length === 0,
        },
      ]
    : [];

  // Handle widget clicks from WidgetGroup
  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      switch (widgetKey) {
        case "pending-requests":
          handleCardClick("PENDING");
          break;
        case "total-requests-submitted":
          handleCardClick("", true); // Use multi-filter mode
          break;

        default:
          break;
      }
    },
    [handleCardClick, selectedFilters, removeFilter],
  );

  // Preserve last widgets to prevent flicker
  const [lastWidgets, setLastWidgets] = useState<WidgetItem[] | null>(null);
  useEffect(() => {
    if (widgets && widgets.length > 0) setLastWidgets(widgets);
  }, [widgets]);
  const renderWidgets = widgets.length > 0 ? widgets : lastWidgets || [];

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  useEffect(() => {
    if (!requestStatsLoading) setHasLoadedOnce(true);
  }, [requestStatsLoading]);

  return (
    <div className="gba:relative gba:min-h-[160px]">
      {(!hasLoadedOnce || requestStatsLoading) && (
        <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center">
          <Spinner />
        </div>
      )}
      <div className={!hasLoadedOnce || requestStatsLoading ? "gba:opacity-0" : "gba:opacity-100"}>
        <WidgetGroup
          widgets={renderWidgets}
          isLoading={false}
          error={hasLoadedOnce && requestStatsError ? "Failed to load statistics" : undefined}
          onRetry={fetchRequestStatistics}
          onWidgetClick={handleWidgetClick}
          skeletonCount={4}
          emptyText={hasLoadedOnce ? getTranslationFromI18nKeyAndLabel(
            "lowcoder:personal_expenses.no_expense_request_statistics_available",
            "No expense request statistics available.",
          ) : undefined}
          cardBackground="transparent"
          className="gba:py-0"
        />
      </div>
    </div>
  );
};

export default ExpenseRequestStatistics;
