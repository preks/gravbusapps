import React from 'react'
import { PageLayout, Button, Toaster, useTranslation } from '@newwork/nw-design-system'
import { ArrowLeftIcon, FileTextIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, Navigation } from '@/common/utils/navigationUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import billingTranslations from '../../common/_i18n'
import { useBillingData } from '../../common/invoices/hooks/useBillingData'
import { useBillingCustomers } from '../../common/invoices/hooks/useBillingCustomers'
import { InvoiceFormContent } from '../../common/invoices/components/InvoiceFormContent'
import { useInvoiceFormPrefill } from './hooks/useInvoiceFormPrefill'

interface InvoiceFormProps extends BusinessAppContextProps {
  onClose?: () => void
}

function isActionModalLaunch(additionalData: BusinessAppContextProps['additionalData'], onClose?: () => void): boolean {
  if (onClose || additionalData?.embedded || additionalData?.isModal) {
    return true
  }

  return Boolean(
    additionalData?.psi_taskPayload ||
      additionalData?.psi_initialParameters ||
      additionalData?.externalContextData ||
      additionalData?.contextData ||
      additionalData?.flowContext ||
      additionalData?.targetDesktop ||
      additionalData?.targetMobile ||
      additionalData?.accountId ||
      additionalData?.crmAccountId ||
      additionalData?.opportunityId ||
      additionalData?.crmOpportunityId
  )
}

const InvoiceForm: React.FC<InvoiceFormProps> = props => {
  const { t } = useTranslation(billingTranslations)
  const billing = useBillingData(props)
  const { customers, loading: customersLoading } = useBillingCustomers(props)
  const { initialAccountId, initialOpportunityId } = useInvoiceFormPrefill(props.additionalData)
  const embedded = isActionModalLaunch(props.additionalData, props.onClose)

  const handleEmbeddedSaved = () => {
    dispatchProcessContinueEvent('pse_submit', { event: 'pse_submit' })
    props.onClose?.()
  }

  if (embedded) {
    return (
      <div className="gba:max-h-screen gba:overflow-y-auto gba:px-1 gba:pb-1" data-testid="invoice-form-embedded">
        <InvoiceFormContent
          billing={billing}
          customers={customers}
          customersLoading={customersLoading}
          initialAccountId={initialAccountId}
          initialOpportunityId={initialOpportunityId}
          onSaved={handleEmbeddedSaved}
          embedded
        />
        <Toaster />
      </div>
    )
  }

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
          initialAccountId={initialAccountId}
          initialOpportunityId={initialOpportunityId}
        />
      </PageLayout>
      <Toaster />
    </div>
  )
}

export default InvoiceForm
