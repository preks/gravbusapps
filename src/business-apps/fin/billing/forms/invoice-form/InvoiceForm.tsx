import React, { useEffect, useMemo, useState } from 'react'
import {
  PageLayout,
  Card,
  Button,
  Input,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Toaster,
  useTranslation
} from '@newwork/nw-design-system'
import { toast } from 'sonner'
import { ArrowLeftIcon, FileTextIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, Navigation } from '@/common/utils/navigationUtils'
import billingTranslations from '../../common/_i18n'
import { useBillingData } from '../../common/hooks/useBillingData'
import { useBillingCustomers } from '../../common/hooks/useBillingCustomers'
import { calculateInvoice } from '../../common/utils/invoiceCalculations'
import { formatCurrency } from '../../common/utils/currency'
import { validateInvoiceDraft } from '../../common/utils/invoiceValidation'
import { type InvoiceDraftInput } from '../../common/queries/billingCoreApi'
import type { BillingCustomer } from '../../common/types'
import { LineItemsEditor, type EditableLine } from './components/LineItemsEditor'
import { CustomerSelect } from './components/CustomerSelect'

type InvoiceFormProps = BusinessAppContextProps
type BillingData = ReturnType<typeof useBillingData>

interface InvoiceFormContentProps {
  billing: BillingData
  customers: BillingCustomer[]
  customersLoading?: boolean
  initialAccountId?: string | null
  initialOpportunityId?: string | null
  onSaved?: () => void
  embedded?: boolean
}

function readQueryParam(name: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}

function findCustomerIdForAccount(
  customers: Array<{ id: string; crmAccountId?: string | null }>,
  accountId: string | null
): string | undefined {
  if (!accountId) return undefined
  return customers.find(customer => customer.crmAccountId === accountId || customer.id === accountId)?.id
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

  const draft: InvoiceDraftInput = useMemo(() => {
    const selectedCustomer = customers.find(customer => customer.id === billingCustomerId)
    return {
      legalEntityId,
      billingCustomerId,
      customerName: selectedCustomer?.name ?? null,
      crmAccountId: selectedCustomer?.crmAccountId ?? null,
      crmOpportunityId,
      currency,
      paymentTermId,
      notes: notes || null,
      lines: lines.map(line => ({
        description: line.description,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        discountPercent: Number(line.discountPercent),
        taxCategoryId: line.taxCategoryId
      }))
    }
  }, [legalEntityId, billingCustomerId, customers, crmOpportunityId, currency, paymentTermId, notes, lines])

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

      <Card
        className={
          embedded
            ? 'gba:p-0 gba:border-0 gba:shadow-none gba:flex gba:flex-col gba:gap-4'
            : 'gba:p-6 gba:flex gba:flex-col gba:gap-4'
        }
      >
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
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
            <Select value={paymentTermId} onValueChange={setPaymentTermId}>
              <SelectTrigger data-testid="form-payment-term">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {settings.paymentTerms.map(term => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <LineItemsEditor lines={lines} taxCategories={settings.taxCategories} onChange={setLines} />

        <div className="gba:space-y-1">
          <label className="gba:text-sm gba:font-medium">{t('billing-form-notes')}</label>
          <Input value={notes} onChange={event => setNotes(event.target.value)} data-testid="form-notes" />
        </div>

        <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-4 gba:pt-2 gba:border-t">
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
      </Card>
    </>
  )
}

const InvoiceForm: React.FC<InvoiceFormProps> = props => {
  const { t } = useTranslation(billingTranslations)
  const billing = useBillingData(props)
  const { customers, loading: customersLoading } = useBillingCustomers(props)

  return (
    <div className="gba:min-h-screen gba:p-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigateTo(Navigation.FIN_BILLING_INVOICES)}
        className="gba:flex gba:items-center gba:gap-2 gba:mb-4"
        data-testid="invoice-form-back-button"
      >
        <ArrowLeftIcon size={16} />
        {t('billing-back-to-billing')}
      </Button>

      <PageLayout headerIcon={FileTextIcon} headerTitle={t('billing-form-create-title')} variant="default">
        <InvoiceFormContent
          billing={billing}
          customers={customers}
          customersLoading={customersLoading}
          initialAccountId={readQueryParam('accountId')}
          initialOpportunityId={readQueryParam('opportunityId')}
        />
      </PageLayout>
      <Toaster />
    </div>
  )
}

export default InvoiceForm
