import { Fragment, useState } from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react'
import { formatDate } from '../../../common/utils/date'
import { formatCurrency } from '../../../common/utils/currency'
import { getTransactionStatusLabel } from '../../../common/utils/billingLabels'
import { resolveTransactionPartyName } from '../../../common/ledger/utils/ledgerNames'
import {
  displayTransactionStatus,
  hasTransactionAmountRollup,
  transactionStatusBadgeVariant,
  type TranslateFn
} from '../../../common/ledger/utils/ledgerTransactionStatus'
import type { LedgerBalance, LedgerTransaction } from '../../../common/ledger/network/ledgerAdminClient'

interface ExpandableTransactionTableProps {
  balanceIndex: Map<string, LedgerBalance>
  emptyMessage: string
  onRowClick: (transaction: LedgerTransaction) => void
  rows: LedgerTransaction[]
  t: TranslateFn
}

interface TransactionRowsProps {
  balanceIndex: Map<string, LedgerBalance>
  isExpanded: boolean
  onRowClick: (transaction: LedgerTransaction) => void
  row: LedgerTransaction
  t: TranslateFn
  toggle: (transactionId: string) => void
}

function TransactionAmountCell({ row, t }: Readonly<{ row: LedgerTransaction; t: TranslateFn }>) {
  return (
    <td className="gba:px-3 gba:py-3 gba:text-right">
      {formatCurrency(row.amount, row.currency)}
      {hasTransactionAmountRollup(row) ? (
        <div className="gba:text-xs gba:text-muted-foreground">
          {row.committedAmount && row.committedAmount > 0
            ? `${t('ledger-admin-committed-amount')}: ${formatCurrency(row.committedAmount, row.currency)}`
            : null}
          {row.voidedAmount && row.voidedAmount > 0 ? (
            <div>
              {t('ledger-admin-voided-amount')}: {formatCurrency(row.voidedAmount, row.currency)}
            </div>
          ) : null}
          {row.remainingInflightAmount && row.remainingInflightAmount > 0 ? (
            <div>
              {t('ledger-admin-remaining-amount')}: {formatCurrency(row.remainingInflightAmount, row.currency)}
            </div>
          ) : null}
        </div>
      ) : null}
    </td>
  )
}

function TransactionHistoryRows({
  balanceIndex,
  history,
  onRowClick,
  t
}: Readonly<{
  balanceIndex: Map<string, LedgerBalance>
  history: LedgerTransaction[]
  onRowClick: (transaction: LedgerTransaction) => void
  t: TranslateFn
}>) {
  return (
    <>
      {history.map(transaction => (
        <tr key={transaction.id} className="gba:border-t gba:bg-muted/20">
          <td className="gba:px-3 gba:py-2" />
          <td
            className="gba:cursor-pointer gba:px-3 gba:py-2 gba:pl-8"
            onClick={() => onRowClick(transaction)}
            data-testid={`ledger-transaction-child-row-${transaction.id}`}
          >
            {transaction.reference ?? transaction.transactionId}
          </td>
          <td className="gba:px-3 gba:py-2 gba:text-right">
            {formatCurrency(transaction.amount, transaction.currency)}
          </td>
          <td className="gba:px-3 gba:py-2">{resolveTransactionPartyName(transaction, 'source', balanceIndex, t)}</td>
          <td className="gba:px-3 gba:py-2">
            {resolveTransactionPartyName(transaction, 'destination', balanceIndex, t)}
          </td>
          <td className="gba:px-3 gba:py-2">
            {transaction.status ? (
              <Badge variant={transactionStatusBadgeVariant(transaction, 'outline')}>
                {getTransactionStatusLabel(transaction.status, t)}
              </Badge>
            ) : (
              '—'
            )}
          </td>
          <td className="gba:px-3 gba:py-2">
            {transaction.createdAt ? formatDate(transaction.createdAt, 'date.medium') : '—'}
          </td>
        </tr>
      ))}
    </>
  )
}

function TransactionRows({ balanceIndex, isExpanded, onRowClick, row, t, toggle }: Readonly<TransactionRowsProps>) {
  const children = row.childTransactions ?? []
  const history = row.groupedTransactions ?? [row, ...children]

  return (
    <Fragment key={row.id}>
      <tr className="gba:border-t hover:gba:bg-muted/40">
        <td className="gba:px-3 gba:py-3">
          {history.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={event => {
                event.stopPropagation()
                toggle(row.transactionId)
              }}
              data-testid={`ledger-transaction-expand-${row.id}`}
            >
              {isExpanded ? <CaretDownIcon size={16} /> : <CaretRightIcon size={16} />}
            </Button>
          ) : null}
        </td>
        <td
          className="gba:cursor-pointer gba:px-3 gba:py-3"
          onClick={() => onRowClick(row)}
          data-testid={`ledger-transaction-row-${row.id}`}
        >
          {row.reference ?? row.transactionId}
          {history.length > 1 ? (
            <div className="gba:text-xs gba:text-muted-foreground">{history.length} transaction history entries</div>
          ) : null}
        </td>
        <TransactionAmountCell row={row} t={t} />
        <td className="gba:px-3 gba:py-3">{resolveTransactionPartyName(row, 'source', balanceIndex, t)}</td>
        <td className="gba:px-3 gba:py-3">{resolveTransactionPartyName(row, 'destination', balanceIndex, t)}</td>
        <td className="gba:px-3 gba:py-3">
          {row.effectiveStatus || row.status ? (
            <Badge variant={transactionStatusBadgeVariant(row)}>{displayTransactionStatus(row, t)}</Badge>
          ) : (
            '—'
          )}
        </td>
        <td className="gba:px-3 gba:py-3">{row.createdAt ? formatDate(row.createdAt, 'date.medium') : '—'}</td>
      </tr>
      {isExpanded ? (
        <TransactionHistoryRows balanceIndex={balanceIndex} history={history} onRowClick={onRowClick} t={t} />
      ) : null}
    </Fragment>
  )
}

export function ExpandableTransactionTable({
  balanceIndex,
  emptyMessage,
  onRowClick,
  rows,
  t
}: Readonly<ExpandableTransactionTableProps>) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (transactionId: string) => {
    setExpanded(current => {
      const next = new Set(current)
      if (next.has(transactionId)) {
        next.delete(transactionId)
      } else {
        next.add(transactionId)
      }
      return next
    })
  }

  if (rows.length === 0) {
    return <div className="gba:rounded-md gba:border gba:p-6 gba:text-sm gba:text-muted-foreground">{emptyMessage}</div>
  }

  return (
    <div className="gba:overflow-x-auto gba:rounded-md gba:border" data-testid="ledger-transactions-table">
      <table className="gba:w-full gba:text-sm">
        <thead className="gba:bg-muted/50 gba:text-left gba:text-muted-foreground">
          <tr>
            <th className="gba:w-10 gba:px-3 gba:py-3" />
            <th className="gba:px-3 gba:py-3">{t('ledger-admin-col-reference')}</th>
            <th className="gba:px-3 gba:py-3 gba:text-right">{t('ledger-admin-col-amount')}</th>
            <th className="gba:px-3 gba:py-3">{t('ledger-admin-col-source')}</th>
            <th className="gba:px-3 gba:py-3">{t('ledger-admin-col-destination')}</th>
            <th className="gba:px-3 gba:py-3">{t('ledger-admin-col-status')}</th>
            <th className="gba:px-3 gba:py-3">{t('ledger-admin-col-created')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <TransactionRows
              key={row.id}
              balanceIndex={balanceIndex}
              isExpanded={expanded.has(row.transactionId)}
              onRowClick={onRowClick}
              row={row}
              t={t}
              toggle={toggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
