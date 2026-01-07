import { useState, useEffect, useCallback } from 'react'
import { useFlowExecutionTasks } from '@/business-apps/fin/expenses/apps/manager-expenses/hooks/useFlowExecutionTasks'
import { FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// Types for personal data approvals
export interface PersonalDataApproval {
  id: string
  processDefinitionKey: string
  title: string
  description: string | null
  totalAmount: number
  status: string
  requestDate: string
  createdAt: string
  employee: {
    id: string
    fullName: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
  }
  type: 'information-change' | 'address-change'
  changeType?: string
  oldValue?: string
  newValue?: string
  endpoint?: string
}

interface UsePersonalDataApprovalsProps {
  accessToken: string
  directReports: Array<{ userId: string; displayName: string; pictureThumbnail?: string }>
}

interface UsePersonalDataApprovalsResult {
  personalDataApprovals: PersonalDataApproval[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

// Helper function to get priority label
export const getPersonalChangePriorityLabel = (change: PersonalDataApproval): string => {
  const processKey = change.processDefinitionKey || ''
  if (['changeEmployeeBankDetails', 'changeEmployeeEmergencyContact'].includes(processKey)) {
    return getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.high_priority', 'High Priority')
  }
  if (
    ['approvePersonalInformationChange', 'approveChangeAddress', 'changeEmployeeCommunication'].includes(processKey)
  ) {
    return getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.medium_priority', 'Medium Priority')
  }
  return 'Standard'
}

// Helper function to get priority variant for badges
export const getPersonalChangePriorityVariant = (
  change: PersonalDataApproval
): 'destructive' | 'warning' | 'info' | 'default' => {
  const processKey = change.processDefinitionKey || ''
  // Sensitive data changes get high priority
  if (['changeEmployeeBankDetails', 'changeEmployeeEmergencyContact'].includes(processKey)) {
    return 'destructive'
  }
  // Personal info changes get medium priority
  if (
    ['approvePersonalInformationChange', 'approveChangeAddress', 'changeEmployeeCommunication'].includes(processKey)
  ) {
    return 'warning'
  }
  // Skills, education, picture get low priority
  return 'info'
}

export const usePersonalDataApprovals = ({
  accessToken,
  directReports
}: UsePersonalDataApprovalsProps): UsePersonalDataApprovalsResult => {
  const [personalDataApprovals, setPersonalDataApprovals] = useState<PersonalDataApproval[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState<boolean>(false)
  const [previousDirectReportsLength, setPreviousDirectReportsLength] = useState<number>(0)

  // Flow execution tasks for information changes - only when enabled
  const informationChangeResult = useFlowExecutionTasks(
    { userInfo: undefined, accessToken },
    {
      currentPage: 1,
      pageSize: 1000,
      searchTerm: '',
      filterTaskName: 'approvePersonalInformationChange'
    }
  )

  // Flow execution tasks for address changes - only when enabled
  const addressChangeResult = useFlowExecutionTasks(
    { userInfo: undefined, accessToken },
    {
      currentPage: 1,
      pageSize: 1000,
      searchTerm: '',
      filterTaskName: 'approveChangeAddress'
    }
  )

  // Extract values with fallbacks when disabled
  const {
    tasks: informationChangeTasks,
    isLoading: informationChangeLoading,
    error: informationChangeError,
    refresh: refreshInformationChanges
  } = informationChangeResult

  const {
    tasks: addressChangeTasks,
    isLoading: addressChangeLoading,
    error: addressChangeError,
    refresh: refreshAddressChanges
  } = addressChangeResult

  // Load all personal data
  const loadPersonalData = useCallback(async () => {
    if (hasLoaded) return

    setIsLoading(true)
    setError(null)

    try {
      // Helper function to filter tasks by direct reports
      const filterTasksByDirectReports = (tasks: FlowExecutionTask[]) => {
        if (!directReports || directReports.length === 0) {
          return tasks
        }

        const directReportUserIds = directReports.map(report => report.userId)
        return tasks.filter(task => {
          return task.creatorUserId && directReportUserIds.includes(task.creatorUserId)
        })
      }

      // Process information change tasks from flow
      const processInformationChangeTasks = (tasks: FlowExecutionTask[]): PersonalDataApproval[] => {
        return tasks
          .filter(task => {
            // Check if task is in Open state (not completed)
            return task.state === 'Open'
          })
          .map(task => {
            const personalInformation = task.inputs?.personalInformation
            const oldPersonalInformation = task.inputs?.oldPersonalInformation
            const creatorName = task.creatorName || ''
            const nameParts = creatorName.split(' ')

            // Find the direct report data for this creator
            const directReport = directReports.find(report => report.userId === task.creatorUserId)

            // Determine what changed by comparing old and new values
            let oldValue = ''
            let newValue = ''

            if (personalInformation && oldPersonalInformation) {
              // Compare key fields to determine what changed
              if (personalInformation.preferredName !== oldPersonalInformation.preferredName) {
                oldValue = oldPersonalInformation.preferredName || ''
                newValue = personalInformation.preferredName || ''
              } else if (personalInformation.birthDate !== oldPersonalInformation.birthDate) {
                oldValue = oldPersonalInformation.birthDate || ''
                newValue = personalInformation.birthDate || ''
              } else if (personalInformation.birthPlace !== oldPersonalInformation.birthPlace) {
                oldValue = oldPersonalInformation.birthPlace || ''
                newValue = personalInformation.birthPlace || ''
              } else {
                oldValue = getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.previous_data',
                  'Previous data'
                )
                newValue = getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.updated_data',
                  'Updated data'
                )
              }
            }

            return {
              id: task.id,
              processDefinitionKey: task.name || '',
              title: getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.personal_data_change',
                'Personal Data Change'
              ),
              description: getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.review_personal_information_changes',
                `Review personal information changes for ${directReport?.displayName || creatorName}`,
                { name: directReport?.displayName || creatorName }
              ),
              totalAmount: 0, // Personal data changes don't have amounts
              status: 'PENDING',
              requestDate: task.started || new Date().toISOString(),
              createdAt: task.started || new Date().toISOString(),
              employee: {
                id: task.creatorUserId || '',
                fullName: directReport?.displayName || creatorName,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                pictureThumbnail: directReport?.pictureThumbnail
              },
              type: 'information-change' as const,
              changeType: 'INFORMATION',
              oldValue,
              newValue,
              endpoint: task.endpoint
            }
          })
      }

      // Process address change tasks from flow
      const processAddressChangeTasks = (tasks: FlowExecutionTask[]): PersonalDataApproval[] => {
        return tasks
          .filter(task => {
            // Check if task is in Open state (not completed)
            return task.state === 'Open'
          })
          .map(task => {
            const address = task.inputs?.address
            const oldAddressData = task.inputs?.oldAddressData
            const creatorName = task.creatorName || ''
            const nameParts = creatorName.split(' ')

            // Find the direct report data for this creator
            const directReport = directReports.find(report => report.userId === task.creatorUserId)

            // Determine what changed by comparing old and new address values
            let oldValue = ''
            let newValue = ''

            if (address && oldAddressData) {
              // Compare key address fields to determine what changed
              const newAddressLine = address.addressLine?.join(', ') || ''
              const oldAddressLine = oldAddressData.addressLine?.join(', ') || ''

              if (newAddressLine !== oldAddressLine) {
                oldValue = oldAddressLine
                newValue = newAddressLine
              } else if (address.postalCode !== oldAddressData.postalCode) {
                oldValue = oldAddressData.postalCode || ''
                newValue = address.postalCode || ''
              } else if (address.locality !== oldAddressData.locality) {
                oldValue = oldAddressData.locality || ''
                newValue = address.locality || ''
              } else {
                oldValue = `${oldAddressData.addressLine?.join(', ') || ''}, ${oldAddressData.postalCode || ''} ${oldAddressData.locality || ''}`
                newValue = `${address.addressLine?.join(', ') || ''}, ${address.postalCode || ''} ${address.locality || ''}`
              }
            }

            return {
              id: task.id,
              processDefinitionKey: task.name || '',
              title: getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.address_change',
                'Address Change'
              ),
              description: getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.review_address_changes',
                `Review address changes for ${directReport?.displayName || creatorName}`,
                { name: directReport?.displayName || creatorName }
              ),
              totalAmount: 0, // Address changes don't have amounts
              status: 'PENDING',
              requestDate: task.started || new Date().toISOString(),
              createdAt: task.started || new Date().toISOString(),
              employee: {
                id: task.creatorUserId || '',
                fullName: directReport?.displayName || creatorName,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                pictureThumbnail: directReport?.pictureThumbnail
              },
              type: 'address-change' as const,
              changeType: 'ADDRESS',
              oldValue,
              newValue,
              endpoint: task.endpoint
            }
          })
      }

      // Filter both task types by direct reports
      const filteredInformationChangeTasks = filterTasksByDirectReports(informationChangeTasks)
      const filteredAddressChangeTasks = filterTasksByDirectReports(addressChangeTasks)

      // Process both task types
      const informationChanges = processInformationChangeTasks(filteredInformationChangeTasks)
      const addressChanges = processAddressChangeTasks(filteredAddressChangeTasks)

      // Combine and sort all personal data approvals
      const allPersonalDataApprovals = [...informationChanges, ...addressChanges].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setPersonalDataApprovals(allPersonalDataApprovals)
      setTotalCount(allPersonalDataApprovals.length)
      setPreviousDirectReportsLength(directReports?.length || 0)

      // Only set hasLoaded to true if we have data
      if (allPersonalDataApprovals.length > 0) {
        setHasLoaded(true)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load personal data approvals'
      setError(errorMessage)
      console.error('Error loading personal data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [hasLoaded, informationChangeTasks, addressChangeTasks, directReports])

  // Refetch function
  const refetch = useCallback(() => {
    setHasLoaded(false)
    loadPersonalData()
    refreshInformationChanges?.()
    refreshAddressChanges?.()
  }, [loadPersonalData, refreshInformationChanges, refreshAddressChanges])

  // Simple data processing - no complex useEffect
  const processData = useCallback(() => {
    if (hasLoaded) return

    // Only process when both tasks are loaded (not loading)
    if (informationChangeLoading || addressChangeLoading) return

    // Process data if we have tasks
    if (informationChangeTasks.length > 0 || addressChangeTasks.length > 0) {
      loadPersonalData()
    }
  }, [
    hasLoaded,
    informationChangeLoading,
    addressChangeLoading,
    informationChangeTasks.length,
    addressChangeTasks.length,
    loadPersonalData
  ])

  // Single useEffect to trigger data processing
  useEffect(() => {
    processData()
  }, [processData])

  // Reset hasLoaded when directReports becomes available (was empty before)
  useEffect(() => {
    const currentLength = directReports?.length || 0
    if (
      currentLength > 0 &&
      previousDirectReportsLength === 0 &&
      hasLoaded &&
      (informationChangeTasks.length > 0 || addressChangeTasks.length > 0)
    ) {
      // If we already loaded but directReports was empty, re-process now that it's available
      setHasLoaded(false)
    }
  }, [directReports, previousDirectReportsLength, hasLoaded, informationChangeTasks.length, addressChangeTasks.length])

  // Update error state based on flow tasks
  useEffect(() => {
    if (informationChangeError || addressChangeError) {
      setError(informationChangeError || addressChangeError)
    }
  }, [informationChangeError, addressChangeError])

  return {
    personalDataApprovals,
    totalCount,
    isLoading: isLoading || informationChangeLoading || addressChangeLoading,
    error: error || informationChangeError || addressChangeError,
    refetch
  }
}
