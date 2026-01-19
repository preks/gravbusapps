/**
 * Adapter hooks to transform IRM-specific hooks into generic workspace interfaces
 * This allows IRM hooks to work with the generic PersonalWorkspace component
 * Uses centralized query builders and manages state for workspace consumption
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type {
  KpiResult,
  ActivitiesResult,
  TasksResult
} from '@/common/components/common-relations/view-layouts/personal-workspace/types'
import { useInvestmentPersonalWorkspaceKpis } from '@/common/data/investment/hooks/useInvestmentPersonalWorkspaceKpis'
import { useInvestmentRecentActivities } from '@/common/data/investment/hooks/useInvestmentRecentActivities'
import { useInvestmentPersonalWorkspaceTasks } from '@/common/data/investment/hooks/useInvestmentPersonalWorkspaceTasks'
import { useInvestmentCalendarData } from '@/common/data/investment/hooks/useInvestmentCalendarData'

/**
 * Adapter for KPIs hook - manages state
 */
export const useIrmKpisAdapter = (context: BusinessAppContextProps, employeeId: string): KpiResult => {
  const { fetchKpis } = useInvestmentPersonalWorkspaceKpis(context)
  const [kpis, setKpis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadKpis = useCallback(async () => {
    if (!employeeId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchKpis({ employeeId })
      setKpis(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch KPIs'))
      setKpis(null)
    } finally {
      setLoading(false)
    }
  }, [employeeId, fetchKpis])

  useEffect(() => {
    void loadKpis()
  }, [loadKpis])

  return {
    data: kpis,
    loading,
    error
  }
}

/**
 * Adapter for Recent Activities (for Recent Activities widget in Overview)
 * Fetches only the last 10 activities without date filtering
 * Independent from calendar activities
 */
export const useIrmRecentActivitiesAdapter = (
  context: BusinessAppContextProps,
  employeeId: string
): ActivitiesResult => {
  const { fetchActivities } = useInvestmentRecentActivities(context)
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Use ref to store latest fetchActivities without causing re-renders
  const fetchActivitiesRef = useRef(fetchActivities)
  useEffect(() => {
    fetchActivitiesRef.current = fetchActivities
  }, [fetchActivities])

  // Load recent activities - always fetches last 10, no date filtering
  const loadRecentActivities = useCallback(async () => {
    if (!employeeId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchActivitiesRef.current({
        employeeId,
        limit: 10 // ✅ Only 10 activities for Recent Activities widget
      })
      setActivities(result.activities)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch activities'))
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    void loadRecentActivities()
  }, [loadRecentActivities])

  return {
    activities,
    loading,
    error,
    refetch: loadRecentActivities
  }
}

/**
 * Adapter for Calendar Activities (for Activities & Tasks calendar)
 * Supports date range filtering for calendar optimization
 * Fetches activities for the displayed 2-week period
 */
export const useIrmCalendarActivitiesAdapter = (
  context: BusinessAppContextProps,
  employeeId: string
): ActivitiesResult => {
  const { fetchActivities } = useInvestmentRecentActivities(context)
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Use ref to store latest fetchActivities without causing re-renders
  const fetchActivitiesRef = useRef(fetchActivities)
  useEffect(() => {
    fetchActivitiesRef.current = fetchActivities
  }, [fetchActivities])

  // Stable loadActivities function with date range support - only recreates when employeeId changes
  const loadActivities = useCallback(
    async (dateRange?: { occurredAtFrom?: string; occurredAtTo?: string }) => {
      if (!employeeId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await fetchActivitiesRef.current({
          employeeId,
          limit: 100, // ✅ More activities for calendar to cover 2 weeks
          ...dateRange
        })
        setActivities(result.activities)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch activities'))
        setActivities([])
      } finally {
        setLoading(false)
      }
    },
    [employeeId]
  )

  useEffect(() => {
    void loadActivities()
  }, [loadActivities])

  return {
    activities,
    loading,
    error,
    refetch: loadActivities
  }
}

/**
 * Adapter for Tasks hook - manages state
 * Supports date range filtering for calendar optimization
 */
export const useIrmTasksAdapter = (context: BusinessAppContextProps, employeeId: string): TasksResult => {
  const { fetchTasks } = useInvestmentPersonalWorkspaceTasks(context)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Use ref to store latest fetchTasks without causing re-renders
  const fetchTasksRef = useRef(fetchTasks)
  useEffect(() => {
    fetchTasksRef.current = fetchTasks
  }, [fetchTasks])

  // Stable loadTasks function - only recreates when employeeId changes
  const loadTasks = useCallback(
    async (dateRange?: { dueDateFrom?: string; dueDateTo?: string }) => {
      if (!employeeId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await fetchTasksRef.current({
          employeeId,
          statusFilter: ['PENDING', 'IN_PROGRESS'],
          limit: 100,
          ...dateRange
        })
        setTasks(result.tasks)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch tasks'))
        setTasks([])
      } finally {
        setLoading(false)
      }
    },
    [employeeId]
  )

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  return {
    tasks,
    loading,
    error,
    refetch: loadTasks
  }
}

/**
 * Combined adapter for Calendar Activities & Tasks
 * Fetches both activities and tasks in parallel for better performance
 * Uses Promise.all to execute both queries simultaneously
 * Returns both ActivitiesResult and TasksResult
 */
export const useIrmCombinedCalendarAdapter = (
  context: BusinessAppContextProps,
  employeeId: string
): { activitiesResult: ActivitiesResult; tasksResult: TasksResult } => {
  const { fetchCalendarData } = useInvestmentCalendarData(context)
  const [activities, setActivities] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Track if initial fetch has been triggered to prevent duplicate calls
  const hasInitialFetchTriggered = useRef(false)
  const lastEmployeeId = useRef(employeeId)

  // Track last fetch call to prevent duplicate calls in the same tick
  const lastFetchCall = useRef<{ dateFrom?: string; dateTo?: string; timestamp: number } | null>(null)

  // Reset flag when employeeId changes
  if (lastEmployeeId.current !== employeeId) {
    hasInitialFetchTriggered.current = false
    lastEmployeeId.current = employeeId
    lastFetchCall.current = null
  }

  // Use ref to store latest fetchCalendarData without causing re-renders
  const fetchCalendarDataRef = useRef(fetchCalendarData)
  useEffect(() => {
    fetchCalendarDataRef.current = fetchCalendarData
  }, [fetchCalendarData])

  // Stable load function - only depends on employeeId
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
        console.log('[useIrmCombinedCalendarAdapter] ⚠️ PREVENTED duplicate call with same date range within 100ms')
        return
      }

      // Record this fetch call
      lastFetchCall.current = {
        dateFrom: dateRange?.dateFrom,
        dateTo: dateRange?.dateTo,
        timestamp: now
      }

      setLoading(true)
      setError(null)

      try {
        const result = await fetchCalendarDataRef.current({
          employeeId,
          ...dateRange
        })
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

  // Store loadCalendarData in ref to avoid infinite loops
  const loadCalendarDataRef = useRef(loadCalendarData)
  useEffect(() => {
    loadCalendarDataRef.current = loadCalendarData
  }, [loadCalendarData])

  // Initial load with 2-week date range (same as calendar initial view)
  useEffect(() => {
    if (!employeeId) {
      return
    }

    // Prevent duplicate fetch during React Strict Mode double-mount in development
    if (hasInitialFetchTriggered.current) {
      return
    }

    hasInitialFetchTriggered.current = true

    // Calculate initial 2-week range (same as CompactTwoWeekCalendar with weekOffset=0)
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay()) // Start of current week

    const rangeStart = new Date(startOfWeek)
    rangeStart.setDate(rangeStart.getDate() - 1)
    rangeStart.setHours(0, 0, 0, 0)

    const rangeEnd = new Date(startOfWeek)
    rangeEnd.setDate(rangeEnd.getDate() + 14) // 2 weeks ahead
    rangeEnd.setHours(23, 59, 59, 999)

    void loadCalendarDataRef.current({
      dateFrom: rangeStart.toISOString(),
      dateTo: rangeEnd.toISOString()
    })
  }, [employeeId]) // Only depend on employeeId

  // Create refetch adapters that translate date range formats
  const refetchActivities = useCallback(
    async (dateRange?: { occurredAtFrom?: string; occurredAtTo?: string }) => {
      await loadCalendarDataRef.current({
        dateFrom: dateRange?.occurredAtFrom,
        dateTo: dateRange?.occurredAtTo
      })
    },
    [] // No dependencies - uses ref
  )

  const refetchTasks = useCallback(
    async (dateRange?: { dueDateFrom?: string; dueDateTo?: string }) => {
      await loadCalendarDataRef.current({
        dateFrom: dateRange?.dueDateFrom,
        dateTo: dateRange?.dueDateTo
      })
    },
    [] // No dependencies - uses ref
  )

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
