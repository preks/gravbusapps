/**
 * Flow Template Types
 * Types for dynamic templates from custom-flow-engine
 */

// Field types supported by the workflow engine
export type DynamicFormFieldType = 
  | 'TEXT' 
  | 'TEXTAREA' 
  | 'SELECT' 
  | 'DATE' 
  | 'CHECKBOX' 
  | 'NUMBER'
  | 'EMAIL'
  | 'URL'
  | 'MULTISELECT';

// Validation rule types
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'url';
  value?: string | number;
  message?: string;
}

// Dynamic form field definition from workflow template
export interface DynamicFormField {
  type: DynamicFormFieldType;
  name: string;
  label: string;
  required: boolean;
  placeholder?: string;
  description?: string;
  validation?: ValidationRule[];
  options?: Array<{
    value: string;
    label: string;
  }>;
  // Conditional fields
  dependsOn?: string;
  showWhen?: string | string[];
  // UI hints
  colspan?: number;
  order?: number;
}

// Step definition from workflow template
export interface FlowTemplateStep {
  type: 'TASK' | 'GATEWAY' | 'SUBPROCESS';
  title: string;
  message?: string;
  dueInMinutes?: number;
  form?: DynamicFormField[];
  links?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  assignment?: {
    targets: any;
    assignmentMode: string;
    allowReassignment: boolean;
  };
}

// Flow template from custom-flow-engine
export interface FlowTemplate {
  id?: string; // May not have ID initially
  type: 'TEMPLATE';
  name: string;
  description: string;
  version: number;
  steps: FlowTemplateStep[];
  
  // Future enhancements for categorization
  category?: string;
  tags?: Record<string, any>;
  metadata?: {
    icon?: string;
    estimatedTime?: string;
    difficulty?: 'simple' | 'standard' | 'complex';
  };
  
  // Computed properties for UI
  formSchema?: DynamicFormField[]; // Extracted from step_0.form
  estimatedDuration?: string;
  stepCount?: number;
}

// Form values for dynamic forms
export type DynamicFormValues = Record<string, any>;

// Form submission result
export interface DynamicFormSubmission {
  templateId: string;
  stepData: DynamicFormValues;
  runtimeAssignments?: Record<string, any>;
}

// Template loading state
export interface FlowTemplateState {
  templates: FlowTemplate[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
}
