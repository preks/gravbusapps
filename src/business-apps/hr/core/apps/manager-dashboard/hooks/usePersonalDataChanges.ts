import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { Employee, EmployeeResponse, PersonalDataChangeTaskRaw } from '../types/employee.types'

// Types for personal data change tasks from flow-metrics API
interface PersonalDataChangeTask {
  id: string
  processInstanceId: string
  name: string
  description: string
  assignee: string
  created: string
  due?: string
  processDefinitionKey: string
  processDefinitionName: string
  priority: number
  taskDefinitionKey: string
  // Employee information
  employee?: {
    id: string
    fullName: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
    userId?: string // Added for matching with GraphQL Employee.userId
  }
  // Change details
  changeType?: string
  changeDetails?: Record<string, any>
  requestDate?: string
  submittedDate?: string
}

interface UsePersonalDataChangesParams {
  accessToken: string
  managerId: string
  showAll?: boolean
}

interface UsePersonalDataChangesResult {
  personalChanges: PersonalDataChangeTask[]
  personalChangesCount: number
  loading: boolean
  error: string | null
  refetch: () => void
  approveChange: (taskId: string, comment?: string) => Promise<void>
  rejectChange: (taskId: string, comment?: string) => Promise<void>
  approving: boolean
  rejecting: boolean
}

// Personal data change process definitions to filter for
const personalDataProcesses = [
  'changePersonalInformation',
  'changeEmployeeAddress',
  'changeEmployeeCommunication',
  'changeEmployeePicture',
  'changeEmployeeSkills',
  'changeEmployeeEducation',
  'changeEmployeeEmergencyContact',
  'changeEmployeeBankDetails',
  'changeEmployeePreferences'
]

// GraphQL query to fetch employees by userIds for picture enrichment
const GET_EMPLOYEES_BY_USER_IDS = `
  query GetEmployeesByUserIds($userIds: [String!]!) {
    Employee(
      where: {
        _and: [
          { userId: { _in: $userIds } }
          { isDeleted: { _eq: false } }
        ]
      }
    ) {
      id
      userId
      firstName
      lastName
      fullName
      pictureThumbnail
    }
  }
`

export const usePersonalDataChanges = ({
  accessToken,
  managerId,
  showAll = false
}: UsePersonalDataChangesParams): UsePersonalDataChangesResult => {
  const [personalChanges, setPersonalChanges] = useState<PersonalDataChangeTask[]>([])
  const [personalChangesCount, setPersonalChangesCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const graphQLClient = useGraphQLClient(accessToken)

  const fetchPersonalChanges = useCallback(async () => {
    if (!accessToken || !managerId) return

    setLoading(true)
    setError(null)

    try {
      // Fetch more from backend and slice on client for dashboard parity
      const pageSize = 1000

      // Use backend as-is without search term to validate raw results
      const queryParams = new URLSearchParams({
        searchItem: '',
        size: pageSize.toString(),
        page: '0',
        field: 'CREATION_DATE',
        direction: 'DESC',
        cockpitPage: 'INBOX'
      })

      const url = `/flow-metrics/api/v1/flow-executions/tasks?${queryParams.toString()}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch personal data changes: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      // The API returns tasks in different shapes depending on endpoint version
      const allTasks = result.processingStates || result.content || []

      // Filter ONLY the approval tasks we care about
      const allowedTaskNames = ['approvePersonalInformationChange', 'approveChangeAddress']
      const filteredTasks = allTasks.filter((task: PersonalDataChangeTaskRaw) => {
        const taskName = task.name || task.taskName || task.taskDefinitionKey || ''
        return allowedTaskNames.includes(taskName)
      })

      // Map to our interface format
      const mappedChanges: PersonalDataChangeTask[] = filteredTasks.map((task: PersonalDataChangeTaskRaw) => {
        const variables = task.processVariables || task.variables || {}
        const employeeId = variables.employeeId || ''
        const employeeName = variables.employeeName || variables.fullName || task.creatorName || 'Unknown Employee'
        const firstName = variables.firstName
        const lastName = variables.lastName
        const created = task.created || task.createdDate || task.startDate || task.started || task.lastUpdate
        const creatorUserId = task.creatorUserId || task.creator || task.createdBy || variables.creatorUserId

        return {
          id: task.id || task.taskId,
          processInstanceId: task.processInstanceId || task.instanceId,
          name: task.name || task.taskName || 'Personal Data Change',
          description: task.description || task.taskDescription || '',
          assignee:
            task.assignee ||
            task.actualOwner ||
            (Array.isArray(task.assigneeNames) ? task.assigneeNames.join(', ') : undefined),
          created: created,
          due: task.due || task.dueDate,
          processDefinitionKey: task.processDefinitionKey || task.processId || task.name || task.processName,
          processDefinitionName:
            task.referenceName ||
            task.processDefinitionName ||
            task.name ||
            task.processDefinitionKey ||
            task.processId,
          priority: task.priority || 50,
          taskDefinitionKey: task.taskDefinitionKey || task.taskName,
          employee: {
            id: employeeId,
            fullName: employeeName,
            firstName,
            lastName,
            pictureThumbnail: variables.pictureThumbnail,
            userId: creatorUserId // Store the creator user ID for enrichment
          },
          changeType: getChangeTypeLabel(task.processDefinitionKey || task.processId || task.name || task.processName),
          changeDetails: variables,
          requestDate: created,
          submittedDate: created
        }
      })

      // Enrich with employee pictures from GraphQL
      let enrichedChanges = mappedChanges
      try {
        // Extract unique creator user IDs
        const creatorUserIds = [
          ...new Set(mappedChanges.map(change => change.employee?.userId).filter(Boolean))
        ] as string[]

        if (creatorUserIds.length > 0 && graphQLClient) {
          // Fetch employee data by user IDs
          const employeeResponse = await graphQLClient.request(GET_EMPLOYEES_BY_USER_IDS, { userIds: creatorUserIds })

          const employees = employeeResponse?.Employee || []

          // Create a map of userId -> employee data for quick lookup
          const employeeMap = new Map(employees.map((emp: Employee) => [emp.userId, emp]))

          // Enrich the mapped changes with employee pictures
          enrichedChanges = mappedChanges.map(change => {
            const employeeData = employeeMap.get(change.employee?.userId)
            if (employeeData) {
              return {
                ...change,
                employee: {
                  ...change.employee,
                  id: employeeData.id,
                  fullName: employeeData.fullName || change.employee?.fullName,
                  firstName: employeeData.firstName || change.employee?.firstName,
                  lastName: employeeData.lastName || change.employee?.lastName,
                  pictureThumbnail: employeeData.pictureThumbnail
                }
              }
            }
            return change
          })
        }
      } catch (enrichmentError) {
        console.error('Error enriching personal changes with employee pictures:', enrichmentError)
        // Continue with non-enriched data if enrichment fails
      }

      // For dashboard (showAll=false) show up to 5; detail view shows all
      setPersonalChanges(showAll ? enrichedChanges : enrichedChanges.slice(0, 5))
      setPersonalChangesCount(enrichedChanges.length)
    } catch (err) {
      console.error('Error fetching personal data changes:', err)
      setError(err instanceof Error ? err.message : 'Failed to load personal data changes')
      setPersonalChanges([])
      setPersonalChangesCount(0)
    } finally {
      setLoading(false)
    }
  }, [accessToken, managerId, showAll, graphQLClient])

  useEffect(() => {
    fetchPersonalChanges()
  }, [fetchPersonalChanges])

  const approveChange = useCallback(
    async (taskId: string, comment?: string) => {
      if (!accessToken) return

      setApproving(true)
      try {
        const response = await fetch(`/flow-metrics/api/v1/flow-executions/tasks/${taskId}/complete`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'approve',
            comment: comment || 'Approved from manager dashboard'
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to approve change: ${response.status}`)
        }

        // Refresh the list
        await fetchPersonalChanges()
      } catch (err) {
        console.error('Error approving personal data change:', err)
        setError(err instanceof Error ? err.message : 'Failed to approve change')
      } finally {
        setApproving(false)
      }
    },
    [accessToken, fetchPersonalChanges]
  )

  const rejectChange = useCallback(
    async (taskId: string, comment?: string) => {
      if (!accessToken) return

      setRejecting(true)
      try {
        const response = await fetch(`/flow-metrics/api/v1/flow-executions/tasks/${taskId}/complete`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'reject',
            comment: comment || 'Rejected from manager dashboard'
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to reject change: ${response.status}`)
        }

        // Refresh the list
        await fetchPersonalChanges()
      } catch (err) {
        console.error('Error rejecting personal data change:', err)
        setError(err instanceof Error ? err.message : 'Failed to reject change')
      } finally {
        setRejecting(false)
      }
    },
    [accessToken, fetchPersonalChanges]
  )

  const refetch = useCallback(() => {
    fetchPersonalChanges()
  }, [fetchPersonalChanges])

  return {
    personalChanges,
    personalChangesCount,
    loading,
    error,
    refetch,
    approveChange,
    rejectChange,
    approving,
    rejecting
  }
}

// Helper function to get human-readable labels for change types
const getChangeTypeLabel = (processKey: string): string => {
  const labels: Record<string, string> = {
    changePersonalInformation: 'Personal Info',
    changeEmployeeAddress: 'Address',
    changeEmployeeCommunication: 'Contact Info',
    changeEmployeePicture: 'Profile Picture',
    changeEmployeeSkills: 'Skills',
    changeEmployeeEducation: 'Education',
    changeEmployeeEmergencyContact: 'Emergency Contact',
    changeEmployeeBankDetails: 'Bank Details',
    changeEmployeePreferences: 'Preferences'
  }
  return labels[processKey] || processKey
}

// Helper function to get priority variant for badges
export const getPersonalChangePriorityVariant = (
  change: PersonalDataChangeTask
): 'destructive' | 'warning' | 'info' | 'default' => {
  // Sensitive data changes get high priority
  if (['changeEmployeeBankDetails', 'changeEmployeeEmergencyContact'].includes(change.processDefinitionKey)) {
    return 'destructive'
  }
  // Personal info changes get medium priority
  if (
    ['changePersonalInformation', 'changeEmployeeAddress', 'changeEmployeeCommunication'].includes(
      change.processDefinitionKey
    )
  ) {
    return 'warning'
  }
  // Skills, education, picture get low priority
  return 'default'
}

// Helper function to get priority label
export const getPersonalChangePriorityLabel = (change: PersonalDataChangeTask): string => {
  if (['changeEmployeeBankDetails', 'changeEmployeeEmergencyContact'].includes(change.processDefinitionKey)) {
    return 'High Priority'
  }
  if (
    ['changePersonalInformation', 'changeEmployeeAddress', 'changeEmployeeCommunication'].includes(
      change.processDefinitionKey
    )
  ) {
    return 'Medium Priority'
  }
  return 'Standard'
}

// Helper function to format change type with icon
export const formatChangeType = (processKey: string): string => {
  const icons: Record<string, string> = {
    changePersonalInformation: '👤',
    changeEmployeeAddress: '🏠',
    changeEmployeeCommunication: '📞',
    changeEmployeePicture: '📸',
    changeEmployeeSkills: '🛠️',
    changeEmployeeEducation: '🎓',
    changeEmployeeEmergencyContact: '🚨',
    changeEmployeeBankDetails: '🏦',
    changeEmployeePreferences: '⚙️'
  }

  const icon = icons[processKey] || '📝'
  const label = getChangeTypeLabel(processKey)
  return `${icon} ${label}`
}
