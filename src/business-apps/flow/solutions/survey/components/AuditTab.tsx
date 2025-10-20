import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Alert, Button } from '@newwork/nw-design-system'
import { Spinner } from '@newwork/nw-design-system'
import { ClipboardList, Download, Search, RefreshCw, FileText, Database, Users, Activity } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { useAuditFilterOptions, AuditFilters } from '../../../apps/success/hooks/useAuditData'
import { useSurveyAuditLogs } from '../hooks/useSurveyAuditData'

interface SurveyAuditFilters extends AuditFilters {
  // Survey-specific filter options
  surveyId?: string
  surveyType?: string
  responseId?: string
}

interface SurveyAuditTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const AuditTab: React.FC<SurveyAuditTabProps> = ({ prefixDataTestId = 'survey-audit-tab', accessToken }) => {
  // Filter state with survey tag pre-applied (handled in hook)
  const [filters, setFilters] = useState<SurveyAuditFilters>({
    limit: 50,
    offset: 0
  })

  // Loading states
  const [exportLoading, setExportLoading] = useState(false)

  // Fetch data with survey filtering
  const { data: auditData, isLoading, error, refetch } = useSurveyAuditLogs(filters, accessToken)
  const { data: filterOptions, isLoading: filterOptionsLoading } = useAuditFilterOptions(accessToken)

  // Handle filter changes
  const handleFilterChange = (key: keyof SurveyAuditFilters, value: string | number | undefined) => {
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

  // Handle survey-specific export
  const handleSurveyExport = async (format: 'csv' | 'json') => {
    setExportLoading(true)
    try {
      // Create CSV content from audit data
      const csvContent = generateAuditCSV(auditData?.entries || [])

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `survey-audit-log.${format}`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Survey audit export failed:', error)
    } finally {
      setExportLoading(false)
    }
  }

  const generateAuditCSV = (entries: any[]): string => {
    if (entries.length === 0) return 'No audit data available'

    const headers = ['Timestamp', 'Action', 'User', 'Survey', 'Details', 'IP Address']
    const csvHeaders = headers.join(',')

    const csvRows = entries.map(entry => {
      const values = [
        `"${formatTimestamp(entry.timestamp)}"`,
        `"${entry.action || 'N/A'}"`,
        `"${entry.userId || entry.user?.displayName || 'System'}"`,
        `"${entry.workflowName || entry.surveyName || 'N/A'}"`,
        `"${entry.details || entry.message || 'N/A'}"`,
        `"${entry.ipAddress || 'N/A'}"`
      ]
      return values.join(',')
    })

    return [csvHeaders, ...csvRows].join('\n')
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  // Format action with color for survey-specific actions
  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'SURVEY_SUBMITTED':
      case 'RESPONSE_SUBMITTED':
        return 'gba:text-green-600 gba:bg-green-100'
      case 'SURVEY_STARTED':
      case 'SURVEY_OPENED':
        return 'gba:text-blue-600 gba:bg-blue-100'
      case 'SURVEY_COMPLETED':
        return 'gba:text-emerald-600 gba:bg-emerald-100'
      case 'SURVEY_ABANDONED':
      case 'SURVEY_TIMEOUT':
        return 'gba:text-orange-600 gba:bg-orange-100'
      case 'SURVEY_CREATED':
        return 'gba:text-purple-600 gba:bg-purple-100'
      case 'SURVEY_LAUNCHED':
        return 'gba:text-cyan-600 gba:bg-cyan-100'
      case 'SURVEY_CLOSED':
        return 'gba:text-red-600 gba:bg-red-100'
      case 'PARTICIPANT_INVITED':
        return 'gba:text-indigo-600 gba:bg-indigo-100'
      case 'REMINDER_SENT':
        return 'gba:text-yellow-600 gba:bg-yellow-100'
      case 'SYSTEM':
        return 'gba:text-gray-600 gba:bg-gray-100'
      default:
        return 'gba:text-slate-600 gba:bg-slate-100'
    }
  }

  // Calculate summary statistics
  const totalLogs = auditData?.totalCount || 0
  const todayLogs =
    auditData?.entries?.filter(entry => {
      const entryDate = new Date(entry.timestamp)
      const today = new Date()
      return entryDate.toDateString() === today.toDateString()
    }).length || 0

  const surveyActions = auditData?.entries?.filter(entry => entry.action?.toLowerCase().includes('survey')).length || 0

  const responseActions =
    auditData?.entries?.filter(
      entry => entry.action?.toLowerCase().includes('response') || entry.action?.toLowerCase().includes('submit')
    ).length || 0

  // Widget configuration for audit statistics
  const widgets: WidgetItem[] = [
    {
      key: 'total-audit-logs',
      title: 'Total Audit Logs',
      value: totalLogs,
      prefix: <Database className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#3b82f6',
      description: 'All survey audit entries'
    },
    {
      key: 'today-logs',
      title: "Today's Activity",
      value: todayLogs,
      prefix: <Activity className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#16a34a',
      description: 'Audit logs from today'
    },
    {
      key: 'survey-actions',
      title: 'Survey Actions',
      value: surveyActions,
      prefix: <ClipboardList className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: '#9333ea',
      description: 'Survey management actions'
    },
    {
      key: 'response-actions',
      title: 'Response Actions',
      value: responseActions,
      prefix: <Users className="gba:h-5 gba:w-5 gba:text-orange-600" />,
      color: '#f59e0b',
      description: 'Survey response activities'
    }
  ]

  if (isLoading || filterOptionsLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid="survey-audit-tab-loading">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="survey-audit-tab-error">
        <div>
          <h3>Error Loading Survey Audit Data</h3>
          <p>{error}</p>
          <Button
            onClick={refetch}
            variant="secondary"
            className="gba:mt-2"
            data-testid="survey-audit-tab-retry-button"
          >
            <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">Survey Audit Trail</h2>
          <p className="gba:text-gray-600">Track survey activities, responses, and system events</p>
        </div>
        <div className="gba:flex gba:gap-2">
          <Button
            onClick={() => handleSurveyExport('csv')}
            variant="outline"
            size="sm"
            disabled={exportLoading}
            data-testid="survey-audit-tab-export-button"
          >
            {exportLoading ? (
              <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
            ) : (
              <Download className="gba:w-4 gba:h-4 gba:mr-2" />
            )}
            Export CSV
          </Button>
          <Button onClick={refetch} variant="outline" size="sm" data-testid="survey-audit-tab-refresh-button">
            <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Widgets */}
      <WidgetGroup widgets={widgets} isLoading={false} skeletonCount={4} data-testid="survey-audit-statistics" />

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FileText className="gba:h-5 gba:w-5" />
            Survey Audit Logs ({auditData?.entries?.length || 0} entries)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditData?.entries && auditData.entries.length > 0 ? (
            <div className="gba:overflow-x-auto">
              <table className="gba:w-full gba:border-collapse">
                <thead>
                  <tr className="gba:border-b gba:border-gray-200">
                    <th className="gba:text-left gba:p-3 gba:font-semibold">Timestamp</th>
                    <th className="gba:text-left gba:p-3 gba:font-semibold">Action</th>
                    <th className="gba:text-left gba:p-3 gba:font-semibold">User</th>
                    <th className="gba:text-left gba:p-3 gba:font-semibold">Survey</th>
                    <th className="gba:text-left gba:p-3 gba:font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditData.entries.map((entry: any, index: number) => (
                    <tr
                      key={entry.id || index}
                      className={`gba:border-b gba:border-gray-100 ${index % 2 === 0 ? 'gba:bg-gray-50' : ''}`}
                      data-testid={`survey-audit-entry-${index}`}
                    >
                      <td className="gba:p-3 gba:text-sm gba:font-mono">{formatTimestamp(entry.timestamp)}</td>
                      <td className="gba:p-3">
                        <span
                          className={`gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium ${getActionColor(entry.action || 'UNKNOWN')}`}
                        >
                          {entry.action || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="gba:p-3 gba:text-sm">{entry.userId || entry.user?.displayName || 'System'}</td>
                      <td className="gba:p-3 gba:text-sm">{entry.workflowName || entry.surveyName || 'N/A'}</td>
                      <td className="gba:p-3 gba:text-sm gba:max-w-xs gba:truncate">
                        {entry.details || entry.message || 'No details available'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              <FileText className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4 gba:text-gray-300" />
              <p>No audit logs found</p>
              <p className="gba:text-sm">Survey activities will appear here once surveys are created and used</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {auditData?.totalCount && auditData.totalCount > filters.limit && (
        <div className="gba:flex gba:justify-center gba:mt-6">
          <div className="gba:flex gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.offset === 0}
              onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
              data-testid="survey-audit-tab-previous-button"
            >
              Previous
            </Button>
            <span className="gba:flex gba:items-center gba:px-3 gba:text-sm">
              {filters.offset + 1} - {Math.min(filters.offset + filters.limit, auditData.totalCount)} of{' '}
              {auditData.totalCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.offset + filters.limit >= auditData.totalCount}
              onClick={() => handlePageChange(filters.offset + filters.limit)}
              data-testid="survey-audit-tab-next-button"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
