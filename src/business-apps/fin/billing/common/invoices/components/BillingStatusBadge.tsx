import React from 'react'
import { Badge, useTranslation } from '@newwork/nw-design-system'
import billingTranslations from '../../_i18n'
import { getInvoiceStatusBadgeVariant } from '../utils/invoiceStatus'
import { getInvoiceStatusLabel } from '../../utils/billingLabels'
import type { InvoiceDisplayStatus } from '../types'

interface BillingStatusBadgeProps {
  status: InvoiceDisplayStatus
  dataTestId?: string
}

export const BillingStatusBadge: React.FC<BillingStatusBadgeProps> = ({ status, dataTestId }) => {
  const { t } = useTranslation(billingTranslations)
  return (
    <Badge
      variant={getInvoiceStatusBadgeVariant(status)}
      data-testid={dataTestId ?? `billing-status-${status.toLowerCase()}`}
    >
      {getInvoiceStatusLabel(status, t)}
    </Badge>
  )
}

export default BillingStatusBadge
