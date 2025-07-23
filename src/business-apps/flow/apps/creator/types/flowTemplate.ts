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

export type TaskAssignment = {
  target: AssignmentTarget; // Single target instead of array
  allowReassignment?: boolean;
};

export interface FlowStep {
  id?: string;
  title: string;
  message?: string;
  type: FlowStepType;
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
  version?: number;
  assignmentMode: AssignmentMode; // Moved from TaskAssignment and made mandatory
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

