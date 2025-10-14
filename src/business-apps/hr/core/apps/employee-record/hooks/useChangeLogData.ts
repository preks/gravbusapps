import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '../../../../../../common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ChangeLogEntry, ChangeLogFilters } from '../components/tabs/ChangeLogTab'

// GraphQL query to fetch change log data from FLOW audit system
export const GET_CHANGE_LOG_DATA = /*sql*/ `
  query GetChangeLogData($employeeId: uuid!, $limit: Int, $offset: Int) {
    # Query FLOW audit logs for employee data changes
    FlowAuditLog(
      where: {
        entityId: {_eq: $employeeId}
        entityType: {_eq: "employee"}
      }
      orderBy: {timestamp: DESC}
      limit: $limit
      offset: $offset
    ) {
      id
      timestamp
      userId
      userName
      department
      flowId
      flowName
      templateId
      templateName
      taskId
      taskName
      taskType
      action
      status
      previousStatus
      newStatus
      details
      ipAddress
      userAgent
      
      # Field-level changes
      fieldChanges {
        fieldName
        fieldCategory
        previousValue
        newValue
        isVisible
        isMasked
      }
      
      # Change origin metadata
      changeOrigin {
        flowId
        flowName
        templateId
        isSystemGenerated
        isAIGenerated
      }
    }
  }
`

// GraphQL query to get employee data versions for comparison
export const GET_EMPLOYEE_VERSIONS = /*sql*/ `
  query GetEmployeeVersions($employeeId: uuid!, $limit: Int) {
    Employee(where: {id: {_eq: $employeeId}}) {
      id
      version
      updatedAt
      updatedBy
      
      # Personal information versions
      personalDataVersions: EmployeePersonalDataVersion(
        orderBy: {version: DESC}
        limit: $limit
      ) {
        version
        updatedAt
        updatedBy
        firstName
        lastName
        displayName
        preferredName
        birthDate
        salutation
        maritalStatus
        gender
        academicTitleRef
      }
      
      # Address versions
      addressVersions: EmployeeAddressVersion(
        orderBy: {version: DESC}
        limit: $limit
      ) {
        version
        updatedAt
        updatedBy
        addressLine
        postalCode
        locality
        type
        country
      }
      
      # Communication versions
      communicationVersions: EmployeeCommunicationVersion(
        orderBy: {version: DESC}
        limit: $limit
      ) {
        version
        updatedAt
        updatedBy
        channelRef
        value
        purpose
        type
      }
      
      # Working condition versions
      workingConditionVersions: EmployeeWorkingConditionVersion(
        orderBy: {version: DESC}
        limit: $limit
      ) {
        version
        updatedAt
        updatedBy
        contractType
        employmentType
        hireDate
        exitDate
        vacationDays
        remote
        region
      }
      
      # Working hours versions
      workingHoursVersions: EmployeeWorkingHoursVersion(
        orderBy: {version: DESC}
        limit: $limit
      ) {
        version
        updatedAt
        updatedBy
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
      }
      
      # Bank account versions
      bankAccountVersions: EmployeeBankAccountVersion(
        orderBy: {version: DESC}
        limit: $limit
      ) {
        version
        updatedAt
        updatedBy
        iban
        bankName
        accountHolder
      }
      
      # Tax details versions
      taxDetailsVersions: EmployeeTaxDetailsVersion(
        orderBy: {version: DESC}
        limit: $limit
      ) {
        version
        updatedAt
        updatedBy
        taxNumber
        taxBracketRef
        taxIdentificationNumber
        socialSecurityNumber
        taxableChurchAffiliationRef
        childTaxAllowance
        healthInsuranceName
        healthInsuranceTypeRef
      }
    }
  }
`

export interface UseChangeLogDataProps extends BusinessAppContextProps {
  employeeId: string
  userRole: string
  filters?: ChangeLogFilters
}

export interface UseChangeLogDataReturn {
  changeLogEntries: ChangeLogEntry[]
  loading: boolean
  error: string | null
  totalCount: number
  hasMore: boolean
  fetchMore: () => void
  refetch: () => void
}

export const useChangeLogData = ({
  employeeId,
  userRole,
  filters,
  accessToken
}: UseChangeLogDataProps): UseChangeLogDataReturn => {
  const [changeLogEntries, setChangeLogEntries] = useState<ChangeLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  
  const graphqlClient = useGraphqlClient()
  const LIMIT = 50

  // Transform FLOW audit data to ChangeLogEntry format
  const transformAuditData = useCallback((auditData: any[]): ChangeLogEntry[] => {
    return auditData.flatMap(audit => {
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
        isVisible: fieldChange.isVisible,
        isMasked: fieldChange.isMasked
      }))
    })
  }, [])

  // Apply field-level visibility based on user role
  const applyVisibilityRules = useCallback((entries: ChangeLogEntry[]): ChangeLogEntry[] => {
    return entries.map(entry => {
      let isVisible = entry.isVisible
      let isMasked = entry.isMasked

      // Apply role-based visibility rules
      switch (entry.fieldCategory) {
        case 'financial':
          // Financial data only visible to HR managers and admins
          isVisible = userRole === 'admin' || userRole === 'hr_manager'
          isMasked = !isVisible
          break
          
        case 'org':
          // Organizational data visible to HR and managers
          isVisible = ['admin', 'hr_manager', 'manager'].includes(userRole)
          isMasked = !isVisible
          break
          
        case 'working':
          // Working conditions visible to HR and managers
          isVisible = ['admin', 'hr_manager', 'manager'].includes(userRole)
          isMasked = !isVisible
          break
          
        case 'personal':
        case 'address':
        case 'skills':
        case 'performance':
        case 'absence':
        case 'emergency':
          // These are generally visible to the employee
          isVisible = true
          isMasked = false
          break
          
        default:
          // Default to visible for unknown categories
          isVisible = true
          isMasked = false
      }

      return {
        ...entry,
        isVisible,
        isMasked
      }
    })
  }, [userRole])

  // Fetch change log data
  const fetchChangeLogData = useCallback(async (resetOffset = false) => {
    if (!employeeId) return

    setLoading(true)
    setError(null)

    try {
      const currentOffset = resetOffset ? 0 : offset
      
      // First try to get data from FLOW audit system
      const auditResponse = await graphqlClient.request(GET_CHANGE_LOG_DATA, {
        employeeId,
        limit: LIMIT,
        offset: currentOffset
      })

      if (auditResponse?.FlowAuditLog?.length > 0) {
        const transformedEntries = transformAuditData(auditResponse.FlowAuditLog)
        const visibleEntries = applyVisibilityRules(transformedEntries)
        
        if (resetOffset) {
          setChangeLogEntries(visibleEntries)
        } else {
          setChangeLogEntries(prev => [...prev, ...visibleEntries])
        }
        
        setHasMore(auditResponse.FlowAuditLog.length === LIMIT)
        setTotalCount(auditResponse.FlowAuditLog.length)
      } else {
        // Fallback: Generate change log from version comparison
        const versionsResponse = await graphqlClient.request(GET_EMPLOYEE_VERSIONS, {
          employeeId,
          limit: LIMIT
        })

        if (versionsResponse?.Employee?.[0]) {
          const employee = versionsResponse.Employee[0]
          const generatedEntries = generateChangeLogFromVersions(employee, userRole)
          
          if (resetOffset) {
            setChangeLogEntries(generatedEntries)
          } else {
            setChangeLogEntries(prev => [...prev, ...generatedEntries])
          }
          
          setHasMore(false) // Version-based approach doesn't support pagination
          setTotalCount(generatedEntries.length)
        }
      }
    } catch (err) {
      console.error('Error fetching change log data:', err)
      setError('Failed to load change log data')
    } finally {
      setLoading(false)
    }
  }, [employeeId, offset, graphqlClient, transformAuditData, applyVisibilityRules, userRole])

  // Generate change log from version comparison
  const generateChangeLogFromVersions = useCallback((employee: any, userRole: string): ChangeLogEntry[] => {
    const entries: ChangeLogEntry[] = []

    // Compare personal data versions
    if (employee.personalDataVersions?.length > 1) {
      for (let i = 0; i < employee.personalDataVersions.length - 1; i++) {
        const current = employee.personalDataVersions[i]
        const previous = employee.personalDataVersions[i + 1]

        // Compare each field
        const fieldsToCompare = [
          'firstName', 'lastName', 'displayName', 'preferredName', 
          'birthDate', 'salutation', 'maritalStatus', 'gender'
        ]

        fieldsToCompare.forEach(field => {
          if (current[field] !== previous[field]) {
            entries.push({
              id: `personal-${field}-${current.version}`,
              fieldName: formatFieldName(field),
              fieldCategory: 'personal',
              previousValue: previous[field],
              newValue: current[field],
              timestamp: current.updatedAt,
              changedBy: {
                userId: current.updatedBy || 'system',
                userName: current.updatedBy || 'System',
                userRole: 'System'
              },
              changeOrigin: {
                flowId: `version-${current.version}`,
                flowName: 'Employee Data Update',
                isSystemGenerated: true,
                isAIGenerated: false
              },
              isVisible: true,
              isMasked: false
            })
          }
        })
      }
    }

    // Apply visibility rules
    return applyVisibilityRules(entries)
  }, [applyVisibilityRules])

  // Format field names for display
  const formatFieldName = (fieldName: string): string => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  // Load more data
  const fetchMore = useCallback(() => {
    if (!loading && hasMore) {
      setOffset(prev => prev + LIMIT)
    }
  }, [loading, hasMore])

  // Refetch data
  const refetch = useCallback(() => {
    setOffset(0)
    fetchChangeLogData(true)
  }, [fetchChangeLogData])

  // Load data on mount and when dependencies change
  useEffect(() => {
    fetchChangeLogData(true)
  }, [employeeId, userRole])

  // Refetch when filters change
  useEffect(() => {
    if (filters) {
      refetch()
    }
  }, [filters, refetch])

  return {
    changeLogEntries,
    loading,
    error,
    totalCount,
    hasMore,
    fetchMore,
    refetch
  }
}

export default useChangeLogData
