export interface ApprovalRequest {
  id: string;
  title: string;
  description: string | null;
  totalAmount: number;
  status: string;
  requestDate: string;
  createdAt: string;
  taskGroup: string; // New field for task group
  taskName: string; // Original task name for validation
  employee: {
    id: string;
    fullName: string;
    firstName: string;
    lastName: string;
  };
}

export type ValidTaskGroup =
  | 'Expense Plan'
  | 'Request'
  | 'Advance Payment Request'
  | 'Transfer'
  | 'Handout';

export interface TaskSelectionValidation {
  isValid: boolean;
  errorMessage?: string;
  allowedGroups: ValidTaskGroup[];
}
