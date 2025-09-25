import React from 'react';
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
import ApprovalTablePagination from './ApprovalTablePagination';
import ApprovalTableActions from './ApprovalTableActions';
import { useApprovalHandling } from '../hooks/useApprovalHandling';

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
}) => {
  const rawTasks = tasks;
  const approvalRequests = mapFlowTasksToApprovalRequests(tasks);

  const { isApproving, approvalError, handleApproveClick } = useApprovalHandling({
    selectedTasks,
    setSelectedTasks,
    rawTasks,
    tabKey,
    userInfo,
    accessToken,
  });

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

  const handleApproveClickWithValidation = async () => {
    if (selectedTasks.length === 0) {
      setValidationError('Please select at least one task to approve');
      return;
    }

    const result = await handleApproveClick();
    if (result?.error) {
      setValidationError(result.error);
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

      <ApprovalTableActions
        selectedTasks={selectedTasks}
        validationError={validationError}
        approvalError={approvalError}
        isApproving={isApproving}
        onClearSelection={handleClearSelection}
        onApproveClick={handleApproveClickWithValidation}
        dataTestIdPrefix={dataTestIdPrefix}
      />

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
              <TableHead className="gba:w-[20%]">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:manager_expenses_landing_page.task_group',
                  'Task Group',
                )}
              </TableHead>
              <TableHead className="gba:w-[15%]">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:hr_absences.create_absence.employee',
                  'Employee',
                )}
              </TableHead>
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

      <ApprovalTablePagination
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        pageSize={pageSize}
        handlePageSizeChange={handlePageSizeChange}
        totalCount={totalCount}
        dataTestIdPrefix={dataTestIdPrefix}
      />
    </div>
  );
};

export default ApprovalTable;
