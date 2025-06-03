import { BusinessAppContextProps } from '../../../../common/BusinessAppContext';

export interface ExpenseItemProps extends BusinessAppContextProps {
  title?: string;
}

export interface ExpensePosition {
  id: string;
  expenseGroup: string;
  expenseType: string;
  amount: number;
  costCenter: string;
  customField?: string;
  isReimbursable?: boolean;
}

export interface ExpenseItemData {
  id?: string;
  title: string;
  date: string;
  positions: ExpensePosition[];
  totalAmount: number;
  currency: string;
  attachmentUrl?: string;
  fileName?: string;
  expenseRequestId?: string | null;
}

export interface ExpenseGroup {
  id: string;
  name: string;
  code?: string;
}

export interface ExpenseType {
  id: string;
  name: string;
  classId: string;
  code?: string;
}

export interface CostCenter {
  id: string;
  name: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
}
