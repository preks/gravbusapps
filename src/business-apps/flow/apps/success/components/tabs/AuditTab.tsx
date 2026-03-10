import React, { useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { Activity, Database, Download, FileText, Shield, Users } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDisplayText } from '@/common/utils/displayText'
import translations from '../../_i18n'
import { useAuditLogs, useAuditFilterOptions, exportAuditLogs, AuditFilters } from '../../hooks/useAuditData'
import { SuccessEmptyState, SuccessErrorState, SuccessKpiGrid, SuccessStatusBadge, SuccessTabPage } from '../shared'
import { formatDateTime, formatEnumLabel, formatStatusLabel } from '../../utils/formatters'

interface AuditTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const AuditTab: React.FC<AuditTabProps> = ({ prefixDataTestId = 'audit-tab', accessToken }) => {
  const { t } = useTranslation(translations)
  const [filters, setFilters] = useState<AuditFilters>({
    limit: 50,
    offset: 0
  })
  const [exportLoading, setExportLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline')
  const [scope, setScope] = useState<'all' | 'system' | 'user'>('all')

  const { data: auditData, isLoading, error, refetch } = useAuditLogs(filters, accessToken)
  const { data: filterOptions, isLoading: filterOptionsLoading } = useAuditFilterOptions(accessToken)

  const handleFilterChange = (key: keyof AuditFilters, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0 // Reset to first page when filters change
    }))
  }

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }))
  }

  const handleExport = async (format: 'csv' | 'json') => {
    setExportLoading(true)
    try {
      await exportAuditLogs(filters, format, accessToken)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExportLoading(false)
    }
  }

  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1
  const totalPages = auditData ? Math.ceil(auditData.pagination.total / (filters.limit || 50)) : 0

  const userActionsCount = auditData?.summary?.actionBreakdown
    ? Object.entries(auditData.summary.actionBreakdown)
        .filter(([action]) => action !== 'SYSTEM')
        .reduce((total, [, count]) => total + count, 0)
    : 0

  const summaryItems = auditData?.summary
    ? [
        {
          id: 'total-entries',
          label: t('audit-total-entries'),
          value: String(auditData.summary.totalEntries),
          description: t('audit-total-entries-description'),
          icon: <Database className="gba:h-5 gba:w-5" />
        },
        {
          id: 'user-actions',
          label: t('audit-user-actions'),
          value: String(userActionsCount),
          description: t('audit-user-actions-description'),
          icon: <Users className="gba:h-5 gba:w-5" />
        },
        {
          id: 'unique-flows',
          label: t('audit-unique-flows'),
          value: String(auditData.summary.uniqueFlows),
          description: t('audit-unique-flows-description'),
          icon: <Activity className="gba:h-5 gba:w-5" />
        },
        {
          id: 'unique-users',
          label: t('audit-unique-users'),
          value: String(auditData.summary.uniqueUsers),
          description: t('audit-unique-users-description'),
          icon: <Shield className="gba:h-5 gba:w-5" />
        }
      ]
    : []

  const filteredEntries = useMemo(() => {
    const entries = auditData?.entries || []
    if (scope === 'system') return entries.filter(entry => entry.action === 'SYSTEM')
    if (scope === 'user') return entries.filter(entry => entry.action !== 'SYSTEM')
    return entries
  }, [auditData?.entries, scope])

  if (error) {
    return (
      <SuccessErrorState
        title={t('state-error-title')}
        message={error instanceof Error ? error.message : t('state-error-title')}
        onRetry={refetch}
        retryLabel={t('action-retry')}
        data-testid={`${prefixDataTestId}-error`}
      />
    )
  }

  return (
    <SuccessTabPage
      title={t('audit-title')}
      description={t('audit-description')}
      actions={
        <>
          <Button variant="outline" onClick={() => handleExport('csv')} disabled={exportLoading}>
            <Download className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('action-export-csv')}
          </Button>
          <Button variant="outline" onClick={() => handleExport('json')} disabled={exportLoading}>
            <FileText className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('action-export-json')}
          </Button>
          <Button variant="outline" onClick={refetch}>
            {t('action-refresh')}
          </Button>
        </>
      }
      data-testid={prefixDataTestId}
    >
      <SuccessKpiGrid
        items={summaryItems}
        isLoading={isLoading || filterOptionsLoading}
        emptyTitle={t('state-empty')}
        emptyDescription={t('audit-description')}
        data-testid={`${prefixDataTestId}-summary`}
      />

      <Card className="gba:border-border gba:bg-card">
        <CardHeader className="gba:border-b gba:border-border">
          <CardTitle>{t('label-search')}</CardTitle>
          <CardDescription>{t('audit-description')}</CardDescription>
        </CardHeader>
        <CardContent className="gba:grid gba:grid-cols-1 gba:gap-3 gba:p-5 gba:md:grid-cols-2 gba:xl:grid-cols-5">
          <Select
            value={filters.userId || 'ALL'}
            onValueChange={value => handleFilterChange('userId', value === 'ALL' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('filter-all-users')}</SelectItem>
              {(filterOptions?.users || []).map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.action || 'ALL'}
            onValueChange={value => handleFilterChange('action', value === 'ALL' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('filter-all-actions')}</SelectItem>
              {(filterOptions?.actions || []).map(action => (
                <SelectItem key={action} value={action}>
                  {formatEnumLabel(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status || 'ALL'}
            onValueChange={value => handleFilterChange('status', value === 'ALL' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('filter-all-statuses')}</SelectItem>
              {(filterOptions?.statuses || []).map(status => (
                <SelectItem key={status} value={status}>
                  {formatStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filters.startDate || ''}
            onChange={event => handleFilterChange('startDate', event.target.value || undefined)}
          />
          <Input
            type="date"
            value={filters.endDate || ''}
            onChange={event => handleFilterChange('endDate', event.target.value || undefined)}
          />
          <Input
            className="gba:md:col-span-2 gba:xl:col-span-3"
            value={filters.flowId || ''}
            placeholder={t('placeholder-search-flow-id')}
            onChange={event => handleFilterChange('flowId', event.target.value || undefined)}
          />
          <Select value={scope} onValueChange={value => setScope(value as 'all' | 'system' | 'user')}>
            <SelectTrigger className="gba:md:col-span-2 gba:xl:col-span-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('audit-scope-all')}</SelectItem>
              <SelectItem value="user">{t('audit-scope-user')}</SelectItem>
              <SelectItem value="system">{t('audit-scope-system')}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="gba:border-border gba:bg-card">
        <CardHeader className="gba:border-b gba:border-border">
          <CardTitle>{scope === 'system' ? t('audit-latest-system-events') : t('audit-title')}</CardTitle>
          <CardDescription>
            {scope === 'system' ? t('audit-latest-system-events-description') : t('audit-description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="gba:p-5">
          <Tabs value={viewMode} onValueChange={value => setViewMode(value as 'timeline' | 'table')}>
            <TabsList className="gba:mb-4">
              <TabsTrigger value="timeline">{t('audit-view-timeline')}</TabsTrigger>
              <TabsTrigger value="table">{t('audit-view-table')}</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              {!filteredEntries.length ? (
                <SuccessEmptyState
                  title={t('state-empty')}
                  description={t('audit-no-entries')}
                  icon={<Activity className="gba:h-8 gba:w-8" />}
                />
              ) : (
                <div className="gba:flex gba:flex-col gba:gap-4">
                  {filteredEntries.map(entry => (
                    <div
                      key={entry.id}
                      className="gba:flex gba:gap-4 gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-4"
                    >
                      <div className="gba:flex gba:h-10 gba:w-10 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted">
                        <Activity className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                      </div>
                      <div className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:gap-1">
                        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                          <span className="gba:text-sm gba:font-medium gba:text-foreground">
                            {formatEnumLabel(entry.action)}
                          </span>
                          <SuccessStatusBadge status={entry.status} />
                        </div>
                        <span className="gba:text-sm gba:text-muted-foreground">
                          {formatDisplayText(entry.flowName, entry.flowId)}
                        </span>
                        <span className="gba:text-sm gba:text-muted-foreground">
                          {formatDisplayText(entry.taskName, entry.taskId)} · {entry.userName || entry.userId}
                        </span>
                        {entry.details?.reason ? (
                          <span className="gba:text-xs gba:text-muted-foreground">{entry.details.reason}</span>
                        ) : null}
                        <span className="gba:text-xs gba:text-muted-foreground">{formatDateTime(entry.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="table">
              {!filteredEntries.length ? (
                <SuccessEmptyState
                  title={t('state-empty')}
                  description={t('audit-no-entries')}
                  icon={<Database className="gba:h-8 gba:w-8" />}
                />
              ) : (
                <>
                  <div className="gba:overflow-x-auto">
                    <table className="gba:w-full gba:border-collapse">
                      <thead>
                        <tr className="gba:border-b gba:border-border">
                          <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('audit-timestamp')}</th>
                          <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('audit-user')}</th>
                          <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('audit-task-type')}</th>
                          <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('label-action')}</th>
                          <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('label-flow')}</th>
                          <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('audit-task')}</th>
                          <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">
                            {t('audit-status-transition')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEntries.map(entry => (
                          <tr key={entry.id} className="gba:border-b gba:border-border/60">
                            <td className="gba:p-3 gba:text-sm gba:text-foreground">
                              {formatDateTime(entry.timestamp)}
                            </td>
                            <td className="gba:p-3 gba:text-sm gba:text-foreground">
                              {entry.userName || entry.userId}
                            </td>
                            <td className="gba:p-3 gba:text-sm gba:text-foreground">
                              {formatEnumLabel(entry.stepType || entry.taskType)}
                            </td>
                            <td className="gba:p-3 gba:text-sm gba:text-foreground">{formatEnumLabel(entry.action)}</td>
                            <td className="gba:p-3 gba:text-sm gba:text-foreground">
                              {formatDisplayText(entry.flowName, entry.flowId)}
                            </td>
                            <td className="gba:p-3 gba:text-sm gba:text-foreground">
                              {formatDisplayText(entry.taskName, entry.taskId)}
                            </td>
                            <td className="gba:p-3">
                              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                                {entry.previousStatus && entry.newStatus && entry.previousStatus !== entry.newStatus ? (
                                  <>
                                    <SuccessStatusBadge status={entry.previousStatus} />
                                    <span className="gba:text-muted-foreground">→</span>
                                    <SuccessStatusBadge status={entry.newStatus} />
                                  </>
                                ) : (
                                  <SuccessStatusBadge status={entry.status} />
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 ? (
                    <div className="gba:flex gba:flex-col gba:gap-3 gba:pt-4 gba:md:flex-row gba:md:items-center gba:md:justify-between">
                      <span className="gba:text-sm gba:text-muted-foreground">
                        {currentPage} / {totalPages}
                      </span>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange((filters.offset || 0) - (filters.limit || 50))}
                          disabled={currentPage === 1}
                        >
                          {t('action-previous')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange((filters.offset || 0) + (filters.limit || 50))}
                          disabled={!auditData?.pagination.hasMore}
                        >
                          {t('action-next')}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </SuccessTabPage>
  )
}
