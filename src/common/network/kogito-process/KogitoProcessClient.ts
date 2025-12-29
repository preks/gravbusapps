import { RestClient } from '../rest/RestClient'
import { env } from '@/common/env/EnvUtils'

/**
 * Generic Kogito process instance response (NEW BACKEND - with status field!)
 * Each process has its own specific fields, but they all have:
 * - id: process instance ID
 * - employeeId: employee who initiated the process
 * - status: current status (PENDING, PROCESSING, APPROVED, REJECTED, CANCELLED)
 * - supervisorId: supervisor assigned for approval
 * - createdAt: when the process was created (ISO date string)
 * - [entityField]: the actual entity data (bankAccount, bonus, etc.)
 */
export interface KogitoProcessInstance {
  id: string
  employeeId: string
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  supervisorId: string | null
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
   * @param options - Optional request options including employeeId filter and abort signal
   * @returns Array of active process instances
   *
   * @example
   * ```typescript
   * const client = new KogitoProcessClient(accessToken)
   *
   * // Get processes for a specific employee (NEW BACKEND - uses query param!)
   * const processes = await client.getProcessInstances('changeBankAccount', {
   *   employeeId: '123-456-789'
   * })
   *
   * // Check for pending processes
   * const pending = processes.filter(p =>
   *   p.status === 'PENDING' || p.status === 'PROCESSING'
   * )
   * ```
   */
  async getProcessInstances(
    processPath: string,
    options?: { employeeId?: string; signal?: AbortSignal }
  ): Promise<KogitoProcessInstance[]> {
    const queryParams = options?.employeeId ? `?employeeId=${encodeURIComponent(options.employeeId)}` : ''
    return this.get<KogitoProcessInstance[]>(`/${processPath}${queryParams}`, { signal: options?.signal })
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
