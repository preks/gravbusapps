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
} from "@newwork/nw-design-system";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import Pill from "@/components/pill/Pill";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import {
  ExpenseRequest,
  SortField,
} from "../../../hooks/useGetExpenseRequests";
import { getExpenseRequestStatusDisplay } from "../../../utils";
import ExpenseRequestDetails from "./ExpenseRequestDetails";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { formatCurrency } from "../../../utils/currencyUtils";

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
    currencyFilter?: string | null
  ) => Promise<void>;

  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedFilters: string[];
  filterGroups: any[];
  filterLabelMap: Record<string, string>;
  addFilter: (filter: string) => void;
  removeFilter: (filter: string) => void;
  handleDataFilterChange: (filterId: string, selected: boolean) => void;
}

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = (props) => {
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo,
    }),
    [props.accessToken, props.userInfo]
  );

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(
    null
  );

  const {
    expenseRequests: requests,
    loading: isLoading,
    error,
    totalCount,
    searchTerm,
    setSearchTerm,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    handleDataFilterChange,
  } = props;

  const [sorting, setSorting] = useState<{
    field: SortField;
    order: "ASC" | "DESC";
  }>({
    field: "requestDate",
    order: "DESC",
  });

  const updateSorting = useCallback((field: SortField) => {
    setSorting((prevSorting) => {
      if (prevSorting.field === field) {
        return {
          field,
          order: prevSorting.order === "ASC" ? "DESC" : "ASC",
        };
      }

      return {
        field,
        order: "DESC",
      };
    });
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      setCurrentPage(1);
    },
    [setSearchTerm]
  );

  const handleSort = useCallback(
    (field: SortField) => {
      updateSorting(field);
      setCurrentPage(1);
    },
    [updateSorting, setCurrentPage]
  );

  const renderSortIndicator = useCallback(
    (field: SortField) => {
      if (sorting.field === field) {
        return sorting.order === "ASC" ? (
          <ArrowUpOutlined className="gba:ml-1 gba:text-blue-500" />
        ) : (
          <ArrowDownOutlined className="gba:ml-1 gba:text-blue-500" />
        );
      }
      return null;
    },
    [sorting]
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
          <div className="gba:font-medium">Error loading expense requests</div>
          <div className="gba:text-sm">{error}</div>
        </Alert>
      );
    }

    if (requests.length === 0) {
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12 gba:text-gray-500">
          No expense requests found.
        </div>
      );
    }

    return (
      <div>
        <div className="gba:overflow-x-auto gba:border gba:border-gray-200 gba:rounded-md gba:shadow-sm gba:relative">
          {isLoading && requests.length > 0 && (
            <div
              className="gba:absolute gba:inset-0 gba:bg-white/50 gba:flex gba:items-center gba:justify-center gba:z-10"
              data-testid="expense-requests-loading-overlay"
            >
              <Spinner className="gba:h-8 gba:w-8" />
            </div>
          )}
          <Table data-testid="expense-requests-table">
            <TableHeader>
              <TableRow>
                <TableHead className="gba:w-[60px]"></TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort("title")}
                  data-testid="expense-requests-title-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:expense_request_details.title",
                        "Request Title"
                      )}
                    </span>
                    {renderSortIndicator("title")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort("startDate")}
                  data-testid="expense-requests-start-date-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:expense_request_details.start_date",
                        "Start Date"
                      )}
                    </span>
                    {renderSortIndicator("startDate")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort("endDate")}
                  data-testid="expense-requests-end-date-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:expense_request_details.end_date",
                        "End Date"
                      )}
                    </span>
                    {renderSortIndicator("endDate")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort("employee.fullName")}
                  data-testid="expense-requests-employee-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:expense_request_details.employee",
                        "Employee"
                      )}
                    </span>
                    {renderSortIndicator("employee.fullName")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort("requestDate")}
                  data-testid="expense-requests-request-date-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:expense_request_details.creation_date",
                        "Creation Date"
                      )}
                    </span>
                    {renderSortIndicator("requestDate")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:text-right gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort("amount")}
                  data-testid="expense-requests-amount-header"
                >
                  <div className="gba:flex gba:items-center gba:justify-end">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:expense_request_details.amount",
                        "Amount"
                      )}
                    </span>
                    {renderSortIndicator("amount")}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort("status")}
                  data-testid="expense-requests-status-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        "lowcoder:expense_request_details.status",
                        "Status"
                      )}
                    </span>
                    {renderSortIndicator("status")}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((record) => {
                const { type, label } = getExpenseRequestStatusDisplay(
                  record.status
                );
                return (
                  <TableRow
                    key={record.id}
                    className="gba:cursor-pointer gba:hover:bg-gray-50"
                    onClick={() => handleSelectRequest(record)}
                    data-testid={`expense-requests-row-${record.id}`}
                  >
                    <TableCell
                      data-testid={`expense-requests-actions-cell-${record.id}`}
                    >
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`expense-requests-update-button-${record.id}`}
                          contextsArray={[FlowContextName.expenseRequests]}
                          externalContextData={{
                            expenseRequestId: record.id,
                          }}
                          prefixDataTestId="expense-requests-update"
                          accessToken={props.accessToken}
                          emptyStateBehavior="disable"
                          deferMainContextRequestsUntilClick
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="gba:text-left">
                      <div className="gba:font-medium gba:text-sm">
                        {record.title ?? "Untitled Request"}
                      </div>
                      <div className="gba:text-xs gba:text-gray-500">
                        {record.code ?? "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="gba:text-sm">
                      {record.startDate
                        ? (() => {
                            try {
                              const date = new Date(record.startDate);
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
                      {record.endDate
                        ? (() => {
                            try {
                              const date = new Date(record.endDate);
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
                            {record.employee?.displayName ||
                              record.employee?.fullName}
                          </div>
                          <div className="gba:text-xs gba:text-gray-500">
                            {record.employee?.department || "N/A"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="gba:text-sm">
                      {record.requestDate
                        ? (() => {
                            try {
                              const date = new Date(record.requestDate);
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
                      className="gba:text-right gba:text-sm"
                      data-testid={`expense-request-amount-cell-${record.id}`}
                    >
                      {typeof record.amount === "number"
                        ? formatCurrency(record.amount, record.currency)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Pill
                        type={type as any}
                        label={label}
                        data-testid={`status-pill-${record.status?.toLowerCase()}`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {totalCount > 0 && (
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4 gba:border-t gba:border-gray-200"
            data-testid="expense-requests-pagination"
          >
            <div
              className="gba:text-sm gba:text-gray-600"
              data-testid="expense-requests-pagination-info"
            >
              {`${(currentPage - 1) * pageSize + 1}-${Math.min(
                currentPage * pageSize,
                totalCount
              )} of ${totalCount} expense requests`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">Rows per page</p>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newPageSize = Number(e.target.value);
                    setPageSize(newPageSize);
                    setCurrentPage(1);
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
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  data-testid="expense-requests-first-page-button"
                >
                  <span className="gba:sr-only">Go to first page</span>
                  ⟪⟪
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid="expense-requests-previous-page-button"
                >
                  <span className="gba:sr-only">Go to previous page</span>⟪
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid="expense-requests-next-page-button"
                >
                  <span className="gba:sr-only">Go to next page</span>⟫
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() =>
                    setCurrentPage(Math.ceil(totalCount / pageSize))
                  }
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
    <DataContainer
      dataControllerProps={{
        search: searchTerm,
        setSearch: handleSearchChange,
        filter: selectedFilters,
        setFilter: (newFilters: string[]): void => {
          const filtersToRemove = selectedFilters.filter(
            (f) => !newFilters.includes(f)
          );
          const filtersToAdd = newFilters.filter(
            (f) => !selectedFilters.includes(f)
          );

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
                  "Expense Requests"
                )}
              </span>
              <span className="gba:text-gray-500">({totalCount})</span>
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
      dataDetails={
        selectedRequest
          ? {
              title: "Expense Request Details",
              content: (
                <ExpenseRequestDetails
                  request={selectedRequest}
                  onApprove={handleApproveRequest}
                  onReject={handleRejectRequest}
                  {...contextProps}
                />
              ),
              onClose: () => {
                setSelectedRequest(null);
              },
            }
          : undefined
      }
      data-testid="expense-requests-container"
    />
  );
};

export default ExpenseRequestsTable;
