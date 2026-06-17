import type { CreateTransactionInput, LedgerBalance } from '../network/ledgerAdminClient'
import type { Invoice } from '../../invoices/types'
import { balanceLabel } from '../utils/ledgerNames'
import type { SplitEntry } from './TransactionSplitFields'
import {
  partySelectionBalanceId,
  parseOptionalInteger,
  parseOptionalNumber,
  transactionPartyValue,
  toIsoDateTime
} from './transactionDialogUtils'

type TranslateFn = (key: string) => string
type TransactionEntryMode = 'standard' | 'split'
type SplitSide = 'sources' | 'destinations'

interface BuildTransactionInputParams {
  amount: string
  atomic: boolean
  balanceByRef: Map<string, LedgerBalance>
  currency: string
  description: string
  destination: string
  destinationSplits: SplitEntry[]
  effectiveDate: string
  entryMode: TransactionEntryMode
  inflight: boolean
  inflightCommitDate: string
  inflightExpiryDate: string
  overdraftLimit: string
  preciseAmount: string
  precision: string
  rate: string
  reference: string
  scheduledFor: string
  selectedInvoice?: Invoice
  skipQueue: boolean
  source: string
  sourceSplits: SplitEntry[]
  splitSide: SplitSide
  t: TranslateFn
}

let splitEntrySequence = 0

export function createSplitEntry(identifier = ''): SplitEntry {
  splitEntrySequence += 1
  return {
    id: globalThis.crypto?.randomUUID?.() || `split-${splitEntrySequence}`,
    identifier,
    distribution: ''
  }
}

function toSplitPayload(entries: SplitEntry[]): Array<{ identifier: string; distribution?: string }> {
  return entries
    .map(entry => ({
      identifier: transactionPartyValue(entry.identifier),
      distribution: entry.distribution.trim() || undefined
    }))
    .filter(entry => entry.identifier.length > 0)
}

function indicatorDisplayLabel(indicator: string): string {
  return indicator
    .replace(/^@+/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
}

function partyMetaData(
  side: 'source' | 'destination',
  formValue: string,
  resolvedRef: string,
  balanceByRef: Map<string, LedgerBalance>,
  t: TranslateFn
) {
  const balanceId = partySelectionBalanceId(formValue) ?? (resolvedRef.startsWith('bln_') ? resolvedRef : null)
  const balance = balanceId ? balanceByRef.get(balanceId) : null
  const label = balance ? balanceLabel(balance, t) : null

  if (resolvedRef.startsWith('@')) {
    return {
      [`${side}_indicator`]: resolvedRef,
      [`${side}_label`]: indicatorDisplayLabel(resolvedRef)
    }
  }

  if (balanceId) {
    return {
      [`${side}_balance_id`]: balanceId,
      ...(label ? { [`${side}_label`]: label } : {})
    }
  }

  return {}
}

function invoiceMetaData(selectedInvoice: Invoice | undefined, customerBalanceId: string) {
  return selectedInvoice
    ? {
        invoice_id: selectedInvoice.id,
        invoice_number: selectedInvoice.invoiceNumber ?? undefined,
        customer_account_id: selectedInvoice.crmAccountId,
        customer_balance_id: customerBalanceId.startsWith('bln_') ? customerBalanceId : undefined,
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber ?? undefined,
        invoiceAccountId: selectedInvoice.crmAccountId
      }
    : undefined
}

export function buildTransactionInput({
  amount,
  atomic,
  balanceByRef,
  currency,
  description,
  destination,
  destinationSplits,
  effectiveDate,
  entryMode,
  inflight,
  inflightCommitDate,
  inflightExpiryDate,
  overdraftLimit,
  preciseAmount,
  precision,
  rate,
  reference,
  scheduledFor,
  selectedInvoice,
  skipQueue,
  source,
  sourceSplits,
  splitSide,
  t
}: BuildTransactionInputParams): CreateTransactionInput {
  const isSplit = entryMode === 'split'
  const numericAmount = Number(amount)
  const splitSources = toSplitPayload(sourceSplits)
  const splitDestinations = toSplitPayload(destinationSplits)
  const hasSplitSources = isSplit && splitSide === 'sources' && splitSources.length > 1
  const hasSplitDestinations = isSplit && splitSide === 'destinations' && splitDestinations.length > 1
  const resolvedSource = isSplit ? (splitSources[0]?.identifier ?? '') : transactionPartyValue(source)
  const resolvedDestination = isSplit ? (splitDestinations[0]?.identifier ?? '') : transactionPartyValue(destination)

  if (!resolvedSource || !resolvedDestination) throw new Error(t('ledger-admin-validation-accounts'))
  if (hasSplitSources && hasSplitDestinations) throw new Error(t('ledger-admin-validation-split-side'))
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error(t('ledger-admin-validation-amount'))
  if (!reference.trim()) throw new Error(t('ledger-admin-validation-reference'))
  if (!description.trim()) throw new Error(t('ledger-admin-validation-description'))
  if (selectedInvoice && !selectedInvoice.crmAccountId) throw new Error(t('ledger-admin-validation-invoice-account'))

  return {
    source: resolvedSource,
    destination: resolvedDestination,
    amount: numericAmount,
    preciseAmount: parseOptionalNumber(preciseAmount, t('ledger-admin-field-precise-amount')) ?? null,
    precision: parseOptionalInteger(precision, t('ledger-admin-field-precision')),
    rate: parseOptionalNumber(rate, t('ledger-admin-field-rate')),
    overdraftLimit: parseOptionalNumber(overdraftLimit, t('ledger-admin-field-overdraft-limit')),
    sources: hasSplitSources ? splitSources : [],
    destinations: hasSplitDestinations ? splitDestinations : [],
    currency,
    reference: reference.trim(),
    description: description.trim(),
    allowOverdraft: hasSplitSources
      ? splitSources.some(entry => entry.identifier.startsWith('@'))
      : resolvedSource.startsWith('@'),
    inflight,
    skipQueue,
    atomic,
    scheduledFor: toIsoDateTime(scheduledFor),
    inflightExpiryDate: toIsoDateTime(inflightExpiryDate),
    inflightCommitDate: toIsoDateTime(inflightCommitDate),
    effectiveDate: toIsoDateTime(effectiveDate),
    metaData: {
      ...partyMetaData('source', source, resolvedSource, balanceByRef, t),
      ...partyMetaData('destination', destination, resolvedDestination, balanceByRef, t),
      ...invoiceMetaData(selectedInvoice, resolvedDestination)
    }
  }
}
