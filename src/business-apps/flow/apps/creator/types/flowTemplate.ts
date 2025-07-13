/**
 * Flow template types for defining workflow configurations
 */

// Flow Template Types for Creator App
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
  type: 'TEMPLATE' | 'INSTANCE' | 'DRAFT';
  name: string;
  description?: string;
  steps: FlowStep[];
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

