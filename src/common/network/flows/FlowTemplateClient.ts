import { RestClient } from '../rest/RestClient';
import { env } from '../../env/EnvUtils';

// Assignment target
export type AssignmentTarget = {
  entity: 'user' | 'department' | 'team' | 'capability' | 'role';
  id: string;
};

// Task assignment configuration
export type TaskAssignment = {
  targets: AssignmentTarget[];
  assignToAll: boolean;
  allowReassignment?: boolean;
};

// Input block types
export enum InputBlockType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA', 
  NUMBER = 'NUMBER',
  DROPDOWN = 'DROPDOWN',
  RADIO = 'RADIO',
  CHECKBOX = 'CHECKBOX',
  DATETIME = 'DATETIME',
  FILE = 'FILE',
  SIGNATURE = 'SIGNATURE'
}

export type InputBlock = {
  id: string;
  type: InputBlockType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  multiple?: boolean;
  accept?: string;
};

// Content block types
export enum ContentBlockType {
  TEXT = 'TEXT',
  DOCUMENT = 'DOCUMENT',
  IMAGE = 'IMAGE',
  LINK = 'LINK'
}

export type ContentBlock = {
  id: string;
  type: ContentBlockType;
  content: string;
};

// Step types
export enum StepType {
  APPROVAL = 'APPROVAL',
  ACKNOWLEDGE = 'ACKNOWLEDGE', 
  TASK = 'TASK',
  INFORMATION = 'INFORMATION'
}

// Task execution type
export enum TaskExecutionType {
  PARALLEL = 'PARALLEL',
  SEQUENTIAL = 'SEQUENTIAL'
}

// Time units
export enum TimeUnit {
  HOURS = 'HOURS',
  DAYS = 'DAYS'
}

// Timing types
export enum TimingType {
  AFTER = 'AFTER',
  BEFORE = 'BEFORE'
}

// Step definition
export type FlowStep = {
  id: string;
  title: string;
  description: string;
  type: StepType;
  contentBlocks: ContentBlock[];
  inputBlocks: InputBlock[];
  assignment?: TaskAssignment;
};

// Complete FlowTemplate interface matching the frontend
export interface FlowTemplate {
  id?: string;
  title: string;
  description: string;
  executionStrategy: TaskExecutionType;
  assignment?: TaskAssignment;
  reminder?: {
    timing: {
      type: TimingType;
      value: number;
      unit: TimeUnit;
    };
  };
  escalation?: {
    timing: {
      type: TimingType;
      value: number;
      unit: TimeUnit;
    };
  };
  steps: FlowStep[];
  flowType?: 'TEMPLATE' | 'INSTANCE' | 'DRAFT';
}

export interface StoredTemplate {
  template: FlowTemplate;
  metadata: {
    createdAt: string;
    updatedAt: string;
    isDraft: boolean;
    originalTemplate: FlowTemplate;
    workflowDefinition?: any;
  };
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  count?: number;
  message?: string;
}

export class FlowTemplateClient extends RestClient {
  constructor(accessToken: string) {
    super(
      env('NEXT_PUBLIC_BUSINESS_FLOWS_API_URL') || 'http://localhost:3001',
      {
        'Authorization': `Bearer ${accessToken}`
      }
    );
  }

  /**
   * Create a new template
   */
  async createTemplate(template: FlowTemplate, isDraft: boolean = false): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<FlowTemplate>>('/api/templates', {
      ...template,
      isDraft
    });
    return response.data;
  }

  /**
   * Save template as draft
   */
  async saveDraft(template: FlowTemplate): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<FlowTemplate>>('/api/templates/drafts', template);
    return response.data;
  }

  /**
   * Get all templates
   */
  async getAllTemplates(): Promise<FlowTemplate[]> {
    const response = await this.get<ApiResponse<FlowTemplate[]>>('/api/templates');
    return response.data;
  }

  /**
   * Get all draft templates
   */
  async getDrafts(): Promise<FlowTemplate[]> {
    const response = await this.get<ApiResponse<FlowTemplate[]>>('/api/templates/drafts');
    return response.data;
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<FlowTemplate> {
    const response = await this.get<ApiResponse<FlowTemplate>>(`/api/templates/${id}`);
    return response.data;
  }

  /**
   * Get template with metadata by ID
   */
  async getTemplateWithMetadata(id: string): Promise<StoredTemplate> {
    const response = await this.get<ApiResponse<StoredTemplate>>(`/api/templates/${id}/metadata`);
    return response.data;
  }

  /**
   * Get original template for editing by ID
   */
  async getOriginalTemplate(id: string): Promise<FlowTemplate> {
    const response = await this.get<ApiResponse<FlowTemplate>>(`/api/templates/${id}/original`);
    return response.data;
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, template: Partial<FlowTemplate>, isDraft: boolean = false): Promise<FlowTemplate> {
    const response = await this.put<ApiResponse<FlowTemplate>>(`/api/templates/${id}`, {
      ...template,
      isDraft
    });
    return response.data;
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.delete(`/api/templates/${id}`);
  }

  /**
   * Publish a draft template
   */
  async publishTemplate(id: string): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<FlowTemplate>>(`/api/templates/${id}/publish`, {});
    return response.data;
  }

  /**
   * Generate Conductor workflow definition
   */
  async generateConductorFlow(template: FlowTemplate): Promise<any> {
    const response = await this.post<ApiResponse<any>>('/api/templates/generate-conductor-flow', template);
    return response.data;
  }

  /**
   * Generate Conductor workflow definition with resolved assignments
   */
  async generateConductorFlowWithAssignments(template: FlowTemplate): Promise<any> {
    const response = await this.post<ApiResponse<any>>('/api/templates/generate-conductor-flow-with-assignments', template);
    return response.data;
  }

  /**
   * Execute/Launch a workflow from a template
   */
  async executeWorkflow(id: string, params: {
    runtimeParameters: { [key: string]: string };
    initiator?: string;
    context?: any;
  }): Promise<{
    workflowId: string;
    templateId: string;
    workflowName: string;
    input: any;
  }> {
    const response = await this.post<ApiResponse<{
      workflowId: string;
      templateId: string;
      workflowName: string;
      input: any;
    }>>(`/api/templates/${id}/execute`, params);
    return response.data;
  }
} 