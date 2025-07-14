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

export enum AssignmentMode {
  CLAIM = 'CLAIM',
  ASSIGN = 'ASSIGN'
}

export type AssignmentTarget = {
  entity: 'user' | 'department' | 'capability' | 'role';
  id: string;
};

export interface TaskAssignment {
  targets: AssignmentTarget[];
  assignmentMode: AssignmentMode;
  allowReassignment?: boolean;
}

export interface FlowStep {
  type: StepType;
  title: string;
  message?: string;
  inputs?: InputBlock[];
  links?: Link[];
  assignment?: TaskAssignment;
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

// Assignment types moved to top of file
