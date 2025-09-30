import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Spinner,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@newwork/nw-design-system";
import { Modal } from "antd";
import { PiArrowUp, PiArrowDown } from "react-icons/pi";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import Pill from "@/components/pill/Pill";
import { ExpensePlan, SortField } from "../../../hooks/useMainViewExpensePlans";
import { getExpensePlanStatusDisplay, ExpenseStatus } from "../../../utils";
import {
  getTranslationFromI18nKeyAndLabel,
  getCurrentActiveUserLocale,
} from "@/common/utils/windowUtils";
import { formatCurrencyDisplay } from "../../../../personal-expenses/utils";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { useExpensePlanFileService } from "../../../../personal-expenses/utils/expensePlanFileService";
import ExpensePlanDetails from "./ExpensePlanDetails";

interface ExpensePlansTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
  employeeId?: string;
  activeFilter?: ExpenseStatus[] | null;
  onFilterChange?: (filter: ExpenseStatus[] | null) => void;
  onClearFilters?: () => void;
  onViewDetails?: (plan: ExpensePlan) => void;
  currencyFilter?: string | null;
  expensePlans: ExpensePlan[];
  loading: boolean;
  error: Error | null;
  totalCount: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  sorting: any;
  updateSorting: (field: SortField) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
}

const DATA_TEST_ID_PREFIX = "ExpensePlansTable";

const ExpensePlansTable: React.FC<ExpensePlansTableProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo,
    }),
    [props.accessToken, props.userInfo],
  );

  // Use parent's filter state directly
  const currentStatusFilter = props.activeFilter || [];

  // Use the currency filter passed from parent instead of global store
  const currentCurrencyFilter = props.currencyFilter || "EUR";

  // Set up local state
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [printPdfUrl, setPrintPdfUrl] = useState<string>("");
  const [printLoading, setPrintLoading] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<ExpensePlan | null>(null);

  // Use the file service hook
  const { printExpensePlan, isMounted } = useExpensePlanFileService(contextProps);

  // Get expense plans data and functions from props
  const {
    expensePlans,
    loading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    sorting,
    updateSorting,
    pageSize,
    setPageSize,
  } = props;

  // Reset page to 1 when filter changes (fixes pagination issue when switching filters)
  const prevFilterRef = useRef<ExpenseStatus[] | null>(null);
  useEffect(() => {
    const currentFilterStr = JSON.stringify(currentStatusFilter);
    const prevFilterStr = JSON.stringify(prevFilterRef.current);

    // Only reset page if filter actually changed (not on initial render)
    if (prevFilterRef.current !== null && currentFilterStr !== prevFilterStr) {
      setCurrentPage(1);
    }

    // Update the ref with current filter
    prevFilterRef.current = currentStatusFilter;
  }, [currentStatusFilter, setCurrentPage]);

  // Handle selecting an item for details view
  const handleSelectItem = useCallback((item: ExpensePlan) => {
    setSelectedItem(item);
  }, []);

  // Handle closing details
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // Handle viewing details for a plan
  const handleViewDetails = useCallback((plan: ExpensePlan) => {
    const url = buildPlatformUrl("/platform/fin/expenses/expense-plan-record", {
      expensePlanId: plan.id,
    });
    navigateTo(url);
  }, []);

  // Handle printing a plan
  const handlePrintPlan = useCallback(
    async (plan: ExpensePlan) => {
      setPrintLoading(true);
      setPrintModalOpen(true);

      try {
        // Map manager-expenses ExpensePlan to personal-expenses format
        const mappedPlan = {
          ...plan,
          reimbursableAmount: plan.totalAmount,
          decisionDate: null,
          requestTypeRef: null,
          employeeDocumentId: plan.employeeDocument?.id || null,
          advancePaymentPaidAmount: 0,
          advancePaymentInTransitAmount: 0,
          employeeDocument: plan.employeeDocument,
          requestType: null,
          expensePlanItem: [],
          advancePayment: null,
          expenseRequestTrip: null,
          currencyRef: `Currency:v1:${plan.currency}`,
          expenseRequest: [],
          currency: { value: plan.currency, label: plan.currency } as any,
          description: plan.description || "",
          employee: {
            ...plan.employee,
            code: plan.employee.id,
            firstName: plan.employee.displayName?.split(" ")[0] || "",
            lastName: plan.employee.displayName?.split(" ").slice(1).join(" ") || "",
          },
        };

        const result = await printExpensePlan(mappedPlan);

        if (result.success && result.pdfUrl && isMounted.current) {
          setPrintPdfUrl(result.pdfUrl);
        } else if (!result.success) {
          console.error("Error printing plan:", result.error);
        }
      } catch (error) {
        console.error("Error fetching print PDF:", error);
      } finally {
        if (isMounted.current) {
          setPrintLoading(false);
        }
      }
    },
    [printExpensePlan, isMounted],
  );

  // Pagination handlers - used directly in the component
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
    },
    [setCurrentPage],
  );

  // Sorting handler
  const handleSort = useCallback(
    (field: SortField) => {
      updateSorting(field);
    },
    [updateSorting],
  );

  // Render sort indicator
  const renderSortIndicator = useCallback(
    (field: SortField) => {
      if (sorting.lastField === field && sorting.order !== null) {
        return sorting.order === "ASC" ? (
          <PiArrowUp className="gba:inline gba:ml-1" size={12} />
        ) : (
          <PiArrowDown className="gba:inline gba:ml-1" size={12} />
        );
      }
      return null;
    },
    [sorting],
  );

  // Handle page size changes in the pagination controls
  const handlePageSizeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const size = parseInt(event.target.value, 10);
      setPageSize(size);
      setCurrentPage(1); // Reset to first page when changing page size
    },
    [setPageSize, setCurrentPage],
  );

  // Show error state
  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <div className="gba:text-gray-600 gba:mb-4">{error.message}</div>
        <Button
          variant="default"
          onClick={() => window.location.reload()}
          data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Show loading state
  if (loading && !expensePlans.length) {
    return (
      <div className="gba:flex gba:justify-center gba:p-8" data-testid="expense-plans-loading">
        <Spinner />
      </div>
    );
  }

  // Show empty state
  if (!expensePlans || expensePlans.length === 0) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center">
        <div className="gba:text-gray-500 gba:text-lg gba:font-medium gba:mb-2">
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:create_expense_request.no_plans_found_search",
            "No expense plans found",
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      {/* Table with border containing both table and pagination */}
      <div className="gba:border gba:border-gray-200 gba:rounded-md gba:shadow-sm">
        {/* Table with horizontal scrolling and fixed height */}
        <div className="gba:overflow-x-auto gba:max-h-[600px] gba:overflow-y-auto gba:border-b gba:border-gray-200">
          <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`} className="gba:w-max">
            <TableHeader className="gba:sticky gba:top-0 gba:bg-white gba:z-10 gba:border-b gba:border-gray-200">
              <TableRow>
                <TableHead
                  className="gba:w-[8%] gba:bg-gray-50 gba:font-semibold"
                  data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                ></TableHead>
                <TableHead
                  className="gba:w-[25%] gba:cursor-pointer gba:select-none gba:bg-gray-50 gba:font-semibold"
                  onClick={() => handleSort("title")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-title-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      "lowcoder:backoffice_expense_landing_page.plan_info_pl",
                      "Plans",
                    )}
                    {renderSortIndicator("title")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:cursor-pointer gba:select-none gba:bg-gray-50 gba:font-semibold"
                  onClick={() => handleSort("startDate")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-start-date-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      "lowcoder:personal_expenses.start_date",
                      "Start Date",
                    )}
                    {renderSortIndicator("startDate")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:cursor-pointer gba:select-none gba:bg-gray-50 gba:font-semibold"
                  onClick={() => handleSort("endDate")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-end-date-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      "lowcoder:personal_expenses.end_date",
                      "End Date",
                    )}

                    {renderSortIndicator("endDate")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[20%] gba:cursor-pointer gba:select-none gba:bg-gray-50 gba:font-semibold"
                  onClick={() => handleSort("employee.fullName")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-employee-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      "lowcoder:hr_absences.create_absence.employee",
                      "Employee",
                    )}
                    {renderSortIndicator("employee.fullName")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:cursor-pointer gba:select-none gba:bg-gray-50 gba:font-semibold"
                  onClick={() => handleSort("createdAt")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-creation-date-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      "lowcoder:manager_expense_request_list.expense_table.creation_date",
                      "Creation Date",
                    )}
                    {renderSortIndicator("createdAt")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[18%] gba:text-right gba:cursor-pointer gba:select-none gba:bg-gray-50 gba:font-semibold"
                  onClick={() => handleSort("totalAmount")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-amount-header`}
                >
                  <div className="gba:flex gba:items-center gba:justify-end">
                    {getTranslationFromI18nKeyAndLabel("lowcoder:sales_hub.amount", "Amount")}
                    {renderSortIndicator("totalAmount")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[18%] gba:cursor-pointer gba:select-none gba:bg-gray-50 gba:font-semibold"
                  onClick={() => handleSort("status")}
                  data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      "lowcoder:expense_request_list.expense_plan_table.status",
                      "Status",
                    )}
                    {renderSortIndicator("status")}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expensePlans.map((plan: ExpensePlan) => {
                const display = getExpensePlanStatusDisplay(plan.status as ExpenseStatus);
                return (
                  <TableRow
                    key={plan.id}
                    data-testid={`${DATA_TEST_ID_PREFIX}-row-${plan.id}`}
                    className={`gba:cursor-pointer gba:hover:bg-gray-50 gba:transition-colors ${
                      selectedItem?.id === plan.id ? "gba:bg-blue-50" : ""
                    }`}
                    onClick={() => handleSelectItem(plan)}
                  >
                    <TableCell data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${plan.id}`}>
                      <div
                        className="gba:flex gba:justify-center gba:gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <AppActionButton
                          data-testid={`${DATA_TEST_ID_PREFIX}-update-plan-button-${plan.id}`}
                          size="icon"
                          staticFlowData={[
                            // Print action - only available if document exists
                            ...(plan.employeeDocument?.file
                              ? [
                                  {
                                    category: getTranslationFromI18nKeyAndLabel(
                                      "lowcoder:employee_list.flows_button.actions",
                                      "Actions",
                                    ),
                                    key: "print",
                                    label: getTranslationFromI18nKeyAndLabel(
                                      "lowcoder:expense_plan_list.expense_plan_flows.print",
                                      "Print",
                                    ),
                                    onClick: (e?: React.MouseEvent) => {
                                      e?.stopPropagation();
                                      handlePrintPlan(plan);
                                    },
                                  },
                                ]
                              : []),
                            // View Plan Details - always available
                            {
                              category: getTranslationFromI18nKeyAndLabel(
                                "lowcoder:employee_list.flows_button.navigations",
                                "Navigations",
                              ),
                              key: "view-plan-details",
                              label: getTranslationFromI18nKeyAndLabel(
                                "lowcoder:expense_plan_list.expense_plan_flows.view_plan_details",
                                "View Plan Details",
                              ),
                              onClick: (e?: React.MouseEvent) => {
                                e?.stopPropagation();
                                handleViewDetails(plan);
                              },
                            },
                          ]}
                          prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-expense-plan`}
                          accessToken={contextProps.accessToken}
                          emptyStateBehavior="disable"
                          deferMainContextRequestsUntilClick
                        />
                      </div>
                    </TableCell>
                    <TableCell className="gba:text-left">
                      <div className="gba:font-medium gba:text-sm">{plan.title}</div>
                      <div className="gba:text-xs gba:text-gray-500">{plan.code}</div>
                    </TableCell>
                    <TableCell className="gba:text-sm">
                      {plan.startDate
                        ? (() => {
                            try {
                              const date = new Date(plan.startDate);
                              const userLocale = getCurrentActiveUserLocale();
                              return date.toLocaleDateString(userLocale, {
                                month: "2-digit",
                                day: "2-digit",
                                year: "2-digit",
                              });
                            } catch (error) {
                              return "N/A";
                            }
                          })()
                        : "N/A"}
                    </TableCell>
                    <TableCell className="gba:text-sm">
                      {plan.endDate
                        ? (() => {
                            try {
                              const date = new Date(plan.endDate);
                              const userLocale = getCurrentActiveUserLocale();
                              return date.toLocaleDateString(userLocale, {
                                month: "2-digit",
                                day: "2-digit",
                                year: "2-digit",
                              });
                            } catch (error) {
                              return "N/A";
                            }
                          })()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Avatar className="gba:h-6 gba:w-6">
                          <AvatarImage
                            src={
                              plan.employee?.pictureThumbnail
                                ? `data:image/gif;base64,${plan.employee.pictureThumbnail}`
                                : undefined
                            }
                            alt={plan.employee?.fullName}
                          />
                          <AvatarFallback>
                            {plan.employee?.displayName?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="gba:font-medium gba:text-sm">
                          {plan.employee?.displayName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="gba:text-sm">
                      {plan.createdAt
                        ? (() => {
                            try {
                              const date = new Date(plan.createdAt);
                              const userLocale = getCurrentActiveUserLocale();
                              return date.toLocaleDateString(userLocale, {
                                month: "2-digit",
                                day: "2-digit",
                                year: "2-digit",
                              });
                            } catch (error) {
                              return "N/A";
                            }
                          })()
                        : "N/A"}
                    </TableCell>
                    <TableCell className="gba:text-right">
                      <span className="gba:font-medium gba:text-sm">
                        {typeof plan.totalAmount === "number"
                          ? formatCurrencyDisplay(
                              plan.totalAmount,
                              currentCurrencyFilter || plan.currency || "EUR",
                            )
                          : formatCurrencyDisplay(
                              0,
                              currentCurrencyFilter || plan.currency || "EUR",
                            )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Pill type={display.type as any} label={display.label} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination - Always show when there are records */}
        {totalCount > 0 && (
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4 gba:border-t gba:border-gray-200"
            data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}
          >
            <div
              className="gba:text-sm gba:text-gray-600"
              data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info`}
            >
              {`${(currentPage - 1) * pageSize + 1}-${Math.min(
                currentPage * pageSize,
                totalCount,
              )} ${getTranslationFromI18nKeyAndLabel("lowcoder:personal_expenses.of", "of")} ${totalCount} ${getTranslationFromI18nKeyAndLabel("lowcoder:team_expenses_page.expense_plans_tab.footer_expense_plans", "expense plans")} `}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">
                  {" "}
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:personal_expenses.rows_per_page",
                    "Rows per page",
                  )}
                </p>
                <select
                  className="gba:h-8 gba:rounded-md gba:border gba:border-gray-300 gba:bg-white gba:px-2 gba:text-sm"
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select`}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div
                className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                data-testid={`${DATA_TEST_ID_PREFIX}-page-info`}
              >
                {getTranslationFromI18nKeyAndLabel("lowcoder:personal_expenses.page", "Page")}{" "}
                {currentPage}{" "}
                {getTranslationFromI18nKeyAndLabel("lowcoder:personal_expenses.of", "of")}{" "}
                {Math.ceil(totalCount / pageSize)}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
                >
                  <span className="gba:sr-only">Go to first page</span>
                  ⟪⟪
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
                >
                  <span className="gba:sr-only">Go to previous page</span>⟪
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid={`${DATA_TEST_ID_PREFIX}-next-page-button`}
                >
                  <span className="gba:sr-only">Go to next page</span>⟫
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePageChange(Math.ceil(totalCount / pageSize))}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid={`${DATA_TEST_ID_PREFIX}-last-page-button`}
                >
                  <span className="gba:sr-only">Go to last page</span>
                  ⟫⟫
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print Modal */}
      <Modal
        open={printModalOpen}
        title="Print Expense Plan"
        footer={null}
        onCancel={() => {
          setPrintModalOpen(false);
          setPrintPdfUrl("");
        }}
        width="90%"
        style={{ top: 20 }}
        destroyOnHidden={true}
        data-testid="print-plan-modal"
      >
        {printLoading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Spinner />
          </div>
        ) : printPdfUrl ? (
          <iframe
            src={printPdfUrl}
            style={{ width: "100%", height: "calc(90vh - 55px)", border: "none" }}
            title="Print Preview"
            data-testid="print-plan-iframe"
          />
        ) : (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
            <div className="gba:text-gray-600 gba:mb-4">No document available for printing</div>
            <div className="gba:text-sm gba:text-gray-500">
              This expense plan does not have an associated document to print.
            </div>
          </div>
        )}
      </Modal>

      {/* Expense Plan Details Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && handleCloseDetails()}>
        <SheetContent className="gba:w-[600px] gba:sm:gba:w-[600px] gba:max-w-none">
          <SheetHeader>
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-gray-900">
              {selectedItem?.title ||
                getTranslationFromI18nKeyAndLabel(
                  "lowcoder:approve_expense_plan.expense_subtitle_details",
                  "Expense Plan Details",
                )}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:mt-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
            {selectedItem && (
              <ExpensePlanDetails
                selectedItem={selectedItem}
                onClose={handleCloseDetails}
                accessToken={contextProps.accessToken}
                userInfo={contextProps.userInfo}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(ExpensePlansTable);
