/**
 * Adapter hooks to transform CRM-specific hooks into generic workspace interfaces
 * This allows CRM hooks to work with the generic PersonalWorkspace component
 * Uses centralized query builders and manages state for workspace consumption
 */
import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type {
  KpiResult,
  ActivitiesResult,
  TasksResult
} from '@/common/components/common-relations/view-layouts/personal-workspace/types'
import { useCustomerPersonalWorkspaceKpis } from '@/common/data/customer/hooks/useCustomerPersonalWorkspaceKpis'
import { useCustomerRecentActivities } from '@/common/data/customer/hooks/useCustomerRecentActivities'
import { useCustomerPersonalWorkspaceTasks } from '@/common/data/customer/hooks/useCustomerPersonalWorkspaceTasks'

/**
 * Adapter for KPIs hook - manages state
 */
export const useCrmKpisAdapter = (context: BusinessAppContextProps, employeeId: string): KpiResult => {
  const { fetchKpis } = useCustomerPersonalWorkspaceKpis(context)
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
 * Adapter for Activities hook - manages state
 */
export const useCrmActivitiesAdapter = (context: BusinessAppContextProps, employeeId: string): ActivitiesResult => {
  const { fetchActivities } = useCustomerRecentActivities(context)
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadActivities = useCallback(async () => {
    if (!employeeId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchActivities({ employeeId, limit: 100 })
      setActivities(result.activities)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch activities'))
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [employeeId, fetchActivities])

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

/**
 * Adapter for Tasks hook - manages state
 */
export const useCrmTasksAdapter = (context: BusinessAppContextProps, employeeId: string): TasksResult => {
  const { fetchTasks } = useCustomerPersonalWorkspaceTasks(context)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadTasks = useCallback(async () => {
    if (!employeeId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchTasks({
        employeeId,
        statusFilter: ['PENDING', 'IN_PROGRESS'],
        limit: 100
      })
      setTasks(result.tasks)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch tasks'))
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [employeeId, fetchTasks])

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
