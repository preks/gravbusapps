import React, { useEffect, useMemo, useState } from 'react'
import {
  Card,
  Button,
  Input,
  DateInput,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { toast } from 'sonner'
import { navigateTo, Navigation } from '@/common/utils/navigationUtils'
import billingTranslations from '../../_i18n'
import { useBillingData } from '../hooks/useBillingData'
import { calculateInvoice } from '../utils/invoiceCalculations'
import { validateInvoiceDraft } from '../utils/invoiceValidation'
import { formatCurrency } from '../../utils/currency'
import { type InvoiceDraftInput } from '../../queries/billingCoreApi'
import type { BillingCustomer } from '../types'
import { LineItemsEditor, type EditableLine } from './LineItemsEditor'
import { CustomerSelect } from './CustomerSelect'

type BillingData = ReturnType<typeof useBillingData>

const CUSTOM_DUE_DATE_OPTION = '__custom_due_date__'

interface InvoiceFormContentProps {
  billing: BillingData
  customers: BillingCustomer[]
  customersLoading?: boolean
  initialAccountId?: string | null
  initialOpportunityId?: string | null
  onSaved?: () => void
  embedded?: boolean
}

function findCustomerIdForAccount(
  customers: Array<{ id: string; crmAccountId?: string | null }>,
  accountId: string | null
): string | undefined {
  if (!accountId) return undefined
  return customers.find(customer => customer.crmAccountId === accountId || customer.id === accountId)?.id
}

function calculateDueDate(issueDate: string | null | undefined, dueDays: number | undefined): string {
  const date = issueDate ? new Date(issueDate) : new Date()
  date.setDate(date.getDate() + (dueDays ?? 0))
  return date.toISOString()
}

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10)
}

function dateInputToIso(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export const InvoiceFormContent: React.FC<InvoiceFormContentProps> = ({
  billing,
  customers,
  customersLoading = false,
  initialAccountId,
  initialOpportunityId,
  onSaved,
  embedded = false
}) => {
  const { t } = useTranslation(billingTranslations)
  const settings = billing.settings

  const [legalEntityId, setLegalEntityId] = useState(settings.legalEntities[0]?.id ?? '')
  const [billingCustomerId, setBillingCustomerId] = useState('')
  const [currency, setCurrency] = useState(settings.currencies.enabledCurrencies[0] ?? 'EUR')
  const [paymentTermId, setPaymentTermId] = useState(settings.paymentTerms[0]?.id ?? '')
  const [customDueDate, setCustomDueDate] = useState(todayDateInputValue())
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<EditableLine[]>([
    {
      id: 'line-initial',
      description: '',
      quantity: '1',
      unitPrice: '0',
      discountPercent: '0',
      taxCategoryId: settings.taxCategories[0]?.id ?? ''
    }
  ])
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const crmOpportunityId = initialOpportunityId ?? null
  const usesCustomDueDate = paymentTermId === CUSTOM_DUE_DATE_OPTION
  const FormShell: React.ElementType = embedded ? 'div' : Card
  const formShellClass = embedded
    ? 'gba:flex gba:flex-col gba:gap-5 gba:bg-transparent'
    : 'gba:p-6 gba:flex gba:flex-col gba:gap-4'
  const fieldGridClass = embedded
    ? 'gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-x-4 gba:gap-y-5'
    : 'gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4'
  const totalsClass = embedded
    ? 'gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4 gba:pt-4 gba:border-t'
    : 'gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4 gba:pt-2 gba:border-t'

  // Sync defaults once live settings / CRM customers arrive.
  useEffect(() => {
    if (!legalEntityId && settings.legalEntities[0]) setLegalEntityId(settings.legalEntities[0].id)
    if (!paymentTermId && settings.paymentTerms[0]) setPaymentTermId(settings.paymentTerms[0].id)
    // Once customers load, keep a valid selection and honour an explicit
    // ?accountId from CRM account records by resolving it to the customer id.
    if (customers.length > 0 && !customers.some(customer => customer.id === billingCustomerId)) {
      setBillingCustomerId(findCustomerIdForAccount(customers, initialAccountId ?? null) ?? customers[0].id)
    }
  }, [settings, customers, legalEntityId, paymentTermId, billingCustomerId, initialAccountId])

  const handlePaymentTermChange = (value: string) => {
    setPaymentTermId(value)
    if (value === CUSTOM_DUE_DATE_OPTION) {
      setCustomDueDate(current => current || todayDateInputValue())
    } else {
      setCustomDueDate('')
    }
  }

  const draft: InvoiceDraftInput = useMemo(() => {
    const selectedCustomer = customers.find(customer => customer.id === billingCustomerId)
    const selectedPaymentTerm = usesCustomDueDate
      ? undefined
      : settings.paymentTerms.find(term => term.id === paymentTermId)
    return {
      legalEntityId,
      billingCustomerId,
      customerName: selectedCustomer?.name ?? null,
      crmAccountId: selectedCustomer?.crmAccountId ?? null,
      crmOpportunityId,
      currency,
      paymentTermId: usesCustomDueDate ? null : paymentTermId,
      dueDate: usesCustomDueDate ? dateInputToIso(customDueDate) : calculateDueDate(null, selectedPaymentTerm?.dueDays),
      notes: notes || null,
      lines: lines.map(line => ({
        description: line.description,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        discountPercent: Number(line.discountPercent),
        taxCategoryId: line.taxCategoryId
      }))
    }
  }, [
    legalEntityId,
    billingCustomerId,
    customers,
    crmOpportunityId,
    currency,
    paymentTermId,
    usesCustomDueDate,
    customDueDate,
    settings.paymentTerms,
    notes,
    lines
  ])

  const totals = useMemo(
    () =>
      calculateInvoice(
        lines.map(line => ({
          id: line.id,
          description: line.description,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          discountPercent: Number(line.discountPercent),
          taxCategoryId: line.taxCategoryId
        })),
        { currency, taxCategories: settings.taxCategories }
      ).totals,
    [lines, currency, settings.taxCategories]
  )

  const handleSave = async () => {
    const result = validateInvoiceDraft(draft)
    if (!result.valid) {
      setErrors(result.errors.map(error => error.message))
      return
    }
    setErrors([])

    setSubmitting(true)
    try {
      await billing.createInvoice(draft)
      toast.success(t('billing-form-save-draft-success'))
      if (onSaved) {
        onSaved()
      } else {
        navigateTo(Navigation.FIN_BILLING_INVOICES)
      }
    } catch {
      // Persisting to the ledger failed: keep the user on the form so nothing is
      // lost, and surface the failure rather than pretending it succeeded.
      toast.error(t('billing-form-save-draft-error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {errors.length > 0 && (
        <Alert className="gba:mb-4" data-testid="invoice-form-errors">
          <AlertDescription>
            <p className="gba:font-medium">{t('billing-form-validation-errors')}</p>
            <ul className="gba:list-disc gba:ml-5">
              {errors.map(error => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <FormShell className={formShellClass}>
        <div className={fieldGridClass}>
          <div className="gba:space-y-1">
            <label className="gba:text-sm gba:font-medium">{t('billing-form-legal-entity')}</label>
            <Select value={legalEntityId} onValueChange={setLegalEntityId}>
              <SelectTrigger data-testid="form-legal-entity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {settings.legalEntities.map(entity => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="gba:space-y-1">
            <label className="gba:text-sm gba:font-medium">{t('billing-form-customer')}</label>
            <CustomerSelect
              customers={customers}
              value={billingCustomerId}
              onChange={setBillingCustomerId}
              loading={customersLoading}
            />
          </div>
          <div className="gba:space-y-1">
            <label className="gba:text-sm gba:font-medium">{t('billing-form-currency')}</label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger data-testid="form-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {settings.currencies.enabledCurrencies.map(code => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="gba:space-y-1">
            <label className="gba:text-sm gba:font-medium">{t('billing-form-payment-term')}</label>
            <Select value={paymentTermId} onValueChange={handlePaymentTermChange}>
              <SelectTrigger data-testid="form-payment-term">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {settings.paymentTerms.map(term => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_DUE_DATE_OPTION}>{t('billing-form-custom-due-date-option')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {usesCustomDueDate && (
            <div className="gba:space-y-1">
              <label className="gba:text-sm gba:font-medium" htmlFor="form-custom-due-date">
                {t('billing-form-custom-due-date')}
              </label>
              <DateInput
                id="form-custom-due-date"
                type="date"
                mode="single"
                value={customDueDate}
                onChange={value => setCustomDueDate(typeof value === 'string' ? value : '')}
                placeholder={t('billing-form-custom-due-date')}
                data-testid="form-custom-due-date"
              />
            </div>
          )}
        </div>

        <div className={embedded ? 'gba:pt-1' : undefined}>
          <LineItemsEditor lines={lines} taxCategories={settings.taxCategories} onChange={setLines} />
        </div>

        <div className="gba:space-y-1">
          <label className="gba:text-sm gba:font-medium">{t('billing-form-notes')}</label>
          <Input value={notes} onChange={event => setNotes(event.target.value)} data-testid="form-notes" />
        </div>

        <div className={totalsClass}>
          <div className="gba:flex gba:flex-col gba:text-sm">
            <span>
              {t('billing-record-net')}: {formatCurrency(totals.netTotal, currency)}
            </span>
            <span>
              {t('billing-record-tax')}: {formatCurrency(totals.taxTotal, currency)}
            </span>
            <span className="gba:font-semibold">
              {t('billing-record-gross')}: {formatCurrency(totals.grossTotal, currency)}
            </span>
          </div>
          <Button onClick={handleSave} disabled={submitting} data-testid="form-save-button">
            {submitting && <Spinner className="gba:mr-2" size="sm" />}
            {t('billing-form-save-draft')}
          </Button>
        </div>
      </FormShell>
    </>
  )
}
