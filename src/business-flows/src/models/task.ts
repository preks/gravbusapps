/**
 * Task model for business-flows service
 */

export interface TaskInput {
  key?: string;
  value: string | number | boolean | object;
}

export interface TaskOutput {
  key: string;
  value: string | number | boolean | object;
}

export enum TaskStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  TIMED_OUT = 'TIMED_OUT',
  CANCELED = 'CANCELED',
}

export type TaskPriority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Task {
  taskId: string;
  workflowInstanceId: string;
  referenceTaskName: string;
  taskType: string;
  name: string;
  status: TaskStatus;
  input: Record<string, any>;
  output: Record<string, any>;
  workerId?: string;
  priority?: TaskPriority;
  startTime?: number;
  endTime?: number;
  updateTime?: number;
  retryCount?: number;
  retryLimit?: number;
  workflowType?: string;
  taskDefName?: string;
  scheduledTime?: number;
  responseTimeoutSeconds?: number;
  callbackAfterSeconds?: number;
  pollCount?: number;
  rateLimitPerFrequency?: number;
  rateLimitFrequencyInSeconds?: number;
  externalInputPayloadStoragePath?: string;
  externalOutputPayloadStoragePath?: string;
  workflowTask?: object;
  domain?: string;
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
  correlationId?: string;
}

export interface TaskDefinition {
  name: string;
  description?: string;
  retryCount?: number;
  timeoutSeconds?: number;
  timeoutPolicy?: 'RETRY' | 'TIME_OUT_WF' | 'ALERT_ONLY';
  retryLogic?: 'FIXED' | 'EXPONENTIAL_BACKOFF' | 'LINEAR_BACKOFF';
  retryDelaySeconds?: number;
  responseTimeoutSeconds?: number;
  concurrentExecLimit?: number;
  rateLimitPerFrequency?: number;
  rateLimitFrequencyInSeconds?: number;
  inputKeys?: string[];
  outputKeys?: string[];
  inputTemplate?: Record<string, any>;
  ownerEmail?: string;
  type?: string;
  createdBy?: string;
  updatedBy?: string;
  backoffScaleFactor?: number;
}

// Custom CLAIM task interface
export interface ClaimTask {
  taskId: string;
  userId: string;
  taskType: 'CLAIM';
}

// Human task interface
export interface HumanTask {
  taskId: string;
  userId?: string; // The user who claimed the task
  taskType: 'HUMAN';
  input: Record<string, any>;
  output: Record<string, any>;
}

export interface TaskSearchParams {
  workflowId?: string;
  taskType?: string;
  status?: TaskStatus | TaskStatus[];
  startKey?: string;
  limit?: number;
  assignedTo?: string;
}
