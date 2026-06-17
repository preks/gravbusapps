import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@newwork/nw-design-system'
import { formatCurrency } from '../../utils/currency'
import { getTransactionStatusLabel } from '../../utils/billingLabels'
import { balanceLabel, resolveTransactionPartyName } from '../utils/ledgerNames'
import { formatDate } from '../../utils/date'
import type { Ledger, LedgerBalance, LedgerTransaction } from '../network/ledgerAdminClient'

type TranslateFn = (key: string) => string

/** Render a primary name with the technical id as a muted, truncated subtitle. */
function NameWithId({ name, id }: Readonly<{ name: string; id: string }>) {
  const showId = Boolean(id) && id !== name
  return (
    <div className="gba:flex gba:flex-col">
      <span className="gba:font-medium">{name || '—'}</span>
      {showId && (
        <span className="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-[220px]" title={id}>
          {id}
        </span>
      )}
    </div>
  )
}

export interface LedgerColumnLabels {
  name: string
  created: string
}

export function buildLedgerColumns(labels: LedgerColumnLabels): ColumnDef<Ledger>[] {
  return [
    {
      accessorKey: 'name',
      header: labels.name,
      cell: ({ row }) => <NameWithId name={row.original.name} id={row.original.ledgerId} />
    },
    {
      accessorKey: 'createdAt',
      header: labels.created,
      cell: ({ row }) => (row.original.createdAt ? formatDate(row.original.createdAt, 'date.medium') : '—')
    }
  ]
}

export interface AccountColumnLabels {
  name: string
  currency: string
  balance: string
  inflight: string
}

export function buildAccountColumns(labels: AccountColumnLabels, t: TranslateFn): ColumnDef<LedgerBalance>[] {
  return [
    {
      accessorKey: 'name',
      header: labels.name,
      cell: ({ row }) => <NameWithId name={balanceLabel(row.original, t)} id={row.original.balanceId} />
    },
    { accessorKey: 'currency', header: labels.currency, cell: ({ row }) => row.original.currency },
    {
      id: 'balance',
      header: labels.balance,
      cell: ({ row }) => formatCurrency(row.original.balance, row.original.currency)
    },
    {
      id: 'inflight',
      header: labels.inflight,
      cell: ({ row }) => formatCurrency(row.original.inflightBalance, row.original.currency)
    }
  ]
}

export interface TransactionColumnLabels {
  reference: string
  amount: string
  source: string
  destination: string
  status: string
  created: string
}

export function buildTransactionColumns(
  labels: TransactionColumnLabels,
  t: TranslateFn,
  balanceIndex: Map<string, LedgerBalance>
): ColumnDef<LedgerTransaction>[] {
  return [
    {
      accessorKey: 'reference',
      header: labels.reference,
      cell: ({ row }) => row.original.reference ?? row.original.transactionId
    },
    {
      id: 'amount',
      header: labels.amount,
      cell: ({ row }) => formatCurrency(row.original.amount, row.original.currency)
    },
    {
      accessorKey: 'source',
      header: labels.source,
      cell: ({ row }) => resolveTransactionPartyName(row.original, 'source', balanceIndex, t)
    },
    {
      accessorKey: 'destination',
      header: labels.destination,
      cell: ({ row }) => resolveTransactionPartyName(row.original, 'destination', balanceIndex, t)
    },
    {
      accessorKey: 'status',
      header: labels.status,
      cell: ({ row }) =>
        row.original.status ? (
          <Badge variant="secondary">{getTransactionStatusLabel(row.original.status, t)}</Badge>
        ) : (
          '—'
        )
    },
    {
      accessorKey: 'createdAt',
      header: labels.created,
      cell: ({ row }) => (row.original.createdAt ? formatDate(row.original.createdAt, 'date.medium') : '—')
    }
  ]
}
