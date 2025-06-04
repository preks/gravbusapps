/**
 * Core data types for the HR application
 */

// Employee types
export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    position: string;
    department: string;
    teams?: string[];
    managerId?: string;
    startDate: string;
    status: EmployeeStatus;
    profileImage?: string;
    location?: string;
    timezone?: string;
    birthday?: string;
    availability?: EmployeeAvailability;
    communication?: EmployeeCommunication;
    personalInfo?: EmployeePersonalInfo;
    employmentInfo?: EmploymentInfo;
    skills?: EmployeeSkill[];
    feedback?: EmployeeFeedback[];
    hrNotes?: HRNote[];
    jobProfileId?: string
    departmentId?: string
    teamIds?: string[]
    projectIds?: string[]
    costCenterId?: string
    locationId?: string
    capabilityIds?: string[]
  }
  
  export interface EmployeeAvailability {
    status: "available" | "busy" | "away" | "offline";
    schedule?: WorkSchedule;
    outOfOffice?: {
      startDate: string;
      endDate: string;
      reason: string;
    };
  }
  
  export interface EmployeeCommunication {
    slack?: string;
    teams?: string;
    zoom?: string;
    extension?: string;
  }
  
  export interface EmployeePersonalInfo {
    nationality?: string;
    maritalStatus?: string;
    address?: Address;
    emergencyContact?: EmergencyContact;
    bankInfo?: BankInfo;
  }
  
  export interface Address {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }
  
  export interface EmergencyContact {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }
  
  export interface BankInfo {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    routingNumber: string;
    currency: string;
  }
  
  export interface EmploymentInfo {
    contractType: "full-time" | "part-time" | "contractor" | "intern" | "permanent";
    startDate: string;
    endDate?: string;
    workingHours: WorkSchedule;
    jobHistory: JobHistoryEntry[];
    compensation?: CompensationInfo;
  }
  
  export interface WorkSchedule {
    monday?: DaySchedule;
    tuesday?: DaySchedule;
    wednesday?: DaySchedule;
    thursday?: DaySchedule;
    friday?: DaySchedule;
    saturday?: DaySchedule;
    sunday?: DaySchedule;
  }
  
  export interface DaySchedule {
    start: string;
    end: string;
    breaks?: Break[];
  }
  
  export interface Break {
    start: string;
    end: string;
    type: "lunch" | "rest" | "other";
  }
  
  export interface JobHistoryEntry {
    position: string;
    department: string;
    startDate: string;
    endDate?: string;
    responsibilities: string[];
    manager: string;
  }
  
  export interface CompensationInfo {
    baseSalary: number;
    currency: string;
    effectiveDate: string;
    paymentFrequency: "monthly" | "bi-weekly" | "weekly";
    bonuses?: Bonus[];
    benefits?: Benefit[];
  }
  
  export interface Bonus {
    type: string;
    amount: number;
    date: string;
  }
  
  export interface Benefit {
    name: string;
    description: string;
    startDate: string;
    endDate?: string;
  }
  
  export interface EmployeeSkill {
    name: string;
    category: string;
    level: 1 | 2 | 3 | 4 | 5;
    verified: boolean;
    lastUpdated: string;
  }
  
  export interface EmployeeFeedback {
    id: string;
    type: "performance" | "peer" | "360" | "other";
    date: string;
    reviewer: string;
    content: string;
    rating?: number;
    private: boolean;
  }
  
  export interface HRNote {
    id: string;
    date: string;
    author: string;
    category: "general" | "performance" | "disciplinary" | "achievement";
    content: string;
    private: boolean;
    attachments?: string[];
  }
  
  export enum EmployeeStatus {
    Active = "active",
    OnLeave = "on-leave",
    Terminated = "terminated",
    Onboarding = "onboarding",
  }
  
  // Lifecycle status enum for onboarding/offboarding
  export enum LifecycleStatus {
    Onboarding = "onboarding",
    Active = "active",
    OnLeave = "on_leave",
    Offboarding = "offboarding",
    Inactive = "inactive",
    Terminated = "terminated",
  }
  
  // Department types
  export interface Department {
    id: string;
    name: string;
    managerId?: string;
    parentDepartmentId?: string;
    description?: string;
  }
  
  // Document types
  export interface Document {
    id: string;
    title: string;
    type: DocumentType;
    createdAt: string;
    updatedAt: string;
    status: DocumentStatus;
    employeeId?: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }
  
  export enum DocumentType {
    Contract = "contract",
    Payslip = "payslip",
    Review = "review",
    Certificate = "certificate",
    Other = "other",
  }
  
  export enum DocumentStatus {
    Draft = "draft",
    PendingSignature = "pending-signature",
    Signed = "signed",
    Archived = "archived",
  }
  
  // Workflow & approval types
  export interface Approval {
    id: string;
    type: ApprovalType;
    requestedById: string;
    status: ApprovalStatus;
    created: string;
    updated: string;
    details: Record<string, any>;
    approvers: ApproverInfo[];
  }
  
  export enum ApprovalType {
    TimeOff = "time-off",
    Expense = "expense",
    DocumentApproval = "document-approval",
    HiringRequest = "hiring-request",
    Other = "other",
  }
  
  export enum ApprovalStatus {
    Pending = "pending",
    Approved = "approved",
    Rejected = "rejected",
    Cancelled = "cancelled",
  }
  
  export interface ApproverInfo {
    employeeId: string;
    status: "pending" | "approved" | "rejected";
    timestamp?: string;
    comments?: string;
  }
  
  // Notification type
  export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    created: string;
    link?: string;
  }
  
  export enum NotificationType {
    Approval = "approval",
    Document = "document",
    Reminder = "reminder",
    System = "system",
  }
  
  // Onboarding types
  export enum TaskStatus {
    NotStarted = "not_started",
    InProgress = "in_progress",
    Completed = "completed",
    Blocked = "blocked",
  }
  
  export enum TaskType {
    HR = "hr",
    Manager = "manager",
    Employee = "employee",
    Document = "document",
    System = "system",
  }
  
  export enum WorkflowType {
    Onboarding = "onboarding",
    Offboarding = "offboarding",
  }
  
  export enum TemplateType {
    Onboarding = "onboarding",
    Offboarding = "offboarding",
  }
  
  export enum TemplateCategory {
    JobProfile = "job_profile",
    Department = "department",
    ContractType = "contract_type",
    Location = "location",
    Custom = "custom",
  }
  
  // Project types
  export interface Project {
    id: string;
    name: string;
    code?: string;
    description?: string;
    status: "active" | "planned" | "archived";
    startDate?: string;
    endDate?: string;
    clientName?: string;
    billable: boolean;
    costCenterId?: string;
    departmentId?: string;
    projectManagerId?: string;
    projectManagerName?: string;
  }
  
  // Time entry with project
  export interface TimeEntry {
    id: string;
    employeeId: string;
    date: string;
    hours: number;
    start: string;
    end: string;
    breaks: number;
    type: "regular" | "overtime";
    status: "pending" | "submitted" | "approved" | "rejected";
    notes?: string;
    projectId?: string;
  }
  