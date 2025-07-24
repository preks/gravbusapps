export interface SalesTaskQueryVariables {
  offset?: number;
  limit?: number;
  search?: string;
  taskTypes?: string[];
  assignedEmployeeIds?: string[];
  accountIds?: string[];
  leadIds?: string[];
  opportunityIds?: string[];
  contactIds?: string[];
  createdAfter?: string;
  createdBefore?: string;
  dueDateAfter?: string;
  dueDateBefore?: string;
  statusRefs?: string[];
  priorityRefs?: string[];
  orderBy?: any[];
  where?: any;
}

export interface SalesTaskResponse {
  SalesTask: SalesTask[];
}

export interface SalesTask {
  id: string;
  name?: string;
  description?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
  version?: number;
  statusRef?: string;
  priorityRef?: string;
  typeRef?: string;
  assignedEmployeeId?: string;
  assignedEmployee?: {
    id: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    pictureThumbnail?: string;
    picture?: string;
  };
  account?: {
    id: string;
    name?: string;
  };
  contact?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  lead?: {
    id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
  };
  opportunity?: {
    id: string;
    name?: string;
  };
  recordState?: string;
} 