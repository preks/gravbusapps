/**
 * Flow template types for defining workflow configurations
 */

// Assignment target
export type AssignmentTarget = {
  entity: 'user' | 'department' | 'team' | 'capability' | 'role';
  id: string;
};

// Task assignment configuration
export type TaskAssignment = {
  targets: AssignmentTarget[];
  assignToAll: boolean; // true = assign to all targets (creates multiple tasks), false = assign to any (creates single task)
  allowReassignment?: boolean;
};

// Input block types enum
export enum InputBlockType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA', 
  NUMBER = 'NUMBER',
  DROPDOWN = 'DROPDOWN',
  RADIO = 'RADIO',
  CHECKBOX = 'CHECKBOX',
  DATETIME = 'DATETIME',
  FILE = 'FILE',
  SIGNATURE = 'SIGNATURE'
}

export type InputBlock = {
  id: string;
  type: InputBlockType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  multiple?: boolean; // For select types that can have multiple selections
  accept?: string; // For file input to specify allowed file types
};

// Content block types enum
export enum ContentBlockType {
  TEXT = 'TEXT',
  DOCUMENT = 'DOCUMENT',
  IMAGE = 'IMAGE',
  LINK = 'LINK'
}

export type ContentBlock = {
  id: string;
  type: ContentBlockType;
  content: string;
};

// Step type enum
export enum StepType {
  APPROVAL = 'APPROVAL',
  ACKNOWLEDGE = 'ACKNOWLEDGE', 
  TASK = 'TASK',
  INFORMATION = 'INFORMATION'
}

// Step definition with simplified assignment
export type FlowStep = {
  id: string;
  title: string;
  description: string;
  type: StepType;
  contentBlocks: ContentBlock[];
  inputBlocks: InputBlock[];
  assignment?: TaskAssignment;
};

// Time unit enum for reminders and escalations
export enum TimeUnit {
  HOURS = 'HOURS',
  DAYS = 'DAYS'
}

// Timing type enum for reminders and escalations
export enum TimingType {
  AFTER = 'AFTER',
  BEFORE = 'BEFORE'
}

// Task execution type enum (keeping for backward compatibility)
export enum TaskExecutionType {
  PARALLEL = 'PARALLEL',
  SEQUENTIAL = 'SEQUENTIAL'
}

// Flow template with flow-level assignment
export type FlowTemplate = {
  id?: string;
  title: string;
  description: string;
  executionStrategy: TaskExecutionType;
  // Flow-level assignment that overrides task-level assignments when configured
  assignment?: TaskAssignment;
  reminder?: {
    timing: {
      type: TimingType;
      value: number;
      unit: TimeUnit;
    };
  };
  escalation?: {
    timing: {
      type: TimingType;
      value: number;
      unit: TimeUnit;
    };
  };
  steps: FlowStep[];
  flowType?: 'TEMPLATE' | 'INSTANCE' | 'DRAFT'; // Optional metadata to specify the flow type
};

// Form field error type
export type FormErrors = {
  [key: string]: string | FormErrors | Array<FormErrors>;
};
