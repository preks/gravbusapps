import { FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient';
import { ApprovalRequest } from '../types';

/**
 * Maps FlowExecutionTask to ApprovalRequest for compatibility with existing UI
 */
export const mapFlowTaskToApprovalRequest = (task: FlowExecutionTask): ApprovalRequest => {
  // Extract amount from task variables if available
  const totalAmount =
    task.variables?.totalAmount || task.variables?.amount || task.variables?.expenseAmount || 0;

  // Extract status from task state or variables
  const status = task.state || task.variables?.status || task.variables?.requestStatus || 'PENDING';

  // Extract title from referenceName or task name
  const title =
    task.referenceName ||
    task.variables?.title ||
    task.variables?.requestTitle ||
    task.name ||
    'Untitled Request';

  // Extract description from task variables or use task description
  const description =
    task.variables?.description || task.variables?.requestDescription || task.description || null;

  // Extract employee information from creator or task variables
  // For expense tasks, the creator is usually the employee who submitted the request
  const employee = {
    id: task.creatorUserId || task.variables?.employeeId || task.variables?.requestorId || '',
    firstName:
      task.creatorName?.split(' ')[0] ||
      task.variables?.employeeFirstName ||
      task.variables?.requestorFirstName ||
      'Unknown',
    lastName:
      task.creatorName?.split(' ').slice(1).join(' ') ||
      task.variables?.employeeLastName ||
      task.variables?.requestorLastName ||
      'Employee',
    fullName:
      task.creatorName ||
      task.variables?.employeeFullName ||
      task.variables?.requestorFullName ||
      'Unknown Employee',
  };

  const createdAt = task.started || task.createdAt || task.lastUpdate || new Date().toISOString();

  const getTaskGroup = (taskName: string): string => {
    if (taskName.includes('ExpensePlan')) return 'Expense Plan';
    if (taskName.includes('ExpenseRequest')) return 'Request';
    if (taskName.includes('AdvancePayment')) return 'Advance Payment Request';
    if (taskName.includes('Transfer')) return 'Transfer';
    if (taskName.includes('Handout')) return 'Handout';
    return 'Other';
  };

  return {
    id: task.id,
    title,
    description,
    totalAmount: typeof totalAmount === 'number' ? totalAmount : 0,
    status,
    requestDate: createdAt,
    createdAt: createdAt,
    taskGroup: getTaskGroup(task.name),
    taskName: task.name,
    employee: {
      id: employee.id,
      fullName: employee.fullName || `${employee.firstName} ${employee.lastName}`,
      firstName: employee.firstName,
      lastName: employee.lastName,
    },
  };
};

/**
 * Maps an array of FlowExecutionTask to ApprovalRequest array
 */
export const mapFlowTasksToApprovalRequests = (tasks: FlowExecutionTask[]): ApprovalRequest[] => {
  if (!tasks || tasks.length === 0) {
    return [];
  }
  return tasks.map(mapFlowTaskToApprovalRequest);
};
