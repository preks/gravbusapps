import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Label } from '@newwork/nw-design-system'
import { toast } from 'sonner'
import type { ComboboxOption } from '@newwork/nw-design-system'
import type { CreateTransactionInput, LedgerBalance } from '../network/ledgerAdminClient'
import type { Invoice } from '../../invoices/types'
import { InvoiceSelect, TransactionAccountFields } from './TransactionAccountFields'
import { TransactionAdvancedFields } from './TransactionAdvancedFields'
import { TransactionDetailsFields } from './TransactionDetailsFields'
import { TransactionSplitFields, type SplitEntry, type SplitSide } from './TransactionSplitFields'
import {
  invoiceOptionLabel,
  matchesInvoiceQuery,
  partySelectionBalanceId,
  partySelectionInputValue
} from './transactionDialogUtils'
import { buildTransactionInput, createSplitEntry } from './transactionCreatePayload'

type TranslateFn = (key: string) => string
type TransactionEntryMode = 'standard' | 'split'
const FIELD_LABEL_CLASS = 'gba:text-sm gba:font-medium'

interface TransactionCreateFormProps {
  balances: LedgerBalance[]
  invoices: Invoice[]
  initialSource?: string
  onCancel: () => void
  onCreateTransaction: (input: CreateTransactionInput) => Promise<unknown>
  onSuccess: () => void
  submitting: boolean
  setSubmitting: (value: boolean) => void
  t: TranslateFn
}

export function TransactionCreateForm({
  balances,
  invoices,
  initialSource,
  onCancel,
  onCreateTransaction,
  onSuccess,
  setSubmitting,
  submitting,
  t
}: Readonly<TransactionCreateFormProps>) {
  const [currency, setCurrency] = useState('EUR')
  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('')
  const [preciseAmount, setPreciseAmount] = useState('')
  const [precision, setPrecision] = useState('100')
  const [rate, setRate] = useState('1')
  const [overdraftLimit, setOverdraftLimit] = useState('0')
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')
  const [entryMode, setEntryMode] = useState<TransactionEntryMode>('standard')
  const [splitSide, setSplitSide] = useState<SplitSide>('destinations')
  const [sourceSplits, setSourceSplits] = useState<SplitEntry[]>(() => [createSplitEntry()])
  const [destinationSplits, setDestinationSplits] = useState<SplitEntry[]>(() => [createSplitEntry()])
  const [inflight, setInflight] = useState(false)
  const [skipQueue, setSkipQueue] = useState(true)
  const [atomic, setAtomic] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')
  const [inflightExpiryDate, setInflightExpiryDate] = useState('')
  const [inflightCommitDate, setInflightCommitDate] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [invoiceQuery, setInvoiceQuery] = useState('')
  const lastPrefilledReference = useRef('')

  const balanceByRef = useMemo(() => new Map(balances.map(balance => [balance.balanceId, balance])), [balances])
  const invoiceById = useMemo(() => new Map(invoices.map(invoice => [invoice.id, invoice])), [invoices])
  const selectedInvoice = invoiceById.get(invoiceId)
  const isSplit = entryMode === 'split'

  useEffect(() => {
    if (!initialSource) return
    const selectionValue = partySelectionInputValue(initialSource)
    setSource(selectionValue)
    setSourceSplits(current => [
      { ...(current[0] ?? createSplitEntry()), identifier: selectionValue },
      ...current.slice(1)
    ])
    const balance = balanceByRef.get(initialSource)
    if (balance?.currency) setCurrency(balance.currency)
  }, [initialSource, balanceByRef])

  const invoiceOptions = useMemo<ComboboxOption[]>(() => {
    const normalized = invoiceQuery.trim().toLowerCase()
    const filtered = normalized
      ? invoices.filter(invoice => matchesInvoiceQuery(invoice, invoiceOptionLabel(invoice), normalized))
      : invoices
    return filtered.map(invoice => {
      const label = invoiceOptionLabel(invoice)
      return { value: invoice.id, label, optionLabel: label }
    })
  }, [invoices, invoiceQuery])

  const updateAccountCurrency = (value: string) => {
    const balanceId = partySelectionBalanceId(value)
    const balance = balanceId ? balanceByRef.get(balanceId) : null
    if (balance?.currency) setCurrency(balance.currency)
  }

  const handleSourceChange = (value: string) => {
    setSource(value)
    updateAccountCurrency(value)
  }

  const handleDestinationChange = (value: string) => {
    setDestination(value)
    updateAccountCurrency(value)
  }

  const handleInvoiceChange = (value: string) => {
    const nextInvoice = invoiceById.get(value)
    const nextReference = nextInvoice ? invoiceOptionLabel(nextInvoice) : ''
    setInvoiceId(value)
    setReference(current => {
      if (!nextReference) {
        lastPrefilledReference.current = ''
        return current
      }
      if (current.trim() && current !== lastPrefilledReference.current) return current
      lastPrefilledReference.current = nextReference
      return nextReference
    })
  }

  const updateSourceSplit = (id: string, patch: Partial<SplitEntry>) => {
    setSourceSplits(current => current.map(entry => (entry.id === id ? { ...entry, ...patch } : entry)))
    if (patch.identifier) updateAccountCurrency(patch.identifier)
  }

  const updateDestinationSplit = (id: string, patch: Partial<SplitEntry>) => {
    setDestinationSplits(current => current.map(entry => (entry.id === id ? { ...entry, ...patch } : entry)))
    if (patch.identifier) updateAccountCurrency(patch.identifier)
  }

  const handleSplitSideChange = (side: SplitSide) => {
    setSplitSide(side)
    if (side === 'sources') {
      setDestinationSplits(current => current.slice(0, 1))
      return
    }
    setSourceSplits(current => current.slice(0, 1))
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      const input = buildTransactionInput({
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
      })
      await onCreateTransaction(input)
      toast.success(t('ledger-admin-create-success'))
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('ledger-admin-create-error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      <div className="gba:flex gba:flex-col gba:gap-2">
        <Label className={FIELD_LABEL_CLASS}>{t('ledger-admin-transaction-mode')}</Label>
        <div className="gba:flex gba:gap-2">
          <Button
            type="button"
            variant={entryMode === 'standard' ? 'default' : 'outline'}
            onClick={() => setEntryMode('standard')}
            data-testid="ledger-transaction-standard-mode"
          >
            {t('ledger-admin-transaction-mode-standard')}
          </Button>
          <Button
            type="button"
            variant={entryMode === 'split' ? 'default' : 'outline'}
            onClick={() => setEntryMode('split')}
            data-testid="ledger-transaction-split-mode"
          >
            {t('ledger-admin-transaction-mode-split')}
          </Button>
        </div>
      </div>
      {isSplit ? (
        <TransactionSplitFields
          balances={balances}
          destinations={destinationSplits}
          onAddDestination={() => setDestinationSplits(current => [...current, createSplitEntry()])}
          onAddSource={() => setSourceSplits(current => [...current, createSplitEntry()])}
          onDestinationChange={updateDestinationSplit}
          onRemoveDestination={id =>
            setDestinationSplits(current => (current.length === 1 ? current : current.filter(entry => entry.id !== id)))
          }
          onRemoveSource={id =>
            setSourceSplits(current => (current.length === 1 ? current : current.filter(entry => entry.id !== id)))
          }
          onSplitSideChange={handleSplitSideChange}
          onSourceChange={updateSourceSplit}
          splitSide={splitSide}
          sources={sourceSplits}
          t={t}
        />
      ) : (
        <TransactionAccountFields
          balances={balances}
          source={source}
          destination={destination}
          onSourceChange={handleSourceChange}
          onDestinationChange={handleDestinationChange}
          t={t}
        />
      )}
      <InvoiceSelect
        invoiceId={invoiceId}
        invoiceOptions={invoiceOptions}
        onInvoiceChange={handleInvoiceChange}
        onInvoiceSearch={setInvoiceQuery}
        t={t}
      />
      <TransactionAdvancedFields
        amount={amount}
        atomic={atomic}
        currency={currency}
        inflight={inflight}
        overdraftLimit={overdraftLimit}
        preciseAmount={preciseAmount}
        precision={precision}
        rate={rate}
        showAtomic={isSplit}
        skipQueue={skipQueue}
        setAmount={setAmount}
        setAtomic={setAtomic}
        setCurrency={setCurrency}
        setInflight={setInflight}
        setOverdraftLimit={setOverdraftLimit}
        setPreciseAmount={setPreciseAmount}
        setPrecision={setPrecision}
        setRate={setRate}
        setSkipQueue={setSkipQueue}
        t={t}
      />
      <TransactionDetailsFields
        description={description}
        effectiveDate={effectiveDate}
        inflightCommitDate={inflightCommitDate}
        inflightExpiryDate={inflightExpiryDate}
        reference={reference}
        scheduledFor={scheduledFor}
        setDescription={setDescription}
        setEffectiveDate={setEffectiveDate}
        setInflightCommitDate={setInflightCommitDate}
        setInflightExpiryDate={setInflightExpiryDate}
        setReference={setReference}
        setScheduledFor={setScheduledFor}
        t={t}
      />
      <div className="gba:flex gba:justify-end gba:gap-2">
        <Button variant="outline" onClick={onCancel} disabled={submitting} data-testid="ledger-dialog-cancel">
          {t('ledger-admin-action-cancel')}
        </Button>
        <Button onClick={submit} disabled={submitting} data-testid="ledger-dialog-submit">
          {t('ledger-admin-action-create')}
        </Button>
      </div>
    </div>
  )
}
