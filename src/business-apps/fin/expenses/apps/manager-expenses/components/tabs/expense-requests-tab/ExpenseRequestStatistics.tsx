import React from "react";
import { Clock, FileText, CurrencyDollar } from "@phosphor-icons/react";
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
}

const ExpenseRequestStatistics: React.FC<ExpenseRequestStatisticsProps> = ({
  requestStats,
  requestStatsLoading,
  requestStatsError,
  fetchRequestStatistics,
  currencyFilter,
  addFilter,
}) => {
  const displayCurrency = currencyFilter || "EUR";

  const widgets: WidgetItem[] = requestStats
    ? [
        {
          key: "pending-requests",
          title: getTranslationFromI18nKeyAndLabel(
            "lowcoder:absence_management_hub_manager.pending_requests_btn",
            "Pending Requests"
          ),
          value: requestStats.pendingCount,
          color: "#faad14",

          span: { xs: 24, sm: 12, md: 6, lg: 6 },
          description: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.waiting_for_approval",
            "Waiting for approval"
          ),
          onClick: () => {
            addFilter("PENDING");
          },
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
            "lowcoder:team_expenses_page.expense_requests_tab.approved_verified_booked_transferred",
            "Approved, verified, booked, transferred"
          ),
          valueIsString: true,
        },
        {
          key: "total-requests-submitted",
          title: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.total_requests_submitted",
            "Total Requests Submitted"
          ),
          value: requestStats.totalRequestsSubmitted,
          color: "#1890ff",

          span: { xs: 24, sm: 12, md: 6, lg: 6 },
          description: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.all_statuses_except_rejected_discarded_created",
            "All statuses except rejected, discarded, created"
          ),
          onClick: () => {
            // Apply all status filters except rejected, discarded, created
            addFilter("PENDING");
            addFilter("APPROVED");
            addFilter("VERIFIED");
            addFilter("BOOKED");
            addFilter("TRANSFERRED");
          },
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
          color: "#722ed1",

          span: { xs: 24, sm: 12, md: 6, lg: 6 },
          description: getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.expense_requests_tab.all_statuses_except_rejected_discarded_created",
            "All statuses except rejected, discarded, created"
          ),
          valueIsString: true,
        },
      ]
    : [];

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={requestStatsLoading}
      error={requestStatsError ? "Failed to load statistics" : undefined}
      onRetry={fetchRequestStatistics}
      skeletonCount={4}
      emptyText="No expense request statistics available."
      cardBackground="transparent"
      className="gba:py-0"
    />
  );
};

export default ExpenseRequestStatistics;
