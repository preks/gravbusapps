import { RestClient } from '../rest/RestClient';
import { env } from '@/common/env/EnvUtils';

// Flow template types (matching backend)
export enum FlowStepType {
  TASK = 'TASK',
  APPROVAL = 'APPROVAL',
  INFORMATION = 'INFORMATION',
  ACKNOWLEDGE = 'ACKNOWLEDGE'
}

export enum InputType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  SELECT = 'SELECT',
  MULTISELECT = 'MULTISELECT',
  CHECKBOX = 'CHECKBOX',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  NUMBER = 'NUMBER',
  FILE = 'FILE'
}

export enum AssignmentMode {
  CLAIM = 'CLAIM',
  ASSIGN = 'ASSIGN'
}

export interface InputOption {
  value: string;
  label: string;
}

export interface InputBlock {
  type: InputType;
  name: string;
  label: string;
  required?: boolean;
  options?: InputOption[];
}

export interface Link {
  name: string;
  url: string;
  type?: string;
}

export interface AssignmentTarget {
  userIds?: string[];
  organizationalUnits?: string[];
  matrixTeams?: string[];
  companies?: string[];
  siteLocations?: string[];
  costCenters?: string[];
  capabilities?: string[];
}

export interface TaskAssignment {
  targets: AssignmentTarget | null; // Required in backend - null indicates runtime assignment
  assignmentMode: AssignmentMode; // Required - CLAIM or ASSIGN mode  
  allowReassignment?: boolean;
}

export interface FlowStep {
  id?: string;
  type: FlowStepType;
  title: string;
  message?: string;
  dueInMinutes?: number;
  form?: InputBlock[];  // Backend uses 'form'
  inputs?: InputBlock[];  // Legacy field for backward compatibility
  links?: Link[];
  assignment: TaskAssignment;  // Required to match backend API
}

// Simplified init step for self-service flows
export interface InitStep {
  title: string;
  message?: string;
  links?: Link[];
  form?: InputBlock[];  // Backend uses 'form'
  inputs?: InputBlock[];  // Legacy field for backward compatibility
}

export interface FlowTemplate {
  id?: string;
  type: 'TEMPLATE' | 'SELF_SERVICE';
  name: string;
  description?: string;
  version: number;  // Required to match backend API
  steps: FlowStep[];
  
  // Self-service specific: simplified to just the init step
  initStep?: InitStep;
}

/**
 * Backend API response format
 */
interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  count?: number;
  message?: string;
}

/**
 * Client for Flow Template API operations
 */
export class FlowTemplateClient extends RestClient {
  constructor(accessToken: string) {
    // Use our custom flow engine API endpoint
    const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine';
    super(`${baseUrl}/api/templates`, {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Get all flow templates
   */
  async getTemplates(): Promise<FlowTemplate[]> {
    const response = await this.get<ApiResponse<FlowTemplate[]>>('/');
    return response.data;
  }

  /**
   * Get a specific flow template by ID
   */
  async getTemplate(id: string): Promise<FlowTemplate> {
    const response = await this.get<ApiResponse<FlowTemplate>>(`/${id}`);
    return response.data;
  }

  /**
   * Create a new flow template
   */
  async createTemplate(template: Omit<FlowTemplate, 'id'>): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<FlowTemplate>>('/', template);
    return response.data;
  }

  /**
   * Update an existing flow template
   */
  async updateTemplate(id: string, template: Partial<FlowTemplate>): Promise<FlowTemplate> {
    const response = await this.put<ApiResponse<FlowTemplate>>(`/${id}`, template);
    return response.data;
  }

  /**
   * Delete a flow template
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.delete(`/${id}`);
  }

  /**
   * Publish a flow template
   */
  async publishTemplate(id: string): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<FlowTemplate>>(`/${id}/publish`);
    return response.data;
  }

  /**
   * Save template as draft
   */
  async saveDraft(template: Omit<FlowTemplate, 'id'>): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<FlowTemplate>>('/drafts', template);
    return response.data;
  }

  /**
   * Get all draft templates
   */
  async getDrafts(): Promise<FlowTemplate[]> {
    const response = await this.get<ApiResponse<FlowTemplate[]>>('/drafts');
    return response.data;
  }

  /**
   * Get template with metadata
   */
  async getTemplateWithMetadata(id: string): Promise<{
    template: FlowTemplate;
    metadata: {
      createdAt: string;
      updatedAt?: string;
      isDraft: boolean;
      originalTemplate?: FlowTemplate;
      workflowDefinition?: any;
    };
  }> {
    const response = await this.get<ApiResponse<any>>(`/${id}/metadata`);
    return response.data;
  }

  /**
   * Execute/Launch a workflow from a template
   */
  async executeWorkflow(id: string, params: {
    initiator: string;
    context?: any;
    runtimeAssignments?: any;
    inputValues?: any;
    runtimeParameters?: any;
  }): Promise<{
    workflowId: string;
    templateId: string;
    workflowName: string;
    input: any;
  }> {
    const response = await this.post<ApiResponse<any>>(`/${id}/execute`, params);
    return response.data;
  }
} 