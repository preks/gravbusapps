import React, { useState, useCallback, useMemo } from "react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Alert,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@newwork/nw-design-system";
import { PiArrowUp, PiArrowDown } from "react-icons/pi";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { formatCurrencyDisplay } from "../../../../personal-expenses/utils";
import { getAdvancePaymentStatusDisplay } from "../../../utils";
import {
  getTranslationFromI18nKeyAndLabel,
  getCurrentActiveUserLocale,
} from "@/common/utils/windowUtils";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";
import { AdvancePayment as AdvancePaymentItem } from "../../../hooks/useMainViewAdvancePayments";
import AdvancePaymentDetails from "./AdvancePaymentDetails";
// Local token map for status colors
const ADV_STATUS_CLASSES: Record<string, string> = {
  success: "gba:bg-success gba:text-success-foreground",
  warning: "gba:bg-warning gba:text-warning-foreground",
  info: "gba:bg-info gba:text-info-foreground",
  destructive: "gba:bg-destructive gba:text-destructive-foreground",
  offline: "gba:bg-offline gba:text-offline-foreground",
  draft: "gba:bg-muted gba:text-muted-foreground",
  completed: "gba:bg-success gba:text-success-foreground",
  waiting: "gba:bg-info gba:text-info-foreground",
  task: "gba:bg-warning gba:text-warning-foreground",
  error: "gba:bg-destructive gba:text-destructive-foreground",
  preparing: "gba:bg-muted gba:text-muted-foreground",
};

interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string;
  onSearchChange?: (search: string) => void;
  activeFilter?: string[] | null;
  onFilterChange?: (filter: string[] | null) => void;
  onClearFilters?: () => void;
  currencyFilter?: string;
  // Data from parent hook
  advancePayments?: AdvancePaymentItem[];
  loading?: boolean;
  error?: Error | null;
  totalCount?: number;
  currentPage?: number;
  setCurrentPage?: (page: number) => void;
  sorting?: { field: string; direction: "asc" | "desc" } | null;
  updateSorting?: (field: string) => void;
  pageSize?: number;
  setPageSize?: (size: number) => void;
}

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = (props) => {
  // Extract context props for passing to child components
  const contextProps = React.useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo,
    }),
    [props.accessToken, props.userInfo],
  );

  // Use data from props if provided (from parent Tab), otherwise fall back to local hook
  const payments = props.advancePayments;
  const isLoading = props.loading ?? false;
  const error = props.error ?? null;
  const totalCount = props.totalCount ?? 0;
  const currentPage = props.currentPage ?? 1;
  const setCurrentPage = props.setCurrentPage ?? (() => {});
  const sorting = props.sorting ?? null;
  const updateSorting = props.updateSorting ?? (() => {});
  const pageSize = props.pageSize ?? 10;
  const setPageSize = props.setPageSize ?? (() => {});
  const currencyFilter = props.currencyFilter ?? "";

  // Local state management
  const [selectedPayment, setSelectedPayment] = useState<AdvancePaymentItem | null>(null);

  // Filter payments based on data from props
  const filteredPayments = useMemo(() => payments || [], [payments]);

  // Handle page size changes
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  }, [setPageSize, setCurrentPage]);

  // Render the table
  const renderDataBody = useCallback(() => {
    if (error) {
      return (
        <Alert variant="destructive">
          <div className="gba:font-medium">Error loading advance payments</div>
          <div className="gba:text-sm gba:py-3 gba:px-4">
            {error.message || "An error occurred while loading advance payments."}
          </div>
        </Alert>
      );
    }

    if (!isLoading && filteredPayments.length === 0) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
          <span className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:personal_expenses.no_advance_payments_found",
              "No advance payments found.",
            )}
          </span>
        </div>
      );
    }

    return (
        <div className="gba:border gba:border-border gba:rounded-md">
        {/* Table with horizontal scrolling */}
        <div className="gba:overflow-x-auto gba:pr-4">
          <Table data-testid="advance-payments-table" className="gba:w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="gba:w-[60px] gba:min-w-[60px] gba:max-w-[60px] gba:box-border gba:first:pl-0" data-testid="advance-payments-actions-header"></TableHead>
                <TableHead
                  className="gba:w-[12%] gba:cursor-pointer"
                  onClick={() => updateSorting("expensePlan.title")}
                  data-testid="advance-payments-title-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:create_expense_request.initial_expense_plan_select_label",
                        "Expense Plan",
                      )}
                    </span>
                    {sorting?.field === "expensePlan.title" &&
                      sorting?.direction &&
                      (sorting.direction === "asc" ? (
                        <PiArrowUp className="gba:inline gba:ml-1" size={12} />
                      ) : (
                        <PiArrowDown className="gba:inline gba:ml-1" size={12} />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[8%] gba:cursor-pointer"
                  onClick={() => updateSorting("expensePlan.startDate")}
                  data-testid="advance-payments-start-date-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:personal_expenses.start_date",
                        "Start Date",
                      )}
                    </span>
                    {sorting?.field === "expensePlan.startDate" &&
                      sorting?.direction &&
                      (sorting.direction === "asc" ? (
                        <PiArrowUp className="gba:inline gba:ml-1" size={12} />
                      ) : (
                        <PiArrowDown className="gba:inline gba:ml-1" size={12} />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[8%] gba:cursor-pointer"
                  onClick={() => updateSorting("expensePlan.endDate")}
                  data-testid="advance-payments-end-date-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:personal_expenses.end_date",
                        "End Date",
                      )}
                    </span>
                    {sorting?.field === "expensePlan.endDate" &&
                      sorting?.direction &&
                      (sorting.direction === "asc" ? (
                        <PiArrowUp className="gba:inline gba:ml-1" size={12} />
                      ) : (
                        <PiArrowDown className="gba:inline gba:ml-1" size={12} />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[20%] gba:cursor-pointer"
                  onClick={() => updateSorting("expensePlan.employee.fullName")}
                  data-testid="advance-payments-employee-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:expense_config_calculation_rule_list.expense_table.employee",
                        "Employee",
                      )}
                    </span>
                    {sorting?.field === "expensePlan.employee.fullName" &&
                      sorting?.direction &&
                      (sorting.direction === "asc" ? (
                        <PiArrowUp className="gba:inline gba:ml-1" size={12} />
                      ) : (
                        <PiArrowDown className="gba:inline gba:ml-1" size={12} />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[8%] gba:cursor-pointer"
                  onClick={() => updateSorting("createdAt")}
                  data-testid="advance-payments-creation-date-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:manager_expense_request_list.expense_table.creation_date",
                        "Creation Date",
                      )}
                    </span>
                    {sorting?.field === "createdAt" &&
                      sorting?.direction &&
                      (sorting.direction === "asc" ? (
                        <PiArrowUp className="gba:inline gba:ml-1" size={12} />
                      ) : (
                        <PiArrowDown className="gba:inline gba:ml-1" size={12} />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[12%] gba:cursor-pointer"
                  onClick={() => updateSorting("amount")}
                  data-testid="advance-payments-amount-header"
                >
                  <div className="gba:flex gba:items-center gba:justify-start gba:gap-1">
                    <span>
                      {getTranslationFromI18nKeyAndLabel("lowcoder:sales_hub.amount", "Amount")}
                    </span>
                    {sorting?.field === "amount" &&
                      sorting?.direction &&
                      (sorting.direction === "asc" ? (
                        <PiArrowUp className="gba:inline gba:ml-1" size={12} />
                      ) : (
                        <PiArrowDown className="gba:inline gba:ml-1" size={12} />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[20%] gba:cursor-pointer gba:pr-6"
                  onClick={() => updateSorting("status")}
                  data-testid="advance-payments-status-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:expense_item_list.expense_table.status",
                        "Status",
                      )}
                    </span>
                    {sorting?.field === "status" &&
                      sorting?.direction &&
                      (sorting.direction === "asc" ? (
                        <PiArrowUp className="gba:inline gba:ml-1" size={12} />
                      ) : (
                        <PiArrowDown className="gba:inline gba:ml-1" size={12} />
                      ))}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((record) => (
                <TableRow
                  key={record.id}
                  className="gba:cursor-pointer gba:hover:bg-accent"
                  onClick={() => setSelectedPayment(record)}
                >
                  <TableCell className="gba:w-[60px] gba:min-w-[60px] gba:max-w-[60px] gba:box-border gba:py-3 gba:px-4" data-testid={`advance-payments-actions-cell-${record.id}`}>
                    <div className="gba:flex gba:justify-start gba:items-center gba:gap-0">
                        <AppActionButton
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`advance-payments-update-button-${record.id}`}
                        size="icon"
                          className="gba:h-7 gba:w-7"
                        staticFlowData={[
                          {
                            category: getTranslationFromI18nKeyAndLabel(
                              "lowcoder:employee_list.flows_button.actions",
                              "Actions",
                            ),
                            key: "view-advance-payment-details",
                            label: getTranslationFromI18nKeyAndLabel(
                              "lowcoder:advance_payment_table.advance_payment_details",
                              "View Advance Payment Details",
                            ),
                            onClick: () => {
                              // Navigate to advance payment details page
                              const url = buildPlatformUrl(
                                "/platform/fin/expenses/advance-payment-record",
                                {
                                  advancePaymentId: record.id,
                                },
                              );
                              navigateTo(url);
                            },
                          },
                        ]}
                        prefixDataTestId="advance-payments-update"
                        accessToken={props.accessToken}
                        emptyStateBehavior="enable"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="gba:text-left gba:py-3 gba:px-4 gba:w-[12%]">
                    <div className="gba:font-medium gba:text-sm gba:whitespace-nowrap gba:truncate">
                      {record.expensePlan?.title ?? getTranslationFromI18nKeyAndLabel("lowcoder:common.not_available","N/A")}
                    </div>
                    <div className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap gba:truncate">
                      {record.expensePlan?.code ?? getTranslationFromI18nKeyAndLabel("lowcoder:common.not_available","N/A")}
                    </div>
                  </TableCell>
                  <TableCell className="gba:text-sm gba:py-3 gba:px-4">
                    {record.expensePlan?.startDate
                      ? (() => {
                          try {
                            const date = new Date(record.expensePlan.startDate);
                            const userLocale = getCurrentActiveUserLocale();
                            return date.toLocaleDateString(userLocale, {
                              month: "2-digit",
                              day: "2-digit",
                              year: "2-digit",
                            });
                          } catch (error) {
                            return getTranslationFromI18nKeyAndLabel("lowcoder:common.not_available","N/A");
                          }
                        })()
                      : getTranslationFromI18nKeyAndLabel("lowcoder:common.not_available","N/A")}
                  </TableCell>
                  <TableCell className="gba:text-sm gba:py-3 gba:px-4">
                    {record.expensePlan?.endDate
                      ? (() => {
                          try {
                            const date = new Date(record.expensePlan.endDate);
                            const userLocale = getCurrentActiveUserLocale();
                            return date.toLocaleDateString(userLocale, {
                              month: "2-digit",
                              day: "2-digit",
                              year: "2-digit",
                            });
                          } catch (error) {
                            return getTranslationFromI18nKeyAndLabel("lowcoder:common.not_available","N/A");
                          }
                        })()
                      : getTranslationFromI18nKeyAndLabel("lowcoder:common.not_available","N/A")}
                  </TableCell>
                  <TableCell>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Avatar className="gba:h-6 gba:w-6">
                        <AvatarImage
                          src={
                            record.expensePlan?.employee?.pictureThumbnail
                              ? `data:image/gif;base64,${record.expensePlan.employee.pictureThumbnail}`
                              : undefined
                          }
                          alt={record.expensePlan?.employee?.fullName}
                        />
                        <AvatarFallback>
                          {record.expensePlan?.employee?.displayName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="gba:font-medium gba:text-sm">
                        {record.expensePlan?.employee?.displayName ??
                          record.expensePlan?.employee?.fullName ??
                          getTranslationFromI18nKeyAndLabel("lowcoder:common.not_available","N/A")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="gba:text-sm gba:py-3 gba:px-4">
                    {record.createdAt
                      ? (() => {
                          try {
                            const date = new Date(record.createdAt);
                            const userLocale = getCurrentActiveUserLocale();
                            return date.toLocaleDateString(userLocale, {
                              month: "2-digit",
                              day: "2-digit",
                              year: "2-digit",
                            });
                          } catch (error) {
                            return getTranslationFromI18nKeyAndLabel("lowcoder:common.not_available","N/A");
                          }
                        })()
                      : getTranslationFromI18nKeyAndLabel("lowcoder:common.not_available","N/A")}
                  </TableCell>
                  <TableCell
                    className="gba:text-right"
                    data-testid={`advance-payments-amount-cell-${record.id}`}
                  >
                    <span className="gba:font-medium gba:text-sm">
                      {typeof record.amount === "number"
                        ? formatCurrencyDisplay(
                            record.amount,
                            (record.currencyRef || currencyFilter || "").replace(
                              "Currency:v1:",
                              "",
                            ) || "EUR",
                          )
                        : formatCurrencyDisplay(0, "EUR")}
                    </span>
                  </TableCell>
                  <TableCell className="gba:pr-6 gba:w-[20%]">
                    {(() => {
                      const status = getAdvancePaymentStatusDisplay(record.status);
                      const cls = ADV_STATUS_CLASSES[String(status.type).toLowerCase()] || ADV_STATUS_CLASSES.draft;
                      return (
                        <span
                          className={`gba:inline-block gba:rounded-full gba:px-3 gba:py-1 gba:text-xs gba:font-medium gba:whitespace-nowrap ${cls}`}
                          data-testid={`status-pill-${record.status.toLowerCase()}`}
                        >
                          {status.label}
                        </span>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination - Always show when there are records */}
        {totalCount > 0 && (
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4 gba:border-t gba:border-border"
            data-testid="advance-payments-pagination"
          >
            <div
              className="gba:text-sm gba:text-muted-foreground"
              data-testid="advance-payments-pagination-info"
            >
              {`${(currentPage - 1) * pageSize + 1}-${Math.min(
                currentPage * pageSize,
                totalCount,
              )} ${getTranslationFromI18nKeyAndLabel("lowcoder:personal_expenses.of", "of")} ${totalCount} ${getTranslationFromI18nKeyAndLabel("lowcoder:personal_expenses.advance_payments", "advance payments")}`}
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
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                  data-testid="advance-payments-page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div
                className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                data-testid="advance-payments-page-info"
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
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  data-testid="advance-payments-first-page-button"
                >
                  <span className="gba:sr-only">Go to first page</span>
                  ⟪⟪
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid="advance-payments-previous-page-button"
                >
                  <span className="gba:sr-only">Go to previous page</span>⟪
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid="advance-payments-next-page-button"
                >
                  <span className="gba:sr-only">Go to next page</span>⟫
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid="advance-payments-last-page-button"
                >
                  <span className="gba:sr-only">Go to last page</span>
                  ⟫⟫
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [error, isLoading, filteredPayments, totalCount, pageSize, currentPage]);

  return (
    <>
      {renderDataBody()}

      {/* Advance Payment Details Sheet */}
      {/* IMPORTANT: The 'title' prop is REQUIRED by @newwork/nw-design-system Sheet interface (line 20).
          Removing it causes TypeScript error: "Property 'title' is missing but required in type 'SheetProps'".
          SonarCloud incorrectly flags it as unsupported. Verified in Sheet.d.ts - title: string (required).
          The component renders the title internally. DO NOT REMOVE. */}
      <Sheet
        open={!!selectedPayment}
        onOpenChange={(open) => !open && setSelectedPayment(null)}
        title={
          selectedPayment?.expensePlan?.title ||
          getTranslationFromI18nKeyAndLabel(
            "lowcoder:advance_payment_details.title",
            "Advance Payment Details",
          )
        }
      >
        <SheetContent className="gba:w-[600px] gba:sm:gba:w-[600px] gba:max-w-none">
          <SheetHeader>
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-gray-900">
              {selectedPayment?.expensePlan?.title ||
                getTranslationFromI18nKeyAndLabel(
                  "lowcoder:advance_payment_details.title",
                  "Advance Payment Details",
                )}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:mt-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
            {selectedPayment && (
              <AdvancePaymentDetails payment={selectedPayment} {...contextProps} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AdvancePaymentsTable;
