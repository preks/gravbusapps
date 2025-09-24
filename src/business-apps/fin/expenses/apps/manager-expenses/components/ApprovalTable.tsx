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
} from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ApprovalRequest } from '../types';
import { mapFlowTasksToApprovalRequests } from '../utils/flowTaskMapper';
import { validateTaskSelection } from '../utils/taskValidation';
import {
  getTranslationFromI18nKeyAndLabel,
  getCurrentActiveUserLocale,
} from '@/common/utils/windowUtils';
import { getExpenseRequestStatusDisplay } from '../utils';
import Pill from '@/components/pill';
import { getTabByKey } from '../constants/approvalTabs';
import { env } from '@/common/env/EnvUtils';

interface ApprovalTableProps extends BusinessAppContextProps {
  tasks: any[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  selectedTasks: ApprovalRequest[];
  setSelectedTasks: (tasks: ApprovalRequest[]) => void;
  validationError: string | null;
  setValidationError: (error: string | null) => void;
  dataTestIdPrefix: string;
  tabKey: string; // The current tab key to determine approval process
}

const ApprovalTable: React.FC<ApprovalTableProps> = ({
  tasks,
  totalCount,
  isLoading,
  error,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  selectedTasks,
  setSelectedTasks,
  validationError,
  setValidationError,
  dataTestIdPrefix,
  tabKey,
  userInfo,
  accessToken,
  additionalData,
}) => {
  // Map flow execution tasks to approval requests for UI compatibility
  // Keep raw tasks for entity ID extraction and map for display
  const rawTasks = tasks; // Raw FlowExecutionTask[] from API
  const approvalRequests = mapFlowTasksToApprovalRequests(tasks);

  // Approval state
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleTaskSelection = (task: ApprovalRequest) => {
    setValidationError(null);

    const isAlreadySelected = selectedTasks.some((selected) => selected.id === task.id);

    if (isAlreadySelected) {
      setSelectedTasks(
        selectedTasks.filter((selected: ApprovalRequest) => selected.id !== task.id),
      );
      return;
    }

    const validation = validateTaskSelection(selectedTasks, task);

    if (!validation.isValid) {
      setValidationError(validation.errorMessage || 'Invalid task selection');
      return;
    }

    setSelectedTasks([...selectedTasks, task]);
  };

  const handleClearSelection = () => {
    setSelectedTasks([]);
    setValidationError(null);
  };

  // Get the tab configuration for the current tab
  const tabConfig = getTabByKey(tabKey);

  // Handle approval button click
  const handleApproveClick = async () => {
    if (selectedTasks.length === 0) {
      setValidationError('Please select at least one task to approve');
      return;
    }

    if (!tabConfig || !userInfo) {
      setApprovalError('Missing configuration or user information');
      return;
    }

    setIsApproving(true);
    setApprovalError(null);

    try {
      // Create approval payload based on tab type
      const approvalPayload = createApprovalPayload(
        selectedTasks,
        tabConfig,
        '', // No message since we removed the dialog
        userInfo,
      );

      for (const task of selectedTasks) {
        try {
          const originalTask = rawTasks.find((t) => t.id === task.id);
          if (!originalTask) {
            throw new Error(`Could not find original task data for ${task.id}`);
          }

          const domain = 'employee-expense';
          const processName = tabConfig.processName;

          const taskInstanceId = task.id;

          const taskName = originalTask.name || 'approveTask';

          const userId = userInfo?.id;

          let processInstanceId = originalTask.processInstanceId;

          if (!processInstanceId && originalTask.endpoint) {
            const endpointParts = originalTask.endpoint.split('/');
            const processNameIndex = endpointParts.findIndex((part) => part === processName);

            if (processNameIndex !== -1 && endpointParts[processNameIndex + 1]) {
              processInstanceId = endpointParts[processNameIndex + 1];
            }
          }

          if (!processInstanceId) {
            processInstanceId = task.id;
          }

          if (!userId) {
            throw new Error('User ID not available');
          }

          if (!processInstanceId) {
            throw new Error('Process instance ID not available');
          }

          const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? '';
          const url = `${baseUrl}/processes/${domain}/${processName}/${processInstanceId}/${taskName}/${taskInstanceId}?phase=complete&user=${userId}`;

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(approvalPayload),
          });

          if (!response.ok) {
            const responseText = await response.text();
            throw new Error(
              `API request failed: ${response.status} - ${response.statusText} - ${responseText}`,
            );
          }

          await response.json();
        } catch (taskError) {
          throw taskError; // Re-throw to be caught by the outer try-catch
        }
      }

      // Clear selection
      setSelectedTasks([]);
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : 'Failed to approve tasks');
    } finally {
      setIsApproving(false);
    }
  };

  // Create approval payload based on tab type
  const createApprovalPayload = (
    tasks: ApprovalRequest[],
    tabConfig: any,
    message: string,
    userInfo: any,
  ) => {
    const today = new Date().toISOString();
    const employeeId = userInfo?.employeeDetails?.employeeId;

    // Get the original task data to access variables
    // Find the original task from the tasks array that corresponds to the first selected task
    const firstSelectedTask = tasks.find((task) => task.id === selectedTasks[0].id);

    if (!firstSelectedTask) {
      throw new Error('Could not find original task data');
    }

    // Extract entity ID from task data
    const getEntityId = (task: any, tabKey: string) => {
      // Try to get the actual entity ID from task variables first
      let entityId = null;
      if (task.variables) {
        switch (tabKey) {
          case 'advance-payment':
            entityId =
              task.variables.advancePaymentId ||
              task.variables.paymentId ||
              task.variables.advancePayment?.id;
            break;
          case 'expense-request':
            entityId =
              task.variables.expenseRequestId ||
              task.variables.requestId ||
              task.variables.expenseRequest?.id;
            break;
          case 'expense-plan':
            entityId =
              task.variables.expensePlanId ||
              task.variables.planId ||
              task.variables.expensePlan?.id;
            break;
          case 'handout-payment':
            entityId =
              task.variables.handoutPaymentId ||
              task.variables.paymentId ||
              task.variables.handoutPayment?.id;
            break;
          case 'transfer-payment':
            entityId =
              task.variables.transferPaymentId ||
              task.variables.paymentId ||
              task.variables.transferPayment?.id;
            break;
        }
        if (entityId) {
          return entityId;
        }
      }

      // If not found in variables, extract process instance ID from endpoint
      if (task.endpoint) {
        const endpointParts = task.endpoint.split('/');
        const processNameIndex = endpointParts.findIndex(
          (part: string) =>
            part === 'approveExpensePlan' ||
            part === 'approveExpenseRequest' ||
            part === 'approveAdvancePayment' ||
            part === 'handOutAdvancePayment' ||
            part === 'transferAdvancePayment',
        );

        if (processNameIndex !== -1 && endpointParts[processNameIndex + 1]) {
          entityId = endpointParts[processNameIndex + 1];
        }
      }

      // Fallback to processInstanceId if available
      if (!entityId && task.processInstanceId) {
        entityId = task.processInstanceId;
      }

      // Final fallback to task ID
      if (!entityId) {
        entityId = task.id;
      }

      return entityId;
    };

    const entityId = getEntityId(
      rawTasks.find((t) => t.id === firstSelectedTask.id),
      tabConfig.key,
    );

    // Create payload based on tab type
    switch (tabConfig.key) {
      case 'expense-plan':
        return {
          event: 'pse_approve',
          expensePlanComment: {
            commentDate: today.slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
            comment: message || '',
            commentType: 'APPROVE_COMMENT',
            authorEmployee: employeeId,
            expensePlan: entityId,
          },
        };

      case 'expense-request':
        return {
          event: 'pse_approve',
          expenseRequestComment: {
            commentDate: today.slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
            comment: message || '',
            commentType: 'APPROVE_COMMENT',
            authorEmployee: employeeId,
            expenseRequest: entityId,
          },
        };

      case 'advance-payment':
        return {
          event: 'pse_approve',
          advancePaymentComment: {
            commentDate: today.slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
            comment: message || '',
            commentType: 'APPROVE_COMMENT',
            authorEmployee: employeeId,
            advancePayment: entityId,
          },
        };

      case 'handout-payment':
        return {
          event: 'pse_approve',
          handoutPaymentComment: {
            commentDate: today.slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
            comment: message || '',
            commentType: 'APPROVE_COMMENT',
            authorEmployee: employeeId,
            handoutPayment: entityId,
          },
        };

      case 'transfer-payment':
        return {
          event: 'pse_approve',
          transferPaymentComment: {
            commentDate: today.slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
            comment: message || '',
            commentType: 'APPROVE_COMMENT',
            authorEmployee: employeeId,
            transferPayment: entityId,
          },
        };

      default:
        throw new Error(`Unknown tab type: ${tabConfig.key}`);
    }
  };

  if (isLoading && !approvalRequests.length) {
    return (
      <div className="gba:flex gba:justify-center gba:p-8">
        <Spinner data-testid={`${dataTestIdPrefix}-loading-spinner`} />
      </div>
    );
  }

  if (approvalRequests.length === 0) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center">
        <div className="gba:text-gray-500 gba:text-lg gba:font-medium gba:mb-2">
          No pending approval requests found
        </div>
        <div className="gba:text-gray-400 gba:mb-4">All approval requests have been processed.</div>
      </div>
    );
  }

  return (
    <div data-testid={`${dataTestIdPrefix}-container`}>
      {error && (
        <Alert className="gba:mb-4" data-testid={`${dataTestIdPrefix}-error-alert`}>
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {validationError && (
        <Alert className="gba:mb-4" data-testid={`${dataTestIdPrefix}-validation-error-alert`}>
          <AlertDescription>
            <strong>Selection Error:</strong> {validationError}
          </AlertDescription>
        </Alert>
      )}

      {selectedTasks.length > 0 && (
        <div className="gba:mb-4 gba:flex gba:justify-between gba:items-center">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-gray-600">{selectedTasks.length} selected</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSelection}
              data-testid={`${dataTestIdPrefix}-clear-selection-button`}
            >
              Clear Selection
            </Button>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleApproveClick}
            disabled={isApproving}
            data-testid={`${dataTestIdPrefix}-approve-button`}
          >
            {isApproving
              ? 'Approving...'
              : `Approve ${selectedTasks.length} Task${selectedTasks.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      )}

      {/* Error Display */}
      {approvalError && (
        <Alert variant="destructive" className="gba:mb-4">
          <AlertDescription>
            <strong>Error:</strong> {approvalError}
          </AlertDescription>
        </Alert>
      )}

      <div className="gba:overflow-x-auto">
        <Table data-testid={`${dataTestIdPrefix}-table`}>
          <TableHeader>
            <TableRow>
              <TableHead className="gba:w-[5%]">
                <input
                  type="checkbox"
                  checked={
                    selectedTasks.length > 0 && selectedTasks.length === approvalRequests.length
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
                  data-testid={`${dataTestIdPrefix}-select-all-checkbox`}
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
                className="gba:cursor-pointer gba:hover:bg-gray-50"
                onClick={() => handleTaskSelection(request)}
                data-testid={`${dataTestIdPrefix}-table-row-${request.id}`}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedTasks.some((selected) => selected.id === request.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleTaskSelection(request);
                    }}
                    data-testid={`${dataTestIdPrefix}-select-checkbox-${request.id}`}
                  />
                </TableCell>
                <TableCell>
                  {request.requestDate
                    ? new Intl.DateTimeFormat(getCurrentActiveUserLocale(), {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      }).format(new Date(request.requestDate))
                    : '-'}
                </TableCell>
                <TableCell>
                  <div className="gba:font-medium gba:text-gray-900">{request.title}</div>
                </TableCell>
                <TableCell>
                  <div className="gba:text-sm gba:text-gray-600">{request.taskGroup}</div>
                </TableCell>
                <TableCell>
                  <div className="gba:text-sm gba:text-gray-900">{request.employee.fullName}</div>
                </TableCell>
                <TableCell>
                  {(() => {
                    const { type, label } = getExpenseRequestStatusDisplay(request.status);
                    return (
                      <Pill
                        type={type as any}
                        label={label}
                        data-testid={`${dataTestIdPrefix}-status-pill-${request.status?.toLowerCase()}`}
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
          data-testid={`${dataTestIdPrefix}-pagination`}
        >
          <div
            className="gba:text-sm gba:text-gray-600"
            data-testid={`${dataTestIdPrefix}-pagination-info`}
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
                className="gba:h-8 gba:w-16 gba:rounded gba:border gba:border-gray-300 gba:bg-white gba:px-2 gba:py-1 gba:text-sm"
                data-testid={`${dataTestIdPrefix}-page-size-select`}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                data-testid={`${dataTestIdPrefix}-first-page-button`}
              >
                <span className="gba:sr-only">Go to first page</span>
                ⟨⟨
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                data-testid={`${dataTestIdPrefix}-previous-page-button`}
              >
                <span className="gba:sr-only">Go to previous page</span>⟨
              </Button>
              <span className="gba:flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:text-sm gba:font-medium">
                {currentPage}
              </span>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                data-testid={`${dataTestIdPrefix}-next-page-button`}
              >
                <span className="gba:sr-only">Go to next page</span>⟩
              </Button>
              <Button
                variant="outline"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                data-testid={`${dataTestIdPrefix}-last-page-button`}
              >
                <span className="gba:sr-only">Go to last page</span>
                ⟩⟩
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalTable;
