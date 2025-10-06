import { FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient';
import { ApprovalRequest } from '../types';

/**
 * Maps FlowExecutionTask to ApprovalRequest for compatibility with existing UI
 */
export const mapFlowTaskToApprovalRequest = (task: FlowExecutionTask): ApprovalRequest => {
  // Extract amount from task inputs based on the task type
  let totalAmount = 0;
  if (task.inputs) {
    if (task.inputs.expenseRequest?.totalAmount) {
      totalAmount = task.inputs.expenseRequest.totalAmount;
    } else if (task.inputs.expensePlan?.totalAmount) {
      totalAmount = task.inputs.expensePlan.totalAmount;
    } else if (task.inputs.advancePayment?.amount) {
      // This covers advance payment, handout payment, and transfer payment
      totalAmount = task.inputs.advancePayment.amount;
    }
  }

  // Fallback to variables if inputs don't have the amount
  if (totalAmount === 0) {
    totalAmount =
      task.variables?.totalAmount || task.variables?.amount || task.variables?.expenseAmount || 0;
  }

  // Extract currency from task inputs
  let currency = 'EUR'; // Default currency
  if (task.inputs) {
    if (task.inputs.expenseRequest?.currencyRef) {
      currency = task.inputs.expenseRequest.currencyRef.split(':').pop() || 'EUR';
    } else if (task.inputs.expensePlan?.currencyRef) {
      currency = task.inputs.expensePlan.currencyRef.split(':').pop() || 'EUR';
    } else if (task.inputs.advancePayment?.currencyRef) {
      // This covers advance payment, handout payment, and transfer payment
      currency = task.inputs.advancePayment.currencyRef.split(':').pop() || 'EUR';
    }
  }

  // Fallback to variables if inputs don't have the currency
  if (currency === 'EUR') {
    const currencyFromVars = task.variables?.currencyRef || task.variables?.currency;
    if (currencyFromVars) {
      currency = currencyFromVars.split(':').pop() || 'EUR';
    }
  }

  // Extract status from task state or variables
  const status = task.state || task.variables?.status || task.variables?.requestStatus || 'PENDING';

  // Build human friendly task name from camelCase (e.g., handOutAdvancePayment -> Hand Out Advance Payment)
  const formatTaskName = (name?: string): string => {
    if (!name) return 'Task';
    const spaced = name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Za-z])(\d)/g, '$1 $2')
      .replace(/(\d)([A-Za-z])/g, '$1 $2')
      .replace(/Store\s?Director/g, 'Store Director')
      .trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  // Prefer linked entity titles for handout/transfer; if referenceName already contains "for \"Title\"" keep it
  const linkedEntityTitle =
    task.inputs?.expensePlan?.title ||
    task.inputs?.expenseRequest?.title ||
    task.variables?.title ||
    task.variables?.requestTitle ||
    null;

  let title: string;
  if (task.referenceName && /for\s+"/.test(task.referenceName)) {
    // e.g., "Transfer Advance Payment for \"Trip to Berlin\"" already includes the request title
    title = task.referenceName;
  } else if (linkedEntityTitle) {
    title = `${formatTaskName(task.name)} - ${linkedEntityTitle}`;
  } else {
    title = task.referenceName || formatTaskName(task.name) || 'Untitled Request';
  }

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

  // Extract entity ID and data from task inputs (optimization to avoid GET calls during approval)
  let entityId: string | undefined;
  let rawEntityData: any = null;
  let processInstanceId: string | undefined;

  if (task.inputs) {
    if (task.inputs.expensePlan) {
      entityId = task.inputs.expensePlan.id;
      rawEntityData = task.inputs.expensePlan;
    } else if (task.inputs.expenseRequest) {
      entityId = task.inputs.expenseRequest.id;
      rawEntityData = task.inputs.expenseRequest;
    } else if (task.inputs.advancePayment) {
      entityId = task.inputs.advancePayment.id;
      rawEntityData = task.inputs.advancePayment;
    }
  }

  // Extract process instance ID from endpoint if available
  // Use pattern matching to handle task name variations (e.g., approveAdvancePaymentStoreDirector)
  if (task.endpoint) {
    const endpointParts = task.endpoint.split('/');
    const processNameIndex = endpointParts.findIndex(
      (part: string) =>
        part.startsWith('approveExpensePlan') ||
        part.startsWith('approveExpenseRequest') ||
        part.startsWith('approveAdvancePayment') ||
        part.startsWith('payAdvancePayment') ||
        part.startsWith('handOutAdvancePayment') ||
        part.startsWith('transferAdvancePayment'),
    );

    if (processNameIndex !== -1 && endpointParts[processNameIndex + 1]) {
      processInstanceId = endpointParts[processNameIndex + 1];
    }
  }

  return {
    id: task.id,
    title,
    description,
    totalAmount: typeof totalAmount === 'number' ? totalAmount : 0,
    currency,
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
    // Optimization fields: store entity data to avoid GET calls during approval
    entityId,
    processInstanceId,
    taskInstanceId: task.id,
    rawEntityData,
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
