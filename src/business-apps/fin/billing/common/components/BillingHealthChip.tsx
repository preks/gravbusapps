import React from 'react'
import { Badge, useTranslation } from '@newwork/nw-design-system'
import { CircleIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import billingTranslations from '../_i18n'
import { useBillingConnectionHealth } from '../hooks/useBillingConnectionHealth'

interface BillingHealthChipProps {
  context: BusinessAppContextProps
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary'> = {
  live: 'success',
  degraded: 'warning',
  offline: 'secondary',
  unknown: 'secondary'
}

const STATUS_LABEL_KEY: Record<string, string> = {
  live: 'billing-health-live',
  degraded: 'billing-health-degraded',
  offline: 'billing-health-offline',
  unknown: 'billing-health-offline'
}

export const BillingHealthChip: React.FC<BillingHealthChipProps> = ({ context }) => {
  const { t } = useTranslation(billingTranslations)
  const { status } = useBillingConnectionHealth(context)

  return (
    <Badge variant={STATUS_VARIANT[status]} data-testid="billing-health-chip">
      <CircleIcon weight="fill" className="gba:w-2 gba:h-2 gba:mr-1" />
      {t(STATUS_LABEL_KEY[status])}
    </Badge>
  )
}
