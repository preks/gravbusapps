/**
 * Shared types for absence task forms
 */

/**
 * Form data submitted through the task completion process
 */
export interface TaskFormData {
  approval?: string
  approvalNote?: string
}

/**
 * Process metadata containing workflow-level configuration
 * Contains the primary endpoint for API operations
 */
export interface ProcessMetadata {
  /**
   * Primary API endpoint for process-level operations
   * Used as the first choice in the endpoint resolution chain
   */
  endpoint?: string
  // Process-specific metadata can be added as explicit fields here
  processId?: string
  processDefinitionId?: string
  businessKey?: string
}

/**
 * Task-specific payload containing data for the current task
 */
export interface TaskPayload {
  /**
   * Task-level API endpoint for task-specific operations
   * Used as secondary fallback when processMetadata.endpoint is not available
   */
  endpoint?: string
  // Task-specific data can be added as explicit fields here
  taskId?: string
  taskName?: string
  variables?: Record<string, unknown>
}

/**
 * Extended interface for additionalData with form-specific properties
 * This provides proper typing for task payload properties with clear separation
 * of concerns between form data, task data, and process metadata.
 *
 * Note: The Kogito process system may inject additional runtime properties.
 * If new dynamic properties are required, they should be explicitly added
 * to the appropriate interface (TaskPayload, ProcessMetadata, or TaskFormData)
 * rather than using a broad index signature.
 */
export interface ExtendedAdditionalData {
  /**
   * Form data submitted through the task completion
   */
  formData?: TaskFormData

  /**
   * Timestamp when the task was completed
   */
  psi_taskCompletedAt?: string

  /**
   * Task-specific payload containing data for the current task
   */
  psi_taskPayload?: TaskPayload

  /**
   * Process metadata containing workflow-level configuration
   */
  psi_processMetadata?: ProcessMetadata

  /**
   * Current task status (e.g., 'Ready', 'Reserved', 'InProgress', 'Completed')
   */
  psi_taskStatus?: string

  /**
   * Top-level API endpoint for general operations
   * Used as final fallback in the endpoint resolution chain:
   * 1. psi_processMetadata.endpoint (primary)
   * 2. psi_taskPayload.endpoint (secondary)
   * 3. endpoint (final fallback)
   */
  endpoint?: string
}
