import { Badge, Separator } from '@newwork/nw-design-system'
import { formatDate } from '../../../utils/date'
import { formatCurrency } from '../../../utils/currency'
import { getTransactionStatusLabel } from '../../../utils/billingLabels'
import { resolveTransactionPartyName } from '../../utils/ledgerNames'
import { isEffectiveInflightTransaction } from '../../utils/ledgerTransactionGroups'
import {
  displayTransactionStatus,
  hasTransactionAmountRollup,
  transactionStatusBadgeVariant,
  type TranslateFn
} from '../../utils/ledgerTransactionStatus'
import type { LedgerBalance, LedgerTransaction, UpdateInflightTransactionInput } from '../../network/ledgerAdminClient'
import { Field, RelatedRow, SectionTitle } from './LedgerDetailPrimitives'
import { InflightTransactionActions } from './InflightTransactionActions'

interface TransactionDetailViewProps {
  balanceIndex: Map<string, LedgerBalance>
  onClose: () => void
  onSelectTransaction: (transaction: LedgerTransaction) => void
  onUpdateInflight?: (input: UpdateInflightTransactionInput) => Promise<LedgerTransaction | null>
  transaction: LedgerTransaction
  t: TranslateFn
}

export function TransactionDetailView({
  balanceIndex,
  onClose,
  onSelectTransaction,
  onUpdateInflight,
  transaction,
  t
}: Readonly<TransactionDetailViewProps>) {
  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      <Field label={t('ledger-admin-col-reference')} value={transaction.reference ?? transaction.transactionId} />
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <Field label={t('ledger-admin-col-amount')} value={formatCurrency(transaction.amount, transaction.currency)} />
        <Field
          label={t('ledger-admin-col-status')}
          value={
            transaction.effectiveStatus || transaction.status ? (
              <Badge variant={transactionStatusBadgeVariant(transaction)}>
                {displayTransactionStatus(transaction, t)}
              </Badge>
            ) : (
              '—'
            )
          }
        />
        {transaction.effectiveStatus && transaction.status && (
          <Field
            label={t('ledger-admin-detail-raw-status')}
            value={
              <Badge variant={transactionStatusBadgeVariant(transaction, 'outline')}>
                {getTransactionStatusLabel(transaction.status, t)}
              </Badge>
            }
          />
        )}
        <Field
          label={t('ledger-admin-col-source')}
          value={resolveTransactionPartyName(transaction, 'source', balanceIndex, t)}
        />
        <Field
          label={t('ledger-admin-col-destination')}
          value={resolveTransactionPartyName(transaction, 'destination', balanceIndex, t)}
        />
      </div>
      {transaction.description && <Field label={t('ledger-admin-field-description')} value={transaction.description} />}
      {hasTransactionAmountRollup(transaction) && (
        <>
          <Separator />
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <Field
              label={t('ledger-admin-committed-amount')}
              value={formatCurrency(transaction.committedAmount ?? 0, transaction.currency)}
            />
            <Field
              label={t('ledger-admin-voided-amount')}
              value={formatCurrency(transaction.voidedAmount ?? 0, transaction.currency)}
            />
            <Field
              label={t('ledger-admin-remaining-amount')}
              value={formatCurrency(transaction.remainingInflightAmount ?? 0, transaction.currency)}
            />
          </div>
        </>
      )}
      <Field
        label={t('ledger-admin-col-created')}
        value={transaction.createdAt ? formatDate(transaction.createdAt, 'date.medium') : '—'}
      />
      <Field label={t('ledger-admin-detail-transaction-id')} value={transaction.transactionId} mono />
      {transaction.groupedTransactions && transaction.groupedTransactions.length > 1 && (
        <>
          <Separator />
          <div>
            <SectionTitle>{t('ledger-admin-detail-child-history')}</SectionTitle>
            <div className="gba:flex gba:flex-col gba:gap-1">
              {transaction.groupedTransactions.map(historyItem => (
                <RelatedRow
                  key={historyItem.id}
                  testId={`ledger-detail-child-txn-${historyItem.id}`}
                  primary={historyItem.reference ?? historyItem.transactionId}
                  secondary={
                    <Badge variant={transactionStatusBadgeVariant(historyItem, 'outline')}>
                      {getTransactionStatusLabel(historyItem.status, t)}
                    </Badge>
                  }
                  trailing={formatCurrency(historyItem.amount, historyItem.currency)}
                  onClick={() => onSelectTransaction(historyItem)}
                />
              ))}
            </div>
          </div>
        </>
      )}
      {onUpdateInflight && isEffectiveInflightTransaction(transaction) && (
        <>
          <Separator />
          <InflightTransactionActions
            onClose={onClose}
            onUpdateInflight={onUpdateInflight}
            transaction={transaction}
            t={t}
          />
        </>
      )}
    </div>
  )
}
