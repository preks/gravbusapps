import { ChangeLogEntry } from '../components/tabs/ChangeLogTab'
import { env } from '@/common/env/EnvUtils'
import ChangeLogDataTransformer from './changeLogDataTransformer'
import ChangeLogVisibilityRules from './changeLogVisibilityRules'
import { CHANGE_LOG_QUERIES } from './changeLogQueries'
import { FlowMetricsClient } from '@/common/network/flow-metrics/FlowMetricsClient'

export interface ChangeLogApiResponse {
  entries: ChangeLogEntry[]
  totalCount: number
  hasMore: boolean
}

export interface ChangeLogServiceConfig {
  baseUrl: string
  accessToken: string
  employeeId: string
  userRole: string
}

export class ChangeLogService {
  private config: ChangeLogServiceConfig
  private graphqlClient: any

  constructor(config: ChangeLogServiceConfig, graphqlClient?: any) {
    this.config = config
    this.graphqlClient = graphqlClient
  }

  /**
   * Fetch change log entries from FLOW audit system
   */
  async fetchChangeLogEntries(): Promise<ChangeLogApiResponse> {
    try {
      // First try to get data from FLOW audit API
      const auditResponse = await this.fetchFromFlowAudit()

      if (auditResponse.entries.length > 0) {
        return auditResponse
      } else {
        return {
          entries: [],
          totalCount: 0,
          hasMore: false
        }
      }
    } catch (error) {
      console.error('Error fetching change log entries:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to fetch change log data: ${message}`)
    }
  }

  /**
   * Fetch data from FLOW audit system
   */
  private async fetchFromFlowAudit(): Promise<ChangeLogApiResponse> {
    try {
      const flowMetricsClient = new FlowMetricsClient(this.config.accessToken)

      const PROCESS_NAMES = [
        'employee.changePictureFlow',
        'employee.changeAddress',
        'employee.changeBankAccount',
        'employee.changeCommunication',
        'employee.changeEmployeePrivateCommunication',
        'employee.changeEmployeeSkills',
        'employee.changePersonalInformation',
        'employee.changeRelationship',
        'employee.updateEmployeeWorkingHours',
        'employee.uploadEmployeeDocument'
      ] as const

      // Execute all process-specific requests in parallel
      const requests = PROCESS_NAMES.map(processName =>
        flowMetricsClient
          .getFlowExecutionTasks({
            cockpitPage: 'ALL',
            size: 100,
            page: 0,
            field: 'PRIORITY',
            direction: 'DESC',
            filterProcessName: processName,
            filterState: 'Closed'
          })
          .catch(() => ({ processingStates: [], content: [], totalCount: 0 }))
      )

      const results = await Promise.all(requests)

      // Flatten tasks from different possible response shapes
      const allTasks: any[] = results.flatMap((r: any) =>
        Array.isArray(r?.processingStates) && r.processingStates.length > 0
          ? r.processingStates
          : Array.isArray(r?.content)
            ? r.content
            : []
      )

      // Map each task to ChangeLogEntry, but keep only those referencing this employeeId in variables/inputs
      const entries = allTasks
        .map(task => this.taskToChangeLogEntry(task))
        .filter(ChangeLogService.isNonNullChangeLogEntry)

      return {
        entries,
        totalCount: entries.length,
        hasMore: false
      }
    } catch {
      return {
        entries: [],
        totalCount: 0,
        hasMore: false
      }
    }
  }

  /**
   * Fetch data using version comparison approach
   */
  private async fetchFromVersionComparison(limit: number = 50): Promise<ChangeLogApiResponse> {
    try {
      // Use the predefined GraphQL query
      const query = CHANGE_LOG_QUERIES.GET_EMPLOYEE_CHANGE_LOG

      // Use GraphQL client if available, otherwise fallback to fetch
      let data: any
      if (this.graphqlClient) {
        data = await this.graphqlClient.request(query, {
          employeeId: this.config.employeeId,
          limit
        })
        // Validate response structure when using GraphQL client
        if (!data || !Array.isArray(data.Employee)) {
          throw new Error('Invalid GraphQL response: missing Employee array')
        }
      } else {
        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK') || '', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query,
            variables: {
              employeeId: this.config.employeeId,
              limit
            }
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        data = await response.json()

        if (data.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
        }

        // Validate response structure for raw fetch
        if (!data || !data.data || !Array.isArray(data.data.Employee)) {
          throw new Error('Invalid GraphQL response: missing data.Employee array')
        }
      }

      // Transform the data to ChangeLogEntry format
      const employeeData = this.graphqlClient ? data?.Employee?.[0] : data.data?.Employee?.[0]
      const entries = ChangeLogDataTransformer.transformEmployeeData(employeeData)

      return {
        entries,
        totalCount: entries.length,
        hasMore: entries.length === limit
      }
    } catch (error) {
      console.error('Error fetching employee change log data:', error)
      // Propagate the error instead of silently returning empty data
      throw new Error(`Failed to fetch change log data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Type guard for filtering out nullish entries from task mapping
  private static isNonNullChangeLogEntry(value: ChangeLogEntry | null | undefined): value is ChangeLogEntry {
    return Boolean(value)
  }

  // (summary-based transformer removed; we now use flow-executions/tasks per process)

  /**
   * Convert a Flow Execution Task to a ChangeLogEntry when it relates to the current employee.
   */
  private taskToChangeLogEntry(task: any): ChangeLogEntry | null {
    const variables = task?.variables || task?.inputs || {}

    const maybeEmployeeIds: string[] = [
      variables.employeeId,
      variables.idEmployee,
      variables.employee_id,
      variables?.employee?.id
    ].filter(Boolean)

    if (maybeEmployeeIds.length > 0 && !maybeEmployeeIds.includes(this.config.employeeId)) {
      return null
    }

    const processName: string = task?.processDefinitionId || task?.processName || task?.customFlowId || ''

    const timestamp =
      task?.lastUpdate || task?.completed || task?.createdAt || task?.started || new Date().toISOString()

    // Use referenceName as the title
    const referenceName: string = task?.referenceName || task?.name || 'Employee Update'

    // Map process to a stable category value for filtering
    const mapping: Record<string, { category: string }> = {
      'employee.changePictureFlow': { category: 'personal' },
      'employee.changeAddress': { category: 'address' },
      'employee.changeBankAccount': { category: 'personal' },
      'employee.changeCommunication': { category: 'address' },
      'employee.changeEmployeePrivateCommunication': { category: 'address' },
      'employee.changeEmployeeSkills': { category: 'skills' },
      changeEmployeeSkills: { category: 'skills' },
      enterEmployeeSkills: { category: 'skills' },
      'employee.changePersonalInformation': { category: 'personal' },
      'employee.changeRelationship': { category: 'personal' },
      'employee.updateEmployeeWorkingHours': { category: 'employment' },
      'employee.uploadEmployeeDocument': { category: 'documents' },
      // Additional synonyms/variants we have seen
      'employee.uploadDocument': { category: 'documents' },
      uploadEmployeeDocument: { category: 'documents' },
      uploadDocument: { category: 'documents' }
    }
    const mapKey = Object.keys(mapping).find(k => processName?.includes(k)) || ''
    let categoryValue = mapping[mapKey]?.category
    // Heuristic fallback: infer from human-readable name
    if (!categoryValue) {
      if (/document/i.test(referenceName) || /document/i.test(processName)) {
        categoryValue = 'documents'
      } else if (/skill/i.test(referenceName) || /skill/i.test(processName)) {
        categoryValue = 'skills'
      } else if (
        /address/i.test(referenceName) ||
        /communication/i.test(referenceName) ||
        /address|communication/i.test(processName)
      ) {
        categoryValue = 'address'
      }
    }
    if (!categoryValue) categoryValue = 'personal'

    return {
      id: task?.id || `${processName}-${timestamp}`,
      fieldName: referenceName,
      fieldCategory: categoryValue,
      previousValue: null,
      newValue: variables?.newValue || null,
      timestamp,
      changedBy: {
        userId: task?.creatorUserId || task?.actualOwner || 'system',
        userName: task?.creatorName || task?.ownerName || task?.actualOwner || 'System',
        userRole: 'System'
      },
      changeOrigin: {
        flowId: task?.processInstanceId || task?.customFlowId || processName || 'flow-execution',
        flowName: task?.name || processName || referenceName,
        isSystemGenerated: true,
        isAIGenerated: false
      },
      isVisible: true,
      isMasked: false
    }
  }
  /**
   * Export change log data as CSV
   */
  async exportChangeLog(): Promise<Blob> {
    const response = await this.fetchChangeLogEntries() // Large limit for export

    const csvContent = [
      ['Field Name', 'Category', 'Previous Value', 'New Value', 'Timestamp', 'Changed By', 'Change Origin'],
      ...response.entries.map(entry => [
        entry.fieldName,
        entry.fieldCategory,
        entry.previousValue || '',
        entry.newValue || '',
        entry.timestamp,
        entry.changedBy.userName,
        entry.changeOrigin.flowName
      ])
    ]
      .map(row => row.join(','))
      .join('\n')

    return new Blob([csvContent], { type: 'text/csv' })
  }

  /**
   * Get field categories available for the current user
   */
  getAvailableFieldCategories(): string[] {
    return ChangeLogVisibilityRules.getAvailableFieldCategories(this.config.userRole)
  }

  /**
   * Get change actors available for the current user
   */
  getAvailableChangeActors(): string[] {
    return ChangeLogVisibilityRules.getAvailableChangeActors()
  }
}

/**
 * Factory function to create ChangeLogService instance
 */
export const createChangeLogService = (
  config: Omit<ChangeLogServiceConfig, 'baseUrl'> & {
    baseUrl?: string
  },
  graphqlClient?: any
): ChangeLogService => {
  // Get base URL from environment or use provided one
  const baseUrl = config.baseUrl || 'https://newwork-dev.newwork.com'

  return new ChangeLogService(
    {
      ...config,
      baseUrl
    },
    graphqlClient
  )
}

export default ChangeLogService
