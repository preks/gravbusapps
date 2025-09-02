import React, { useCallback } from "react";
import { ExpenseRequestStatisticsData } from "../../../hooks/useGetExpenseRequests";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { formatCurrency } from "../../../utils/currencyUtils";
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
        const filtersToToggle = [
          "PENDING",
          "APPROVED",
          "VERIFIED",
          "BOOKED",
          "TRANSFERRED",
        ];

        // Check if all filters are currently active
        const allFiltersActive = filtersToToggle.every((filter) =>
          selectedFilters.includes(filter)
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
    [selectedFilters, addFilter, removeFilter]
  );

  const widgets: WidgetItem[] = requestStats
    ? [
        {
          key: "pending-requests",
          title: getTranslationFromI18nKeyAndLabel(
            "lowcoder:absence_management_hub_manager.pending_requests_btn",
            "Pending Requests"
          ),
          value: requestStats.pendingCount,
          color: selectedFilters.includes("PENDING") ? "#1890ff" : "#faad14",
          span: { xs: 24, sm: 12, md: 6, lg: 6 },
          description: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.waiting_for_approval",
            "Waiting for approval"
          ),
          active: selectedFilters.includes("PENDING"),
        },
        {
          key: "pending-amount",
          title: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.pending_amount",
            "Pending Amount"
          ),
          value: formatCurrency(
            requestStats.pendingAmount || 0,
            displayCurrency
          ),
          color: "#52c41a",
          span: { xs: 24, sm: 12, md: 6, lg: 6 },
          description: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.pending_amount_description",
            "Total Pending Funds"
          ),
          valueIsString: true,
          // This card shows amount, not clickable for filtering
        },
        {
          key: "total-requests-submitted",
          title: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.total_requests_submitted",
            "Total Requests Submitted"
          ),
          value: requestStats.totalRequestsSubmitted,
          color: (() => {
            const multiFilters = [
              "PENDING",
              "APPROVED",
              "VERIFIED",
              "BOOKED",
              "TRANSFERRED",
            ];
            const allActive = multiFilters.every((filter) =>
              selectedFilters.includes(filter)
            );
            return allActive ? "#1677ff" : "#1890ff";
          })(),
          span: { xs: 24, sm: 12, md: 6, lg: 6 },
          description: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.total_requests_submitted_description",
            "All Submitted Requests"
          ),
          active: (() => {
            const multiFilters = [
              "PENDING",
              "APPROVED",
              "VERIFIED",
              "BOOKED",
              "TRANSFERRED",
            ];
            return multiFilters.every((filter) =>
              selectedFilters.includes(filter)
            );
          })(),
        },
        {
          key: "total-submitted-amount",
          title: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.total_submitted_amount",
            "Total Submitted Amount"
          ),
          value: formatCurrency(
            requestStats.totalSubmittedAmount || 0,
            displayCurrency
          ),
          color: selectedFilters.length === 0 ? "#1677ff" : "#722ed1",
          span: { xs: 24, sm: 12, md: 6, lg: 6 },
          description: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.total_submitted_amount_description",
            "All Expense Requests"
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
        case "total-submitted-amount":
          // Clear all filters when clicking this card
          selectedFilters.forEach((filter) => removeFilter(filter));
          break;
        default:
          break;
      }
    },
    [handleCardClick, selectedFilters, removeFilter]
  );

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={requestStatsLoading}
      error={requestStatsError ? "Failed to load statistics" : undefined}
      onRetry={fetchRequestStatistics}
      onWidgetClick={handleWidgetClick}
      skeletonCount={4}
      emptyText="No expense request statistics available."
      cardBackground="transparent"
      className="gba:py-0"
    />
  );
};

export default ExpenseRequestStatistics;
