/**
 * Flow template types for the business-flows service
 */

// Step type
export type StepType = 'TASK' | 'APPROVAL' | 'INFORMATION' | 'ACKNOWLEDGE';

// Input type
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

export interface FlowStep {
  type: StepType;
  name: string;
  description?: string;
  inputs?: InputBlock[];
  links?: Link[];
  assignment?: Assignment;
}

// Flow template main type
export interface FlowTemplate {
  id?: string;
  type: 'TEMPLATE' | 'INSTANCE' | 'DRAFT';
  name: string;
  description?: string;
  version?: number;
  steps: FlowStep[];
}

// Legacy types for backward compatibility
export type InputBlockType = 'text' | 'textarea' | 'number' | 'dropdown' | 'radio' | 'checkbox' | 'datetime' | 'file' | 'signature';
export type ContentBlockType = 'text' | 'document' | 'image';
export type ExecutionStrategy = 'PARALLEL' | 'SEQUENTIAL';
export type TimeUnit = 'hours' | 'days';
export type TimingType = 'after' | 'before';

export type AssignmentTarget = {
  entity: 'user' | 'department' | 'capability' | 'role';
  id: string;
  name: string;
};

export type TaskAssignment = {
  targets: AssignmentTarget[];
  assignToAll: boolean;
  allowReassignment: boolean;
};
