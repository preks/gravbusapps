/**
 * EveryBox Type Definitions
 * Imports unified task types and defines Flow-specific types
 */

// Re-export unified task types from the Every API
export type {
  UnifiedTask,
  TaskSource,
  TaskStatus,
  TaskFilters,
  TaskStatistics,
  TaskAssignment,
  TaskAvailableActions,
  TaskWorkflowMeta
} from '@/business-apps/core/every/apps/every-api/types';

/**
 * Flow status
 */
export type FlowStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TERMINATED';

/**
 * Flow step status
 */
export type FlowStepStatus = 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED' | 'FAILED' | 'CANCELED';

/**
 * Flow Step
 */
export interface FlowStep {
  stepIndex: number;
  title: string;
  type: string;
  status: FlowStepStatus;
  assignedTo?: string;
  completedBy?: string;
  completedAt?: string;
}

/**
 * Flow Model
 * Represents initiated workflows
 */
export interface Flow {
  id: string;
  templateName: string;
  templateId: string;
  status: FlowStatus;
  initiatedBy: string;
  startedAt: string;
  completedAt?: string;
  currentStep: number;
  totalSteps: number;
  steps: FlowStep[];
  metadata: Record<string, any>;
}

/**
 * Flow filter options
 */
export interface FlowFilters {
  status?: FlowStatus[];
  templateName?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  search?: string;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  count?: number;
  totalCount?: number;
}
