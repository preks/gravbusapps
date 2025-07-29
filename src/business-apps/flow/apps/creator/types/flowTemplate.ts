/**
 * Flow template types for defining workflow configurations
 */

// Flow template types for the frontend

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
  RADIO = 'RADIO',
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

export type TaskAssignment = {
  targets: AssignmentTarget | null; // Required in backend - null indicates runtime assignment
  assignmentMode: AssignmentMode; // Required - CLAIM or ASSIGN mode
  allowReassignment?: boolean;
};

export interface FlowStep {
  id?: string;
  title: string;
  message?: string;
  type: FlowStepType;
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

export interface ExecutionConfiguration {
  templateId: string;
  userId: string;
  inputs?: Record<string, any>;
}

export enum TimeUnit {
  HOURS = 'HOURS',
  DAYS = 'DAYS'
}

export enum TimingType {
  AFTER = 'AFTER',
  BEFORE = 'BEFORE'
}

