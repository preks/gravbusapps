import React, { useState, useCallback, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Spinner,
  Alert,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@newwork/nw-design-system";
import { PiArrowUp, PiArrowDown } from "react-icons/pi";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
// (replaced by REQUEST_STATUS_CLASSES)
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { ExpenseRequest, SortField } from "../../../hooks/useGetExpenseRequests";
import { getExpenseRequestStatusDisplay } from "../../../utils";
import ExpenseRequestDetails from "./ExpenseRequestDetails";
import {
  getTranslationFromI18nKeyAndLabel,
  getCurrentActiveUserLocale,
} from "@/common/utils/windowUtils";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { formatCurrencyDisplay } from "../../../../personal-expenses/utils";
import { Modal } from "antd";
import { useExpensePlanFileService } from "../../../../personal-expenses/utils/expensePlanFileService";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";

// Status → token classes (design-system)
const REQUEST_STATUS_CLASSES: Record<string, string> = {
  success: "gba:bg-success gba:text-success-foreground",
  warning: "gba:bg-warning gba:text-warning-foreground",
  info: "gba:bg-info gba:text-info-foreground",
  destructive: "gba:bg-destructive gba:text-destructive-foreground",
  offline: "gba:bg-offline gba:text-offline-foreground",
  // domain-specific aliases
  draft: "gba:bg-muted gba:text-muted-foreground",
  completed: "gba:bg-success gba:text-success-foreground",
  waiting: "gba:bg-info gba:text-info-foreground",
  task: "gba:bg-warning gba:text-warning-foreground",
  error: "gba:bg-destructive gba:text-destructive-foreground",
  preparing: "gba:bg-muted gba:text-muted-foreground",
};

interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  expenseRequests: ExpenseRequest[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  fetchRequests: (
    searchTerm?: string,
    page?: number,
    pageSize?: number,
    sortBy?: string,
    status?: string[],
    requestDateStart?: string,
    currencyFilter?: string | null,
  ) => Promise<void>;

  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedFilters: string[];
  filterGroups: any[];
  filterLabelMap: Record<string, string>;
  addFilter: (filter: string) => void;
  removeFilter: (filter: string) => void;
  handleDataFilterChange: (filterId: string, selected: boolean) => void;
  primaryCurrency: string | null;
}

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = (props) => {
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo,
    }),
    [props.accessToken, props.userInfo],
  );

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [printPdfUrl, setPrintPdfUrl] = useState<string>("");
  const [printLoading, setPrintLoading] = useState<boolean>(false);

  const [sorting, setSorting] = useState<{
    field: SortField | null;
    order: "ASC" | "DESC" | null;
    lastField: SortField | null;
  }>({
    field: null,
    order: null,
    lastField: null,
  });

  const {
    expenseRequests: requests,
    loading: isLoading,
    error,
    totalCount,
    fetchRequests,
    searchTerm,
    setSearchTerm,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    handleDataFilterChange,
    primaryCurrency,
  } = props;

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      setCurrentPage(1);
    },
    [setSearchTerm],
  );

  const handleSort = useCallback(
    (field: SortField) => {
      let newSorting: {
        field: SortField | null;
        order: "ASC" | "DESC" | null;
        lastField: SortField | null;
      };

      if (sorting.lastField === field) {
        if (sorting.order === "ASC") {
          newSorting = { field, order: "DESC", lastField: field };
        } else if (sorting.order === "DESC") {
          newSorting = { field: null, order: null, lastField: null };
        } else {
          newSorting = { field, order: "ASC", lastField: field };
        }
      } else {
        newSorting = { field, order: "ASC", lastField: field };
      }

      setSorting(newSorting);
      setCurrentPage(1);

      if (newSorting.field && newSorting.order) {
        const sortByParam = `${newSorting.field}:${newSorting.order.toLowerCase()}`;
        fetchRequests(
          searchTerm,
          1,
          pageSize,
          sortByParam,
          selectedFilters,
          undefined,
          primaryCurrency,
        );
      } else {
        fetchRequests(searchTerm, 1, pageSize, "none", selectedFilters, undefined, primaryCurrency);
      }
    },
    [
      setCurrentPage,
      sorting,
      fetchRequests,
      searchTerm,
      pageSize,
      selectedFilters,
      primaryCurrency,
    ],
  );

  const { printExpensePlan, isMounted } = useExpensePlanFileService(contextProps);

  const handlePrintRequest = useCallback(
    async (request: ExpenseRequest) => {
      setPrintLoading(true);
      setPrintModalOpen(true);

      try {
        // Map expense request to expense plan format for printing
        const mappedPlan = {
          id: request.id,
          code: request.code || "",
          title: request.title || getTranslationFromI18nKeyAndLabel("lowcoder:common.untitled_request","Untitled Request"),
          description: request.description || "",
          status: request.status,
          startDate: request.startDate || "",
          endDate: request.endDate || "",
          planDate: request.requestDate || "",
          totalAmount: request.totalAmount || 0,
          currency: { value: request.currency || "EUR", label: request.currency || "EUR" } as any,
          createdAt: request.createdAt || "",
          updatedAt: request.updatedAt || "",
          employeeDocument: request.employeeDocument || null,
          employee: {
            id: request.employee?.id || "",
            code: request.employee?.id || "",
            firstName:
              request.employee?.displayName?.split(" ")[0] ||
              request.employee?.fullName?.split(" ")[0] ||
              "",
            lastName:
              request.employee?.displayName?.split(" ").slice(1).join(" ") ||
              request.employee?.fullName?.split(" ").slice(1).join(" ") ||
              "",
            employeePosition: {
              organizationalUnit: {
                id: request.employee?.employeePosition?.organizationalUnit?.id || "",
                name: request.employee?.employeePosition?.organizationalUnit?.name || "",
              },
              siteLocation: {
                id: request.employee?.employeePosition?.siteLocation?.id || "",
                name: request.employee?.employeePosition?.siteLocation?.name || "",
              },
            },
          },

          reimbursableAmount: request.totalAmount || 0,
          decisionDate: null,
          requestTypeRef: null,
          employeeDocumentId: request.employeeDocument?.id || null,
          advancePaymentPaidAmount: 0,
          advancePaymentInTransitAmount: 0,
          requestType: null,
          expensePlanItem: [],
          advancePayment: null,
          expenseRequestTrip: null,
          currencyRef: `Currency:v1:${request.currency || "EUR"}`,
          expenseRequest: [],
        };

        const result = await printExpensePlan(mappedPlan);

        if (result.success && result.pdfUrl && isMounted.current) {
          setPrintPdfUrl(result.pdfUrl);
        } else if (!result.success) {
          console.error("Error printing request:", result.error);
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

  const handleViewRequestDetails = useCallback((request: ExpenseRequest) => {
    const url = buildPlatformUrl("/platform/fin/expenses/expense-request-record", {
      expenseRequestId: request.id,
    });
    navigateTo(url);
  }, []);

  const renderSortIndicator = useCallback(
    (field: SortField) => {
      if (sorting.lastField === field && sorting.order !== null) {
        if (sorting.order === "ASC") {
          return <PiArrowUp className="gba:inline gba:ml-1" size={12} />;
        } else if (sorting.order === "DESC") {
          return <PiArrowDown className="gba:inline gba:ml-1" size={12} />;
        }
      }
      return null;
    },
    [sorting],
  );

  const handleSelectRequest = useCallback((request: ExpenseRequest) => {
    setSelectedRequest(request);
  }, []);

  const handleApproveRequest = useCallback(async () => {
    setSelectedRequest(null);
  }, []);

  const handleRejectRequest = useCallback(async () => {
    setSelectedRequest(null);
  }, []);

  const renderDataBody = useCallback(() => {
    if (isLoading && requests.length === 0) {
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
          <Spinner className="gba:h-8 gba:w-8" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <div className="gba:font-medium">
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:team_expenses_page.dashboard_tab.error_loading_data",
              "Error loading data",
            )}
          </div>
          <div className="gba:text-sm gba:py-3 gba:px-4">{error}</div>
        </Alert>
      );
    }

    if (requests.length === 0) {
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12 gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:personal_expenses.no_expense_data_available",
            "No expense data available.",
          )}
        </div>
      );
    }

    return (
      <div>
        <div className="gba:overflow-x-auto gba:pr-4 gba:border gba:border-border gba:rounded-md gba:relative">
          {isLoading && requests.length > 0 && (
            <div
              className="gba:absolute gba:inset-0 gba:bg-background/50 gba:flex gba:items-center gba:justify-center gba:z-10"
              data-testid="expense-requests-loading-overlay"
            >
              <Spinner className="gba:h-8 gba:w-8" />
            </div>
          )}
          <Table data-testid="expense-requests-table" className="gba:w-full">
            <TableHeader className="gba:sticky gba:top-0 gba:bg-white gba:z-10 gba:border-b gba:border-border">
              <TableRow>
                <TableHead className="gba:w-[60px] gba:min-w-[60px] gba:max-w-[60px] gba:box-border"></TableHead>
                <TableHead
                  className="gba:w-[13%] gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort("title")}
                  data-testid="expense-requests-title-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:expense_request_list.expense_plan_table.title",
                        "Title",
                      )}
                    </span>
                    {renderSortIndicator("title")}
                  </div>
                </TableHead>
                <TableHead className="gba:w-[10%]">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:expense_calculation_rule.expense_table.code",
                    "Plan Code",
                  )}
                </TableHead>
                <TableHead
                  className="gba:w-[8%] gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort("startDate")}
                  data-testid="expense-requests-start-date-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:personal_expenses.start_date",
                        "Start Date",
                      )}
                    </span>
                    {renderSortIndicator("startDate")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[8%] gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort("endDate")}
                  data-testid="expense-requests-end-date-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:personal_expenses.end_date",
                        "End Date",
                      )}
                    </span>
                    {renderSortIndicator("endDate")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[20%] gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort("employee.fullName")}
                  data-testid="expense-requests-employee-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:hr_absences.create_absence.employee",
                        "Employee",
                      )}
                    </span>
                    {renderSortIndicator("employee.fullName")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[8%] gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort("requestDate")}
                  data-testid="expense-requests-request-date-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:manager_expense_request_list.expense_table.creation_date",
                        "Creation Date",
                      )}
                    </span>
                    {renderSortIndicator("requestDate")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[12%] gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort("amount")}
                  data-testid="expense-requests-amount-header"
                >
                  <div className="gba:flex gba:items-center gba:justify-start">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:manager_expense_request_list.expense_table.amount",
                        "Amount",
                      )}
                    </span>
                    {renderSortIndicator("amount")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[20%] gba:cursor-pointer gba:select-none gba:pr-6"
                  onClick={() => handleSort("status")}
                  data-testid="expense-requests-status-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:expense_request_details.status",
                        "Status",
                      )}
                    </span>
                    {renderSortIndicator("status")}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((record) => {
                const { type, label } = getExpenseRequestStatusDisplay(record.status);
                return (
                  <TableRow
                    key={record.id}
                    className="gba:cursor-pointer gba:hover:bg-accent"
                    onClick={() => handleSelectRequest(record)}
                    data-testid={`expense-requests-row-${record.id}`}
                  >
                    <TableCell className="gba:w-[60px] gba:min-w-[60px] gba:max-w-[60px] gba:box-border gba:py-4 gba:px-0" data-testid={`expense-requests-actions-cell-${record.id}`}>
                      <div className="gba:flex gba:justify-start gba:items-center gba:gap-0">
                        <AppActionButton
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`expense-requests-update-button-${record.id}`}
                          size="icon"
                          className="gba:h-7 gba:w-7"
                          staticFlowData={[
                            ...(record.employeeDocument?.file
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
                                    onClick: () => {
                                      handlePrintRequest(record);
                                    },
                                  },
                                ]
                              : []),
                            {
                              category: getTranslationFromI18nKeyAndLabel(
                                "lowcoder:employee_list.flows_button.navigations",
                                "Navigations",
                              ),
                              key: "view-request-details",
                              label: getTranslationFromI18nKeyAndLabel(
                                "lowcoder:expense_request_list.expense_request_flows.view_request_details",
                                "View Request Details",
                              ),
                              onClick: () => {
                                handleViewRequestDetails(record);
                              },
                            },
                          ]}
                          prefixDataTestId="expense-requests-update"
                          accessToken={props.accessToken}
                          emptyStateBehavior="enable"
                          deferMainContextRequestsUntilClick
                        />
                      </div>
                    </TableCell>
                    <TableCell className="gba:text-left gba:py-3 gba:px-4 gba:w-[13%]">
                      <div className="gba:font-medium gba:text-sm gba:whitespace-nowrap gba:truncate">
                        {record.title ?? getTranslationFromI18nKeyAndLabel("lowcoder:common.untitled_request","Untitled Request")}
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap gba:truncate">
                        {record.code ?? getTranslationFromI18nKeyAndLabel("lowcoder:common.not_available","N/A")}
                      </div>
                    </TableCell>
                    <TableCell className="gba:w-[10%] gba:py-4 gba:px-3 gba:text-sm">
                      {(record as any)?.expensePlan?.code ?? getTranslationFromI18nKeyAndLabel("lowcoder:common.not_available","N/A")}
                    </TableCell>
                    <TableCell
                      className="gba:text-sm gba:py-3 gba:px-4"
                      data-testid={`expense-requests-start-date-cell-${record.id}`}
                    >
                      {record.startDate
                        ? (() => {
                            try {
                              const date = new Date(record.startDate);
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
                      className="gba:text-sm gba:py-3 gba:px-4"
                      data-testid={`expense-requests-end-date-cell-${record.id}`}
                    >
                      {record.endDate
                        ? (() => {
                            try {
                              const date = new Date(record.endDate);
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
                    <TableCell data-testid={`expense-requests-employee-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Avatar className="gba:h-6 gba:w-6">
                          <AvatarImage
                            src={
                              record.employee?.pictureThumbnail
                                ? `data:image/gif;base64,${record.employee.pictureThumbnail}`
                                : undefined
                            }
                            alt={record.employee?.fullName}
                          />
                          <AvatarFallback>
                            {record.employee?.displayName?.charAt(0) ||
                              record.employee?.fullName?.charAt(0) ||
                              "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="gba:font-medium gba:text-sm">
                            {record.employee?.displayName || record.employee?.fullName}
                          </div>
                          <div className="gba:text-xs gba:text-muted-foreground">
                            {record.employee?.department || getTranslationFromI18nKeyAndLabel("lowcoder:common.not_available","N/A")}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell
                      className="gba:text-sm gba:py-3 gba:px-4"
                      data-testid={`expense-requests-request-date-cell-${record.id}`}
                    >
                      {record.requestDate
                        ? (() => {
                            try {
                              const date = new Date(record.requestDate);
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
                      className="gba:text-right gba:text-sm"
                      data-testid={`expense-request-amount-cell-${record.id}`}
                    >
                      {typeof record.amount === "number"
                        ? formatCurrencyDisplay(record.amount, record.currency)
                        : formatCurrencyDisplay(0, record.currency || "EUR")}
                    </TableCell>
                    <TableCell className="gba:pr-6 gba:w-[20%]">
                      <span
                        className={`gba:inline-block gba:rounded-full gba:px-3 gba:py-1 gba:text-xs gba:font-medium gba:whitespace-nowrap ${
                          REQUEST_STATUS_CLASSES[String(type).toLowerCase()] || REQUEST_STATUS_CLASSES.draft
                        }`}
                        data-testid={`status-pill-${record.status?.toLowerCase()}`}
                      >
                        {label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {totalCount > 0 && (
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4 gba:border-t gba:border-border"
            data-testid="expense-requests-pagination"
          >
            <div
              className="gba:text-sm gba:text-muted-foreground"
              data-testid="expense-requests-pagination-info"
            >
              {`${(currentPage - 1) * pageSize + 1}-${Math.min(
                currentPage * pageSize,
                totalCount,
              )} ${getTranslationFromI18nKeyAndLabel("lowcoder:personal_expenses.of", "of")} ${totalCount} ${getTranslationFromI18nKeyAndLabel("lowcoder:personal_expenses.expense_requests", "expense requests")}`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:personal_expenses.rows_per_page",
                    "Rows per page",
                  )}
                </p>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newPageSize = Number(e.target.value);
                    setPageSize(newPageSize);
                    setCurrentPage(1);
                    fetchRequests(
                      searchTerm,
                      1,
                      newPageSize,
                      sorting.field
                        ? `${sorting.field}:${sorting.order?.toLowerCase()}`
                        : "requestDate:desc",
                      selectedFilters,
                      undefined,
                      primaryCurrency,
                    );
                  }}
                  className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                  data-testid="expense-requests-page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div
                className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                data-testid="expense-requests-page-info"
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
                  onClick={() => {
                    setCurrentPage(1);
                    fetchRequests(
                      searchTerm,
                      1,
                      pageSize,
                      sorting.field
                        ? `${sorting.field}:${sorting.order?.toLowerCase()}`
                        : "requestDate:desc",
                      selectedFilters,
                      undefined,
                      primaryCurrency,
                    );
                  }}
                  disabled={currentPage === 1}
                  data-testid="expense-requests-first-page-button"
                >
                  <span className="gba:sr-only">Go to first page</span>
                  ⟪⟪
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => {
                    const newPage = currentPage - 1;
                    setCurrentPage(newPage);
                    fetchRequests(
                      searchTerm,
                      newPage,
                      pageSize,
                      sorting.field
                        ? `${sorting.field}:${sorting.order?.toLowerCase()}`
                        : "requestDate:desc",
                      selectedFilters,
                      undefined,
                      primaryCurrency,
                    );
                  }}
                  disabled={currentPage === 1}
                  data-testid="expense-requests-previous-page-button"
                >
                  <span className="gba:sr-only">Go to previous page</span>⟪
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => {
                    const newPage = currentPage + 1;
                    setCurrentPage(newPage);
                    fetchRequests(
                      searchTerm,
                      newPage,
                      pageSize,
                      sorting.field
                        ? `${sorting.field}:${sorting.order?.toLowerCase()}`
                        : "requestDate:desc",
                      selectedFilters,
                      undefined,
                      primaryCurrency,
                    );
                  }}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid="expense-requests-next-page-button"
                >
                  <span className="gba:sr-only">Go to next page</span>⟫
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => {
                    const lastPage = Math.ceil(totalCount / pageSize);
                    setCurrentPage(lastPage);
                    fetchRequests(
                      searchTerm,
                      lastPage,
                      pageSize,
                      sorting.field
                        ? `${sorting.field}:${sorting.order?.toLowerCase()}`
                        : "requestDate:desc",
                      selectedFilters,
                      undefined,
                      primaryCurrency,
                    );
                  }}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid="expense-requests-last-page-button"
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
  }, [requests, isLoading, error, totalCount, pageSize, currentPage]);

  return (
    <>
      <DataContainer
        key="expense-requests-data-container"
        dataControllerProps={{
          search: searchTerm,
          setSearch: handleSearchChange,
          filter: selectedFilters,
          setFilter: (newFilters: string[]): void => {
            const filtersToRemove = selectedFilters.filter((f) => !newFilters.includes(f));
            const filtersToAdd = newFilters.filter((f) => !selectedFilters.includes(f));

            filtersToRemove.forEach(removeFilter);
            filtersToAdd.forEach(addFilter);

            setCurrentPage(1);
          },
          filterLabelMap: filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:employee_list.flows_button.expense_requests",
                    "Expense Requests",
                  )}
                </span>
                <span className="gba:text-muted-foreground">({totalCount})</span>
              </div>
            </div>
          ),
          debounceDelay: 300,
        }}
        dataFilterProps={{
          filterGroups: filterGroups,
          onFilterChange: handleDataFilterChange,
        }}
        dataBody={renderDataBody()}
        contentBackground="white"
        data-testid="expense-requests-container"
      />

      {/* Expense Request Details Sheet */}
      {/* IMPORTANT: The 'title' prop is REQUIRED by @newwork/nw-design-system Sheet interface (line 20).
          Removing it causes TypeScript error: "Property 'title' is missing but required in type 'SheetProps'".
          SonarCloud incorrectly flags it as unsupported. Verified in Sheet.d.ts - title: string (required).
          The component renders the title internally. DO NOT REMOVE. */}
      <Sheet
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
        title={
          selectedRequest?.title ||
          getTranslationFromI18nKeyAndLabel(
            "lowcoder:expense_request_details.title",
            "Expense Request Details",
          )
        }
      >
        <SheetContent className="gba:w-[500px] gba:sm:gba:w-[500px] gba:max-w-none">
          <SheetHeader>
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-foreground">
              {selectedRequest?.title ||
                getTranslationFromI18nKeyAndLabel(
                  "lowcoder:expense_request_details.title",
                  "Expense Request Details",
                )}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:mt-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
            {selectedRequest && (
              <ExpenseRequestDetails
                request={selectedRequest}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
                {...contextProps}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Print Modal */}
      <Modal
        open={printModalOpen}
        title={getTranslationFromI18nKeyAndLabel("lowcoder:print.preview_title","Print Preview")}
        footer={null}
        onCancel={() => {
          setPrintModalOpen(false);
          setPrintPdfUrl("");
        }}
        width="90%"
        style={{ top: 20 }}
        destroyOnHidden={true}
        data-testid="print-request-modal"
      >
        {printLoading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Spinner />
          </div>
        ) : printPdfUrl ? (
          <iframe
            src={printPdfUrl}
            style={{ width: "100%", height: "calc(90vh - 55px)", border: "none" }}
            title={getTranslationFromI18nKeyAndLabel("lowcoder:print.preview_title","Print Preview")}
            data-testid="print-request-iframe"
          />
        ) : (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
            <div className="gba:text-muted-foreground gba:mb-4">{getTranslationFromI18nKeyAndLabel("lowcoder:print.no_document","No document available for printing")}</div>
            <div className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel("lowcoder:print.no_document_details","This expense request does not have an associated document to print.")}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default ExpenseRequestsTable;
