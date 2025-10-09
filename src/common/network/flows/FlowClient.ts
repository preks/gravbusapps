import { RestClient, RequestOptions } from '../rest/RestClient'
import { env } from '../../env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import { FlowPathParams, FlowPayload, FlowResponse } from '../../types/FlowTypes'

// Flow response interfaces
export interface FlowInitiationResponse {
  id: string
  processId: string
  processName: string
  businessKey?: string
  [key: string]: any
}

export interface FlowTask {
  id: string
  name: string
  processInstanceId: string
  processId: string
  rootProcessInstanceId?: string
  rootProcessId?: string
  state: string
  actualOwner?: string
  [key: string]: any
}

export interface FlowTasksResponse {
  tasks: FlowTask[]
  [key: string]: any
}

export interface FlowTaskCompletionResponse {
  id: string
  processInstanceId: string
  [key: string]: any
}

/**
 * Client for interacting with Flow service
 * Enables triggering and managing flows
 */
export class FlowClient extends RestClient {
  constructor() {
    super(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT') ?? '')
  }

  /**
   * Set the access token for authentication
   * @param accessToken - The access token to use for authentication
   */
  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  /**
   * Executes a new flow execution
   * @param payload - The flow execution payload
   * @param options - Additional request options
   * @returns A Promise that resolves to a FlowResponse containing the flow execution details
   */
  public async executeFlow(
    params: FlowPathParams,
    payload: FlowPayload,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<FlowResponse> {
    try {
      return await this.post<FlowResponse>(`/${params.accessScope}/${params.context}`, payload, options)
    } catch (error) {
      console.error('FlowClient: Error executing flow:', error)
      throw error
    }
  }

  /**
   * Initiates a workflow process
   * @param domain The domain of the process (e.g., 'employee-expense')
   * @param processName The name of the process (e.g., 'changeExpenseItem')
   * @param payload The payload to send with the process initiation
   * @returns Promise with the process initiation result
   */
  public async initiateFlow(
    domain: string,
    processName: string,
    payload: Record<string, any>
  ): Promise<FlowInitiationResponse> {
    if (!this.headers?.['Authorization']) {
      throw new Error('FlowClient: Access token not set. Call setAccessToken before initiating flow.')
    }

    try {
      const url = `/${domain}/${processName}`
      return await this.post<FlowInitiationResponse>(url, payload)
    } catch (error) {
      console.error('FlowClient: Error initiating flow:', error)
      throw error
    }
  }

  /**
   * Gets the opened task flow for a specific process instance
   * @param domain The domain of the process (e.g., 'employee-expense')
   * @param processName The name of the process (e.g., 'changeExpenseItem')
   * @param processInstanceId Process instance ID from initiateFlow
   * @param userId User ID for the tasks
   * @returns Promise with the opened task flow result
   */
  public async getOpenedTaskFlow(
    domain: string,
    processName: string,
    processInstanceId: string,
    userId: string
  ): Promise<FlowTasksResponse> {
    if (!this.headers?.['Authorization']) {
      throw new Error('FlowClient: Access token not set. Call setAccessToken before getting task flow.')
    }

    try {
      const url = `/${domain}/${processName}/${processInstanceId}/tasks?user=${userId}`
      return await this.get<FlowTasksResponse>(url)
    } catch (error) {
      console.error('FlowClient: Error getting task flow:', error)
      throw error
    }
  }

  /**
   * Completes a task in the workflow process
   * @param domain The domain of the process (e.g., 'employee-expense')
   * @param processName The name of the process (e.g., 'changeExpenseItem')
   * @param processInstanceId Process instance ID from initiateFlow
   * @param taskName Task name from getOpenedTaskFlow
   * @param taskId Task ID from getOpenedTaskFlow
   * @param userId User ID for the task
   * @param submitData Data to submit with the task completion
   * @returns Promise with the task completion result
   */
  public async completeTaskFlow(
    domain: string,
    processName: string,
    processInstanceId: string,
    taskName: string,
    taskId: string,
    userId: string,
    submitData: Record<string, any>
  ): Promise<FlowTaskCompletionResponse> {
    if (!this.headers?.['Authorization']) {
      throw new Error('FlowClient: Access token not set. Call setAccessToken before completing task flow.')
    }

    try {
      const url = `/${domain}/${processName}/${processInstanceId}/${taskName}/${taskId}?phase=complete&user=${userId}`
      return await this.post<FlowTaskCompletionResponse>(url, submitData)
    } catch (error) {
      console.error('FlowClient: Error completing task flow:', error)
      throw error
    }
  }

  /**
   * Gets a resource from the flow service using a custom path
   * @param path The path to the resource (will be appended to the base URL)
   * @param options Additional request options
   * @returns Promise with the resource data
   */
  public async getResource<T = any>(path: string, options: Omit<RequestOptions, 'body'> = {}): Promise<T> {
    if (!this.headers?.['Authorization']) {
      throw new Error('FlowClient: Access token not set. Call setAccessToken before getting resource.')
    }

    try {
      const url = path.startsWith('/') ? path : `/${path}`
      return await this.get<T>(url, options)
    } catch (error) {
      console.error(`FlowClient: Error getting resource from ${path}:`, error)
      throw error
    }
  }
}

export const flowClient = new FlowClient()
