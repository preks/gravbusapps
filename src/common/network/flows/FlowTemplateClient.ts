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
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  CHECKBOX = 'CHECKBOX',
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
}

export const ANY_SELECTOR = "ANY" as const;
export type ANY_SELECTOR = typeof ANY_SELECTOR;

export interface AssignmentTarget {
  userIds?: string[];
  organizationalUnits?: string[]; // former department Id
  matrixTeams?: string[]; // new field
  companies?: string[]; // former legalEntities
  siteLocations?: string[]; // former locations
  costCenters?: string[]; // new field
  capabilities?: string[]; // flattened from nested array structure
}

export interface TaskAssignment {
  targets: AssignmentTarget[];
  allowReassignment?: boolean;
}

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

// Simplified init step for self-service flows
export interface InitStep {
  title: string;
  message?: string;
  links?: Link[];
  inputs?: InputBlock[];
}

export interface FlowTemplate {
  id?: string;
  type: 'TEMPLATE' | 'SELF_SERVICE'; // Removed INSTANCE and DRAFT
  name: string;
  description?: string;
  assignmentMode: AssignmentMode; // Added assignment mode at template level
  steps: FlowStep[];
  
  // Self-service specific: simplified to just the init step
  initStep?: InitStep;
}

/**
 * Backend template format (what the API returns)
 */
interface BackendFlowTemplate {
  id?: string;
  type: 'TEMPLATE' | 'SELF_SERVICE';
  name: string;
  description?: string;
  version?: number;
  assignmentMode: AssignmentMode;
  steps: BackendFlowStep[];
  initStep?: InitStep;
}

interface BackendFlowStep {
  type: FlowStepType;
  title: string;
  message?: string;
  inputs?: InputBlock[];
  links?: Link[];
  assignment?: TaskAssignment;
}

/**
 * Transform backend template to frontend format
 */
const transformBackendToFrontend = (backendTemplate: BackendFlowTemplate): FlowTemplate => {
  return {
    id: backendTemplate.id,
    type: backendTemplate.type,
    name: backendTemplate.name,
    description: backendTemplate.description,
    assignmentMode: backendTemplate.assignmentMode,
    initStep: backendTemplate.initStep,
    steps: backendTemplate.steps.map((step, index) => ({
      id: `step-${index + 1}`,
      type: step.type,
      title: step.title,
      message: step.message,
      inputs: step.inputs || [],
      links: step.links || [],
      assignment: step.assignment
    }))
  };
};

/**
 * Transform frontend template to backend format
 */
const transformFrontendToBackend = (frontendTemplate: FlowTemplate): BackendFlowTemplate => {
  return {
    id: frontendTemplate.id,
    type: frontendTemplate.type,
    name: frontendTemplate.name,
    description: frontendTemplate.description,
    assignmentMode: frontendTemplate.assignmentMode,
    initStep: frontendTemplate.initStep,
    steps: frontendTemplate.steps.map(step => ({
      type: step.type,
      title: step.title,
      message: step.message,
      inputs: step.inputs || [],
      links: step.links || [],
      assignment: step.assignment
    }))
  };
};

/**
 * Client for Flow Template API operations
 */
export class FlowTemplateClient extends RestClient {
  constructor(accessToken: string) {
    super(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT') + '/flow-templates', {
      'Authorization': `Bearer ${accessToken}`
    });
  }

  /**
   * Get all flow templates
   */
  async getTemplates(): Promise<FlowTemplate[]> {
    const response = await this.get<BackendFlowTemplate[]>('/');
    return response.map(transformBackendToFrontend);
  }

  /**
   * Get a specific flow template by ID
   */
  async getTemplate(id: string): Promise<FlowTemplate> {
    const response = await this.get<BackendFlowTemplate>(`/${id}`);
    return transformBackendToFrontend(response);
  }

  /**
   * Create a new flow template
   */
  async createTemplate(template: Omit<FlowTemplate, 'id'>): Promise<FlowTemplate> {
    const backendTemplate = transformFrontendToBackend(template as FlowTemplate);
    const response = await this.post<BackendFlowTemplate>('/', backendTemplate);
    return transformBackendToFrontend(response);
  }

  /**
   * Update an existing flow template
   */
  async updateTemplate(id: string, template: Partial<FlowTemplate>): Promise<FlowTemplate> {
    const backendTemplate = transformFrontendToBackend(template as FlowTemplate);
    const response = await this.put<BackendFlowTemplate>(`/${id}`, backendTemplate);
    return transformBackendToFrontend(response);
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
    const response = await this.post<BackendFlowTemplate>(`/${id}/publish`);
    return transformBackendToFrontend(response);
  }
} 