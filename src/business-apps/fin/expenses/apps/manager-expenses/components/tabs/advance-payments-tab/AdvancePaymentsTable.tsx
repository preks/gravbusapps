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
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { formatCurrency } from "../../../utils/currencyUtils";
import { useAdvancePaymentFilters } from "../../../hooks/useAdvancePaymentFilters";
import { useMainViewAdvancePayments } from "../../../hooks/useMainViewAdvancePayments";
import { getAdvancePaymentStatusDisplay } from "../../../utils";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { navigateTo, buildPlatformUrl } from "@/common/utils/navigationUtils";
import { AdvancePayment as AdvancePaymentItem } from "../../../hooks/useMainViewAdvancePayments";
import AdvancePaymentDetails from "./AdvancePaymentDetails";
import Pill from "@/components/pill/Pill";

interface AdvancePaymentsTableProps extends BusinessAppContextProps {}

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = (props) => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = React.useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo,
    }),
    [props.accessToken, props.userInfo],
  );

  // Get managerId from userInfo for currency filtering
  const managerId = props.userInfo?.employeeDetails?.employeeId || "";

  // Use the advance payment filters hook with accessToken and managerId for dynamic currency data
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
    currencyFilter,
  } = useAdvancePaymentFilters({
    accessToken: props.accessToken,
    managerId,
  });

  // Local state management
  const [selectedPayment, setSelectedPayment] = useState<AdvancePaymentItem | null>(null);
  const [currentActionPlanId, setCurrentActionPlanId] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Use the new main view hook for advance payments
  const {
    payments,
    loading: isLoading,
    error,
    totalCount,
    approving,
    rejecting,
    approvePayment,
    rejectPayment,
    sorting,
    updateSorting,
  } = useMainViewAdvancePayments({
    ...contextProps,
    pageSize,
    searchTerm: searchTerm,
    currentStatusFilter: statusFilter || undefined,
    currentPage,
    currentCurrencyFilter: currencyFilter,
  });

  // Filter payments based on search and status (already handled by the hook)
  const filteredPayments = useMemo(() => payments, [payments]);

  // Handle page size changes
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  }, []);

  const handleApprovePayment = useCallback(
    async (paymentId: string) => {
      setCurrentActionPlanId(paymentId);
      try {
        await approvePayment(paymentId, "Approved");
      } finally {
        setCurrentActionPlanId("");
      }
    },
    [approvePayment],
  );

  const handleRejectPayment = useCallback(
    async (paymentId: string) => {
      setCurrentActionPlanId(paymentId);
      try {
        await rejectPayment(paymentId, "Rejected");
      } finally {
        setCurrentActionPlanId("");
      }
    },
    [rejectPayment],
  );

  // Render the table
  const renderDataBody = useCallback(() => {
    if (error) {
      return (
        <Alert variant="destructive">
          <div className="gba:font-medium">Error loading advance payments</div>
          <div className="gba:text-sm">
            {error.message || "An error occurred while loading advance payments."}
          </div>
        </Alert>
      );
    }

    if (!isLoading && filteredPayments.length === 0) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
          <span className="gba:text-gray-500">No advance payments found.</span>
        </div>
      );
    }

    return (
      <div className="gba:border gba:border-gray-200 gba:rounded-md gba:shadow-sm">
        {/* Table with horizontal scrolling */}
        <div className="gba:overflow-x-auto">
          <Table data-testid="advance-payments-table">
            <TableHeader>
              <TableRow>
                <TableHead className="gba:w-[8%]"></TableHead>
                <TableHead
                  className="gba:w-[25%] gba:cursor-pointer"
                  onClick={() => updateSorting("expensePlan.title")}
                  data-testid="advance-payments-title-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>Expense Plan</span>
                    {sorting.field === "expensePlan.title" &&
                      (sorting.order === "ASC" ? <ArrowUpOutlined /> : <ArrowDownOutlined />)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:cursor-pointer"
                  onClick={() => updateSorting("expensePlan.startDate")}
                  data-testid="advance-payments-start-date-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>Start Date</span>
                    {sorting.field === "expensePlan.startDate" &&
                      (sorting.order === "ASC" ? <ArrowUpOutlined /> : <ArrowDownOutlined />)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:cursor-pointer"
                  onClick={() => updateSorting("expensePlan.endDate")}
                  data-testid="advance-payments-end-date-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>End Date</span>
                    {sorting.field === "expensePlan.endDate" &&
                      (sorting.order === "ASC" ? <ArrowUpOutlined /> : <ArrowDownOutlined />)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[20%] gba:cursor-pointer"
                  onClick={() => updateSorting("expensePlan.employee.fullName")}
                  data-testid="advance-payments-employee-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>Employee</span>
                    {sorting.field === "expensePlan.employee.fullName" &&
                      (sorting.order === "ASC" ? <ArrowUpOutlined /> : <ArrowDownOutlined />)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[15%] gba:cursor-pointer"
                  onClick={() => updateSorting("createdAt")}
                  data-testid="advance-payments-creation-date-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>Creation Date</span>
                    {sorting.field === "createdAt" &&
                      (sorting.order === "ASC" ? <ArrowUpOutlined /> : <ArrowDownOutlined />)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[18%] gba:text-right gba:cursor-pointer"
                  onClick={() => updateSorting("amount")}
                  data-testid="advance-payments-amount-header"
                >
                  <div className="gba:flex gba:items-center gba:justify-end gba:gap-1">
                    <span>Amount</span>
                    {sorting.field === "amount" &&
                      (sorting.order === "ASC" ? <ArrowUpOutlined /> : <ArrowDownOutlined />)}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[18%] gba:cursor-pointer"
                  onClick={() => updateSorting("status")}
                  data-testid="advance-payments-status-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>Status</span>
                    {sorting.field === "status" &&
                      (sorting.order === "ASC" ? <ArrowUpOutlined /> : <ArrowDownOutlined />)}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((record) => (
                <TableRow
                  key={record.id}
                  className="gba:cursor-pointer gba:hover:bg-gray-50"
                  onClick={() => setSelectedPayment(record)}
                >
                  <TableCell data-testid={`advance-payments-actions-cell-${record.id}`}>
                    <div
                      className="gba:flex gba:justify-center gba:gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <AppActionButton
                        data-testid={`advance-payments-update-button-${record.id}`}
                        size="icon"
                        staticFlowData={[
                          {
                            category: getTranslationFromI18nKeyAndLabel(
                              "lowcoder:employee_list.flows_button.actions",
                              "Actions",
                            ),
                            key: "view-advance-payment-details",
                            label: getTranslationFromI18nKeyAndLabel(
                              "lowcoder:advance_payment_details.title",
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
                        emptyStateBehavior="disable"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="gba:text-left">
                    <div className="gba:font-medium gba:text-sm">
                      {record.expensePlan?.title ?? "N/A"}
                    </div>
                    <div className="gba:text-xs gba:text-gray-500">
                      {record.expensePlan?.code ?? "N/A"}
                    </div>
                  </TableCell>
                  <TableCell className="gba:text-sm">
                    {record.expensePlan?.startDate
                      ? (() => {
                          try {
                            const date = new Date(record.expensePlan.startDate);
                            return date.toLocaleDateString("en-US", {
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
                    {record.expensePlan?.endDate
                      ? (() => {
                          try {
                            const date = new Date(record.expensePlan.endDate);
                            return date.toLocaleDateString("en-US", {
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
                          "N/A"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="gba:text-sm">
                    {record.createdAt
                      ? (() => {
                          try {
                            const date = new Date(record.createdAt);
                            return date.toLocaleDateString("en-US", {
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
                  <TableCell
                    className="gba:text-right"
                    data-testid={`advance-payments-amount-cell-${record.id}`}
                  >
                    <span className="gba:font-medium gba:text-sm">
                      {typeof record.amount === "number"
                        ? formatCurrency(
                            record.amount,
                            (record.currencyRef || currencyFilter || "").replace(
                              "Currency:v1:",
                              "",
                            ),
                          )
                        : "N/A"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Pill
                      label={getAdvancePaymentStatusDisplay(record.status).label}
                      type={getAdvancePaymentStatusDisplay(record.status).type as any}
                      data-testid={`status-pill-${record.status.toLowerCase()}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination - Always show when there are records */}
        {totalCount > 0 && (
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4 gba:border-t gba:border-gray-200"
            data-testid="advance-payments-pagination"
          >
            <div
              className="gba:text-sm gba:text-gray-600"
              data-testid="advance-payments-pagination-info"
            >
              {`${(currentPage - 1) * pageSize + 1}-${Math.min(
                currentPage * pageSize,
                totalCount,
              )} of ${totalCount} advance payments`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">Rows per page</p>
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
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
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
  }, [
    error,
    isLoading,
    filteredPayments,
    approvePayment,
    rejectPayment,
    approving,
    rejecting,
    currentActionPlanId,
    totalCount,
    pageSize,
    currentPage,
  ]);

  return (
    <>
      <DataContainer
        contentBackground="white"
        dataControllerProps={{
          search: searchTerm,
          setSearch: setSearchTerm,
          debounceDelay: 300,
          filter: statusFilter || [],
          setFilter: (newFilters: string[]) => {
            setStatusFilter(newFilters.length > 0 ? newFilters : null);
          },
          filterLabelMap: filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    "lowcoder:backoffice_expense_landing_page.advance_title",
                    "Advance Payments",
                  )}
                </span>
                <span className="gba:text-gray-500">({totalCount})</span>
              </div>
            </div>
          ),
        }}
        dataFilterProps={{
          filterGroups: filterGroups,
          onFilterChange: handleDataFilterChange,
        }}
        hideFilter={false}
        dataBody={renderDataBody()}
        data-testid="advance-payments-container"
      />

      {/* Advance Payment Details Sheet */}
      <Sheet open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <SheetContent className="gba:w-[500px] gba:sm:gba:w-[500px] gba:max-w-none">
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
              <AdvancePaymentDetails
                payment={selectedPayment}
                onApprove={handleApprovePayment}
                onReject={handleRejectPayment}
                {...contextProps}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AdvancePaymentsTable;
