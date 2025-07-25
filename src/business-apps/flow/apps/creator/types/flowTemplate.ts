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
  targets: AssignmentTarget[]; // Array of targets to match backend structure
  assignmentMode?: AssignmentMode; // CLAIM or ASSIGN mode
  allowReassignment?: boolean;
};

export interface FlowStep {
  id?: string;
  title: string;
  message?: string;
  type: FlowStepType;
  dueInMinutes?: number;
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
  type: 'TEMPLATE' | 'SELF_SERVICE';
  name: string;
  description?: string;
  version?: number;
  assignmentMode?: AssignmentMode; // Optional to match backend
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

