import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { Activity, Database, Download, FileText, RefreshCw, Shield, Users } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDisplayText } from '@/common/utils/displayText'
import translations from '../../_i18n'
import { useAuditLogs, useAuditFilterOptions, exportAuditLogs, AuditFilters } from '../../hooks/useAuditData'
import { useResolvedUserNames } from '../../hooks/useResolvedUserNames'
import { SuccessEmptyState, SuccessErrorState, SuccessKpiGrid, SuccessStatusBadge, SuccessTabPage } from '../shared'
import { formatDateTime, formatEnumLabel, formatStatusLabel } from '../../utils/formatters'
import { getSuccessTimeframeDateRange, type SuccessTimeframe } from '../../utils/timeframe'
import type { FlowSuccessAuditScope, FlowSuccessDrilldownTarget } from '../../shellState'

interface AuditTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  timeframe?: SuccessTimeframe
  templateId?: string
  showControls?: boolean
  section?: string
  auditScope?: FlowSuccessAuditScope
  onDrilldown?: (target: FlowSuccessDrilldownTarget) => void
  headerActions?: React.ReactNode
}

export const AuditTab: React.FC<AuditTabProps> = ({
  prefixDataTestId = 'audit-tab',
  accessToken,
  timeframe,
  templateId,
  section,
  auditScope = 'all',
  onDrilldown,
  headerActions
}) => {
  const { t } = useTranslation(translations)
  const timeframeRange = useMemo(
    () => (timeframe ? getSuccessTimeframeDateRange(timeframe) : { startDate: undefined, endDate: undefined }),
    [timeframe]
  )
  const [filters, setFilters] = useState<AuditFilters>({
    templateId: templateId && templateId !== 'ALL' ? templateId : undefined,
    startDate: timeframeRange.startDate,
    endDate: timeframeRange.endDate,
    limit: 50,
    offset: 0
  })
  const [exportLoading, setExportLoading] = useState(false)
  const [scope, setScope] = useState<FlowSuccessAuditScope>(auditScope)

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

  useEffect(() => {
    setScope(auditScope)
  }, [auditScope])

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      templateId: templateId && templateId !== 'ALL' ? templateId : undefined,
      startDate: timeframeRange.startDate,
      endDate: timeframeRange.endDate,
      offset: 0
    }))
  }, [templateId, timeframeRange.endDate, timeframeRange.startDate])

  useEffect(() => {
    if (!section) return
    const element = document.getElementById(section)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [section])

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
  const auditUserIds = useMemo(
    () => filteredEntries.filter(entry => !entry.userName).map(entry => entry.userId),
    [filteredEntries]
  )
  const resolvedUserNames = useResolvedUserNames(accessToken, auditUserIds)
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
      title={t('governance-subview-audit')}
      description={t('audit-description')}
      actions={headerActions}
      data-testid={prefixDataTestId}
    >
      <div id="audit-summary">
        <SuccessKpiGrid
          items={summaryItems}
          isLoading={isLoading || filterOptionsLoading}
          emptyTitle={t('state-empty')}
          emptyDescription={t('audit-description')}
          data-testid={`${prefixDataTestId}-summary`}
        />
      </div>

      <div
        className="gba:flex gba:flex-col gba:gap-3 gba:xl:flex-row gba:xl:items-start gba:xl:justify-between"
        data-testid={`${prefixDataTestId}-filters-row`}
      >
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3">
          <Select
            value={filters.userId || 'ALL'}
            onValueChange={value => handleFilterChange('userId', value === 'ALL' ? undefined : value)}
          >
            <SelectTrigger className="gba:w-36 gba:shrink-0" data-testid={`${prefixDataTestId}-user-select`}>
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
            value={scope}
            onValueChange={value => {
              const nextScope = value as 'all' | 'system' | 'user'
              setScope(nextScope)
              onDrilldown?.({
                primaryView: 'governance',
                governanceView: 'audit',
                section: 'audit-results',
                auditScope: nextScope
              })
            }}
          >
            <SelectTrigger className="gba:w-36 gba:shrink-0" data-testid={`${prefixDataTestId}-activity-select`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('audit-scope-all')}</SelectItem>
              <SelectItem value="user">{t('audit-scope-user')}</SelectItem>
              <SelectItem value="system">{t('audit-scope-system')}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.action || 'ALL'}
            onValueChange={value => handleFilterChange('action', value === 'ALL' ? undefined : value)}
          >
            <SelectTrigger className="gba:w-36 gba:shrink-0" data-testid={`${prefixDataTestId}-action-select`}>
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
            <SelectTrigger className="gba:w-36 gba:shrink-0" data-testid={`${prefixDataTestId}-status-select`}>
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
        </div>
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3 gba:xl:justify-end">
          <Input
            className="gba:w-40 gba:shrink-0"
            type="date"
            value={filters.startDate || ''}
            onChange={event => handleFilterChange('startDate', event.target.value || undefined)}
            data-testid={`${prefixDataTestId}-start-date-input`}
          />
          <Input
            className="gba:w-40 gba:shrink-0"
            type="date"
            value={filters.endDate || ''}
            onChange={event => handleFilterChange('endDate', event.target.value || undefined)}
            data-testid={`${prefixDataTestId}-end-date-input`}
          />
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('action-refresh')}
          </Button>
        </div>
      </div>

      <Card className="gba:border-border gba:bg-card" id="audit-results">
        <CardContent className="gba:flex gba:flex-col gba:gap-5 gba:p-5">
          <div className="gba:flex gba:flex-col gba:gap-3 gba:border-b gba:border-border gba:pb-4 gba:md:flex-row gba:md:items-center gba:md:justify-between">
            <span className="gba:text-sm gba:text-muted-foreground">
              {filteredEntries.length} {t('audit-events-in-window')}
            </span>
            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3">
              <Button
                variant="outline"
                onClick={() => handleExport('csv')}
                disabled={exportLoading || !filteredEntries.length}
              >
                <Download className="gba:mr-2 gba:h-4 gba:w-4" />
                {t('action-export-csv')}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('json')}
                disabled={exportLoading || !filteredEntries.length}
              >
                <FileText className="gba:mr-2 gba:h-4 gba:w-4" />
                {t('action-export-json')}
              </Button>
            </div>
          </div>
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
                        <td className="gba:p-3 gba:text-sm gba:text-foreground">{formatDateTime(entry.timestamp)}</td>
                        <td className="gba:p-3 gba:text-sm gba:text-foreground">
                          {entry.userName || resolvedUserNames[entry.userId] || entry.userId}
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
        </CardContent>
      </Card>
    </SuccessTabPage>
  )
}
