import React, { useEffect, useState, useMemo } from "react";
import {
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Spinner,
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  PageLayout,
} from "@newwork/nw-design-system";
import { PiMagnifyingGlass, PiDownload, PiArrowLeft, PiFileText } from "react-icons/pi";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useExpenseReportData, ReportType } from "../../hooks/useExpenseReportData";
import { ensureShortDateFormat } from "../../utils/dateUtils";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { formatCurrencyDisplay } from "../../../personal-expenses/utils";

interface ExpenseReportsPageProps extends BusinessAppContextProps {
  onNavigateBack: () => void;
}

const ExpenseReportsPage: React.FC<ExpenseReportsPageProps> = ({
  onNavigateBack,
  accessToken,
  userInfo,
}) => {
  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReportType, setSelectedReportType] = useState<ReportType>(ReportType.EXPENSE_ITEM);
  const [reportTypeSearchTerm, setReportTypeSearchTerm] = useState("");

  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(
    () => ({
      accessToken,
      userInfo,
    }),
    [accessToken, userInfo],
  );

  // Hook to get expense report data
  const { reportData, isLoading, error, fetchReportData } = useExpenseReportData(contextProps);

  // Load initial data
  useEffect(() => {
    fetchReportData();
  }, [selectedReportType, fetchReportData]);

  // Define report types with display names
  const reportTypes: Array<{ key: ReportType; name: string; description: string }> = [
    {
      key: ReportType.EXPENSE_ITEM,
      name: getTranslationFromI18nKeyAndLabel(
        "lowcoder:personal_expenses.expense_items",
        "Expense Items",
      ),
      description: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.individual_expense_transactions",
        "Individual expense items and transactions",
      ),
    },
    {
      key: ReportType.EXPENSE_PLAN,
      name: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.expense_plans",
        "Expense Plans",
      ),
      description: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.expense_plans_subheader",
        "Budget plans and allocations",
      ),
    },
    {
      key: ReportType.EXPENSE_REQUEST,
      name: getTranslationFromI18nKeyAndLabel(
        "lowcoder:employee_list.flows_button.expense_requests",
        "Expense Requests",
      ),
      description: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.expense_requests_subheader",
        "Submitted expense requests and approvals",
      ),
    },
    {
      key: ReportType.ADVANCE_PAYMENT,
      name: getTranslationFromI18nKeyAndLabel(
        "lowcoder:backoffice_expense_landing_page.advance_title",
        "Advance Payments",
      ),
      description: getTranslationFromI18nKeyAndLabel(
        "lowcoder:team_expenses_page.dashboard_tab.advance_payments_subheader",
        "Cash advances and prepayments",
      ),
    },
  ];

  // Filter report types based on search
  const filteredReportTypes = reportTypes.filter(
    (type) =>
      type.name.toLowerCase().includes(reportTypeSearchTerm.toLowerCase()) ||
      type.description.toLowerCase().includes(reportTypeSearchTerm.toLowerCase()),
  );

  // Define columns based on report type
  const getColumns = () => {
    switch (selectedReportType) {
      case ReportType.EXPENSE_ITEM:
        return [
          {
            key: "date",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_request_list.expense_plan_table.date",
              "Date",
            ),
          },
          {
            key: "title",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_request_list.expense_plan_table.title",
              "Title",
            ),
          },
          {
            key: "description",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:personal_expenses.description",
              "Description",
            ),
          },
          {
            key: "amount",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_request_list.expense_plan_table.amount",
              "Amount",
            ),
          },
          {
            key: "category",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:team_expenses_page.dashboard_tab.category",
              "Category",
            ),
          },
          {
            key: "employeeName",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:hr_absences.create_absence.employee",
              "Employee",
            ),
          },
        ];
      case ReportType.EXPENSE_PLAN:
        return [
          {
            key: "code",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_calculation_rule.expense_table.code",
              "Code",
            ),
          },
          {
            key: "title",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_request_list.expense_plan_table.title",
              "Title",
            ),
          },
          {
            key: "startDate",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:hr_absences.create_absence.start_date",
              "Start Date",
            ),
          },
          {
            key: "endDate",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:hr_absences.create_absence.end_date",
              "End Date",
            ),
          },
          {
            key: "status",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_request_list.expense_plan_table.status",
              "Status",
            ),
          },
        ];
      case ReportType.EXPENSE_REQUEST:
        return [
          {
            key: "requestNumber",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_request_list.expense_request_filter.request_number_input",
              "Request Number",
            ),
          },
          {
            key: "title",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_request_list.expense_plan_table.title",
              "Title",
            ),
          },
          {
            key: "submissionDate",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:acknowledge_sick_leave.submission_date",
              "Submission Date",
            ),
          },
          {
            key: "totalAmount",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_request_list.expense_plan_table.amount",
              "Total Amount",
            ),
          },
          {
            key: "status",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_request_list.expense_plan_table.status",
              "Status",
            ),
          },
          {
            key: "employeeName",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:hr_absences.create_absence.employee",
              "Employee",
            ),
          },
        ];
      case ReportType.ADVANCE_PAYMENT:
        return [
          {
            key: "requestDate",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_request_list.expense_plan_table.date",
              "Request Date",
            ),
          },
          {
            key: "amount",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_request_list.expense_plan_table.amount",
              "Amount",
            ),
          },
          {
            key: "purpose",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:team_expenses_page.dashboard_tab.purpose_label",
              "Purpose",
            ),
          },
          {
            key: "status",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:expense_request_list.expense_plan_table.status",
              "Status",
            ),
          },
          {
            key: "employeeName",
            title: getTranslationFromI18nKeyAndLabel(
              "lowcoder:hr_absences.create_absence.employee",
              "Employee",
            ),
          },
        ];
      default:
        return [];
    }
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!reportData || !searchTerm) return reportData || [];

    return reportData.filter((item: any) => {
      return Object.values(item).some(
        (value: any) => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
      );
    });
  }, [reportData, searchTerm]);

  // Handle download action
  const handleDownload = () => {
    console.log("Downloading report:", selectedReportType);
    // TODO: Implement actual download functionality
  };

  const columns = getColumns();

  return (
    <div data-testid="expense-reports-page-container">
      {/* Back Button Above Everything */}
      <div className="gba:px-6 gba:pt-6 gba:pb-0">
        <div className="gba:flex gba:items-center gba:justify-between">
          <button
            onClick={onNavigateBack}
            className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
            data-testid="expense-reports-back-button"
          >
            <PiArrowLeft className="gba:mr-2" />
            <span>
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:team_expenses_page.dashboard_tab.back_to_btn",
                "Back to Dashboard",
              )}
            </span>
          </button>

          <Button
            variant="outline"
            onClick={handleDownload}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="expense-reports-download-button"
          >
            <PiDownload className="gba:text-sm" />
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:team_expenses_page.dashboard_tab.download_report",
              "Download Report",
            )}
          </Button>
        </div>
      </div>

      <PageLayout
        headerTitle={getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_request_list.modal_list_or_flow_button.absence_same_location_btn",
          "Expense Reports",
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          "lowcoder:team_expenses_page.dashboard_tab.expense_reports_subheader",
          "Generate and download comprehensive expense reports across different categories and time periods",
        )}
        headerIcon={PiFileText}
        className="gba:min-h-screen"
      >
        <div className="gba:px-6 gba:h-full gba:flex gba:gap-6" data-testid="expense-reports-page">
          {/* Left Sidebar - Report Types */}
          <div className="gba:w-80 gba:flex gba:flex-col gba:space-y-4">
            <div>
              <h3 className="gba:text-lg gba:font-medium gba:mb-4">
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:team_expenses_page.dashboard_tab.report_types",
                  "Report Types",
                )}
              </h3>

              {/* Search Report Types */}
              <div className="gba:relative gba:mb-4">
                <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:text-sm" />
                <Input
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    "lowcoder:team_expenses_page.dashboard_tab.search_report_types",
                    "Search report types...",
                  )}
                  onChange={(e) => setReportTypeSearchTerm(e.target.value)}
                  value={reportTypeSearchTerm}
                  className="gba:pl-10"
                  data-testid="expense-reports-type-search-input"
                />
              </div>

              {/* Report Type List */}
              <div className="gba:space-y-2">
                {filteredReportTypes.map((type) => (
                  <Card
                    key={type.key}
                    className={`gba:cursor-pointer gba:transition-colors gba:hover:bg-accent ${
                      selectedReportType === type.key ? "gba:border-primary gba:bg-accent" : ""
                    }`}
                    onClick={() => setSelectedReportType(type.key)}
                    data-testid={`expense-reports-type-${type.key}`}
                  >
                    <CardContent className="gba:p-4">
                      <h4 className="gba:font-medium gba:text-sm">{type.name}</h4>
                      <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                        {type.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Report Table */}
          <div className="gba:flex-1 gba:flex gba:flex-col">
            {error && (
              <Alert className="gba:mb-4" data-testid="expense-reports-error-alert">
                <AlertDescription>
                  <strong>Error:</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Search Bar for Table Data */}
            <div className="gba:mb-4">
              <div className="gba:relative gba:w-64">
                <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:text-sm" />
                <Input
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    "lowcoder:team_expenses_page.dashboard_tab.search_report_data",
                    "Search report data...",
                  )}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={searchTerm}
                  className="gba:pl-10"
                  data-testid="expense-reports-data-search-input"
                />
              </div>
            </div>

            {/* Report Table */}
            {isLoading ? (
              <div className="gba:flex gba:justify-center gba:p-8">
                <Spinner data-testid="expense-reports-loading-spinner" />
              </div>
            ) : filteredData && filteredData.length > 0 ? (
              <div className="gba:overflow-x-auto gba:flex-1">
                <Table data-testid="expense-reports-table">
                  <TableHeader>
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead key={column.key}>{column.title}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row: any, index: number) => (
                      <TableRow key={`${selectedReportType}-${index}`}>
                        {columns.map((column) => (
                          <TableCell
                            key={column.key}
                            data-testid={`expense-reports-cell-${column.key}`}
                          >
                            {column.key.includes("amount") || column.key.includes("Amount") ? (
                              <span className="gba:text-sm">
                                {formatCurrencyDisplay(row[column.key] || 0, "EUR")}
                              </span>
                            ) : column.key === "date" ? (
                              <span className="gba:text-sm">
                                {row[column.key] ? ensureShortDateFormat(row[column.key]) : "-"}
                              </span>
                            ) : (
                              <span className="gba:text-sm">{row[column.key] || "-"}</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center">
                <div className="gba:text-gray-500 gba:text-lg gba:font-medium gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:team_expenses_page.dashboard_tab.no_expense_reports_found",
                    "No expense reports found",
                  )}
                </div>
                <div className="gba:text-gray-400 gba:mb-4">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:team_expenses_page.dashboard_tab.adjust_search",
                    "Try selecting a different report type or adjusting your search.",
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    </div>
  );
};

export default ExpenseReportsPage;
