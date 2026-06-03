import { formatDateTime } from '@/common/utils/dateFormatter.ts'
import { Badge } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'

import type { CompensationAnalysisRun } from '../../../../types/compensationAnalysisRun.types'

type TranslateFn = (key: string) => string

const TABLE_HEADER_CLASS = 'gba:text-sm gba:font-medium gba:text-muted-foreground'
const TABLE_BODY = 'gba:text-sm gba:text-foreground'

const ANALYSIS_TYPE_LABEL_KEYS: Record<string, string> = {
  MARKET_BENCHMARK: 'compensation-analysis-run-type-market-benchmark',
  EQUITY_HEALTH_SCORE: 'compensation-analysis-run-type-equity-health-score',
  GAP_EXPLANATION: 'compensation-analysis-run-type-gap-explanation',
  COMPRESSION: 'compensation-analysis-run-type-compression',
  COMPANY_WIDE_PAY_EQUITY: 'compensation-analysis-run-type-company-wide-pay-equity'
}

function formatRunTimestamp(value: string | null): string {
  if (!value) {
    return '—'
  }
  return formatDateTime(value, 'de') || value
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'COMPLETED') {
    return 'default'
  }
  if (status === 'FAILED' || status === 'ERROR') {
    return 'destructive'
  }
  return 'secondary'
}

function columnHeader(t: TranslateFn, messageKey: string) {
  return function AnalysisRunColumnHeader() {
    return <span className={TABLE_HEADER_CLASS}>{t(messageKey)}</span>
  }
}

export function buildCompensationAnalysisRunsTableColumns(t: TranslateFn): ColumnDef<CompensationAnalysisRun>[] {
  return [
    {
      id: 'type',
      accessorKey: 'type',
      header: columnHeader(t, 'compensation-analysis-runs-col-type'),
      cell: ({ row }) => {
        const type = row.original.type
        const labelKey = ANALYSIS_TYPE_LABEL_KEYS[type]
        return <span className={TABLE_BODY}>{labelKey ? t(labelKey) : type}</span>
      },
      meta: { type: 'text' }
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: columnHeader(t, 'compensation-analysis-runs-col-status'),
      cell: ({ row }) => <Badge variant={getStatusBadgeVariant(row.original.status)}>{row.original.status}</Badge>,
      meta: { type: 'text' }
    },
    {
      id: 'requestedAt',
      accessorKey: 'requestedAt',
      header: columnHeader(t, 'compensation-analysis-runs-col-requested-at'),
      cell: ({ row }) => <span className={TABLE_BODY}>{formatRunTimestamp(row.original.requestedAt)}</span>,
      meta: { type: 'text' }
    },
    {
      id: 'completedAt',
      accessorKey: 'completedAt',
      header: columnHeader(t, 'compensation-analysis-runs-col-completed-at'),
      cell: ({ row }) => <span className={TABLE_BODY}>{formatRunTimestamp(row.original.completedAt)}</span>,
      meta: { type: 'text' }
    },
    {
      id: 'errorMessage',
      accessorKey: 'errorMessage',
      header: columnHeader(t, 'compensation-analysis-runs-col-error'),
      cell: ({ row }) => (
        <span className={`${TABLE_BODY} gba:text-muted-foreground`}>{row.original.errorMessage ?? '—'}</span>
      ),
      meta: { type: 'text' }
    }
  ]
}
