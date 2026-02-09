import React, { useCallback, useMemo, useState } from 'react'
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

export interface ExpertMonitoringTabProps extends BusinessAppContextProps {
  promptId: string
}

export const ExpertMonitoringTab: React.FC<ExpertMonitoringTabProps> = ({ promptId, ...context }) => {
  const { t } = useTranslation(translations)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [status, setStatus] = useState<ExecutionRunStatus | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)

  const query = useMemo(
    () => ({
      promptId,
      status: status === 'all' ? null : status,
      toolName: null,
      createdAtFrom: dateFrom ? `${dateFrom}T00:00:00.000Z` : null,
      createdAtTo: dateTo ? `${dateTo}T23:59:59.999Z` : null,
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      returnTotalRecords: true
    }),
    [promptId, status, dateFrom, dateTo, pagination.pageIndex, pagination.pageSize]
  )

  const { runs, total, isLoading, error, reload } = useExecutionRuns(context, query)

  const data: ExecutionRunRow[] = useMemo(() => (runs || []).map(r => ({ ...r, id: r.executionId })), [runs])

  const openDetails = useCallback((executionId: string) => {
    setSelectedExecutionId(executionId)
  }, [])

  const closeDetails = useCallback(() => {
    setSelectedExecutionId(null)
  }, [])

  const columns = useMemo(
    () => [
      {
        header: t('monitoring-column-started'),
        accessorKey: 'startedAt',
        cell: ({ row }: any) => {
          const v = row.original?.startedAt
          return <span className="gba:text-xs">{v ? new Date(v).toLocaleString() : '—'}</span>
        },
        size: 200
      },
      {
        header: t('monitoring-column-duration'),
        accessorKey: 'durationMs',
        cell: ({ row }: any) => {
          const ms = row.original?.durationMs
          return <span>{typeof ms === 'number' ? `${ms} ms` : '—'}</span>
        },
        size: 140
      },
      {
        header: t('monitoring-column-tools'),
        accessorKey: 'toolCallsCount',
        cell: ({ row }: any) => <span>{row.original?.toolCallsCount ?? 0}</span>,
        size: 110
      },
      {
        header: t('monitoring-column-status'),
        accessorKey: 'status',
        cell: ({ row }: any) => {
          const v = row.original?.status || 'unknown'
          const isTest = (row.original?.tags || []).includes('execution:test')
          return (
            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1">
              <Badge variant={toStatusVariant(v)} data-testid={`expert-run-status-${row.original?.executionId}`}>
                {String(v)}
              </Badge>
              {isTest && (
                <Badge
                  variant="info"
                  className="gba:text-[10px]"
                  data-testid={`expert-run-test-${row.original?.executionId}`}
                >
                  {t('tag-execution-test')}
                </Badge>
              )}
            </div>
          )
        },
        size: 150
      }
    ],
    [t]
  )

  const onApply = useCallback(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }))
    reload({ ...query, offset: 0 }).catch(() => undefined)
  }, [reload, query])

  const onClear = useCallback(() => {
    setStatus('all')
    setDateFrom('')
    setDateTo('')
    setPagination(p => ({ ...p, pageIndex: 0 }))
    reload({
      promptId,
      status: null,
      toolName: null,
      createdAtFrom: null,
      createdAtTo: null,
      offset: 0
    }).catch(() => undefined)
  }, [reload, promptId])

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
    <div className="gba:space-y-4" data-testid="expert-monitoring-tab">
      <div className="gba:flex gba:flex-wrap gba:items-end gba:gap-3" data-testid="expert-monitoring-filters">
        <div>
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('monitoring-filter-status')}</div>
          <Select value={status} onValueChange={v => setStatus(v as any)}>
            <SelectTrigger className="gba:w-[120px]" data-testid="expert-monitoring-filter-status">
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

        <div className="gba:flex gba:items-end gba:gap-2">
          <div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('monitoring-filter-date-from')}</div>
            <Input
              type="date"
              className="gba:w-[150px]"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              data-testid="expert-monitoring-filter-dateFrom"
            />
          </div>
          <span className="gba:text-muted-foreground gba:pb-2">—</span>
          <div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('monitoring-filter-date-to')}</div>
            <Input
              type="date"
              className="gba:w-[150px]"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              data-testid="expert-monitoring-filter-dateTo"
            />
          </div>
        </div>

        <Button variant="default" size="sm" onClick={onApply} data-testid="expert-monitoring-apply">
          {t('monitoring-apply')}
        </Button>
        <Button variant="outline" size="sm" onClick={onClear} data-testid="expert-monitoring-clear">
          {t('monitoring-clear')}
        </Button>
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
        enableSearch={false}
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
          data-testid="expert-monitoring-table"
        />
      </DataDisplay>
    </div>
  )
}

export default ExpertMonitoringTab
