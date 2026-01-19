import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  FlowMetricsClient,
  FlowExecutionTask,
  FlowExecutionTasksParams,
  FlowExecutionTasksResponse
} from '@/common/network/flow-metrics/FlowMetricsClient'

type FetchVariantTasksResult = {
  tasks: FlowExecutionTask[]
  totalCount: number
}

// Fetches both the base and StoreDirector variants for a given task name,
// merges and de-duplicates by ID, sorts by most recent, and sums counts.
const fetchTasksWithVariants = async (
  client: FlowMetricsClient,
  baseParams: FlowExecutionTasksParams,
  baseTaskName: string
): Promise<FetchVariantTasksResult> => {
  const [baseResponse, variantResponse] = await Promise.all([
    client.getFlowExecutionTasks({
      ...baseParams,
      filterTaskName: baseTaskName
    }),
    client.getFlowExecutionTasks({
      ...baseParams,
      filterTaskName: `${baseTaskName}StoreDirector`
    })
  ])

  const getTasks = (res: FlowExecutionTasksResponse): FlowExecutionTask[] => res.processingStates ?? res.content ?? []

  const baseTasks = getTasks(baseResponse)
  const variantTasks = getTasks(variantResponse)

  const taskMap = new Map<string, FlowExecutionTask>()
  for (const task of baseTasks) {
    if (!taskMap.has(task.id)) taskMap.set(task.id, task)
  }
  for (const task of variantTasks) {
    if (!taskMap.has(task.id)) taskMap.set(task.id, task)
  }

  const merged = Array.from(taskMap.values())
  merged.sort((a, b) => {
    const dateA = new Date(a.started ?? a.lastUpdate ?? 0).getTime()
    const dateB = new Date(b.started ?? b.lastUpdate ?? 0).getTime()
    return dateB - dateA
  })

  const getTotal = (res: FlowExecutionTasksResponse): number => res.totalCount ?? res.totalElements ?? 0

  const totalCount = getTotal(baseResponse) + getTotal(variantResponse)

  return { tasks: merged, totalCount }
}

export interface UseFlowExecutionTasksResult {
  tasks: FlowExecutionTask[]
  totalCount: number
  isLoading: boolean
  error: string | null
  currentPage: number
  setCurrentPage: (page: number) => void
  pageSize: number
  setPageSize: (size: number) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  filterTaskName: string | null
  setFilterTaskName: (taskName: string | null) => void
  refresh: () => Promise<void>
  completing: boolean
  completeTask: (taskId: string, variables?: Record<string, any>) => Promise<void>
  taskIdToAction: string
}

export const useFlowExecutionTasks = (
  context?: BusinessAppContextProps,
  externalPagination?: {
    currentPage?: number
    pageSize?: number
    searchTerm?: string
    filterTaskName?: string | null
  }
): UseFlowExecutionTasksResult => {
  // State for tasks data
  const [tasks, setTasks] = useState<FlowExecutionTask[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination state - use external if provided, otherwise internal state
  const [internalCurrentPage, setInternalCurrentPage] = useState<number>(1)
  const [internalPageSize, setInternalPageSize] = useState<number>(50) // Balanced page size for performance
  const [internalSearchTerm, setInternalSearchTerm] = useState<string>('')
  const [internalFilterTaskName, setInternalFilterTaskName] = useState<string | null>(null)

  // Use external pagination if provided, otherwise use internal state
  const currentPage = externalPagination?.currentPage ?? internalCurrentPage
  const pageSize = externalPagination?.pageSize ?? internalPageSize
  const searchTerm = externalPagination?.searchTerm ?? internalSearchTerm
  const filterTaskName = externalPagination?.filterTaskName ?? internalFilterTaskName

  // Setters - use internal setters if no external pagination provided
  const setCurrentPage = externalPagination ? () => {} : setInternalCurrentPage
  const setPageSize = externalPagination ? () => {} : setInternalPageSize
  const setSearchTerm = externalPagination ? () => {} : setInternalSearchTerm
  const setFilterTaskName = externalPagination ? () => {} : setInternalFilterTaskName

  // Action states
  const [completing, setCompleting] = useState<boolean>(false)
  const [taskIdToAction, setTaskIdToAction] = useState<string>('')

  // Initialize the FlowMetrics client
  const accessToken = context?.accessToken || ''

  // Fetch tasks data - for certain process types, fetch both base and StoreDirector variants
  const fetchTasks = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    // Small helpers to keep this function simple
    const isVariantProcess = (name: string | null | undefined) =>
      !!name && ['approveAdvancePayment', 'approveExpenseRequest', 'approveExpensePlan'].includes(name)

    const buildBaseParams = (): FlowExecutionTasksParams => ({
      cockpitPage: 'INBOX',
      size: pageSize,
      page: currentPage - 1,
      field: 'CREATION_DATE',
      direction: 'DESC',
      ...(searchTerm && { search: searchTerm }),
      ...(context?.userInfo?.id && { userId: context.userInfo.id })
    })

    const runFetch = async (client: FlowMetricsClient) => {
      const baseParams = buildBaseParams()

      if (isVariantProcess(filterTaskName) && filterTaskName) {
        const res = await fetchTasksWithVariants(client, baseParams, filterTaskName)
        return { tasks: res.tasks.slice(0, pageSize), total: res.totalCount } as const
      }

      const response = await client.getFlowExecutionTasks({
        ...baseParams,
        ...(filterTaskName && { filterTaskName })
      })
      const tasks = response.processingStates || response.content || []
      const total = response.totalCount || response.totalElements || 0
      return { tasks, total } as const
    }

    try {
      const client = new FlowMetricsClient(accessToken)
      const { tasks, total } = await runFetch(client)

      if (!Array.isArray(tasks)) {
        throw new Error('Invalid data structure received from server')
      }

      setTasks(tasks)
      setTotalCount(total)
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to fetch flow execution tasks'
      setError(errorMessage)
      setTasks([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, searchTerm, context?.userInfo?.id, filterTaskName, currentPage, pageSize])

  // Fetch tasks when dependencies change (tab switch, page change, search, etc.)
  useEffect(() => {
    if (accessToken) {
      fetchTasks()
    }
  }, [accessToken, fetchTasks])

  // Complete a task
  const completeTask = useCallback(
    async (taskId: string, variables?: Record<string, any>) => {
      if (!accessToken) return

      setCompleting(true)
      setTaskIdToAction(taskId)

      try {
        const flowMetricsClient = new FlowMetricsClient(accessToken)
        await flowMetricsClient.completeTask(taskId, variables)

        // Refresh the data after completion
        await fetchTasks()
      } catch (err: any) {
        setError(err.message || 'Failed to complete task')
      } finally {
        setCompleting(false)
        setTaskIdToAction('')
      }
    },
    [accessToken, fetchTasks]
  )

  // Note: initial load is handled by the accessToken-guarded effect above

  return {
    tasks,
    totalCount,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchTerm,
    setSearchTerm,
    filterTaskName,
    setFilterTaskName,
    refresh: fetchTasks,
    completing,
    completeTask,
    taskIdToAction
  }
}
