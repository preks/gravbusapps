import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Alert, Button } from '@newwork/nw-design-system'
import { Spinner } from '@newwork/nw-design-system'
import { Shield, Download, Search, RefreshCw, FileText, Database, Users, Activity } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { useAuditFilterOptions, AuditFilters } from '../../../apps/success/hooks/useAuditData'
import {
  useComplianceAuditLogs,
  exportComplianceAuditLogs,
  ComplianceAuditFilters
} from '../hooks/useComplianceAuditData'

interface ComplianceAuditTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const AuditTab: React.FC<ComplianceAuditTabProps> = ({
  prefixDataTestId = 'compliance-audit-tab',
  accessToken
}) => {
  // Filter state with compliance tag pre-applied (handled in hook)
  const [filters, setFilters] = useState<ComplianceAuditFilters>({
    limit: 50,
    offset: 0
  })

  // Loading states
  const [exportLoading, setExportLoading] = useState(false)

  // Fetch data with compliance filtering
  const { data: auditData, isLoading, error, refetch } = useComplianceAuditLogs(filters, accessToken)
  const { data: filterOptions, isLoading: filterOptionsLoading } = useAuditFilterOptions(accessToken)

  // Handle filter changes
  const handleFilterChange = (key: keyof ComplianceAuditFilters, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0 // Reset to first page when filters change
    }))
  }

  // Handle pagination
  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }))
  }

  // Handle compliance-specific export
  const handleComplianceExport = async (format: 'csv' | 'json') => {
    setExportLoading(true)
    try {
      // Create compliance-specific filters for export
      const complianceFilters = {
        ...filters
        // Note: compliance tag filtering is handled in the export hook
      }
      await exportComplianceAuditLogs(complianceFilters, format, accessToken)
    } catch (error) {
      console.error('Compliance export failed:', error)
    } finally {
      setExportLoading(false)
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  // Format action with color
  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'APPROVE':
      case 'APPROVAL':
        return 'gba:text-green-600 gba:bg-green-100'
      case 'REJECT':
      case 'REJECTION':
        return 'gba:text-red-600 gba:bg-red-100'
      case 'CLAIM':
        return 'gba:text-blue-600 gba:bg-blue-100'
      case 'UNCLAIM':
        return 'gba:text-orange-600 gba:bg-orange-100'
      case 'REASSIGN':
        return 'gba:text-purple-600 gba:bg-purple-100'
      case 'COMPLETE':
        return 'gba:text-emerald-600 gba:bg-emerald-100'
      case 'HUMAN':
        return 'gba:text-cyan-600 gba:bg-cyan-100'
      case 'TASK':
        return 'gba:text-indigo-600 gba:bg-indigo-100'
      case 'SYSTEM':
        return 'gba:text-gray-600 gba:bg-gray-100'
      default:
        return 'gba:text-slate-600 gba:bg-slate-100'
    }
  }

  // Format status with color
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
      case 'APPROVED':
        return 'gba:text-green-600 gba:bg-green-100'
      case 'REJECTED':
        return 'gba:text-red-600 gba:bg-red-100'
      case 'FAILED':
      case 'ERROR':
        return 'gba:text-red-600 gba:bg-red-100'
      case 'CANCELED':
      case 'CANCELLED':
        return 'gba:text-orange-600 gba:bg-orange-100'
      case 'IN_PROGRESS':
      case 'CLAIMED':
        return 'gba:text-blue-600 gba:bg-blue-100'
      case 'OPEN':
      case 'CLAIMABLE':
        return 'gba:text-yellow-600 gba:bg-yellow-100'
      case 'SCHEDULED':
        return 'gba:text-purple-600 gba:bg-purple-100'
      case 'QUEUED':
        return 'gba:text-indigo-600 gba:bg-indigo-100'
      default:
        return 'gba:text-gray-600 gba:bg-gray-100'
    }
  }

  // Format task type with color
  const getTaskTypeColor = (taskType: string | null | undefined) => {
    if (!taskType) return 'gba:text-gray-600 gba:bg-gray-100'
    switch (taskType.toUpperCase()) {
      case 'TASK':
        return 'gba:text-indigo-600 gba:bg-indigo-100'
      case 'INFORMATION':
        return 'gba:text-cyan-600 gba:bg-cyan-100'
      case 'APPROVAL':
        return 'gba:text-purple-600 gba:bg-purple-100'
      case 'ACKNOWLEDGE':
        return 'gba:text-green-600 gba:bg-green-100'
      case 'HUMAN':
        return 'gba:text-cyan-600 gba:bg-cyan-100'
      case 'SIMPLE':
      case 'USER_TASK':
        return 'gba:text-indigo-600 gba:bg-indigo-100'
      case 'LAMBDA':
        return 'gba:text-orange-600 gba:bg-orange-100'
      case 'DO_WHILE':
        return 'gba:text-blue-600 gba:bg-blue-100'
      default:
        return 'gba:text-slate-600 gba:bg-slate-100'
    }
  }

  // Format task type display name
  const formatTaskType = (taskType: string | null | undefined) => {
    if (!taskType) return 'Unknown'
    switch (taskType.toUpperCase()) {
      case 'TASK':
        return 'Task'
      case 'INFORMATION':
        return 'Information'
      case 'APPROVAL':
        return 'Approval'
      case 'ACKNOWLEDGE':
        return 'Acknowledgment'
      case 'USER_TASK':
        return 'User Task'
      case 'SIMPLE':
        return 'Simple Task'
      case 'LAMBDA':
        return 'Lambda'
      case 'DO_WHILE':
        return 'Loop'
      case 'HUMAN':
        return 'Human Task'
      default:
        return taskType
    }
  }

  // Calculate current page
  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1
  const totalPages = auditData ? Math.ceil(auditData.pagination.total / (filters.limit || 50)) : 0

  // Calculate user actions count (all actions except SYSTEM)
  const userActionsCount = auditData?.summary?.actionBreakdown
    ? Object.entries(auditData.summary.actionBreakdown)
        .filter(([action]) => action !== 'SYSTEM')
        .reduce((total, [, count]) => total + count, 0)
    : 0

  // Compliance-specific summary widgets
  const summaryWidgets: WidgetItem[] = auditData?.summary
    ? [
        {
          key: 'total-entries',
          title: 'Total Compliance Actions',
          value: auditData.summary.totalEntries,
          prefix: <Database className="gba:h-4 gba:w-4" />,
          color: '#3b82f6',
          description: 'Total compliance audit entries'
        },
        {
          key: 'user-actions',
          title: 'User Actions',
          value: userActionsCount,
          prefix: <Users className="gba:h-4 gba:w-4" />,
          color: '#10b981',
          description: 'Actions performed by compliance users'
        },
        {
          key: 'unique-flows',
          title: 'Compliance Flows',
          value: auditData.summary.uniqueTemplates || 0,
          prefix: <Activity className="gba:h-4 gba:w-4" />,
          color: '#8b5cf6',
          description: 'Unique compliance flows audited'
        },
        {
          key: 'unique-users',
          title: 'Active Users',
          value: auditData.summary.uniqueUsers,
          prefix: <Users className="gba:h-4 gba:w-4" />,
          color: '#f59e0b',
          description: 'Users active in compliance processes'
        }
      ]
    : []

  if (isLoading || filterOptionsLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        <h3>Error Loading Compliance Audit Data</h3>
        <p>{error instanceof Error ? error.message : 'Failed to load compliance audit data'}</p>
        <Button onClick={refetch} className="gba:mt-2">
          Retry
        </Button>
      </Alert>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
            <Shield className="gba:h-6 gba:w-6 gba:text-blue-600" />
            Compliance Audit Trail
          </h2>
          <p className="gba:text-gray-600">
            Comprehensive audit logs for all compliance processes with filtering and export
          </p>
        </div>

        {/* Export buttons */}
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            onClick={() => handleComplianceExport('csv')}
            disabled={exportLoading}
            variant="outline"
            className="gba:flex gba:items-center gba:gap-2"
          >
            <Download className="gba:h-4 gba:w-4" />
            Export Compliance CSV
          </Button>
          <Button
            onClick={() => handleComplianceExport('json')}
            disabled={exportLoading}
            variant="outline"
            className="gba:flex gba:items-center gba:gap-2"
          >
            <FileText className="gba:h-4 gba:w-4" />
            Export Compliance JSON
          </Button>
          <Button onClick={refetch} variant="outline" className="gba:flex gba:items-center gba:gap-2">
            <RefreshCw className="gba:h-4 gba:w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Compliance Summary Statistics */}
      <WidgetGroup
        widgets={summaryWidgets}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeletonCount={4}
        emptyText="No compliance audit data available"
        data-testid={`${prefixDataTestId}-summary-widgets`}
      />

      {/* Compliance-specific Filters */}
      <div className="gba:flex gba:items-center gba:gap-4 gba:mb-4">
        {/* User filter */}
        <select
          value={filters.userId || ''}
          onChange={e => handleFilterChange('userId', e.target.value || undefined)}
          className="gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:text-sm gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500"
        >
          <option value="">All Compliance Users</option>
          {filterOptions?.users.map(user => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>

        {/* Action filter */}
        <select
          value={filters.action || ''}
          onChange={e => handleFilterChange('action', e.target.value || undefined)}
          className="gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:text-sm gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500"
        >
          <option value="">All Actions</option>
          {filterOptions?.actions.map(action => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filters.status || ''}
          onChange={e => handleFilterChange('status', e.target.value || undefined)}
          className="gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:text-sm gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {filterOptions?.statuses.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        {/* Date Range */}
        <div className="gba:flex gba:items-center gba:gap-2">
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={e => handleFilterChange('startDate', e.target.value || undefined)}
            className="gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:text-sm gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500"
          />
          <span className="gba:text-gray-500">to</span>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={e => handleFilterChange('endDate', e.target.value || undefined)}
            className="gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:text-sm gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500"
          />
        </div>

        {/* Flow ID search */}
        <input
          type="text"
          placeholder="Search by Flow ID"
          value={filters.flowId || ''}
          onChange={e => handleFilterChange('flowId', e.target.value || undefined)}
          className="gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:text-sm gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500"
        />
      </div>

      {/* Compliance Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:justify-between">
            <span className="gba:flex gba:items-center gba:gap-2">
              <Search className="gba:h-5 gba:w-5" />
              Compliance Audit Logs
            </span>
            <span className="gba:text-sm gba:font-normal gba:text-gray-500">
              {auditData ? `${auditData.pagination.total} compliance entries` : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditData?.entries.length ? (
            <>
              {/* Table */}
              <div className="gba:overflow-x-auto">
                <table className="gba:w-full gba:border-collapse">
                  <thead>
                    <tr className="gba:border-b gba:border-gray-200">
                      <th className="gba:text-left gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">Timestamp</th>
                      <th className="gba:text-left gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">User</th>
                      <th className="gba:text-left gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">Task Type</th>
                      <th className="gba:text-left gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">Action</th>
                      <th className="gba:text-left gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">
                        Compliance Flow
                      </th>
                      <th className="gba:text-left gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">Task</th>
                      <th className="gba:text-left gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900">
                        Status Transition
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.entries.map(entry => (
                      <tr key={entry.id} className="gba:border-b gba:border-gray-100 gba:hover:bg-gray-50">
                        <td className="gba:py-3 gba:px-4 gba:text-sm gba:text-gray-900">
                          {formatTimestamp(entry.timestamp)}
                        </td>
                        <td className="gba:py-3 gba:px-4 gba:text-sm">
                          <div>
                            <div className="gba:font-medium gba:text-gray-900">
                              {filterOptions?.users.find(u => u.id === entry.userId)?.name || entry.userId}
                            </div>
                            <div className="gba:text-xs gba:text-gray-500">{entry.userId}</div>
                          </div>
                        </td>
                        <td className="gba:py-3 gba:px-4">
                          <div>
                            <span
                              className={`gba:inline-flex gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium ${getTaskTypeColor(entry.taskType)}`}
                            >
                              {formatTaskType(entry.taskType)}
                            </span>
                          </div>
                        </td>
                        <td className="gba:py-3 gba:px-4">
                          <div>
                            <span
                              className={`gba:inline-flex gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium ${getActionColor(entry.action)}`}
                            >
                              {entry.action}
                            </span>
                            {entry.assignmentChange && (
                              <div className="gba:mt-1 gba:text-xs gba:text-gray-500">
                                {filterOptions?.users.find(u => u.id === entry.assignmentChange?.from)?.name ||
                                  entry.assignmentChange.from}
                                {' → '}
                                {filterOptions?.users.find(u => u.id === entry.assignmentChange?.to)?.name ||
                                  entry.assignmentChange.to}
                                {entry.assignmentChange.reason && (
                                  <div className="gba:text-xs gba:text-gray-400">{entry.assignmentChange.reason}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="gba:py-3 gba:px-4 gba:text-sm">
                          <div>
                            <div
                              className="gba:font-medium gba:text-gray-900 gba:truncate gba:max-w-32"
                              title={entry.flowName}
                            >
                              {entry.flowName}
                            </div>
                            <div
                              className="gba:text-xs gba:text-gray-500 gba:truncate gba:max-w-32"
                              title={entry.flowId}
                            >
                              {entry.flowId}
                            </div>
                          </div>
                        </td>
                        <td className="gba:py-3 gba:px-4 gba:text-sm">
                          <div>
                            <div
                              className="gba:font-medium gba:text-gray-900 gba:truncate gba:max-w-32"
                              title={entry.taskName}
                            >
                              {entry.taskName}
                            </div>
                            <div className="gba:text-xs gba:text-gray-500 gba:truncate gba:max-w-32">
                              {entry.taskType} - {entry.taskId}
                            </div>
                          </div>
                        </td>
                        <td className="gba:py-3 gba:px-4">
                          <div className="gba:space-y-1">
                            {/* Show status transition if we have both previous and new status */}
                            {entry.previousStatus && entry.newStatus && entry.previousStatus !== entry.newStatus ? (
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <span
                                  className={`gba:inline-flex gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium ${getStatusColor(entry.previousStatus)}`}
                                >
                                  {entry.previousStatus}
                                </span>
                                <span className="gba:text-gray-400">→</span>
                                <span
                                  className={`gba:inline-flex gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium ${getStatusColor(entry.newStatus)}`}
                                >
                                  {entry.newStatus}
                                </span>
                              </div>
                            ) : (
                              <span
                                className={`gba:inline-flex gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium ${getStatusColor(entry.status)}`}
                              >
                                {entry.status}
                              </span>
                            )}
                            {entry.details?.reason && (
                              <div className="gba:text-xs gba:text-gray-500">{entry.details.reason}</div>
                            )}
                            {entry.details?.executedBy && entry.details.executedBy !== entry.userId && (
                              <div className="gba:text-xs gba:text-gray-400">
                                Executed by:{' '}
                                {filterOptions?.users.find(u => u.id === entry.details?.executedBy)?.name ||
                                  entry.details.executedBy}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="gba:flex gba:items-center gba:justify-between gba:mt-6">
                  <div className="gba:text-sm gba:text-gray-700">
                    Showing {(filters.offset || 0) + 1} to{' '}
                    {Math.min((filters.offset || 0) + (filters.limit || 50), auditData.pagination.total)} of{' '}
                    {auditData.pagination.total} compliance entries
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Button
                      onClick={() => handlePageChange((filters.offset || 0) - (filters.limit || 50))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <span className="gba:text-sm gba:text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      onClick={() => handlePageChange((filters.offset || 0) + (filters.limit || 50))}
                      disabled={!auditData.pagination.hasMore}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              No compliance audit logs found matching the current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
