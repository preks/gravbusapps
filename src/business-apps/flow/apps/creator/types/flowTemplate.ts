/**
 * Flow template types for defining workflow configurations
 */

// Flow Template Types for Creator App

export type StepType = 'TASK' | 'APPROVAL' | 'INFORMATION' | 'ACKNOWLEDGE';

export type InputType = 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTISELECT' | 'NUMBER' | 'DATE' | 'CHECKBOX' | 'FILE';

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

export interface Assignment {
  type: 'SPECIFIC_USERS' | 'ROLE_BASED' | 'DEPARTMENT' | 'MANAGER' | 'SELF';
  userIds?: string[];
  roleIds?: string[];
  departmentIds?: string[];
}

export interface SimplifiedStep {
  type: StepType;
  name: string;
  description?: string;
  inputs?: InputBlock[];
  links?: Link[];
  assignment?: Assignment;
}

export interface FlowTemplate {
  type: 'TEMPLATE' | 'INSTANCE' | 'DRAFT';
  name: string;
  description?: string;
  steps: SimplifiedStep[];
}

export interface ExecutionConfiguration {
  templateId: string;
  userId: string;
  inputs?: Record<string, any>;
}

// Legacy type aliases for backward compatibility
export type InputBlockType = InputType;
export type AttachmentLink = Link;
export interface SimplifiedStepLegacy extends Omit<SimplifiedStep, 'inputs' | 'links' | 'assignment'> {
  requestInput?: {
    blocks: InputBlock[];
  };
  attachments?: Link[];
  usePredefinedAssignment?: Assignment;
}
