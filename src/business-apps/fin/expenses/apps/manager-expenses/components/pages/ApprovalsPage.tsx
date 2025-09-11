import React, { useState } from "react";
import {
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
  PageLayout,
} from "@newwork/nw-design-system";
import { PiMagnifyingGlass, PiArrowLeft, PiClipboardText } from "react-icons/pi";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { ApprovalRequest, useGetApprovals } from "../../hooks/useGetApprovals";
import {
  getTranslationFromI18nKeyAndLabel,
  getCurrentActiveUserLocale,
} from "@/common/utils/windowUtils";
import { formatCurrencyDisplay } from "../../../personal-expenses/utils";
import { getExpenseRequestStatusDisplay } from "../../utils";
import Pill from "@/components/pill";

interface ApprovalsPageProps extends BusinessAppContextProps {
  onNavigateBack: () => void;
}

const DATA_TEST_ID_PREFIX = "approvals-page";

const ApprovalsPage: React.FC<ApprovalsPageProps> = ({ onNavigateBack, ...props }) => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const {
    approvalRequests,
    searchTerm,
    setSearchTerm,
    pageSize,
    setPageSize,
    totalCount,
    currentPage,
    setCurrentPage,
    isLoading,
    error,
  } = useGetApprovals(props);

  const handleSearchClick = () => {
    setIsSearchExpanded(true);
  };

  const handleSearchBlur = () => {
    if (!searchTerm.trim()) {
      setIsSearchExpanded(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return (
    <div data-testid="approvals-page-container">
      {/* Back Button Above Everything */}
      <div className="gba:px-6 gba:pt-6 gba:pb-0">
        <button
          onClick={onNavigateBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="approvals-back-button"
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
          "lowcoder:team_expenses_page.dashboard_tab.pending_approvals",
          "Pending Approvals",
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          "lowcoder:team_expenses_page.dashboard_tab.review_subheader",
          "Review and process pending expense approval requests from your team",
        )}
        headerIcon={PiClipboardText}
        className="gba:min-h-screen"
      >
        <div className="gba:px-6" data-testid="approvals-page">
          {error && (
            <Alert className="gba:mb-4" data-testid="approvals-error-alert">
              <AlertDescription>
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {isLoading && !approvalRequests.length ? (
            <div className="gba:flex gba:justify-center gba:p-8">
              <Spinner data-testid="approvals-loading-spinner" />
            </div>
          ) : approvalRequests.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center">
              <div className="gba:text-gray-500 gba:text-lg gba:font-medium gba:mb-2">
                No pending approval requests found
              </div>
              <div className="gba:text-gray-400 gba:mb-4">
                All approval requests have been processed.
              </div>
            </div>
          ) : (
            <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
              {/* Search Bar - Collapsible like expense plans */}
              <div className="gba:mb-4 gba:flex gba:justify-between gba:items-center">
                <div className="gba:flex gba:items-center">
                  {!isSearchExpanded ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSearchClick}
                      className="gba:p-2 gba:h-8 gba:w-8"
                      data-testid="search-toggle-button"
                    >
                      <PiMagnifyingGlass className="gba:text-sm" />
                    </Button>
                  ) : (
                    <div className="gba:relative gba:w-64">
                      <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:text-sm" />
                      <input
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          "lowcoder:team_expenses_page.dashboard_tab.pending_approvals",
                          "Search approvals...",
                        )}
                        onChange={handleSearchChange}
                        onBlur={handleSearchBlur}
                        value={searchTerm}
                        className="gba:h-9 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:pl-10 gba:text-sm gba:ring-offset-background file:gba:border-0 file:gba:bg-transparent file:gba:text-sm file:gba:font-medium placeholder:gba:text-muted-foreground focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-ring focus-visible:gba:ring-offset-2 disabled:gba:cursor-not-allowed disabled:gba:opacity-50"
                        data-testid="approvals-search-input"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Table with horizontal scrolling - exactly like expense plans */}
              <div className="gba:overflow-x-auto">
                <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="gba:w-[15%]">
                        {getTranslationFromI18nKeyAndLabel(
                          "lowcoder:expense_request_list.expense_plan_table.date",
                          "Date",
                        )}
                      </TableHead>
                      <TableHead className="gba:w-[35%]">
                        {getTranslationFromI18nKeyAndLabel(
                          "lowcoder:employee_landing_page.request",
                          "Request",
                        )}
                      </TableHead>
                      <TableHead className="gba:w-[20%] gba:text-right">
                        {getTranslationFromI18nKeyAndLabel(
                          "lowcoder:expense_request_list.expense_plan_table.amount",
                          "Amount",
                        )}
                      </TableHead>
                      <TableHead className="gba:w-[15%]">
                        {getTranslationFromI18nKeyAndLabel(
                          "lowcoder:expense_request_list.expense_plan_table.status",
                          "Status",
                        )}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvalRequests.map((request: ApprovalRequest) => (
                      <TableRow
                        key={request.id}
                        data-testid={`${DATA_TEST_ID_PREFIX}-row-${request.id}`}
                        className="gba:cursor-pointer gba:hover:bg-gray-50"
                      >
                        <TableCell data-testid="approval-date" className="gba:text-sm">
                          {request.createdAt
                            ? (() => {
                                try {
                                  const date = new Date(request.createdAt);
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
                          <div>
                            <div className="gba:font-medium gba:text-sm">{request.title}</div>
                            <div className="gba:text-xs gba:text-gray-500">
                              {request.employee.firstName} {request.employee.lastName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="gba:text-right">
                          <span className="gba:font-medium gba:text-sm">
                            {formatCurrencyDisplay(
                              request.totalAmount !== undefined && request.totalAmount !== null
                                ? request.totalAmount
                                : 0,
                              "EUR",
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const { type, label } = getExpenseRequestStatusDisplay(request.status);
                            return (
                              <Pill
                                type={type as any}
                                label={label}
                                data-testid={`status-pill-${request.status?.toLowerCase()}`}
                              />
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination - Exactly like expense plans */}
              {totalCount > 0 && (
                <div
                  className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4 gba:border-t gba:border-gray-200"
                  data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}
                >
                  <div
                    className="gba:text-sm gba:text-gray-600"
                    data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info`}
                  >
                    {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} ${getTranslationFromI18nKeyAndLabel(
                      "lowcoder:personal_expenses.of",
                      "of",
                    )} ${totalCount} ${getTranslationFromI18nKeyAndLabel(
                      "lowcoder:team_expenses_page.dashboard_tab.approval_requests_footer",
                      "approval requests",
                    )}`}
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
                          handlePageSizeChange(newPageSize);
                        }}
                        className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
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
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
                      >
                        <span className="gba:sr-only">Go to first page</span>
                        ⟨⟨
                      </Button>
                      <Button
                        variant="outline"
                        className="gba:h-8 gba:w-8 gba:p-0"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        data-testid={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
                      >
                        <span className="gba:sr-only">Go to previous page</span>⟨
                      </Button>
                      <Button
                        variant="outline"
                        className="gba:h-8 gba:w-8 gba:p-0"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                        data-testid={`${DATA_TEST_ID_PREFIX}-next-page-button`}
                      >
                        <span className="gba:sr-only">Go to next page</span>⟩
                      </Button>
                      <Button
                        variant="outline"
                        className="gba:h-8 gba:w-8 gba:p-0"
                        onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                        disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                        data-testid={`${DATA_TEST_ID_PREFIX}-last-page-button`}
                      >
                        <span className="gba:sr-only">Go to last page</span>
                        ⟩⟩
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PageLayout>
    </div>
  );
};

export default ApprovalsPage;
