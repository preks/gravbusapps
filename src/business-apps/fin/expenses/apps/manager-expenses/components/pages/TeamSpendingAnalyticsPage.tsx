import React, { useMemo, useState, useEffect } from "react";
import { useCurrencyStore } from "../../store/useCurrencyStore";
import { useCurrencyData, standardizeCurrencyRef } from "../../hooks/useCurrencyData";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Spinner,
  Alert,
  AlertDescription,
  PageLayout,
  Input,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Label,
  Separator,
} from "@newwork/nw-design-system";
import { PiArrowLeft, PiMagnifyingGlass } from "react-icons/pi";
import { ChartLineUpIcon } from "@phosphor-icons/react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useTeamSpendingAnalytics, DateRangeOption } from "../../hooks/useTeamSpendingAnalytics";
import { LineChartComponent, PieChartComponent, BarChartComponent } from "../modals/charts";
import StatusLegend from "../StatusLegend";
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from "@/common/utils/windowUtils";
// removed unused formatCurrencyDisplay
import {
  getExpenseRequestStatusDisplay,
  getAdvancePaymentStatusDisplay,
  getExpensePlanStatusDisplay,
} from "../../utils";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import CurrencyFilter from "../../components/currency-filter";

interface TeamSpendingAnalyticsPageProps extends BusinessAppContextProps {
  onNavigateBack: () => void;
}

// Status type → hex color mapping for charts (matching design system pill colors)
const STATUS_COLOR_MAP: Record<string, string> = {
  // Base design system colors
  success: '#10b981',      // green (gba:bg-success)
  warning: '#f59e0b',      // amber (gba:bg-warning)
  info: '#3b82f6',         // blue (gba:bg-info)
  destructive: '#ef4444',  // red (gba:bg-destructive)
  offline: '#6b7280',      // gray (gba:bg-offline)
  // Domain-specific aliases
  draft: '#9ca3af',        // gray-400 (gba:bg-muted)
  completed: '#10b981',    // green (same as success)
  waiting: '#3b82f6',      // blue (same as info)
  task: '#f59e0b',         // amber (same as warning)
  error: '#ef4444',        // red (same as destructive)
  preparing: '#9ca3af',    // gray-400 (same as draft)
};

const resolveStatusColor = (type: string | undefined, fallbackColor: string): string => {
  const key = String(type || 'draft').toLowerCase();
  return STATUS_COLOR_MAP[key] || fallbackColor;
};

const TeamSpendingAnalyticsPage: React.FC<TeamSpendingAnalyticsPageProps> = ({
  onNavigateBack,
  accessToken,
  userInfo,
}) => {
  // colors resolved within StatusLegend component
  // Use the global currency store
  const { primaryCurrency } = useCurrencyStore();
  const [activeTab, setActiveTab] = React.useState<string>("expense-items");

  // Use the currency data hook to get dynamic currency information
  const {
    availableCurrencies,
    defaultCurrency,
    isLoading: isCurrencyLoading,
  } = useCurrencyData(
    accessToken,
    userInfo?.employeeDetails?.employeeId || "00000000-0000-0000-0000-000000000000",
  );

  // Initialize currency filter with null, will be set after data is loaded
  const [currencyFilter, setCurrencyFilter] = useState<string | null>(null);

  // Create a standardized currency reference for GraphQL queries
  const standardizedCurrencyRef = useMemo(() => {
    return currencyFilter ? standardizeCurrencyRef(currencyFilter) : null;
  }, [currencyFilter]);

  // Use the team spending analytics hook
  const {
    isLoading,
    error,
    data,
    dateRange,
    setDateRange,
    locationFilters,
    toggleLocationFilter,
    searchTerm,
    setSearchTerm,
    departmentFilters,
    toggleDepartmentFilter,
    departmentSearchTerm,
    setDepartmentSearchTerm,
  } = useTeamSpendingAnalytics(
    accessToken,
    userInfo?.employeeDetails?.employeeId || "00000000-0000-0000-0000-000000000000",
    standardizedCurrencyRef, // Use standardized currency reference instead of raw currencyFilter
  );

  // Use the expense group catalog hook to get category names
  // catalog names are resolved in hook; no need to load here

  // Set the default currency when data is loaded
  useEffect(() => {
    if (!currencyFilter && defaultCurrency) {
      setCurrencyFilter(defaultCurrency);
    }
  }, [defaultCurrency, currencyFilter]);

  // Transform expense items by category data to use actual category names
  const expenseItemsByCategoryWithNames = useMemo(() => {
    if (!data?.expenseItemsByCategory) return [];
    // Names are now computed in the hook using catalog display
    return data.expenseItemsByCategory as any;
  }, [data?.expenseItemsByCategory]);

  // Handle date range change
  const handleDateRangeChange = (value: DateRangeOption) => {
    setDateRange(value);
  };

  // Create widgets for summary statistics (force two decimals in KPI formatting)
  const kpiCurrencyCode = currencyFilter || primaryCurrency;
  const formatKpiAmount = (amount: number | null | undefined): string => {
    const safe = typeof amount === 'number' ? amount : 0;
    const userLocale = getCurrentActiveUserLocale();
    const formatted = new Intl.NumberFormat(userLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
    const lang = userLocale.split('-')[0].toLowerCase();
    return lang === 'en' ? `${kpiCurrencyCode} ${formatted}` : `${formatted} ${kpiCurrencyCode}`;
  };

  // Create widgets for summary statistics
  const widgets: WidgetItem[] = [
    {
      key: "total-expense-items",
      title: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.total_expense_items",
        "Total Expense Items",
      ),
      value: formatKpiAmount(data?.totalExpenseAmount),
      color: "var(--nw-color-primary-500)",
      valueIsString: true,
      description: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.individual_expense_transactions",
        "Individual expense transactions",
      ),
    },
    {
      key: "total-expense-requests",
      title: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.total_expense_requests",
        "Total Expense Requests",
      ),
      value: formatKpiAmount(data?.totalRequestAmount),
      color: "var(--nw-color-success-500)",
      valueIsString: true,
      description: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.submitted_expense_requests",
        "Submitted expense requests",
      ),
    },
    {
      key: "total-expense-plans",
      title: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.total_expense_plans",
        "Total Expense Plans",
      ),
      value: formatKpiAmount(data?.totalPlanAmount),
      color: "var(--nw-color-accent-500)",
      valueIsString: true,
      description: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.planned_expense_budgets",
        "Planned expense budgets",
      ),
    },
    {
      key: "total-advance-payments",
      title: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments",
        "Total Advance Payments",
      ),
      value: formatKpiAmount(data?.totalAdvanceAmount),
      color: "var(--nw-color-warning-500)",
      valueIsString: true,
      description: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.advance_payments_to_employees",
        "Advance payments to employees",
      ),
    },
  ];

  const renderExpenseItemsTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.monthly_expense_items",
                "Monthly Expense Items",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={data?.expenseItemsByMonth || []}
              title=""
              lineColor="#8884d8"
              currency={currencyFilter || primaryCurrency}
            />
          </CardContent>
        </Card>
      </div>

      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.expense_items_by_status",
                "Expense Items by Status",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={
              data?.expenseItemsByStatus.map((item) => ({
                name: getExpenseRequestStatusDisplay(item.status).label,
                value: item.count,
                status: item.status,
              })) || []
              }
              title=""
              barColor="#8884d8"
              valueType="count"
              countLabel={getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.items",
                "items",
              )}
            getColor={(entry) => {
              const code = entry.status || entry.name;
              const config = getExpenseRequestStatusDisplay(code);
              const type = config?.type || 'draft';
              return resolveStatusColor(type, '#8884d8');
            }}
            />
            <StatusLegend id="expense-items-by-status" />
          </CardContent>
        </Card>

        {/* Move category chart under the status chart and make it full width on large screens */}
        <div className="lg:gba:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:team_expenses_page.dashboard_tab.expense_items_by_category",
                  "Expense Items by Category",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PieChartComponent
                data={expenseItemsByCategoryWithNames}
                title=""
                currency={currencyFilter || primaryCurrency}
                colors={[
                  "#8884d8",
                  "#82ca9d",
                  "#ffc658",
                  "#ff7300",
                  "#8dd1e1",
                  "#d084d0"
                ]}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.summary_statistics",
                "Summary Statistics",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div className="gba:text-3xl gba:font-bold gba:text-primary">
                  {data?.expenseItemsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:team_expenses_page.dashboard_tab.total_expense_items",
                    "Total Items",
                  )}
                </div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div className="gba:text-2xl gba:font-bold" style={{ color: 'var(--nw-color-primary-500)' }}>
                  {formatKpiAmount(Number((data?.totalExpenseAmount ?? 0).toFixed?.(2) ?? data?.totalExpenseAmount ?? 0))}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:expense_request_list.expense_plan_table.total_amount",
                    "Total Amount",
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderExpenseRequestsTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.monthly_expense_requests",
                "Monthly Expense Requests",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={data?.expenseRequestsByMonth || []}
              title=""
              lineColor="#82ca9d"
              currency={currencyFilter || primaryCurrency}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.expense_requests_by_status",
                "Expense Requests by Status",
              )}{" "}
              ({getTranslationFromI18nKeyAndLabel(
                "lowcoder:common.counts",
                "Counts",
              )})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={
              data?.expenseRequestsByStatus.map((item) => ({
                name: getExpenseRequestStatusDisplay(item.status).label,
                value: item.count,
                status: item.status,
              })) || []
              }
              title=""
              barColor="#82ca9d"
              valueType="count"
              countLabel={getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.requests",
                "Requests",
              )}
            getColor={(entry) => {
              const code = entry.status || entry.name;
              const config = getExpenseRequestStatusDisplay(code);
              const type = config?.type || 'draft';
              return resolveStatusColor(type, '#82ca9d');
            }}
            />
            <StatusLegend id="expense-requests-by-status-counts" />
          </CardContent>
        </Card>
      </div>

      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.expense_requests_by_status",
                "Expense Requests by Status",
              )}{" "}
              ({getTranslationFromI18nKeyAndLabel(
                "lowcoder:common.amounts",
                "Amounts",
              )})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent
              data={
              data?.expenseRequestsByStatus.map((item) => ({
                name: getExpenseRequestStatusDisplay(item.status).label,
                value: (item as any).amount ?? 0,
                status: item.status,
              })) || []
              }
              title=""
              currency={currencyFilter || primaryCurrency}
              colors={[
                "#82ca9d",
                "#8884d8",
                "#ffc658",
                "#ff7300",
                "#8dd1e1"
              ]}
            getColor={(entry) => {
              const code = entry.status || entry.name;
              const config = getExpenseRequestStatusDisplay(code);
              const type = config?.type || 'draft';
              return resolveStatusColor(type, '#82ca9d');
            }}
            />
            <StatusLegend id="expense-requests-by-status-amounts" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.summary_statistics",
                "Summary Statistics",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div className="gba:text-3xl gba:font-bold gba:text-primary">
                  {data?.expenseRequestsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:team_expenses_page.dashboard_tab.total_expense_requests",
                    "Total Requests",
                  )}
                </div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div className="gba:text-2xl gba:font-bold" style={{ color: 'var(--nw-color-success-500)' }}>
                  {formatKpiAmount(Number((data?.totalRequestAmount ?? 0).toFixed?.(2) ?? data?.totalRequestAmount ?? 0))}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:team_expenses_page.dashboard_tab.total_amount",
                    "Total Amount",
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderExpensePlansTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.monthly_expense_plans",
                "Monthly Expense Plans",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={data?.expensePlansByMonth || []}
              title=""
              lineColor="#ffc658"
              currency={currencyFilter || primaryCurrency}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.expense_plans_by_status",
                "Expense Plans by Status",
              )} {`(${getTranslationFromI18nKeyAndLabel(
                "lowcoder:common.counts",
                "Counts",
              )})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={
              data?.expensePlansByStatus.map((item) => ({
                name: getExpensePlanStatusDisplay(item.status).label,
                value: item.count,
                status: item.status,
              })) || []
              }
              title=""
              barColor="#ffc658"
              valueType="count"
              countLabel={getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.plans",
                "Plans",
              )}
            getColor={(entry) => {
              const code = entry.status || entry.name;
              const config = getExpensePlanStatusDisplay(code);
              const type = config?.type || 'draft';
              return resolveStatusColor(type, '#ffc658');
            }}
            />
            <StatusLegend id="expense-plans-by-status-counts" />
          </CardContent>
        </Card>
      </div>

      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.expense_plans_by_status",
                "Expense Plans by Status",
              )} {`(${getTranslationFromI18nKeyAndLabel(
                "lowcoder:common.amounts",
                "Amounts",
              )})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent
              data={
              data?.expensePlansByStatus.map((item) => ({
                name: getExpensePlanStatusDisplay(item.status).label,
                value: (item as any).amount ?? 0,
                status: item.status,
              })) || []
              }
              title=""
              currency={currencyFilter || primaryCurrency}
              colors={[
                "#ffc658",
                "#82ca9d",
                "#8884d8",
                "#ff7300",
                "#8dd1e1"
              ]}
            getColor={(entry) => {
              const code = entry.status || entry.name;
              const config = getExpensePlanStatusDisplay(code);
              const type = config?.type || 'draft';
              return resolveStatusColor(type, '#ffc658');
            }}
            />
            <StatusLegend id="expense-plans-by-status-amounts" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.summary_statistics",
                "Summary Statistics",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div className="gba:text-3xl gba:font-bold gba:text-primary">
                  {data?.expensePlansByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:team_expenses_page.dashboard_tab.total_expense_plans",
                    "Total Plans",
                  )}
                </div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div className="gba:text-2xl gba:font-bold" style={{ color: 'var(--nw-color-accent-500)' }}>
                  {formatKpiAmount(Number((data?.totalPlanAmount ?? 0).toFixed?.(2) ?? data?.totalPlanAmount ?? 0))}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:team_expenses_page.dashboard_tab.total_amount",
                    "Total Amount",
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAdvancePaymentsTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.monthly_advance_payments",
                "Monthly Advance Payments",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={data?.advancePaymentsByMonth || []}
              title=""
              lineColor="#8dd1e1"
              currency={currencyFilter || primaryCurrency}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.advance_payments_by_status",
                "Advance Payments by Status",
              )} {`(${getTranslationFromI18nKeyAndLabel(
                "lowcoder:common.counts",
                "Counts",
              )})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={
              data?.advancePaymentsByStatus.map((item: any) => ({
                name: getAdvancePaymentStatusDisplay(item.status).label,
                value: item.count ?? 0,
                status: item.status,
              })) || []
              }
              title=""
              barColor="#8dd1e1"
              valueType="count"
              countLabel={getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.payments",
                "Payments",
              )}
            getColor={(entry) => {
              const code = entry.status || entry.name;
              const config = getAdvancePaymentStatusDisplay(code);
              const type = config?.type || 'draft';
              return resolveStatusColor(type, '#8dd1e1');
            }}
            />
            <StatusLegend id="advance-payments-by-status-counts" />
          </CardContent>
        </Card>
      </div>

      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.advance_payments_by_status",
                "Advance Payments by Status",
              )} {`(${getTranslationFromI18nKeyAndLabel(
                "lowcoder:common.amounts",
                "Amounts",
              )})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent
              data={
              data?.advancePaymentsByStatus.map((item: any) => ({
                name: getAdvancePaymentStatusDisplay(item.status).label,
                value: item.amount ?? 0,
                status: item.status,
              })) || []
              }
              title=""
              colors={[
                "#8dd1e1",
                "#82ca9d",
                "#8884d8",
                "#ff7300",
                "#ffc658"
              ]}
              currency={currencyFilter || primaryCurrency}
            getColor={(entry) => {
              const code = entry.status || entry.name;
              const config = getAdvancePaymentStatusDisplay(code);
              const type = config?.type || 'draft';
              return resolveStatusColor(type, '#8dd1e1');
            }}
            />
            <StatusLegend id="advance-payments-by-status-amounts" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.summary_statistics",
                "Summary Statistics",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div className="gba:text-3xl gba:font-bold gba:text-primary">
                  {data?.advancePaymentsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments",
                    "Total Payments",
                  )}
                </div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div className="gba:text-2xl gba:font-bold" style={{ color: 'var(--nw-color-info-500)' }}>
                  {formatKpiAmount(Number((data?.totalAdvanceAmount ?? 0).toFixed?.(2) ?? data?.totalAdvanceAmount ?? 0))}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:team_expenses_page.dashboard_tab.total_amount",
                    "Total Amount",
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderFilters = () => (
    <Card className="gba:sticky gba:top-6">
      <CardHeader className="gba:pb-4">
        <CardTitle className="gba:text-lg gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:team_expenses_page.dashboard_tab.filters_settings",
            "Filters & Settings",
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-8">
        {/* Date Range Filter */}
        <div className="gba:space-y-4">
          <Label className="gba:text-sm gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:team_expenses_page.dashboard_tab.date_range",
              "Date Range",
            )}
          </Label>
          <RadioGroup
            value={dateRange}
            onValueChange={(value) => handleDateRangeChange(value as DateRangeOption)}
            className="gba:space-y-3"
          >
            <div className="gba:flex gba:items-center gba:space-x-3 gba:py-1">
              <RadioGroupItem value={DateRangeOption.LAST_30_DAYS} id="last-30-days" />
              <Label
                htmlFor="last-30-days"
                className="gba:text-sm gba:leading-relaxed gba:cursor-pointer"
              >
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:team_expenses_page.dashboard_tab.last_30_days",
                  "Last 30 Days",
                )}
              </Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-3 gba:py-1">
              <RadioGroupItem value={DateRangeOption.LAST_90_DAYS} id="last-90-days" />
              <Label
                htmlFor="last-90-days"
                className="gba:text-sm gba:leading-relaxed gba:cursor-pointer"
              >
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:team_expenses_page.dashboard_tab.last_90_days",
                  "Last 90 Days",
                )}
              </Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-3 gba:py-1">
              <RadioGroupItem value={DateRangeOption.YEAR_TO_DATE} id="current-year" />
              <Label
                htmlFor="current-year"
                className="gba:text-sm gba:leading-relaxed gba:cursor-pointer"
              >
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:team_expenses_page.dashboard_tab.current_year",
                  "Current Year",
                )}
              </Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-3 gba:py-1">
              <RadioGroupItem value={DateRangeOption.CUSTOM} id="custom" />
              <Label
                htmlFor="custom"
                className="gba:text-sm gba:leading-relaxed gba:cursor-pointer"
              >
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:team_expenses_page.dashboard_tab.custom_range",
                  "Custom Range",
                )}
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator className="gba:my-6" />

        {/* Location Filters */}
        <div className="gba:space-y-4">
          <Label className="gba:text-sm gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:team_expenses_page.dashboard_tab.location_filters",
              "Location Filters",
            )}
          </Label>
          <div className="gba:relative">
            <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:w-4 gba:h-4 gba:pointer-events-none" />
            <Input
              placeholder={getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.search_locations",
                "Search locations...",
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="gba:pl-14 gba:h-10 gba:text-sm gba:border-input"
            />
          </div>
          <div className="gba:space-y-3 gba:max-h-40 gba:overflow-y-auto gba:pr-2">
            {locationFilters.map((location) => (
              <div
                key={location.id}
                className="gba:flex gba:items-center gba:space-x-3 gba:py-1 gba:rounded-md gba:hover:bg-accent/50 gba:px-2 gba:-mx-2 gba:transition-colors"
              >
                <Checkbox
                  id={location.id}
                  checked={location.selected}
                  onCheckedChange={() => toggleLocationFilter(location.id)}
                />
                <Label
                  htmlFor={location.id}
                  className="gba:text-sm gba:leading-relaxed gba:cursor-pointer gba:flex-1"
                >
                  {location.name}
                </Label>
              </div>
            ))}
            {locationFilters.length === 0 && (
              <div className="gba:text-sm gba:text-muted-foreground gba:italic gba:py-2">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:team_expenses_page.dashboard_tab.no_locations_available",
                  "No locations available",
                )}
              </div>
            )}
          </div>
        </div>

        <Separator className="gba:my-6" />

        {/* Currency Filter */}
        <div className="gba:space-y-4">
          <Label className="gba:text-sm gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_calculation_rule.expense_table.currency",
              "Currency",
            )}
          </Label>
          <CurrencyFilter
            data-testid="team-analytics-currency-filter"
            value={currencyFilter}
            onChange={setCurrencyFilter}
            currencies={availableCurrencies}
            showAllOption={false}
            placeholder={getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_calculation_rule.expense_calculation_rule_modal.currency_placeholder",
              "Select Currency",
            )}
            isLoading={isCurrencyLoading}
          />
        </div>

        <Separator className="gba:my-6" />

        {/* Department Filters */}
        <div className="gba:space-y-4">
          <Label className="gba:text-sm gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:team_expenses_page.dashboard_tab.department_filters",
              "Department Filters",
            )}
          </Label>
          <div className="gba:relative">
            <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:w-4 gba:h-4 gba:pointer-events-none" />
            <Input
              placeholder={getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.search_departments",
                "Search departments...",
              )}
              value={departmentSearchTerm}
              onChange={(e) => setDepartmentSearchTerm(e.target.value)}
              className="gba:pl-14 gba:h-10 gba:text-sm gba:border-input"
            />
          </div>
          <div className="gba:space-y-3 gba:max-h-40 gba:overflow-y-auto gba:pr-2">
            {departmentFilters.map((department) => (
              <div
                key={department.id}
                className="gba:flex gba:items-center gba:space-x-3 gba:py-1 gba:rounded-md gba:hover:bg-accent/50 gba:px-2 gba:-mx-2 gba:transition-colors"
              >
                <Checkbox
                  id={department.id}
                  checked={department.selected}
                  onCheckedChange={() => toggleDepartmentFilter(department.id)}
                />
                <Label
                  htmlFor={department.id}
                  className="gba:text-sm gba:leading-relaxed gba:cursor-pointer gba:flex-1"
                >
                  {department.name}
                </Label>
              </div>
            ))}
            {departmentFilters.length === 0 && (
              <div className="gba:text-sm gba:text-muted-foreground gba:italic gba:py-2">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:team_expenses_page.dashboard_tab.no_departments_found",
                  "No departments found",
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div data-testid="team-spending-analytics-page-container">
      {/* Back Button Above Everything */}
      <div className="gba:px-6 gba:pt-6 gba:pb-0">
        <button
          onClick={onNavigateBack}
          className="gba:flex gba:items-center gba:text-primary gba:hover:text-accent"
          data-testid="team-spending-analytics-back-button"
        >
          <PiArrowLeft className="gba:mr-2" />
          <span>
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:team_expenses_page.dashboard_tab.back_to_btn",
              "Back to Dashboard",
            )}
          </span>
        </button>
      </div>

      <PageLayout
        headerTitle={getTranslationFromI18nKeyAndLabel(
          "lowcoder:team_expenses_page.dashboard_tab.team_spending_analysis",
          "Team Spending Analysis",
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          "lowcoder:team_expenses_page.dashboard_tab.team_spending_analytics_description",
          "Comprehensive analysis of team spending patterns, trends, and budget allocations across all expense categories",
        )}
        headerIcon={ChartLineUpIcon}
        className="gba:min-h-screen"
      >
        <div className="gba:px-6 gba:space-y-6" data-testid="team-spending-analytics-page">
          {/* Summary Statistics */}
          <WidgetGroup
            widgets={widgets}
            isLoading={isLoading}
            error={error ? error : null}
            onRetry={() => globalThis.location?.reload?.()}
            skeletonCount={4}
            emptyText={getTranslationFromI18nKeyAndLabel(
              "lowcoder:team_expenses_page.dashboard_tab.no_analytics_data",
              "No analytics data available.",
            )}
            data-testid="team-spending-analytics-statistics"
          />

          {/* Main Content */}
          <div className="gba:flex gba:gap-6">
            {/* Left Sidebar - Filters */}
            <div className="gba:w-80 gba:flex-shrink-0">{renderFilters()}</div>

            {/* Main Content Area */}
            <div className="gba:flex-1">
              {error ? (
                <Alert data-testid="team-spending-analytics-error-alert">
                  <AlertDescription>
                    <strong>{getTranslationFromI18nKeyAndLabel("lowcoder:common.error_title","Error")}</strong> {error}
                  </AlertDescription>
                </Alert>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:w-full">
                  <TabsList className="gba:grid gba:w-full gba:grid-cols-4">
                    <TabsTrigger value="expense-items">
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:personal_expenses.expense_items",
                        "Expense Items",
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="expense-requests">
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:employee_list.flows_button.expense_requests",
                        "Expense Requests",
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="expense-plans">
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:team_expenses_page.dashboard_tab.expense_plans",
                        "Expense Plans",
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="advance-payments">
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:backoffice_expense_landing_page.advance_title",
                        "Advance Payments",
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="expense-items" className="gba:space-y-6 gba:mt-6">
                    {isLoading ? (
                      <div className="gba:flex gba:justify-center gba:p-8">
                        <Spinner data-testid="loading-spinner" />
                      </div>
                    ) : (
                      renderExpenseItemsTab()
                    )}
                  </TabsContent>

                  <TabsContent value="expense-requests" className="gba:space-y-6 gba:mt-6">
                    {isLoading ? (
                      <div className="gba:flex gba:justify-center gba:p-8">
                        <Spinner data-testid="loading-spinner" />
                      </div>
                    ) : (
                      renderExpenseRequestsTab()
                    )}
                  </TabsContent>

                  <TabsContent value="expense-plans" className="gba:space-y-6 gba:mt-6">
                    {isLoading ? (
                      <div className="gba:flex gba:justify-center gba:p-8">
                        <Spinner data-testid="loading-spinner" />
                      </div>
                    ) : (
                      renderExpensePlansTab()
                    )}
                  </TabsContent>

                  <TabsContent value="advance-payments" className="gba:space-y-6 gba:mt-6">
                    {isLoading ? (
                      <div className="gba:flex gba:justify-center gba:p-8">
                        <Spinner data-testid="loading-spinner" />
                      </div>
                    ) : (
                      renderAdvancePaymentsTab()
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>
      </PageLayout>
    </div>
  );
};

export default TeamSpendingAnalyticsPage;
