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

/**
 * Backend step format (what the API returns)
 */
interface BackendFlowStep {
  id?: string;
  type: FlowStepType;
  title: string;
  message?: string;
  inputs?: InputBlock[];
  links?: Link[];
  assignment?: TaskAssignment;
}

/**
 * Backend template format (what the API returns)
 */
interface BackendFlowTemplate {
  id?: string;
  type: 'TEMPLATE' | 'INSTANCE' | 'DRAFT';
  name: string;
  description?: string;
  steps: BackendFlowStep[];
}

export class FlowTemplateClient extends RestClient {
  constructor(accessToken: string) {
    super(env('NEXT_PUBLIC_FLOW_BACKEND_URL') || 'http://localhost:3000', {
      'Authorization': `Bearer ${accessToken}`
    });
  }

  /**
   * Transform backend step format to frontend format
   */
  private transformBackendStep(backendStep: BackendFlowStep, index: number): FlowStep {
    return {
      id: backendStep.id || `step-${index}`,
      type: backendStep.type,
      title: backendStep.title,
      message: backendStep.message || '',
      description: backendStep.message,
      inputs: backendStep.inputs || [],
      links: backendStep.links || [],
      assignment: backendStep.assignment
    };
  }

  /**
   * Transform backend template format to frontend format
   */
  private transformBackendTemplate(backendTemplate: BackendFlowTemplate): FlowTemplate {
    return {
      id: backendTemplate.id,
      type: backendTemplate.type,
      name: backendTemplate.name,
      description: backendTemplate.description,
      steps: backendTemplate.steps.map((step, index) => this.transformBackendStep(step, index))
    };
  }

  /**
   * Transform frontend step format to backend format
   */
  private transformFrontendStep(frontendStep: FlowStep): BackendFlowStep {
    return {
      id: frontendStep.id,
      type: frontendStep.type,
      title: frontendStep.title,
      message: frontendStep.message || frontendStep.description,
      inputs: frontendStep.inputs || [],
      links: frontendStep.links || [],
      assignment: frontendStep.assignment
    };
  }

  /**
   * Transform frontend template format to backend format
   */
  private transformFrontendTemplate(frontendTemplate: FlowTemplate): BackendFlowTemplate {
    return {
      id: frontendTemplate.id,
      type: frontendTemplate.type,
      name: frontendTemplate.name,
      description: frontendTemplate.description,
      steps: frontendTemplate.steps.map(step => this.transformFrontendStep(step))
    };
  }

  /**
   * Create a new template
   */
  async createTemplate(template: FlowTemplate, isDraft: boolean = false): Promise<FlowTemplate> {
    const backendTemplate = this.transformFrontendTemplate(template);
    const response = await this.post<ApiResponse<BackendFlowTemplate>>('/api/templates', {
      ...backendTemplate,
      isDraft
    });
    return this.transformBackendTemplate(response.data);
  }

  /**
   * Save draft template
   */
  async saveDraft(template: FlowTemplate): Promise<FlowTemplate> {
    const backendTemplate = this.transformFrontendTemplate(template);
    const response = await this.post<ApiResponse<BackendFlowTemplate>>('/api/templates/drafts', backendTemplate);
    return this.transformBackendTemplate(response.data);
  }

  /**
   * Get all templates
   */
  async getAllTemplates(): Promise<FlowTemplate[]> {
    const response = await this.get<ApiResponse<BackendFlowTemplate[]>>('/api/templates');
    return response.data.map(template => this.transformBackendTemplate(template));
  }

  /**
   * Get all draft templates
   */
  async getDrafts(): Promise<FlowTemplate[]> {
    const response = await this.get<ApiResponse<BackendFlowTemplate[]>>('/api/templates/drafts');
    return response.data.map(template => this.transformBackendTemplate(template));
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<FlowTemplate> {
    const response = await this.get<ApiResponse<BackendFlowTemplate>>(`/api/templates/${id}`);
    return this.transformBackendTemplate(response.data);
  }

  /**
   * Get template with metadata by ID
   */
  async getTemplateWithMetadata(id: string): Promise<StoredTemplate> {
    const response = await this.get<ApiResponse<any>>(`/api/templates/${id}/metadata`);
    return {
      template: this.transformBackendTemplate(response.data.template),
      metadata: response.data.metadata
    };
  }

  /**
   * Get original template for editing by ID
   */
  async getOriginalTemplate(id: string): Promise<FlowTemplate> {
    const response = await this.get<ApiResponse<BackendFlowTemplate>>(`/api/templates/${id}/original`);
    return this.transformBackendTemplate(response.data);
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, template: Partial<FlowTemplate>, isDraft: boolean = false): Promise<FlowTemplate> {
    const backendTemplate = template.steps 
      ? this.transformFrontendTemplate(template as FlowTemplate)
      : template;
    
    const response = await this.put<ApiResponse<BackendFlowTemplate>>(`/api/templates/${id}`, {
      ...backendTemplate,
      isDraft
    });
    return this.transformBackendTemplate(response.data);
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.delete(`/api/templates/${id}`);
  }

  /**
   * Publish template
   */
  async publishTemplate(id: string): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<BackendFlowTemplate>>(`/api/templates/${id}/publish`, {});
    return this.transformBackendTemplate(response.data);
  }

  /**
   * Generate Conductor workflow definition
   */
  async generateConductorFlow(template: FlowTemplate): Promise<any> {
    const backendTemplate = this.transformFrontendTemplate(template);
    const response = await this.post<ApiResponse<any>>('/api/templates/generate-conductor-flow', backendTemplate);
    return response.data;
  }

  /**
   * Generate Conductor workflow definition with resolved assignments
   */
  async generateConductorFlowWithAssignments(template: FlowTemplate): Promise<any> {
    const backendTemplate = this.transformFrontendTemplate(template);
    const response = await this.post<ApiResponse<any>>('/api/templates/generate-conductor-flow-with-assignments', backendTemplate);
    return response.data;
  }

  /**
   * Execute workflow
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
    const response = await this.post<ApiResponse<any>>(`/api/templates/${id}/execute`, params);
    return response.data;
  }
} 