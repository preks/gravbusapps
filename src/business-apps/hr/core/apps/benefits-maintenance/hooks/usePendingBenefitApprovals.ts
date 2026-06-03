import { useState, useEffect, useCallback } from 'react'
import {
  FlowMetricsClient,
  FlowExecutionTask,
  FlowExecutionTasksResponse
} from '@/common/network/flow-metrics/FlowMetricsClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

const TASK_NAME = 'approveEmployeeBenefit'
const GET_EMPLOYEES_BY_IDS = `
  query GetEmployeesByIds($employeeIds: [uuid!]!) {
    Employee(where: { id: { _in: $employeeIds }, isDeleted: { _eq: false } }) {
      id
      firstName
      lastName
      displayName
    }
  }
`

function isOpenTask(task: FlowExecutionTask): boolean {
  const state = (task.state || task.status || '').toUpperCase()
  return state !== 'COMPLETED' && state !== 'CLOSED' && state !== 'CANCELLED' && state !== 'ABORTED'
}

export interface PendingBenefitTask {
  id: string
  taskName: string
  employeeName: string
  employeeId: string
  employeePicture: string | null
  benefitTypeName: string
  benefitTypeRef: string
  providerName: string
  providerRef: string
  amount: string
  currencyCode: string
  startDate: string | null
  justification: string
  requestedAt: string | null
  flowTask: FlowExecutionTask
}

interface EmployeeLookupResult {
  Employee: Array<{
    id: string
    firstName?: string | null
    lastName?: string | null
    displayName?: string | null
  }>
}

interface ResolvedPendingTask {
  taskId: string
  decision: 'approved' | 'rejected'
}

function resolveRef(ref: string | undefined): string {
  if (!ref) return ''
  const parts = ref.split(':')
  return parts.length >= 3 ? parts[parts.length - 1] : ref
}

function extractEmployeeNameFromDescription(description?: string | null): string {
  if (!description) {
    return ''
  }

  const descriptionLower = description.toLowerCase()
  const forIndex = descriptionLower.indexOf('for ')
  if (forIndex === -1) {
    return ''
  }

  const afterFor = description.slice(forIndex + 4).trim()
  if (!afterFor) {
    return ''
  }

  const separatorIndex = afterFor.indexOf(' -')
  const extracted = separatorIndex >= 0 ? afterFor.slice(0, separatorIndex) : afterFor
  return extracted.trim()
}

function buildEmployeeName(employee: {
  displayName?: string | null
  firstName?: string | null
  lastName?: string | null
}): string {
  if (employee.displayName?.trim()) {
    return employee.displayName.trim()
  }

  const fullName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim()
  return fullName
}

function extractBenefitData(task: FlowExecutionTask): Omit<PendingBenefitTask, 'flowTask'> {
  const inputs = task.inputs ?? {}
  const variables = task.variables ?? {}
  const benefit = inputs.employeeBenefit ?? variables.employeeBenefit ?? {}

  const employeeId = benefit.employee ?? benefit.employeeId ?? ''

  const firstName = benefit.employeeFirstName ?? inputs.employeeFirstName ?? variables.employeeFirstName ?? ''
  const lastName = benefit.employeeLastName ?? inputs.employeeLastName ?? variables.employeeLastName ?? ''
  const fullNameFromFields = `${firstName} ${lastName}`.trim()

  const employeeName =
    fullNameFromFields ||
    extractEmployeeNameFromDescription(task.description) ||
    inputs.employeeName ||
    variables.employeeName ||
    ''

  const employeePicture =
    benefit.employeePictureThumbnail ?? inputs.employeePictureThumbnail ?? variables.employeePictureThumbnail ?? null

  const benefitTypeName =
    benefit.benefitTypeName ??
    inputs.benefitTypeName ??
    variables.benefitTypeName ??
    (resolveRef(benefit.benefitTypeRef) || '')

  const providerName =
    benefit.benefitProviderName ??
    inputs.benefitProviderName ??
    variables.benefitProviderName ??
    (resolveRef(benefit.benefitProviderRef) || '')

  const monthly = benefit.monthlyAmount
  const yearly = benefit.yearlyAmount
  let amount = ''
  if (monthly != null) {
    amount = String(monthly)
  } else if (yearly != null) {
    amount = String(yearly)
  }

  const currencyRef = benefit.currencyRef ?? benefit.currency ?? ''
  const currencyCode = resolveRef(currencyRef)

  return {
    id: task.id,
    taskName: task.name || TASK_NAME,
    employeeName,
    employeeId,
    employeePicture,
    benefitTypeName,
    benefitTypeRef: benefit.benefitTypeRef ?? '',
    providerName,
    providerRef: benefit.benefitProviderRef ?? '',
    amount,
    currencyCode,
    startDate: benefit.startDate ?? null,
    justification: benefit.justification ?? benefit.notes ?? inputs.note ?? variables.note ?? '',
    requestedAt: task.createdAt ?? task.started ?? null
  }
}

export function usePendingBenefitApprovals(accessToken?: string, userId?: string) {
  const graphqlClient = useGraphQLClient(accessToken)
  const [tasks, setTasks] = useState<PendingBenefitTask[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isActioning, setIsActioning] = useState(false)
  const [resolvedPendingTasks, setResolvedPendingTasks] = useState<ResolvedPendingTask[]>([])

  const fetchPending = useCallback(async () => {
    if (!accessToken) return
    setIsLoading(true)
    setError(null)

    try {
      const client = new FlowMetricsClient(accessToken)
      const response: FlowExecutionTasksResponse = await client.getFlowExecutionTasks({
        cockpitPage: 'INBOX',
        size: 200,
        page: 0,
        field: 'CREATION_DATE',
        direction: 'DESC',
        filterTaskName: TASK_NAME,
        ...(userId ? { userId } : {})
      })

      const allTasks = (response.processingStates ?? response.content ?? []).filter(isOpenTask)
      let mapped: PendingBenefitTask[] = allTasks.map(t => ({
        ...extractBenefitData(t),
        flowTask: t
      }))

      const employeeIds = Array.from(
        new Set(mapped.map(task => task.employeeId).filter((employeeId): employeeId is string => Boolean(employeeId)))
      )

      if (employeeIds.length > 0) {
        try {
          const employeeResult = await graphqlClient.request<EmployeeLookupResult>(GET_EMPLOYEES_BY_IDS, {
            employeeIds
          })
          const employeeById = new Map(employeeResult.Employee.map(employee => [employee.id, employee]))
          mapped = mapped.map(task => {
            const employee = employeeById.get(task.employeeId)
            if (!employee) {
              return task
            }

            const resolvedName = buildEmployeeName(employee)
            return {
              ...task,
              employeeName: resolvedName || task.employeeName,
              employeePicture: task.employeePicture || null
            }
          })
        } catch {
          // Best-effort enrichment, keep original fallback values if lookup fails.
        }
      }

      const resolvedTaskIds = new Set(resolvedPendingTasks.map(task => task.taskId))

      const visibleTasks = mapped.filter(task => !resolvedTaskIds.has(task.id))

      setTasks(visibleTasks)
      setTotalCount(visibleTasks.length)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load pending benefit approvals'))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, userId, graphqlClient, resolvedPendingTasks])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  const completeApproval = useCallback(
    async (task: FlowExecutionTask, decision: 'approved' | 'rejected', userId?: string, reason?: string) => {
      if (!accessToken) {
        throw new Error('Missing access token')
      }
      if (!task.endpoint) {
        throw new Error('Task endpoint is missing')
      }

      setIsActioning(true)
      try {
        const queryParams = new URLSearchParams({ phase: 'complete' })
        if (userId) {
          queryParams.set('user', userId)
        }
        const url = `${task.endpoint}?${queryParams.toString()}`
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            approval: decision,
            decisionReason: reason ?? ''
          })
        })

        if (!res.ok) {
          throw new Error(`Failed to ${decision} benefit: ${res.status} ${res.statusText}`)
        }

        setResolvedPendingTasks(prev => {
          if (prev.some(item => item.taskId === task.id)) {
            return prev
          }
          return [...prev, { taskId: task.id, decision }]
        })
        setTasks(prev => prev.filter(item => item.id !== task.id))
        setTotalCount(prev => Math.max(0, prev - 1))

        await fetchPending()
      } finally {
        setIsActioning(false)
      }
    },
    [accessToken, fetchPending]
  )

  return {
    tasks,
    totalCount,
    isLoading,
    error,
    isActioning,
    refetch: fetchPending,
    approve: (task: FlowExecutionTask, userId?: string, reason?: string) =>
      completeApproval(task, 'approved', userId, reason),
    reject: (task: FlowExecutionTask, userId?: string, reason?: string) =>
      completeApproval(task, 'rejected', userId, reason)
  }
}
