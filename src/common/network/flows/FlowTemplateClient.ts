import { RestClient } from '../rest/RestClient';
import { env } from '../../env/EnvUtils';

// Import types from flow apps to ensure consistency
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
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  CHECKBOX = 'CHECKBOX',
  FILE = 'FILE',
  RADIO = 'RADIO',
  DATETIME = 'DATETIME',
  SIGNATURE = 'SIGNATURE'
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

export enum LinkType {
  FILE = 'FILE',
  URL = 'URL',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT'
}

export interface Link {
  name: string;
  url: string;
  type: LinkType
}

export enum AssignmentMode {
  CLAIM = 'CLAIM',
  ASSIGN = 'ASSIGN'
}

export type AssignmentTarget = {
  entity: 'user' | 'department' | 'capability' | 'role';
  id: string;
};

export type TaskAssignment = {
  targets: AssignmentTarget[];
  assignmentMode: AssignmentMode;
  allowReassignment?: boolean;
};

export interface FlowStep {
  id: string;
  type: FlowStepType;
  title: string;
  description?: string;
  message?: string;
  inputs?: InputBlock[];
  links?: Link[];
  assignment?: TaskAssignment;
}

export interface FlowTemplate {
  id?: string;
  type: 'TEMPLATE' | 'INSTANCE' | 'DRAFT';
  name: string;
  description?: string;
  steps: FlowStep[];
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
    initiator: string;
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