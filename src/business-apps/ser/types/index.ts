/**
 * Service Portal Types
 * Core domain types and UI-specific interfaces for Services+ platform
 * Based on Services+ Contract specifications
 */

// Core domain types
export type StepReceiver =
  | 'HR' | 'IT' | 'Facilities' | 'Finance' | 'Procurement' | 'Legal'
  | 'Security' | 'AccessIdentity' | 'Workplace' | 'Fleet' | 'Data' | 'L&D' | 'Admin';

export type StepStatus = 'pending' | 'ready' | 'in_progress' | 'blocked' | 'done' | 'canceled';
export type TicketStatus = 'queued' | 'claimed' | 'in_progress' | 'waiting' | 'done' | 'canceled';

export type ServiceCategory = {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  order: number;
};

export type StepDefinition = {
  id: string;
  name: string;
  receiver: StepReceiver;
  parallelGroup?: string;
  requires?: string[];
  slaHours?: number;
  inputs?: Record<string, unknown>;
};

export type ServiceRequestTemplate = {
  id: string;
  categoryId: string;
  key: string;
  title: string;
  description?: string;
  formSchema: any;
  uiSchema?: Record<string, unknown>;
  steps: StepDefinition[];
  version: number;
  enabled: boolean;
};

export type Comment = {
  id: string;
  stepId: string;
  authorId: string;
  createdAt: string;
  body: string;
  visibility: 'current_and_downstream';
};

export type StepInstance = {
  id: string;
  defId: string;
  name: string;
  desk: StepReceiver;
  status: StepStatus;
  assignedToUserId?: string;
  claimedByUserId?: string;
  startedAt?: string;
  finishedAt?: string;
  comments: Comment[];
  requestId: string; // backlink
  
  // Additional rich data fields for detailed display
  description?: string;
  expectedStartAt?: string;
  expectedFinishAt?: string;
  dueDate?: string;
  inputs?: Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
    options?: Array<{label: string; value: string}>;
  }>;
  links?: Array<{
    url: string;
    name: string;
    type: string;
  }>;
  assignmentMode?: string;
  allowReassignment?: boolean;
};

export type SubmittedRequest = {
  id: string;
  templateId: string;
  templateVersion: number;
  requesterId: string;
  createdAt: string;
  status: 'open' | 'in_progress' | 'completed' | 'canceled';
  titleSnapshot: string;
  categoryIdSnapshot: string;
  formData: any;
  steps: StepInstance[];
  timeline: Array<{ at: string; message: string }>;
  
  // Additional progress fields for rich display
  progress?: {
    currentStep: number;
    totalSteps: number;
    completedSteps: number;
    percentage: number;
  };
  currentStep?: number;
  totalSteps?: number;
  completedSteps?: number;
  progressPercentage?: number;
};

/**
 * Workflow Engine Interface
 * Provides abstraction for workflow operations
 * Initial implementation: MockWorkflowEngineAdapter
 * Future implementation: ConductorWorkflowEngineAdapter
 */
export interface WorkflowEngine {
  startRequest(templateKey: string, formData: any): Promise<string>;
  getRequest(requestId: string): Promise<SubmittedRequest>;
  getMyRequests(): Promise<SubmittedRequest[]>;
  getDeskTickets(desk: StepReceiver): Promise<StepInstance[]>;
  claim(stepId: string): Promise<void>;
  assign(stepId: string, userId: string): Promise<void>;
  advance(stepId: string, payload?: any): Promise<void>;
  comment(stepId: string, body: string): Promise<Comment>;
}

// Analytics event types
export type ServicesAnalyticsEvent =
  | 'services.request_submitted'
  | 'services.step_claimed'
  | 'services.step_completed'
  | 'services.comment_added';

export type AnalyticsPayload = {
  event: ServicesAnalyticsEvent;
  data: Record<string, unknown>;
  timestamp: string;
};

// UI-specific extensions
export interface ServiceCatalogItem extends ServiceRequestTemplate {
  category: ServiceCategory;
  isPopular?: boolean;
  estimatedDuration?: string;
  complexity?: 'low' | 'medium' | 'high';
}

export interface RequestListItem extends SubmittedRequest {
  categoryName: string;
  currentStep?: StepInstance;
  estimatedCompletion?: string;
}

export interface ServicePortalContextProps {
  accessToken: string;
  workflowEngine: WorkflowEngine;
  userId: string;
  userRoles: string[];
  isServicesEnabled: boolean;
}

// Form-related types
export interface DynamicFormProps {
  schema: any;
  uiSchema?: Record<string, unknown>;
  formData?: any;
  onChange: (data: any) => void;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Navigation types
export type ServiceRoute = '/services' | '/services/my-requests' | '/services/requests';
