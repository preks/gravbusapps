import { useState, useEffect, useCallback, useMemo } from 'react'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

export interface AuditLogEntry {
  id: string
  timestamp: string
  userId: string
  userName?: string
  department?: string
  flowId: string
  flowName: string
  templateId?: string
  templateName?: string
  taskId: string
  taskName: string
  taskType: string
  // Some backends send a dedicated step/task subtype for display (e.g. APPROVAL vs TASK)
  stepType?: string
  action: string
  assignmentChange?: {
    from: string
    to: string
    reason?: string
  }
  status: string
  previousStatus?: string
  newStatus?: string
  details: {
    reason?: string
    comment?: string
    executedBy?: string
    timestamp?: string
    completed?: boolean
  }
  ipAddress?: string
  userAgent?: string
}

export interface AuditFilters {
  userId?: string
  department?: string
  templateId?: string
  flowId?: string
  taskId?: string
  action?: string
  status?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface AuditSummary {
  totalEntries: number
  uniqueUsers: number
  uniqueDepartments: number
  uniqueTemplates: number
  actionBreakdown: { [action: string]: number }
  statusBreakdown: { [status: string]: number }
  timeRange: {
    earliest: string
    latest: string
  }
}

export interface AuditData {
  entries: AuditLogEntry[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  summary: AuditSummary
}

export interface FilterOptions {
  users: Array<{ id: string; name: string }>
  actions: string[]
  statuses: string[]
}

// Custom hook for fetching audit logs
export const useAuditLogs = (filters: AuditFilters, accessToken: string) => {
  const [data, setData] = useState<AuditData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const API_BASE = getFlowEngineApiBaseUrl()
  const filtersKey = JSON.stringify(filters)
  const queryString = useMemo(() => {
    const queryParams = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString())
      }
    })

    return queryParams.toString()
  }, [filtersKey])

  const fetchAuditLogs = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }

      const response = await fetch(`${API_BASE}/audit/logs?${queryString}`, { headers })

      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      if (result.status === 'success') {
        setData(result.data)
      } else {
        throw new Error(result.message || 'Failed to fetch audit logs')
      }
    } catch (err) {
      const normalizedError = err instanceof Error ? err : new Error('Unknown error')
      console.error('Error fetching audit logs:', normalizedError.message)
      setError(normalizedError)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, API_BASE, queryString])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  return {
    data,
    isLoading,
    error,
    refetch: fetchAuditLogs
  }
}

// Custom hook for fetching filter options
export const useAuditFilterOptions = (accessToken: string) => {
  const [data, setData] = useState<FilterOptions | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const API_BASE = getFlowEngineApiBaseUrl()

  const fetchFilterOptions = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }

      const response = await fetch(`${API_BASE}/audit/filter-options`, { headers })

      if (!response.ok) {
        throw new Error(`Failed to fetch filter options: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      if (result.status === 'success') {
        setData(result.data)
      } else {
        throw new Error(result.message || 'Failed to fetch filter options')
      }
    } catch (err) {
      const normalizedError = err instanceof Error ? err : new Error('Unknown error')
      console.error('Error fetching filter options:', normalizedError.message)
      setError(normalizedError)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, API_BASE])

  useEffect(() => {
    fetchFilterOptions()
  }, [fetchFilterOptions])

  return {
    data,
    isLoading,
    error,
    refetch: fetchFilterOptions
  }
}

// Export functionality
export const exportAuditLogs = async (
  filters: AuditFilters,
  format: 'csv' | 'json',
  accessToken: string
): Promise<void> => {
  try {
    const API_BASE = getFlowEngineApiBaseUrl()

    // Build query string
    const queryParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString())
      }
    })
    queryParams.append('format', format)

    const headers: HeadersInit = {
      Authorization: `Bearer ${accessToken}`
    }

    const response = await fetch(`${API_BASE}/audit/export?${queryParams.toString()}`, { headers })

    if (!response.ok) {
      throw new Error(`Failed to export audit logs: ${response.status} ${response.statusText}`)
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }

    // Create blob and download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    const normalizedError = err instanceof Error ? err : new Error('Unknown error')
    console.error('Error exporting audit logs:', normalizedError.message)
    throw normalizedError
  }
}
