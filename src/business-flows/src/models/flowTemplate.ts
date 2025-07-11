/**
 * Flow template types for the business-flows service
 */

// Input block types
export type InputBlockType = 'text' | 'textarea' | 'number' | 'dropdown' | 'radio' | 'checkbox' | 'datetime' | 'file' | 'signature';

export type InputBlock = {
  id: string;
  type: InputBlockType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  multiple?: boolean;
};

// Content block types
export type ContentBlockType = 'text' | 'document' | 'image';

export type ContentBlock = {
  id: string;
  type: ContentBlockType;
  content: string;
};

// Step type (renamed from TaskType)
export type StepType = 'APPROVAL' | 'ACKNOWLEDGE' | 'TASK' | 'INFORMATION';

// Assignment target
export type AssignmentTarget = {
  entity: 'user' | 'department' | 'capability' | 'role';
  id: string;
  name: string;
};

// Task assignment (simplified from complex AssignmentConfig)
export type TaskAssignment = {
  targets: AssignmentTarget[];
  assignToAll: boolean;
  allowReassignment: boolean;
};

// Step definition (renamed from TaskStep)
export type FlowStep = {
  id: string;
  title: string;
  description: string;
  type: StepType;
  contentBlocks: ContentBlock[];
  inputBlocks: InputBlock[];
  assignment?: TaskAssignment;
};

// Time unit for reminders and escalations
export type TimeUnit = 'hours' | 'days';

// Timing type for reminders and escalations
export type TimingType = 'after' | 'before';

// Execution strategy type (simplified)
export type ExecutionStrategy = 'PARALLEL' | 'SEQUENTIAL';

// Flow template main type
export type FlowTemplate = {
  id?: string;
  title: string;
  description: string;
  executionStrategy: ExecutionStrategy;
  // Flow-level assignment that overrides step-level assignments when configured
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
