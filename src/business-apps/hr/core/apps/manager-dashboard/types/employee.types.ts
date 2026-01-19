// GraphQL Employee Response Types for Manager Dashboard

export interface EmployeePosition {
  jobPosition: {
    name: string
  }
  supervisorEmployeeId?: string
  organizationalUnit?: {
    name: string
  }
}

export interface WorkingCondition {
  hireDate: string
}

export interface CommunicationChannel {
  value: string
}

export interface WorkCommunication {
  id: string
  value: string
  channel: CommunicationChannel
}

export interface Translation {
  localeCode: string
  value: string
}

export interface AbsenceType {
  value: string
  translations?: Translation[]
}

// Base Employee type from GraphQL responses
export interface Employee {
  id: string
  firstName: string
  lastName: string
  birthDate?: string
  userId?: string
  pictureThumbnail?: string
  picture?: string
  employeePosition?: EmployeePosition
  workingCondition?: WorkingCondition[]
  workCommunications?: WorkCommunication[]
  displayName?: string
}

// GraphQL response wrapper types
export interface EmployeeResponse {
  Employee: Employee[]
}

// Expense and Leave Request Types
export interface ExpenseRequest {
  id: string
  title?: string
  amount?: number
  currency?: string
  requestDate?: string
  description?: string
  status?: string
  employeeId?: string
  category?: string
  employee?: Employee
  totalAmount?: number
  createdAt?: string
}

export interface ExpensePlan {
  id: string
  title?: string
  totalBudget?: number
  currency?: string
  startDate?: string
  endDate?: string
  description?: string
  status?: string
  employeeId?: string
  requestType?: string
}

export interface LeaveRequest {
  id: string
  startDate: string
  endDate: string
  days?: number
  status?: string
  employeeId?: string
  type?: AbsenceType
  reason?: string
  comments?: string
  parentEntryId?: string
}

// Approval Request Response Types
export interface ApprovalResponse {
  ExpenseRequestApprovals?: ExpenseRequest[]
  ExpensePlanApprovals?: ExpensePlan[]
  LeaveApprovals?: LeaveRequest[]
}

// Personal Data Change Types
export interface ProcessVariable {
  [key: string]: unknown // This can be refined based on actual variable types
}

// Address structure from flow execution task inputs
export interface AddressData {
  id?: string | null
  version?: number | null
  businessKey?: string | null
  recordState?: string | null
  activeTo?: string | null
  additionalProperties?: unknown | null
  employeeId?: string | null
  type?: string | null
  addressLine?: string[] | null
  poBox?: boolean | null
  postalCode?: string | null
  locality?: string | null
  regionRef?: string | null
  countryRef?: string | null
  attachment?: unknown | null
  notes?: string | null
  employeeDocument?: unknown | null
}

// Inputs structure from flow execution task
export interface PersonalDataChangeInputs {
  creatorUserId?: string
  address?: AddressData
  employeeDocumentObject?: unknown | null
  TaskName?: string
  NodeName?: string
  oldAddressData?: AddressData | null
  creatorName?: string
  changeMode?: string
  Skippable?: string
  ActorId?: string
  // Legacy fields for backward compatibility
  personalInformation?: unknown
  oldPersonalInformation?: unknown
  employeeId?: string
  employeeName?: string
  fullName?: string
  firstName?: string
  lastName?: string
  pictureThumbnail?: string
  [key: string]: unknown // Allow additional properties
}

// Personal Data Change Task Raw from flow-metrics API
// Based on actual API response structure
export interface PersonalDataChangeTaskRaw {
  id: string
  name?: string
  referenceName?: string
  completed?: string | null
  actualOwner?: string | null
  state?: string
  lastUpdate?: string
  priority?: number | null
  started?: string
  ownerName?: string
  dueDate?: string | null
  creatorUserId?: string
  creatorName?: string
  potentialUsers?: string[]
  assigneeNames?: string[]
  endpoint?: string
  customFlowId?: string | null
  inputs?: PersonalDataChangeInputs
}

// Employee Absence Types
export interface EmployeeAbsence {
  id: string
  employeeId: string
  startDate: string
  endDate: string
  status: string
  type: {
    value: string
    parentEntryId?: string // e.g., 'AbsenceGroup:v1:HEALTH' for sick leave, 'AbsenceGroup:v1:VACATION' for vacation
  }
}

export interface EmployeeAbsenceResponse {
  EmployeeAbsence: EmployeeAbsence[]
}

// Matrix Team Member Types
export interface MatrixUnitMembership {
  role?: string
  percentage?: number
  matrixUnitId: string
  employeeId: string
  matrixUnit: {
    value: string
    name: string
  }
}

export interface MatrixTeamMember {
  id: string
  firstName: string
  lastName: string
  fullName: string
  pictureThumbnail?: string
  jobPositionName?: string
  status?: 'Online' | 'Away' | 'Offline'
  organizationalUnitName?: string
}

// Missing Job Profiles Types
export interface MissingJobProfile {
  id: string
  firstName: string
  lastName: string
  fullName: string
  pictureThumbnail?: string
  organizationalUnitName?: string
  priority: 'high' | 'medium' | 'low'
}

// User Info Type (for Manager Assistant)
export interface UserInfo {
  id?: string
  name?: string
  email?: string
  role?: string
  department?: string
  [key: string]: unknown // Allow additional properties
}
