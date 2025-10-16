import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ChangeLogEntry, ChangeLogFilters } from '../components/tabs/ChangeLogTab'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import ChangeLogDataTransformer from './changeLogDataTransformer'
import ChangeLogVisibilityRules from './changeLogVisibilityRules'
import { CHANGE_LOG_QUERIES } from './changeLogQueries'

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
  async fetchChangeLogEntries(
    filters?: ChangeLogFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChangeLogApiResponse> {
    try {
      // First try to get data from FLOW audit API
      const auditResponse = await this.fetchFromFlowAudit(filters, limit, offset)
      
      if (auditResponse.entries.length > 0) {
        return auditResponse
      }

      // Fallback to version comparison approach
      return await this.fetchFromVersionComparison(filters, limit, offset)
    } catch (error) {
      console.error('Error fetching change log entries:', error)
      throw new Error('Failed to fetch change log data')
    }
  }

  /**
   * Fetch data from FLOW audit system
   */
  private async fetchFromFlowAudit(
    filters?: ChangeLogFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChangeLogApiResponse> {
    // For now, return empty data since FLOW audit system is not available
    // This will trigger the fallback to version comparison
    return {
      entries: [],
      totalCount: 0,
      hasMore: false
    }
  }

  /**
   * Fetch data using version comparison approach
   */
  private async fetchFromVersionComparison(
    filters?: ChangeLogFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChangeLogApiResponse> {
    try {
      // Use the predefined GraphQL query
      const query = CHANGE_LOG_QUERIES.GET_EMPLOYEE_CHANGE_LOG

      // Use GraphQL client if available, otherwise fallback to fetch
      let data: any
      if (this.graphqlClient) {
        data = await this.graphqlClient.request(query, {
          employeeId: this.config.employeeId,
          limit,
          offset
        })
      } else {
        const response = await fetch(`${this.config.baseUrl}/graphql`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query,
            variables: {
              employeeId: this.config.employeeId,
              limit,
              offset
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


  /**
   * Export change log data as CSV
   */
  async exportChangeLog(filters?: ChangeLogFilters): Promise<Blob> {
    const response = await this.fetchChangeLogEntries(filters, 10000, 0) // Large limit for export
    
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
    ].map(row => row.join(',')).join('\n')
    
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
  const baseUrl = config.baseUrl || process.env.REACT_APP_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://newwork-dev.newwork.com/flow-engine'
  
  return new ChangeLogService({
    ...config,
    baseUrl
  }, graphqlClient)
}

export default ChangeLogService
