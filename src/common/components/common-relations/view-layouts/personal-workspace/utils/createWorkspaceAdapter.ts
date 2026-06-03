/**
 * Generic Workspace Adapter Factory
 * Eliminates code duplication between CRM and IRM workspace adapters
 * Creates type-safe adapters with consistent patterns for:
 * - KPIs, Activities, Tasks, and Combined Calendar Data
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { KpiResult, ActivitiesResult, TasksResult } from '../types'

/**
 * Generic hook type for data fetching
 */
type DataFetchHook<TVariables, TResult> = (context: BusinessAppContextProps) => {
  [key: string]: (variables: TVariables) => Promise<TResult>
}

/**
 * Create a KPI Adapter
 * Generic adapter for fetching and managing KPI data
 */
export function createKpiAdapter<TVariables extends { employeeId: string }, TData>(
  useHook: DataFetchHook<TVariables, TData>,
  fetchKey: string = 'fetchKpis'
) {
  return (context: BusinessAppContextProps, employeeId: string): KpiResult => {
    const hook = useHook(context)
    const fetchFunction = hook[fetchKey]
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    // Stabilize fetch function with useRef
    const fetchRef = useRef(fetchFunction)
    useEffect(() => {
      fetchRef.current = fetchFunction
    }, [fetchFunction])

    const loadData = useCallback(async () => {
      if (!employeeId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await fetchRef.current({ employeeId } as TVariables)
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch KPIs'))
        setData(null)
      } finally {
        setLoading(false)
      }
    }, [employeeId])

    useEffect(() => {
      void loadData()
    }, [loadData])

    return { data, loading, error, refetch: () => void loadData() }
  }
}

/**
 * Create an Activities Adapter
 * Generic adapter for fetching and managing activities data
 */
export function createActivitiesAdapter<TVariables extends { employeeId: string; limit?: number }, TActivity>(
  useHook: DataFetchHook<TVariables, { activities: TActivity[]; total: number }>,
  fetchKey: string = 'fetchActivities',
  defaultLimit: number = 10
) {
  return (context: BusinessAppContextProps, employeeId: string): ActivitiesResult => {
    const hook = useHook(context)
    const fetchFunction = hook[fetchKey]
    const [activities, setActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    // Stabilize fetch function with useRef
    const fetchRef = useRef(fetchFunction)
    useEffect(() => {
      fetchRef.current = fetchFunction
    }, [fetchFunction])

    const loadActivities = useCallback(async () => {
      if (!employeeId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await fetchRef.current({ employeeId, limit: defaultLimit } as TVariables)
        setActivities(result.activities)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch activities'))
        setActivities([])
      } finally {
        setLoading(false)
      }
    }, [employeeId])

    useEffect(() => {
      void loadActivities()
    }, [loadActivities])

    return {
      activities,
      loading,
      error,
      refetch: () => void loadActivities()
    }
  }
}

/**
 * Create a Tasks Adapter
 * Generic adapter for fetching and managing tasks data
 */
export function createTasksAdapter<
  TVariables extends { employeeId: string; statusFilter?: string[]; limit?: number },
  TTask
>(
  useHook: DataFetchHook<TVariables, { tasks: TTask[]; total: number }>,
  fetchKey: string = 'fetchTasks',
  defaultStatusFilter: string[] = ['PENDING', 'IN_PROGRESS'],
  defaultLimit: number = 100
) {
  return (context: BusinessAppContextProps, employeeId: string): TasksResult => {
    const hook = useHook(context)
    const fetchFunction = hook[fetchKey]
    const [tasks, setTasks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    // Stabilize fetch function with useRef
    const fetchRef = useRef(fetchFunction)
    useEffect(() => {
      fetchRef.current = fetchFunction
    }, [fetchFunction])

    const loadTasks = useCallback(async () => {
      if (!employeeId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await fetchRef.current({
          employeeId,
          statusFilter: defaultStatusFilter,
          limit: defaultLimit
        } as TVariables)
        setTasks(result.tasks)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch tasks'))
        setTasks([])
      } finally {
        setLoading(false)
      }
    }, [employeeId])

    useEffect(() => {
      void loadTasks()
    }, [loadTasks])

    return {
      tasks,
      loading,
      error,
      refetch: () => void loadTasks()
    }
  }
}

/**
 * Create a Combined Calendar Adapter
 * Generic adapter for fetching activities and tasks in parallel
 * Includes automatic refetch on process completion events
 */
export function createCombinedCalendarAdapter<
  TVariables extends { employeeId: string; dateFrom?: string; dateTo?: string; limit?: number },
  TResult extends { activities: any[]; tasks: any[]; activitiesTotal: number; tasksTotal: number }
>(useHook: DataFetchHook<TVariables, TResult>, fetchKey: string = 'fetchCalendarData') {
  return (
    context: BusinessAppContextProps,
    employeeId: string
  ): { activitiesResult: ActivitiesResult; tasksResult: TasksResult } => {
    const hook = useHook(context)
    const fetchFunction = hook[fetchKey]
    const [activities, setActivities] = useState<any[]>([])
    const [tasks, setTasks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    // Stabilize fetch function with useRef
    const fetchRef = useRef(fetchFunction)
    useEffect(() => {
      fetchRef.current = fetchFunction
    }, [fetchFunction])

    // Track last fetch call to prevent duplicate calls (with debouncing)
    const lastFetchCall = useRef<{ dateFrom?: string; dateTo?: string; timestamp: number } | null>(null)
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Track if initial fetch has been triggered
    const hasInitialFetchTriggered = useRef(false)
    const lastEmployeeId = useRef(employeeId)

    // Reset flag when employeeId changes
    if (lastEmployeeId.current !== employeeId) {
      hasInitialFetchTriggered.current = false
      lastEmployeeId.current = employeeId
      lastFetchCall.current = null
    }

    // Stable load function
    const loadCalendarData = useCallback(
      async (dateRange?: { dateFrom?: string; dateTo?: string }) => {
        if (!employeeId) {
          setLoading(false)
          return
        }

        // Prevent duplicate calls with the same parameters within 100ms
        const now = Date.now()
        const last = lastFetchCall.current
        if (
          last &&
          last.dateFrom === dateRange?.dateFrom &&
          last.dateTo === dateRange?.dateTo &&
          now - last.timestamp < 100
        ) {
          return
        }

        lastFetchCall.current = {
          dateFrom: dateRange?.dateFrom,
          dateTo: dateRange?.dateTo,
          timestamp: now
        }

        setLoading(true)
        setError(null)

        try {
          const result = await fetchRef.current({
            employeeId,
            ...dateRange
          } as TVariables)
          setActivities(result.activities)
          setTasks(result.tasks)
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Failed to fetch calendar data'))
          setActivities([])
          setTasks([])
        } finally {
          setLoading(false)
        }
      },
      [employeeId]
    )

    // Store loadCalendarData in ref
    const loadCalendarDataRef = useRef(loadCalendarData)
    useEffect(() => {
      loadCalendarDataRef.current = loadCalendarData
    }, [loadCalendarData])

    // Initial load with 2-week date range
    useEffect(() => {
      if (!employeeId || hasInitialFetchTriggered.current) {
        return
      }

      hasInitialFetchTriggered.current = true

      // Calculate initial 2-week range
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())

      const rangeStart = new Date(startOfWeek)
      rangeStart.setDate(rangeStart.getDate() - 1)
      rangeStart.setHours(0, 0, 0, 0)

      const rangeEnd = new Date(startOfWeek)
      rangeEnd.setDate(rangeEnd.getDate() + 14)
      rangeEnd.setHours(23, 59, 59, 999)

      void loadCalendarDataRef.current({
        dateFrom: rangeStart.toISOString(),
        dateTo: rangeEnd.toISOString()
      })
    }, [employeeId])

    // Create refetch adapters
    const refetchActivities = useCallback(async (dateRange?: { occurredAtFrom?: string; occurredAtTo?: string }) => {
      await loadCalendarDataRef.current({
        dateFrom: dateRange?.occurredAtFrom,
        dateTo: dateRange?.occurredAtTo
      })
    }, [])

    const refetchTasks = useCallback(async (dateRange?: { dueDateFrom?: string; dueDateTo?: string }) => {
      await loadCalendarDataRef.current({
        dateFrom: dateRange?.dueDateFrom,
        dateTo: dateRange?.dueDateTo
      })
    }, [])

    // Listen for process completion events to auto-refresh calendar data
    useEffect(() => {
      const handleProcessCompletion = () => {
        // Clear any pending refresh
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current)
        }

        // Debounce refresh by 300ms to batch multiple rapid events
        refreshTimeoutRef.current = setTimeout(() => {
          loadCalendarDataRef.current()
        }, 300)
      }

      const eventNames = ['com.newwork.process.completion', 'com.newwork.process.processCompletion']

      eventNames.forEach(eventName => {
        globalThis.addEventListener(eventName, handleProcessCompletion)
      })

      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current)
        }
        eventNames.forEach(eventName => {
          globalThis.removeEventListener(eventName, handleProcessCompletion)
        })
      }
    }, [])

    return {
      activitiesResult: {
        activities,
        loading,
        error,
        refetch: refetchActivities
      },
      tasksResult: {
        tasks,
        loading,
        error,
        refetch: refetchTasks
      }
    }
  }
}
