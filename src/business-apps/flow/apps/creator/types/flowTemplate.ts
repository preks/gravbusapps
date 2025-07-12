/**
 * Flow template types for defining workflow configurations
 */

// Assignment target
export type AssignmentTarget = {
  entity: 'user' | 'department' | 'capability' | 'role';
  id: string;
};

// Assignment modes
export enum AssignmentMode {
  ASSIGN = 'ASSIGN', // Assign to all - creates separate tasks for each assignee
  CLAIM = 'CLAIM'    // Claimable by one - creates one shared task that any assignee can claim
}

// Task assignment configuration
export type TaskAssignment = {
  targets: AssignmentTarget[];
  assignmentMode: AssignmentMode;
  allowReassignment?: boolean;
};

// Attachment/Link types for unified content management
export type AttachmentLink = {
  type: 'document' | 'image' | 'hyperlink';
  url: string;
  title: string;
  description?: string;
};

// Input block types (simplified)
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

// Input block definition
export type InputBlock = {
  type: InputBlockType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
};

// Step types
export enum StepType {
  TASK = 'TASK',
  APPROVAL = 'APPROVAL',
  INFORMATION = 'INFORMATION',
  ACKNOWLEDGE = 'ACKNOWLEDGE'
}

// Timing configuration
export enum TimingType {
  BEFORE = 'BEFORE',
  AFTER = 'AFTER'
}

export enum TimeUnit {
  MINUTES = 'MINUTES',
  HOURS = 'HOURS',
  DAYS = 'DAYS'
}

// Simplified step definition
export type SimplifiedStep = {
  title: string;
  message: string; // Rich text/Markdown content replacing content blocks
  attachments: AttachmentLink[]; // Unified attachments and links
  
  // Optional sections (disabled by default)
  requestInput: {
    enabled: boolean;
    inputs: InputBlock[];
  };
  
  usePredefinedAssignment: {
    enabled: boolean;
    assignment?: TaskAssignment;
    // When enabled=false, assignment happens at execution time
  };
  
  // Keep step type for workflow logic
  type: StepType;
};

// Simplified flow template (removed flow-level assignment and parallel execution)
export type SimplifiedFlowTemplate = {
  id?: string;
  title: string;
  description: string;
  // Removed: executionStrategy (always sequential)
  // Removed: assignment (flow-level assignment)
  
  // Keep flow-level configurations that make sense
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
  
  steps: SimplifiedStep[];
  flowType?: 'TEMPLATE' | 'INSTANCE' | 'DRAFT';
};

// Legacy types for backward compatibility during migration
// TODO: Remove these after migration is complete
export type FlowStep = SimplifiedStep;
export type FlowTemplate = SimplifiedFlowTemplate;

// Execution configuration for runtime
export type ExecutionConfiguration = {
  templateId: string;
  stepConfigurations: {
    [stepIndex: number]: {
      title?: string; // Allow editing title at execution time
      assignment?: TaskAssignment;
      message?: string; // Allow editing message at execution time
      attachments?: AttachmentLink[]; // Allow adding execution-specific attachments
    };
  };
};

// Legacy enums for backward compatibility
export enum TaskExecutionType {
  SEQUENTIAL = 'SEQUENTIAL'
  // Removed: PARALLEL
}

export enum ContentBlockType {
  TEXT = 'TEXT',
  DOCUMENT = 'DOCUMENT',
  LINK = 'LINK',
  IMAGE = 'IMAGE'
}

export type ContentBlock = {
  id: string;
  type: ContentBlockType;
  content: string;
  description?: string;
  required: boolean;
};

// Form field error type
export type FormErrors = {
  [key: string]: string | FormErrors | Array<FormErrors>;
};
