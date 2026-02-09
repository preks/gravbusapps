import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  DataDisplay,
  DataTable,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { ExecutionRun, ExecutionRunStatus } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { useExecutionRuns } from '../../hooks/useExecutionRuns'
import translations from '../../_i18n'
import { ExecutionDetailView } from './ExecutionDetailView'

type ExecutionRunRow = ExecutionRun & { id: string }

const toStatusVariant = (status: string): 'success' | 'default' | 'destructive' | 'outline' => {
  if (status === 'success') return 'success'
  if (status === 'error') return 'destructive'
  if (status === 'running') return 'default'
  return 'outline'
}

/** Cell renderers extracted outside component to avoid re-creation on each render. */
const PromptNameCell = ({ row }: any) => (
  <span className="gba:truncate">{row.original?.promptName || row.original?.promptId || '—'}</span>
)

const DurationMsCell = ({ row }: any) => {
  const ms = row.original?.durationMs
  return <span>{typeof ms === 'number' ? `${ms} ms` : '—'}</span>
}

const ToolCallsCountCell = ({ row }: any) => {
  const n = row.original?.toolCallsCount ?? 0
  return <span>{n}</span>
}

const PolicyIdsCell = ({ row }: any) => {
  const ids: string[] = row.original?.policyRootIds || []
  if (!ids.length) return <span className="gba:text-muted-foreground">—</span>
  return (
    <div className="gba:flex gba:flex-wrap gba:gap-1">
      {ids.slice(0, 2).map((id: string) => (
        <Badge key={id} variant="outline" className="gba:text-[10px]">
          {id}
        </Badge>
      ))}
      {ids.length > 2 && (
        <Badge variant="outline" className="gba:text-[10px]">
          +{ids.length - 2}
        </Badge>
      )}
    </div>
  )
}

const StartedAtMsCell = ({ row }: any) => {
  const v = row.original?.startedAt
  return <span className="gba:text-xs">{v ? new Date(v).toLocaleString() : '—'}</span>
}

export type MonitoringTabProps = BusinessAppContextProps

export const MonitoringTab: React.FC<MonitoringTabProps> = context => {
  const { t } = useTranslation(translations)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [status, setStatus] = useState<ExecutionRunStatus | 'all'>('all')
  const [policyRootId, setPolicyRootId] = useState('')
  const [promptId, setPromptId] = useState('')
  const [tag, setTag] = useState('')
  const [toolName, setToolName] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)

  // Initial filters from URL (deep links from Policy Control Center)
  useEffect(() => {
    const url = new URL(globalThis.location?.href || 'http://localhost')
    const urlPolicyRootId = url.searchParams.get('policyRootId') || ''
    const urlPromptId = url.searchParams.get('promptId') || ''
    const urlTag = url.searchParams.get('tag') || ''
    const urlToolName = url.searchParams.get('toolName') || ''
    const urlCreatedAtFrom = url.searchParams.get('createdAtFrom') || ''
    const urlCreatedAtTo = url.searchParams.get('createdAtTo') || ''
    const urlStatus = (url.searchParams.get('status') || '').toLowerCase()
    const urlExecutionId = url.searchParams.get('executionId')

    if (urlPolicyRootId) setPolicyRootId(urlPolicyRootId)
    if (urlPromptId) setPromptId(urlPromptId)
    if (urlTag) setTag(urlTag)
    if (urlToolName) setToolName(urlToolName)
    if (urlCreatedAtFrom) setDateFrom(urlCreatedAtFrom.slice(0, 10))
    if (urlCreatedAtTo) setDateTo(urlCreatedAtTo.slice(0, 10))
    if (urlStatus === 'success' || urlStatus === 'error' || urlStatus === 'running') setStatus(urlStatus as any)

    if (urlExecutionId) {
      setSelectedExecutionId(urlExecutionId)
    }
  }, [])

  const query = useMemo(
    () => ({
      policyRootId: policyRootId.trim() || null,
      promptId: promptId.trim() || null,
      tag: tag.trim() || null,
      toolName: toolName.trim() || null,
      createdAtFrom: dateFrom ? `${dateFrom}T00:00:00.000Z` : null,
      createdAtTo: dateTo ? `${dateTo}T23:59:59.999Z` : null,
      status: status === 'all' ? null : status,
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      returnTotalRecords: true
    }),
    [policyRootId, promptId, tag, toolName, dateFrom, dateTo, status, pagination.pageSize, pagination.pageIndex]
  )

  const { runs, total, isLoading, error, reload } = useExecutionRuns(context, query)

  const data: ExecutionRunRow[] = useMemo(() => (runs || []).map(r => ({ ...r, id: r.executionId })), [runs])

  const openDetails = useCallback((executionId: string) => {
    setSelectedExecutionId(executionId)
  }, [])

  const closeDetails = useCallback(() => {
    setSelectedExecutionId(null)
  }, [])

  const StatusCellRenderer = useCallback(
    ({ row }: any) => {
      const v = row.original?.status || 'unknown'
      const isTest = (row.original?.tags || []).includes('execution:test')
      return (
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1">
          <Badge variant={toStatusVariant(v)} data-testid={`prompt-manager-run-status-${row.original?.executionId}`}>
            {String(v)}
          </Badge>
          {isTest && (
            <Badge
              variant="info"
              className="gba:text-[10px]"
              data-testid={`prompt-manager-run-test-${row.original?.executionId}`}
            >
              {t('tag-execution-test')}
            </Badge>
          )}
        </div>
      )
    },
    [t]
  )

  const columns = useMemo(
    () => [
      {
        header: t('monitoring-column-status'),
        accessorKey: 'status',
        cell: StatusCellRenderer,
        size: 150
      },
      {
        header: t('monitoring-column-prompt'),
        accessorKey: 'promptName',
        cell: PromptNameCell
      },
      {
        header: t('monitoring-column-duration'),
        accessorKey: 'durationMs',
        cell: DurationMsCell,
        size: 140
      },
      {
        header: t('monitoring-column-tools'),
        accessorKey: 'toolCallsCount',
        cell: ToolCallsCountCell,
        size: 110
      },
      {
        header: t('monitoring-column-policies'),
        accessorKey: 'policyRootIds',
        cell: PolicyIdsCell
      },
      {
        header: t('monitoring-column-started'),
        accessorKey: 'startedAt',
        cell: StartedAtMsCell,
        size: 200
      }
    ],
    [t, StatusCellRenderer]
  )

  const onApplyFilters = useCallback(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }))
    reload({ ...query, offset: 0 }).catch(() => undefined)
  }, [reload, query])

  const onClearFilters = useCallback(() => {
    setStatus('all')
    setPolicyRootId('')
    setPromptId('')
    setTag('')
    setToolName('')
    setDateFrom('')
    setDateTo('')
    setPagination(p => ({ ...p, pageIndex: 0 }))
    reload({
      status: null,
      policyRootId: null,
      promptId: null,
      tag: null,
      toolName: null,
      createdAtFrom: null,
      createdAtTo: null,
      offset: 0
    }).catch(() => undefined)
  }, [reload])

  const handlePaginationChange = useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      setPagination(newPagination)
      reload({
        ...query,
        limit: newPagination.pageSize,
        offset: newPagination.pageIndex * newPagination.pageSize
      }).catch(() => undefined)
    },
    [reload, query]
  )

  if (selectedExecutionId) {
    return <ExecutionDetailView {...context} executionId={selectedExecutionId} onBack={closeDetails} />
  }

  return (
    <div className="gba:space-y-4" data-testid="prompt-manager-monitoring">
      <div
        className="gba:grid gba:grid-cols-1 gba:md:grid-cols-12 gba:gap-2 gba:items-end"
        data-testid="prompt-manager-monitoring-filters"
      >
        <div className="gba:md:col-span-3">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('monitoring-filter-status')}</div>
          <Select value={status} onValueChange={v => setStatus(v as any)}>
            <SelectTrigger data-testid="prompt-manager-monitoring-filter-status">
              <SelectValue placeholder={t('monitoring-filter-status-placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('monitoring-filter-status-all')}</SelectItem>
              <SelectItem value="success">{t('monitoring-filter-status-success')}</SelectItem>
              <SelectItem value="error">{t('monitoring-filter-status-error')}</SelectItem>
              <SelectItem value="running">{t('monitoring-filter-status-running')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="gba:md:col-span-3">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('monitoring-filter-policy-root-id')}</div>
          <Input
            value={policyRootId}
            onChange={e => setPolicyRootId(e.target.value)}
            placeholder={t('monitoring-filter-policy-root-id-placeholder')}
            data-testid="prompt-manager-monitoring-filter-policyRootId"
          />
        </div>

        <div className="gba:md:col-span-3">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('monitoring-filter-prompt-id')}</div>
          <Input
            value={promptId}
            onChange={e => setPromptId(e.target.value)}
            placeholder={t('monitoring-filter-prompt-id-placeholder')}
            data-testid="prompt-manager-monitoring-filter-promptId"
          />
        </div>

        <div className="gba:md:col-span-3">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('monitoring-filter-tag')}</div>
          <Input
            value={tag}
            onChange={e => setTag(e.target.value)}
            placeholder={t('monitoring-filter-tag-placeholder')}
            data-testid="prompt-manager-monitoring-filter-tag"
          />
        </div>

        <div className="gba:md:col-span-4">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('monitoring-filter-tool-name')}</div>
          <Input
            value={toolName}
            onChange={e => setToolName(e.target.value)}
            placeholder={t('monitoring-filter-tool-name-placeholder')}
            data-testid="prompt-manager-monitoring-filter-toolName"
          />
        </div>

        <div className="gba:md:col-span-4">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('monitoring-filter-date-from')}</div>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            data-testid="prompt-manager-monitoring-filter-dateFrom"
          />
        </div>

        <div className="gba:md:col-span-4">
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('monitoring-filter-date-to')}</div>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            data-testid="prompt-manager-monitoring-filter-dateTo"
          />
        </div>

        <div className="gba:md:col-span-12 gba:flex gba:flex-wrap gba:gap-2 gba:justify-end">
          <Button variant="outline" onClick={onClearFilters} data-testid="prompt-manager-monitoring-clear">
            {t('monitoring-clear')}
          </Button>
          <Button variant="default" onClick={onApplyFilters} data-testid="prompt-manager-monitoring-apply">
            {t('monitoring-apply')}
          </Button>
        </div>
      </div>

      <DataDisplay
        titleSections={[
          {
            id: 'runs',
            label: t('monitoring-title'),
            metadata: { count: total }
          }
        ]}
        currentSection="runs"
        toolbarDensity="comfortable"
      >
        <DataTable<ExecutionRunRow>
          data={data}
          columns={columns as any}
          loading={isLoading}
          error={error}
          onRowClick={(row: ExecutionRunRow) => openDetails(row.executionId)}
          tableLayout="fixed"
          enablePagination
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          totalCount={total}
          rowsPerPageOptions={[10, 20, 50, 100]}
          emptyMessage={t('monitoring-empty')}
          data-testid="prompt-manager-monitoring-table"
        />
      </DataDisplay>
    </div>
  )
}

export default MonitoringTab
