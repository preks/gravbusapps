import { useState, useEffect, useCallback } from 'react'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import { AuditFilters, AuditData, FilterOptions, AuditLogEntry } from '../../apps/success/hooks/useAuditData'

// Extended filters for compliance-specific needs
export interface ComplianceAuditFilters extends AuditFilters {
  solution?: string // For filtering by solution=compliance
}

// Hook for fetching compliance-specific audit logs
export const useComplianceAuditLogs = (filters: ComplianceAuditFilters, accessToken: string) => {
  const [data, setData] = useState<AuditData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const API_BASE = getFlowEngineApiBaseUrl()

  const fetchComplianceAuditLogs = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('Fetching compliance audit logs with filters:', filters)

      // Build query string with compliance-specific filters
      const queryParams = new URLSearchParams()

      // For compliance, filter by solution tag
      queryParams.append('tag.solution', 'compliance')

      // Add standard filters
      if (filters.userId) queryParams.append('userId', filters.userId)
      if (filters.action) queryParams.append('action', filters.action)
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.startDate) queryParams.append('startDate', filters.startDate)
      if (filters.endDate) queryParams.append('endDate', filters.endDate)
      if (filters.flowId) queryParams.append('flowId', filters.flowId)
      if (filters.taskId) queryParams.append('taskId', filters.taskId)
      if (filters.templateId) queryParams.append('templateId', filters.templateId)
      if (filters.department) queryParams.append('department', filters.department)
      queryParams.append('limit', (filters.limit || 50).toString())
      queryParams.append('offset', (filters.offset || 0).toString())

      const response = await fetch(`${API_BASE}/audit/logs?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch compliance audit logs: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.status === 'success') {
        // Transform entries to add compliance-specific metadata
        const enhancedEntries = (result.data?.entries || []).map((entry: AuditLogEntry) => ({
          ...entry,
          // Add compliance-specific context
          isComplianceFlow: true,
          flowType: 'Compliance'
        }))

        const enhancedData = {
          ...result.data,
          entries: enhancedEntries
        }

        setData(enhancedData)
      } else {
        throw new Error(result.message || 'Failed to fetch compliance audit logs')
      }
    } catch (err) {
      console.error('Error fetching compliance audit logs:', err)
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
    } finally {
      setIsLoading(false)
    }
  }, [filters, accessToken, API_BASE])

  useEffect(() => {
    fetchComplianceAuditLogs()
  }, [fetchComplianceAuditLogs])

  return {
    data,
    isLoading,
    error,
    refetch: fetchComplianceAuditLogs
  }
}

// Export compliance-specific audit logs
export const exportComplianceAuditLogs = async (
  filters: ComplianceAuditFilters,
  format: 'csv' | 'json',
  accessToken: string
): Promise<void> => {
  const API_BASE = getFlowEngineApiBaseUrl()

  try {
    // Build query string with compliance filters
    const queryParams = new URLSearchParams()

    // For compliance export, filter by solution tag
    queryParams.append('tag.solution', 'compliance')

    // Add other filters
    if (filters.userId) queryParams.append('userId', filters.userId)
    if (filters.action) queryParams.append('action', filters.action)
    if (filters.status) queryParams.append('status', filters.status)
    if (filters.startDate) queryParams.append('startDate', filters.startDate)
    if (filters.endDate) queryParams.append('endDate', filters.endDate)
    if (filters.flowId) queryParams.append('flowId', filters.flowId)
    if (filters.taskId) queryParams.append('taskId', filters.taskId)
    if (filters.templateId) queryParams.append('templateId', filters.templateId)
    if (filters.department) queryParams.append('department', filters.department)
    queryParams.append('format', format)

    const response = await fetch(`${API_BASE}/audit/export?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to export compliance audit logs: ${response.statusText}`)
    }

    // Handle file download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    // Create filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10)
    link.download = `compliance-audit-logs-${timestamp}.${format}`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    console.log(`Compliance audit logs exported as ${format.toUpperCase()}`)
  } catch (error) {
    console.error('Error exporting compliance audit logs:', error)
    throw error
  }
}
