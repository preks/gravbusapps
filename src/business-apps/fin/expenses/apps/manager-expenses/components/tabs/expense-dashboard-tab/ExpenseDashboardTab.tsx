import React from "react";
import { Card, CardContent, CardHeader, CardTitle, IconAvatar } from "@newwork/nw-design-system";
import {
  PiListChecks,
  PiChartLineUp,
  PiFileText,
  PiCalendar,
  PiClockAfternoon,
} from "react-icons/pi";
import { useCurrencyStore } from "../../../store/useCurrencyStore";
import { useCurrencyFilter } from "../../../hooks/useCurrencyFilter";
import { useGetExpenseDashboard } from "../../../hooks/useGetExpenseDashboard";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import CurrencyFilter from "../../../components/currency-filter";

import ExpenseTrendsChart from "./components/ExpenseTrendsChart";
import {
  getTranslationFromI18nKeyAndLabel,
  getCurrentActiveUserLocale,
} from "@/common/utils/windowUtils";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { formatCurrencyDisplay } from "../../../../personal-expenses/utils";
import { getExpenseRequestStatusDisplay } from "../../../utils";

export interface ExpenseDashboardTabProps extends BusinessAppContextProps {
  onNavigateToApprovals?: () => void;
  onNavigateToReports?: () => void;
  onNavigateToAnalytics?: () => void;
  moduleColor?: string;
}

// Define a type for recent requests if not already available from the hook
interface RecentRequestItem {
  id: string;
  title: string;
  totalAmount: number | string;
  requestDate: string;
  status: string;
  employeeName: string;
  currency?: string; // Add currency field for display purposes
}

const getErrorMessage = (err: unknown): string => {
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  if (typeof err === "string") {
    return err;
  }
  return "An unknown error occurred";
};

const ExpenseDashboardTab: React.FC<ExpenseDashboardTabProps> = (props) => {
  const { moduleColor } = props;
  // Get manager ID from props
  const managerId = props.userInfo?.employeeDetails?.employeeId || props.userInfo?.id || "";
  const accessToken = props.accessToken || "";

  // Use the global currency store
  const { primaryCurrency } = useCurrencyStore();

  // Use the currency filter hook with dynamic data
  const { currencyFilter, setCurrencyFilter } = useCurrencyFilter(accessToken, managerId);

  // Get dashboard data
  const { dashboardData, isLoading, error } = useGetExpenseDashboard(props, currencyFilter);

  // Use the selected currency filter, or fall back to primary currency
  const displayCurrency = currencyFilter || primaryCurrency;

  // For chart display, use the same currency as display
  const chartCurrency = displayCurrency;

  // Get user locale for date formatting
  const userLocale = getCurrentActiveUserLocale();

  // Quick actions data
  const quickActions = [
    {
      key: "approvals",
      title: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.review_approvals",
        "Review Approvals",
      ),
      description: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.review_pending_expense_approvals",
        "Review pending expense approvals.",
      ),
      icon: PiListChecks,
      onClick: () => props.onNavigateToApprovals?.(),
      testId: "review-approvals-action",
      iconColor: "gba:text-blue-500",
    },
    {
      key: "analysis",
      title: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.team_spending_analysis",
        "Team Spending Analysis",
      ),
      description: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.view_spending_trends_and_reports",
        "View spending trends and reports.",
      ),
      icon: PiChartLineUp,
      onClick: () => props.onNavigateToAnalytics?.(),
      testId: "team-spending-analysis-action",
      iconColor: "gba:text-green-500",
    },
    {
      key: "reports",
      title: getTranslationFromI18nKeyAndLabel(
        "lowcoder:expense_request_list.modal_list_or_flow_button.absence_same_location_btn",
        "Expense Reports",
      ),
      description: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.generate_or_view_team_expense_reports",
        "Generate or view team expense reports.",
      ),
      icon: PiFileText,
      onClick: () => props.onNavigateToReports?.(),
      testId: "expense-reports-action",
      iconColor: "gba:text-purple-500",
    },
  ];

  // Transform dashboard data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: "team-members",
      title: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.team_members",
        "Team Members",
      ),
      value: dashboardData?.teamMembersCount ?? 0,
      prefix: <PiListChecks />,
      color: "#1677ff",
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.total_team_members",
        "Total team members",
      ),
    },
    {
      key: "pending-approvals",
      title: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.pending_approvals",
        "Pending Approvals",
      ),
      value: dashboardData?.pendingApprovalsCount ?? 0,
      prefix: <PiClockAfternoon />,
      color: "#faad14",
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.expense_plans_tab.requires_action",
        "Requires action",
      ),
    },
    {
      key: "monthly-expenses",
      title: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.monthly_expenses",
        "Monthly Expenses",
      ),
      value: dashboardData?.monthlyExpensesAmount
        ? formatCurrencyDisplay(dashboardData.monthlyExpensesAmount, displayCurrency)
        : formatCurrencyDisplay(0, displayCurrency),
      prefix: (
        <span className="gba:font-medium" data-testid="dashboard-monthly-expenses-currency-code">
          {displayCurrency}
        </span>
      ),
      color: "#3f8600",
      valueIsString: true,
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.current_month",
        "Current month",
      ),
    },
    {
      key: "expense-categories",
      title: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.expense_categories",
        "Expense Categories",
      ),
      value: dashboardData?.expenseCategoriesCount ?? 0,
      prefix: <PiCalendar />,
      color: "#722ed1",
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.categories_used",
        "Categories used",
      ),
    },
  ];

  return (
    <div className="gba:h-full gba:flex gba:flex-col">
      {/* Currency Filter */}
      <div
        className="gba:flex gba:justify-start gba:mb-4 gba:px-6"
        data-testid="expense-dashboard-currency-filter-container"
      >
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:font-medium">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:team_expenses_page.currency_filter",
              "Currency:",
            )}
          </span>
          <CurrencyFilter
            value={currencyFilter}
            onChange={(value) => setCurrencyFilter(value || primaryCurrency)}
            isLoading={isLoading}
            accessToken={accessToken}
            managerId={managerId}
            data-testid="expense-dashboard-currency-select"
          />
        </div>
      </div>
      {/* Statistics Cards using WidgetGroup */}
      <div className="gba:mb-6">
        <WidgetGroup
          widgets={widgets}
          isLoading={isLoading}
          error={error ? getErrorMessage(error) : null}
          onRetry={() => window.location.reload()}
          skeletonCount={4}
          emptyText={getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.dashboard_tab.no_statistics_available",
            "No dashboard statistics available.",
          )}
          data-testid="expense-dashboard-statistics"
        />
      </div>

      {/* Main Content Area */}
      <div className="gba:flex-1 gba:space-y-6 gba:px-6">
        {/* Quick Actions Section */}
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:team_expenses_page.dashboard_tab.quick_actions",
              "Quick Actions",
            )}
          </h3>
          <div className="gba:grid gba:grid-cols-1 sm:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
            {quickActions.map((action) => {
              return (
                <Card
                  key={action.key}
                  className="gba:cursor-pointer gba:transition-all gba:hover:shadow-md"
                  onClick={action.onClick}
                  data-testid={`quick-action-${action.key}`}
                >
                  <CardContent className="gba:p-6">
                    <div className="gba:flex gba:items-center gba:mb-3">
                      <IconAvatar
                        icon={action.icon as any}
                        className={`gba:text-2xl ${action.iconColor} gba:mr-3`}
                        variant="default"
                        size="md"
                        data-testid={`quick-action-icon-${action.key}`}
                      />
                      <h4 className="gba:text-base gba:font-semibold gba:m-0">{action.title}</h4>
                    </div>
                    <p className="gba:text-sm gba:text-muted-foreground gba:m-0">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Requests and Budget Status */}
        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
          {/* Recent Expense Requests */}
          <Card data-testid="recent-expense-requests-card">
            <CardHeader>
              <CardTitle>
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:team_expenses_page.dashboard_tab.recent_expense_requests",
                  "Recent Expense Requests",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.recentRequests && dashboardData.recentRequests.length > 0 ? (
                <div className="gba:space-y-4">
                  {dashboardData.recentRequests.map((request: RecentRequestItem) => (
                    <div
                      key={request.id}
                      className="gba:flex gba:justify-between gba:items-start gba:pb-4 gba:border-b gba:border-border gba:last:border-0"
                    >
                      <div className="gba:flex-1">
                        <p className="gba:font-medium gba:text-sm gba:mb-1">{request.title}</p>
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                          <p className="gba:text-sm gba:text-muted-foreground">
                            {request.employeeName}
                          </p>
                          <span className="gba:text-xs gba:px-2 gba:py-1 gba:rounded-full gba:bg-secondary gba:text-secondary-foreground">
                            {getExpenseRequestStatusDisplay(request.status).label}
                          </span>
                        </div>
                      </div>
                      <div className="gba:text-right gba:ml-4">
                        <p className="gba:font-medium gba:text-sm">
                          {typeof request.totalAmount === "number"
                            ? formatCurrencyDisplay(
                                request.totalAmount,
                                request.currency || displayCurrency,
                              )
                            : formatCurrencyDisplay(
                                request.totalAmount || 0,
                                request.currency || displayCurrency,
                              )}
                        </p>
                        <p className="gba:text-sm gba:text-muted-foreground">
                          {new Date(request.requestDate).toLocaleDateString(userLocale, {
                            month: "2-digit",
                            day: "2-digit",
                            year: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gba:py-8 gba:text-center">
                  <p className="gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel(
                      "lowcoder:team_expenses_page.dashboard_tab.no_recent_expense_requests",
                      "No recent expense requests",
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Budget Status */}
          <Card>
            <CardHeader>
              <CardTitle>
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:team_expenses_page.dashboard_tab.team_budget_status",
                  "Team Budget Status",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.teamBudget ? (
                <div className="gba:space-y-4">
                  <div>
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <p className="gba:text-sm gba:font-medium">
                        {getTranslationFromI18nKeyAndLabel(
                          "lowcoder:team_expenses_page.dashboard_tab.budget_used",
                          "Budget Used",
                        )}
                      </p>
                      <p className="gba:text-2xl gba:font-bold">
                        {dashboardData.teamBudget.total > 0
                          ? `${((dashboardData.teamBudget.used / dashboardData.teamBudget.total) * 100).toFixed(1)}%`
                          : "0%"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="gba:flex gba:justify-between gba:mb-2 gba:text-sm">
                      <span>
                        {getTranslationFromI18nKeyAndLabel(
                          "lowcoder:absence_hub.used_colon",
                          "Used:",
                        )}{" "}
                        {formatCurrencyDisplay(
                          dashboardData.teamBudget?.used || 0,
                          displayCurrency,
                        )}
                      </span>
                      <span>
                        {getTranslationFromI18nKeyAndLabel(
                          "lowcoder:absence_hub.total_colon",
                          "Total:",
                        )}{" "}
                        {formatCurrencyDisplay(
                          dashboardData.teamBudget?.total || 0,
                          displayCurrency,
                        )}
                      </span>
                    </div>
                    <div className="gba:w-full gba:bg-secondary gba:rounded-full gba:h-2">
                      <div
                        className="gba:bg-primary gba:h-2 gba:rounded-full gba:transition-all"
                        style={{
                          width: `${
                            dashboardData.teamBudget.total > 0
                              ? Math.min(
                                  (dashboardData.teamBudget.used / dashboardData.teamBudget.total) *
                                    100,
                                  100,
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:team_expenses_page.dashboard_tab.no_budget_data_available",
                    "No budget data available",
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Expense Trends Chart */}
        <div>
          <ExpenseTrendsChart
            data={dashboardData?.monthlyTrends || []}
            title={getTranslationFromI18nKeyAndLabel(
              "lowcoder:team_expenses_page.dashboard_tab.monthly_expense_trends",
              "Monthly Expense Trends",
            )}
            currencyFilter={chartCurrency}
            moduleColor={moduleColor}
          />
        </div>
      </div>

      {/* Modals */}
    </div>
  );
};

export default ExpenseDashboardTab;
