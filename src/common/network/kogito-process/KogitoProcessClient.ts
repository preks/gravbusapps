import { RestClient } from '../rest/RestClient'
import { env } from '@/common/env/EnvUtils'

/**
 * Generic Kogito process instance response
 * Each process has its own specific fields, but they all have:
 * - id: process instance ID
 * - employeeId: employee who initiated the process
 * - createdAt: when the process was created (ISO date string)
 * - [entityField]: the actual entity data (null for orphans, populated for real submissions)
 */
export interface KogitoProcessInstance {
  id: string
  employeeId: string
  createdAt?: string // ISO date string (e.g., "2025-12-22T15:45:13.036Z")
  startedAt?: string // ISO date string
  state?: string // Process state
  [key: string]: any // Process-specific fields (bankAccount, bonus, etc.)
}

/**
 * Client for querying Kogito process instances via REST API
 *
 * This is MUCH faster than querying Kogito tasks because:
 * 1. Single REST call per process type
 * 2. Returns only active process instances
 * 3. Automatically filters orphans (entity field is null for orphans)
 * 4. No need to query approval tasks or complex filtering
 */
export class KogitoProcessClient extends RestClient {
  constructor(accessToken?: string) {
    const baseUrl =
      env('NEXT_PUBLIC_EMPLOYEE_SERVICE_ENDPOINT') || `${env('NEXT_PUBLIC_BASE_URL') || ''}/processes/employee`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    super(baseUrl, headers)
  }

  /**
   * Get all active process instances for a specific process type
   *
   * @param processPath - The process path (e.g., 'changeBankAccount', 'grantBonus')
   * @param options - Optional request options (e.g., signal for cancellation)
   * @returns Array of active process instances
   *
   * @example
   * ```typescript
   * const client = new KogitoProcessClient(accessToken)
   * const abortController = new AbortController()
   * const processes = await client.getProcessInstances('changeBankAccount', { signal: abortController.signal })
   *
   * // Filter for real submissions (not orphans)
   * const realSubmissions = processes.filter(p => p.bankAccount !== null)
   * ```
   */
  async getProcessInstances(processPath: string, options?: { signal?: AbortSignal }): Promise<KogitoProcessInstance[]> {
    return this.get<KogitoProcessInstance[]>(`/${processPath}`, options)
  }

  /**
   * Get a specific process instance by ID
   *
   * @param processPath - The process path (e.g., 'changeBankAccount')
   * @param processInstanceId - The process instance ID
   */
  async getProcessInstance(processPath: string, processInstanceId: string): Promise<KogitoProcessInstance> {
    return this.get<KogitoProcessInstance>(`/${processPath}/${processInstanceId}`)
  }
}
