/**
 * Path parameters for flows
 */
export type FlowPathParams = {
  /**
   * Access scope for the flow (e.g., 'employee')
   */
  accessScope: string

  /**
   * Context for the flow
   */
  context: string
}

export interface FlowPayload {}

export interface FlowResponse {
  /**
   * ID of the flow
   */
  id: string
  /**
   * Type of the flow
   */
  flowType: string
  /**
   * Status of the flow
   */
  status: string
  /**
   * Context for the flow
   */
  context?: Record<string, any>
  /**
   * ID of the context
   */
  contextId?: string
  /**
   * Creation date of the flow
   */
  createdAt: string
  /**
   * Update date of the flow
   */
  updatedAt: string
  /**
   * Completion date of the flow
   */
  completedAt?: string
  /**
   * Tasks associated with the flow
   */
  tasks?: FlowTask[]
}

/**
 * Payload for employee document flow
 */
export interface EmployeeDocumentFlowPayload extends FlowPayload {
  employeeDocument: {
    /**
     * Employee ID
     */
    employeeId: string
    /**
     * Document group ID
     */
    documentGroup: string
    /**
     * Document type ID
     */
    type: string
    /**
     * Document name
     */
    name: string
    /**
     * File ID from file service
     */
    file: string
    /**
     * MIME type of the file
     */
    mimeType: string
    /**
     * Description of the document
     */
    description?: string
    /**
     * Size of the file in bytes
     */
    fileSize: number
    /**
     * Date from which the document is valid (ISO format)
     */
    validFrom: string
    /**
     * Date until which the document is valid (ISO format)
     */
    validTo?: string
  }
}

export interface FlowTask {
  /**
   * ID of the task
   */
  id: string
  /**
   * ID of the flow execution
   */
  flowExecutionId: string
  /**
   * Status of the task
   */
  status: string
  /**
   * Type of the task
   */
  type: string
  /**
   * Creation date of the task
   */
  createdAt: string
  /**
   * Update date of the task
   */
  updatedAt: string
  /**
   * Completion date of the task
   */
  completedAt?: string
  /**
   * Result of the task
   */
  result?: any
  /**
   * Error associated with the task
   */
  error?: any
}
