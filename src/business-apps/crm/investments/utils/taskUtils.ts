import type { InvestmentTask } from '@/common/data/investment/types';

/**
 * Helper function to identify approval tasks by type reference, code, or value.
 * Checks various possible formats:
 * - taskType.code/value === 'approval' (case insensitive)
 * - typeRef ending with ':APPROVAL'
 * - typeRef === 'approval' (case insensitive)
 */
export const isApprovalTask = (task: InvestmentTask | any): boolean => {
  const typeVal = task?.taskType?.code || task?.taskType?.value || task?.typeRef;
  if (!typeVal) return false;

  const val = String(typeVal);
  return val.toLowerCase() === 'approval' || val.toUpperCase().endsWith(':APPROVAL');
};
