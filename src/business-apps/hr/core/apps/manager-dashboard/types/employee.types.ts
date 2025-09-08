// GraphQL Employee Response Types for Manager Dashboard

export interface EmployeePosition {
  jobPosition: {
    name: string;
  };
  supervisorEmployeeId?: string;
}

export interface WorkingCondition {
  hireDate: string;
}

export interface CommunicationChannel {
  value: string;
}

export interface WorkCommunication {
  id: string;
  value: string;
  channel: CommunicationChannel;
}

export interface Translation {
  localeCode: string;
  value: string;
}

export interface AbsenceType {
  value: string;
  translations?: Translation[];
}

// Base Employee type from GraphQL responses
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  userId?: string;
  pictureThumbnail?: string;
  picture?: string;
  employeePosition?: EmployeePosition[];
  workingCondition?: WorkingCondition[];
  workCommunications?: WorkCommunication[];
}

// GraphQL response wrapper types
export interface EmployeeResponse {
  Employee: Employee[];
}

// Expense and Leave Request Types
export interface ExpenseRequest {
  id: string;
  title?: string;
  amount?: number;
  currency?: string;
  requestDate?: string;
  description?: string;
  status?: string;
  employeeId?: string;
  category?: string;
}

export interface ExpensePlan {
  id: string;
  title?: string;
  totalBudget?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  status?: string;
  employeeId?: string;
}

export interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  days?: number;
  status?: string;
  employeeId?: string;
  type?: AbsenceType;
  reason?: string;
  comments?: string;
}

// Approval Request Response Types
export interface ApprovalResponse {
  ExpenseRequestApprovals?: ExpenseRequest[];
  ExpensePlanApprovals?: ExpensePlan[];
  LeaveApprovals?: LeaveRequest[];
}

// Personal Data Change Types
export interface ProcessVariable {
  [key: string]: any; // This can be refined based on actual variable types
}

export interface PersonalDataChangeTaskRaw {
  id: string;
  name?: string;
  taskName?: string;
  taskDefinitionKey?: string;
  processVariables?: ProcessVariable;
  variables?: ProcessVariable;
  created?: string;
  due?: string;
  assignee?: string;
  processInstanceId?: string;
}

// Employee Absence Types
export interface EmployeeAbsence {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: string;
  type: {
    value: string;
  };
}

export interface EmployeeAbsenceResponse {
  EmployeeAbsence: EmployeeAbsence[];
}

// Matrix Team Member Types
export interface MatrixUnitMembership {
  matrixUnitId: string;
  employeeId: string;
  matrixUnit: {
    value: string;
  };
}

export interface MatrixTeamMember {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  pictureThumbnail?: string;
  jobPositionName?: string;
  status?: 'Online' | 'Away' | 'Offline';
  organizationalUnitName?: string;
}

// Missing Job Profiles Types  
export interface MissingJobProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  pictureThumbnail?: string;
  organizationalUnitName?: string;
  priority: 'high' | 'medium' | 'low';
}

// User Info Type (for Manager Assistant)
export interface UserInfo {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  [key: string]: any; // Allow additional properties
}
