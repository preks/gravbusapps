import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, useTranslation } from '@newwork/nw-design-system'
import billingTranslations from '../../_i18n'
import { useBillingData } from '../hooks/useBillingData'
import type { BillingCustomer } from '../types'
import { InvoiceFormContent } from './InvoiceFormContent'

type BillingData = ReturnType<typeof useBillingData>

interface InvoiceCreateDialogProps {
  open: boolean
  billing: BillingData
  customers: BillingCustomer[]
  customersLoading?: boolean
  initialAccountId?: string | null
  initialOpportunityId?: string | null
  onClose: () => void
}

export const InvoiceCreateDialog: React.FC<InvoiceCreateDialogProps> = ({
  open,
  billing,
  customers,
  customersLoading = false,
  initialAccountId,
  initialOpportunityId,
  onClose
}) => {
  const { t } = useTranslation(billingTranslations)

  return (
    <Dialog open={open} onOpenChange={nextOpen => (nextOpen ? null : onClose())}>
      <DialogContent className="gba:max-h-screen gba:overflow-y-auto" data-testid="invoice-create-dialog">
        <DialogHeader>
          <DialogTitle>{t('billing-form-create-title')}</DialogTitle>
        </DialogHeader>
        <InvoiceFormContent
          billing={billing}
          customers={customers}
          customersLoading={customersLoading}
          initialAccountId={initialAccountId}
          initialOpportunityId={initialOpportunityId}
          onSaved={onClose}
          embedded
        />
      </DialogContent>
    </Dialog>
  )
}

export default InvoiceCreateDialog
