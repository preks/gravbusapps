import React, { useState } from 'react';
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
} from '@newwork/nw-design-system';
import { PiMagnifyingGlass, PiArrowLeft } from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ApprovalRequest } from '../../types';
import { useFlowExecutionTasks } from '../../hooks/useFlowExecutionTasks';
import { mapFlowTasksToApprovalRequests } from '../../utils/flowTaskMapper';
import { validateTaskSelection } from '../../utils/taskValidation';
import {
  getTranslationFromI18nKeyAndLabel,
  getCurrentActiveUserLocale,
} from '@/common/utils/windowUtils';
import { formatCurrencyDisplay } from '../../../personal-expenses/utils';
import { getExpenseRequestStatusDisplay } from '../../utils';
import Pill from '@/components/pill';

interface ApprovalsPageProps extends BusinessAppContextProps {
  onNavigateBack: () => void;
}

const DATA_TEST_ID_PREFIX = 'approvals-page';

const ApprovalsPage: React.FC<ApprovalsPageProps> = ({ onNavigateBack, ...props }) => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<ApprovalRequest[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    tasks,
    searchTerm,
    setSearchTerm,
    pageSize,
    setPageSize,
    totalCount,
    currentPage,
    setCurrentPage,
    isLoading,
    error,
  } = useFlowExecutionTasks(props);

  // Map flow execution tasks to approval requests for UI compatibility
  const approvalRequests = mapFlowTasksToApprovalRequests(tasks);

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
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleTaskSelection = (task: ApprovalRequest) => {
    setValidationError(null);

    const isAlreadySelected = selectedTasks.some((selected) => selected.id === task.id);

    if (isAlreadySelected) {
      setSelectedTasks((prev) => prev.filter((selected) => selected.id !== task.id));
      return;
    }

    const validation = validateTaskSelection(selectedTasks, task);

    if (!validation.isValid) {
      setValidationError(validation.errorMessage || 'Invalid task selection');
      return;
    }

    setSelectedTasks((prev) => [...prev, task]);
  };

  const handleClearSelection = () => {
    setSelectedTasks([]);
    setValidationError(null);
  };

  return (
    <div data-testid="approvals-page-container">
      <div className="gba:px-6 gba:pt-6 gba:pb-0">
        <button
          onClick={onNavigateBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="approvals-back-button"
        >
          <PiArrowLeft className="gba:mr-2" />
          <span>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.back_to_btn',
              'Back to Dashboard',
            )}
          </span>
        </button>
      </div>

      <PageLayout
        headerTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.pending_approvals',
          'Pending Approvals',
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.review_subheader',
          'Review and process pending expense approval requests from your team',
        )}
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

          {validationError && (
            <Alert className="gba:mb-4" data-testid="validation-error-alert">
              <AlertDescription>
                <strong>Selection Error:</strong> {validationError}
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
              <div className="gba:mb-4 gba:flex gba:justify-between gba:items-center">
                <div className="gba:flex gba:items-center gba:gap-4">
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
                          'lowcoder:team_expenses_page.dashboard_tab.pending_approvals',
                          'Search approvals...',
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

                  {selectedTasks.length > 0 && (
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span className="gba:text-sm gba:text-gray-600">
                        {selectedTasks.length} selected
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearSelection}
                        data-testid="clear-selection-button"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="gba:overflow-x-auto">
                <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="gba:w-[5%]">
                        <input
                          type="checkbox"
                          checked={
                            selectedTasks.length > 0 &&
                            selectedTasks.length === approvalRequests.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (selectedTasks.length > 0) {
                                const firstTaskGroup = selectedTasks[0].taskGroup;
                                const sameTypeTasks = approvalRequests.filter(
                                  (task) => task.taskGroup === firstTaskGroup,
                                );
                                setSelectedTasks(sameTypeTasks);
                              } else {
                                setSelectedTasks(approvalRequests);
                              }
                            } else {
                              setSelectedTasks([]);
                            }
                          }}
                          data-testid="select-all-checkbox"
                        />
                      </TableHead>
                      <TableHead className="gba:w-[15%]">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_request_list.expense_plan_table.date',
                          'Date',
                        )}
                      </TableHead>
                      <TableHead className="gba:w-[20%]">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:employee_landing_page.request',
                          'Title',
                        )}
                      </TableHead>
                      <TableHead className="gba:w-[20%]">Task Group</TableHead>

                      <TableHead className="gba:w-[15%]">Employee</TableHead>
                      <TableHead className="gba:w-[10%]">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_request_list.expense_plan_table.status',
                          'Status',
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
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedTasks.some((selected) => selected.id === request.id)}
                            onChange={() => handleTaskSelection(request)}
                            data-testid={`task-checkbox-${request.id}`}
                          />
                        </TableCell>
                        <TableCell data-testid="approval-date" className="gba:text-sm">
                          {request.createdAt
                            ? (() => {
                                try {
                                  const date = new Date(request.createdAt);
                                  const userLocale = getCurrentActiveUserLocale();
                                  return (
                                    date.toLocaleDateString(userLocale, {
                                      month: '2-digit',
                                      day: '2-digit',
                                      year: '2-digit',
                                    }) +
                                    ' ' +
                                    date.toLocaleTimeString(userLocale, {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  );
                                } catch (error) {
                                  return 'N/A';
                                }
                              })()
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="gba:font-medium gba:text-sm">{request.title}</div>
                        </TableCell>
                        <TableCell>
                          <span className="gba:text-sm">{request.taskGroup}</span>
                        </TableCell>

                        <TableCell>
                          <div className="gba:text-sm">
                            {request.employee.firstName} {request.employee.lastName}
                          </div>
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
                      'lowcoder:personal_expenses.of',
                      'of',
                    )} ${totalCount} ${getTranslationFromI18nKeyAndLabel(
                      'lowcoder:team_expenses_page.dashboard_tab.approval_requests_footer',
                      'approval requests',
                    )}`}
                  </div>
                  <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
                    <div className="gba:flex gba:items-center gba:space-x-2">
                      <p className="gba:text-sm gba:font-medium">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:personal_expenses.rows_per_page',
                          'Rows per page',
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
                      {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.page', 'Page')}{' '}
                      {currentPage}{' '}
                      {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')}{' '}
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
