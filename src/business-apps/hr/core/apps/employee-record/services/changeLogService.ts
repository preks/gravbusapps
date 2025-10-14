import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext'
import { ChangeLogEntry, ChangeLogFilters } from '../components/tabs/ChangeLogTab'

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

  constructor(config: ChangeLogServiceConfig) {
    this.config = config
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
      // Create a GraphQL query to fetch employee data with audit fields
      const query = `
        query GetEmployeeChangeLog($employeeId: uuid!, $limit: Int, $offset: Int) {
          Employee(where: {id: {_eq: $employeeId}}) {
            id
            code
            fullName
            version
            updatedAt
            updatedBy
            createdAt
            createdBy
            
            # Address changes
            addresses(where: {isDeleted: {_eq: false}}, orderBy: {updatedAt: DESC}, limit: $limit) {
              id
              addressLine
              postalCode
              locality
              type
              country {
                value
              }
              version
              updatedAt
              updatedBy
              createdAt
              createdBy
            }
            
            # Communication changes
            communication(where: {isDeleted: {_eq: false}}, orderBy: {updatedAt: DESC}, limit: $limit) {
              id
              channelRef
              value
              purpose
              type {
                value
              }
              channel {
                value
                code
              }
              version
              updatedAt
              updatedBy
              createdAt
              createdBy
            }
            
            # Working condition changes
            workingCondition(where: {isDeleted: {_eq: false}}, orderBy: {updatedAt: DESC}, limit: $limit) {
              id
              contractType {
                value
              }
              employmentType {
                value
              }
              hireDate
              exitDate
              vacationDays
              remote {
                value
              }
              region {
                value
              }
              version
              updatedAt
              updatedBy
              createdAt
              createdBy
            }
            
            # Working hours changes
            workingHours(where: {isDeleted: {_eq: false}}, orderBy: {updatedAt: DESC}, limit: $limit) {
              id
              weeklyHours
              fullTimeEquivalent
              mondayHours
              tuesdayHours
              wednesdayHours
              thursdayHours
              fridayHours
              saturdayHours
              sundayHours
              weeklyDays
              remote {
                value
              }
              version
              updatedAt
              updatedBy
              createdAt
              createdBy
            }
            
            # Bank account changes
            bankAccounts(where: {isDeleted: {_eq: false}}, orderBy: {updatedAt: DESC}, limit: $limit) {
              id
              iban
              bankName
              accountHolder
              version
              updatedAt
              updatedBy
              createdAt
              createdBy
            }
            
            # Tax details changes
            taxDetails(where: {isDeleted: {_eq: false}}, orderBy: {updatedAt: DESC}, limit: $limit) {
              id
              taxNumber
              taxBracketRef
              taxIdentificationNumber
              socialSecurityNumber
              taxableChurchAffiliationRef
              childTaxAllowance
              healthInsuranceName
              healthInsuranceTypeRef
              version
              updatedAt
              updatedBy
              createdAt
              createdBy
            }
          }
        }
      `

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

      const data = await response.json()
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
      }

      // Transform the data to ChangeLogEntry format
      const entries = this.transformEmployeeData(data.data?.Employee?.[0])
      
      return {
        entries,
        totalCount: entries.length,
        hasMore: entries.length === limit
      }
    } catch (error) {
      console.error('Error fetching employee change log data:', error)
      // Return empty data - no mock fallback
      return {
        entries: [],
        totalCount: 0,
        hasMore: false
      }
    }
  }

  /**
   * Transform employee data to ChangeLogEntry format
   */
  private transformEmployeeData(employee: any): ChangeLogEntry[] {
    const entries: ChangeLogEntry[] = []

    if (!employee) return entries

    // Transform addresses
    if (employee.addresses) {
      employee.addresses.forEach((address: any, index: number) => {
        if (index > 0) { // Only show changes, not the first record
          entries.push({
            id: `address-${address.id}`,
            fieldName: 'Address',
            fieldCategory: 'address',
            previousValue: this.formatAddressValue(employee.addresses[index - 1]),
            newValue: this.formatAddressValue(address),
            timestamp: address.updatedAt || address.createdAt,
            changedBy: {
              userId: address.updatedBy || address.createdBy || 'system',
              userName: address.updatedBy || address.createdBy || 'System',
              userRole: 'System'
            },
            changeOrigin: {
              flowId: `address-${address.id}`,
              flowName: 'Employee Address Update',
              isSystemGenerated: true,
              isAIGenerated: false
            },
            isVisible: this.applyVisibilityRules({ fieldCategory: 'address' }, address),
            isMasked: this.applyMaskingRules({ fieldCategory: 'address' }, address)
          })
        }
      })
    }

    // Transform communication
    if (employee.communication) {
      employee.communication.forEach((comm: any, index: number) => {
        if (index > 0) {
          entries.push({
            id: `communication-${comm.id}`,
            fieldName: 'Communication',
            fieldCategory: 'address',
            previousValue: this.formatCommunicationValue(employee.communication[index - 1]),
            newValue: this.formatCommunicationValue(comm),
            timestamp: comm.updatedAt || comm.createdAt,
            changedBy: {
              userId: comm.updatedBy || comm.createdBy || 'system',
              userName: comm.updatedBy || comm.createdBy || 'System',
              userRole: 'System'
            },
            changeOrigin: {
              flowId: `communication-${comm.id}`,
              flowName: 'Employee Communication Update',
              isSystemGenerated: true,
              isAIGenerated: false
            },
            isVisible: this.applyVisibilityRules({ fieldCategory: 'address' }, comm),
            isMasked: this.applyMaskingRules({ fieldCategory: 'address' }, comm)
          })
        }
      })
    }

    // Add more transformations for other fields...

    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  /**
   * Format address value for display
   */
  private formatAddressValue(address: any): string {
    if (!address) return 'N/A'
    const parts = []
    if (address.addressLine) parts.push(address.addressLine)
    if (address.postalCode) parts.push(address.postalCode)
    if (address.locality) parts.push(address.locality)
    if (address.country?.value) parts.push(address.country.value)
    return parts.join(', ') || 'N/A'
  }

  /**
   * Format communication value for display
   */
  private formatCommunicationValue(comm: any): string {
    if (!comm) return 'N/A'
    return comm.value || 'N/A'
  }


  /**
   * Transform audit data to ChangeLogEntry format
   */
  private transformAuditData(auditLogs: any[]): ChangeLogEntry[] {
    return auditLogs.flatMap(audit => {
      if (!audit.fieldChanges || audit.fieldChanges.length === 0) {
        return []
      }

      return audit.fieldChanges.map((fieldChange: any) => ({
        id: `${audit.id}-${fieldChange.fieldName}`,
        fieldName: fieldChange.fieldName,
        fieldCategory: fieldChange.fieldCategory,
        previousValue: fieldChange.previousValue,
        newValue: fieldChange.newValue,
        timestamp: audit.timestamp,
        changedBy: {
          userId: audit.userId,
          userName: audit.userName || 'Unknown User',
          userRole: audit.department || 'User'
        },
        changeOrigin: {
          flowId: audit.flowId,
          flowName: audit.flowName,
          templateId: audit.templateId,
          isSystemGenerated: audit.details?.isSystemGenerated || false,
          isAIGenerated: audit.details?.isAIGenerated || false
        },
        isVisible: this.applyVisibilityRules(fieldChange, audit),
        isMasked: this.applyMaskingRules(fieldChange, audit)
      }))
    })
  }

  /**
   * Apply visibility rules based on user role and field category
   */
  private applyVisibilityRules(fieldChange: any, audit: any): boolean {
    const fieldCategory = fieldChange.fieldCategory

    switch (fieldCategory) {
      case 'financial':
        // Financial data only visible to HR managers and admins
        return this.config.userRole === 'admin' || this.config.userRole === 'hr_manager'
        
      case 'org':
        // Organizational data visible to HR and managers
        return ['admin', 'hr_manager', 'manager'].includes(this.config.userRole)
        
      case 'working':
        // Working conditions visible to HR and managers
        return ['admin', 'hr_manager', 'manager'].includes(this.config.userRole)
        
      case 'personal':
      case 'address':
      case 'skills':
      case 'performance':
      case 'absence':
      case 'emergency':
        // These are generally visible to the employee
        return true
        
      default:
        // Default to visible for unknown categories
        return true
    }
  }

  /**
   * Apply masking rules for sensitive data
   */
  private applyMaskingRules(fieldChange: any, audit: any): boolean {
    const fieldCategory = fieldChange.fieldCategory
    const isVisible = this.applyVisibilityRules(fieldChange, audit)
    
    // If not visible, mask the data
    if (!isVisible) return true
    
    // Additional masking rules for sensitive fields
    const sensitiveFields = ['iban', 'taxNumber', 'socialSecurityNumber', 'bankName']
    const fieldName = fieldChange.fieldName.toLowerCase()
    
    return sensitiveFields.some(sensitive => fieldName.includes(sensitive))
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
    const allCategories = [
      'personal', 'address', 'org', 'working', 
      'financial', 'skills', 'performance', 'absence', 'emergency'
    ]

    // Filter based on user role
    switch (this.config.userRole) {
      case 'admin':
      case 'hr_manager':
        return allCategories
      case 'manager':
        return allCategories.filter(cat => cat !== 'financial')
      case 'employee':
      default:
        return allCategories.filter(cat => 
          !['financial', 'org', 'working'].includes(cat)
        )
    }
  }

  /**
   * Get change actors available for the current user
   */
  getAvailableChangeActors(): string[] {
    const allActors = ['user', 'ai', 'system']
    
    // All users can see all actor types
    return allActors
  }
}

/**
 * Factory function to create ChangeLogService instance
 */
export const createChangeLogService = (
  config: Omit<ChangeLogServiceConfig, 'baseUrl'> & { 
    baseUrl?: string 
  }
): ChangeLogService => {
  const baseUrl = config.baseUrl || 'https://newwork-dev.newwork.com/flow-engine'
  
  return new ChangeLogService({
    ...config,
    baseUrl
  })
}

export default ChangeLogService
