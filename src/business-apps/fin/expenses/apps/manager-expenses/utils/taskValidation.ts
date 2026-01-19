import { ApprovalRequest, ValidTaskGroup, TaskSelectionValidation } from '../types'

/**
 * Validates that selected tasks are of the same type for approval
 * According to requirements: Only tasks of the same type can be selected together
 * Valid groups: Approve Plan, Approve Request, Approve Advance Payment
 */
export const validateTaskSelection = (
  selectedTasks: ApprovalRequest[],
  newTask: ApprovalRequest
): TaskSelectionValidation => {
  // If no tasks selected yet, any task is valid
  if (selectedTasks.length === 0) {
    return {
      isValid: true,
      allowedGroups: getValidTaskGroups(newTask.taskName)
    }
  }

  // Get the task group of the first selected task
  const firstSelectedGroup = selectedTasks[0].taskGroup
  const newTaskGroup = newTask.taskGroup

  // Check if the new task is of the same group as already selected tasks
  if (firstSelectedGroup === newTaskGroup) {
    return {
      isValid: true,
      allowedGroups: getValidTaskGroups(selectedTasks[0].taskName)
    }
  }

  // If different groups, return validation error
  return {
    isValid: false,
    errorMessage: `You can select only tasks that are the same type: ${getValidTaskGroups(selectedTasks[0].taskName).join(', ')}`,
    allowedGroups: getValidTaskGroups(selectedTasks[0].taskName)
  }
}

/**
 * Gets the valid task groups for a given task name
 * Maps task names to their corresponding valid groups
 */
const getValidTaskGroups = (taskName: string): ValidTaskGroup[] => {
  if (taskName.includes('ExpensePlan')) {
    return ['Expense Plan']
  }
  if (taskName.includes('ExpenseRequest')) {
    return ['Request']
  }
  if (taskName.includes('AdvancePayment')) {
    return ['Advance Payment Request']
  }
  if (taskName.includes('Transfer')) {
    return ['Transfer']
  }
  if (taskName.includes('Handout')) {
    return ['Handout']
  }

  // For other task types, return empty array (no valid groups)
  return []
}

/**
 * Checks if a task group is valid for approval
 */
export const isValidTaskGroup = (taskGroup: string): taskGroup is ValidTaskGroup => {
  const validGroups: ValidTaskGroup[] = ['Expense Plan', 'Request', 'Advance Payment Request', 'Transfer', 'Handout']
  return validGroups.includes(taskGroup as ValidTaskGroup)
}

/**
 * Gets the display name for a task group
 */
export const getTaskGroupDisplayName = (taskGroup: ValidTaskGroup): string => {
  const displayNames: Record<ValidTaskGroup, string> = {
    'Expense Plan': 'Approve Plan',
    Request: 'Approve Request',
    'Advance Payment Request': 'Approve Advance Payment',
    Transfer: 'Transfer',
    Handout: 'Handout'
  }
  return displayNames[taskGroup] || taskGroup
}
