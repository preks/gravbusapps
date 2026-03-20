import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface TaskApprovalData {
  // Task identification
  taskId?: string
  name?: string
  description?: string

  // Timing
  dueDate?: string
  taskTiming?: string

  // Catalog references
  taskTypeRef?: string
  taskPriorityRef?: string

  // Related entities (flexible for IRM/CRM)
  investmentId?: string
  investmentName?: string
  accountId?: string
  accountName?: string
  contactId?: string
  contactName?: string
  leadId?: string
  leadName?: string
  opportunityId?: string
  opportunityName?: string

  // Creator
  creatorEmployeeId?: string
  creatorName?: string

  // Documents
  documents?: Array<{
    id: string
    name?: string
    mimeType?: string
  }>

  // Task assignees
  taskAssignees?: Array<{
    id: string
    assignedUserId: string
    completedAt: string | null
    taskStatus: string
    assignedEmployee: string
  }>
}

export interface UseTaskApprovalDataProps {
  accessToken?: string
  additionalData?: any
  moduleType: 'irm' | 'crm'
}

export interface UseTaskApprovalDataReturn {
  taskData: TaskApprovalData
  isLoading: boolean
  error: string | null
  taskStatus: string
  isTaskCompleted: boolean
  processMetadata: any
}

/**
 * Hook for extracting and resolving task approval data
 * Extracts task data from additionalData and resolves entity UUIDs to names
 */
export const useTaskApprovalData = ({
  accessToken,
  additionalData,
  moduleType
}: UseTaskApprovalDataProps): UseTaskApprovalDataReturn => {
  const [taskData, setTaskData] = useState<TaskApprovalData>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken || '')

  const processMetadata = additionalData?.psi_processMetadata || {}
  const taskStatus = additionalData?.psi_taskStatus || 'IN_PROGRESS'
  const isTaskCompleted = taskStatus === 'COMPLETED'

  // Fetch investment name by ID
  const fetchInvestmentName = useCallback(
    async (investmentId: string): Promise<string | undefined> => {
      if (!graphqlClient) {
        console.warn('[fetchInvestmentName] No GraphQL client available')
        return undefined
      }

      try {
        const query = `
          query GetInvestmentName($id: uuid!) {
            InvestmentByPk(id: $id) {
              id
              name
            }
          }
        `
        const result = await graphqlClient.request<any>(query, { id: investmentId })
        return result.InvestmentByPk?.name
      } catch (err) {
        console.error('[fetchInvestmentName] Error:', err)
        return undefined
      }
    },
    [graphqlClient]
  )

  // Fetch employee name by ID
  const fetchEmployeeName = useCallback(
    async (employeeId: string): Promise<string | undefined> => {
      if (!graphqlClient) {
        console.warn('[fetchEmployeeName] No GraphQL client available')
        return undefined
      }

      try {
        const query = `
          query GetEmployeeName($employeeId: uuid!) {
            EmployeePosition(where: { employeeId: { _eq: $employeeId } }, limit: 1) {
              employee {
                displayName
              }
            }
          }
        `
        const result = await graphqlClient.request<any>(query, { employeeId })
        return result.EmployeePosition?.[0]?.employee?.displayName
      } catch (err) {
        console.error('[fetchEmployeeName] Error:', err)
        return undefined
      }
    },
    [graphqlClient]
  )

  // Fetch account name by ID
  const fetchAccountName = useCallback(
    async (accountId: string): Promise<string | undefined> => {
      if (!graphqlClient) return undefined

      try {
        const entityName = moduleType === 'irm' ? 'InvestmentAccount' : 'CustomerAccount'
        const query = `
          query GetAccountName($id: uuid!) {
            ${entityName}ByPk(id: $id) {
              id
              name
            }
          }
        `
        const result = await graphqlClient.request<any>(query, { id: accountId })
        return result[`${entityName}ByPk`]?.name
      } catch (err) {
        console.error('[fetchAccountName] Error:', err)
        return undefined
      }
    },
    [graphqlClient, moduleType]
  )

  // Fetch contact name by ID
  const fetchContactName = useCallback(
    async (contactId: string): Promise<string | undefined> => {
      if (!graphqlClient) return undefined

      try {
        const entityName = moduleType === 'irm' ? 'InvestmentContact' : 'CustomerContact'
        const query = `
          query GetContactName($id: uuid!) {
            ${entityName}ByPk(id: $id) {
              id
              firstName
              lastName
            }
          }
        `
        const result = await graphqlClient.request<any>(query, { id: contactId })
        const contact = result[`${entityName}ByPk`]
        return contact ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() : undefined
      } catch (err) {
        console.error('[fetchContactName] Error:', err)
        return undefined
      }
    },
    [graphqlClient, moduleType]
  )

  // Fetch lead name by ID
  const fetchLeadName = useCallback(
    async (leadId: string): Promise<string | undefined> => {
      if (!graphqlClient) return undefined

      try {
        const entityName = moduleType === 'irm' ? 'InvestmentLead' : 'CustomerLead'
        const query = `
          query GetLeadName($id: uuid!) {
            ${entityName}ByPk(id: $id) {
              id
              firstName
              lastName
            }
          }
        `
        const result = await graphqlClient.request<any>(query, { id: leadId })
        const lead = result[`${entityName}ByPk`]
        return lead ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : undefined
      } catch (err) {
        console.error('[fetchLeadName] Error:', err)
        return undefined
      }
    },
    [graphqlClient, moduleType]
  )

  // Fetch opportunity name by ID
  const fetchOpportunityName = useCallback(
    async (opportunityId: string): Promise<string | undefined> => {
      if (!graphqlClient) return undefined

      try {
        const entityName = moduleType === 'irm' ? 'InvestmentOpportunity' : 'CustomerOpportunity'
        const query = `
          query GetOpportunityName($id: uuid!) {
            ${entityName}ByPk(id: $id) {
              id
              name
            }
          }
        `
        const result = await graphqlClient.request<any>(query, { id: opportunityId })
        return result[`${entityName}ByPk`]?.name
      } catch (err) {
        console.error('[fetchOpportunityName] Error:', err)
        return undefined
      }
    },
    [graphqlClient, moduleType]
  )

  // Extract and resolve task data
  const extractTaskData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Extract task data from additionalData
      // Priority order:
      // 1. psi_processMetadata.inputs.investmentTask (or customerTask/salesTask)
      // 2. psi_taskPayload.investmentTask (or customerTask/salesTask)
      // 3. psi_taskPayload directly (old format)
      const taskKey = moduleType === 'irm' ? 'investmentTask' : 'customerTask'
      // Support legacy 'salesTask' naming for CRM module (used by some Kogito processes)
      const alternateKey = moduleType === 'crm' ? 'salesTask' : null

      const rawTask =
        additionalData?.psi_processMetadata?.inputs?.[taskKey] ||
        (alternateKey ? additionalData?.psi_processMetadata?.inputs?.[alternateKey] : null) ||
        additionalData?.psi_taskPayload?.[taskKey] ||
        (alternateKey ? additionalData?.psi_taskPayload?.[alternateKey] : null) ||
        additionalData?.psi_taskPayload ||
        {}

      // Build base task data
      const baseTaskData: TaskApprovalData = {
        taskId: rawTask.id,
        name: rawTask.name,
        description: rawTask.description,
        dueDate: rawTask.dueDate,
        taskTiming: rawTask.taskTiming || rawTask.timingType,
        // Support both 'taskTypeRef'/'typeRef' and 'taskPriorityRef'/'priorityRef' naming conventions
        taskTypeRef: rawTask.taskTypeRef || rawTask.typeRef,
        taskPriorityRef: rawTask.taskPriorityRef || rawTask.priorityRef,
        documents: rawTask.documents || [],
        taskAssignees: rawTask.taskAssignees || [],
        investmentId: rawTask.investment,
        accountId: rawTask.account,
        contactId: rawTask.contact,
        leadId: rawTask.lead,
        opportunityId: rawTask.opportunity,
        creatorEmployeeId: rawTask.creatorEmployee,
        // Fallback for creator name from top-level additionalData
        creatorName: additionalData?.psi_taskPayload?.creatorName || additionalData?.psi_processMetadata?.creatorName
      }

      // Resolve entity UUIDs to names

      const [investmentName, creatorName, accountName, contactName, leadName, opportunityName] = await Promise.all([
        baseTaskData.investmentId ? fetchInvestmentName(baseTaskData.investmentId) : Promise.resolve(undefined),
        baseTaskData.creatorEmployeeId ? fetchEmployeeName(baseTaskData.creatorEmployeeId) : Promise.resolve(undefined),
        baseTaskData.accountId ? fetchAccountName(baseTaskData.accountId) : Promise.resolve(undefined),
        baseTaskData.contactId ? fetchContactName(baseTaskData.contactId) : Promise.resolve(undefined),
        baseTaskData.leadId ? fetchLeadName(baseTaskData.leadId) : Promise.resolve(undefined),
        baseTaskData.opportunityId ? fetchOpportunityName(baseTaskData.opportunityId) : Promise.resolve(undefined)
      ])

      const finalTaskData = {
        ...baseTaskData,
        investmentName,
        // Use resolved name or fallback to the one from additionalData
        creatorName: creatorName || baseTaskData.creatorName,
        accountName,
        contactName,
        leadName,
        opportunityName
      }

      setTaskData(finalTaskData)
    } catch (err: any) {
      console.error('[useTaskApprovalData] Error extracting task data:', err)
      setError(
        err.message ||
          getTranslationFromI18nKeyAndLabel('task-action-error-extract-data', 'Failed to extract task data')
      )
    } finally {
      setIsLoading(false)
    }
  }, [
    additionalData,
    moduleType,
    graphqlClient,
    fetchInvestmentName,
    fetchEmployeeName,
    fetchAccountName,
    fetchContactName,
    fetchLeadName,
    fetchOpportunityName
  ])

  // Extract task data on mount or when dependencies change
  useEffect(() => {
    extractTaskData()
  }, [extractTaskData])

  return {
    taskData,
    isLoading,
    error,
    taskStatus,
    isTaskCompleted,
    processMetadata
  }
}
