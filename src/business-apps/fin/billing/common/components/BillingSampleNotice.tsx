import React from 'react'
import { Alert, AlertDescription, useTranslation } from '@newwork/nw-design-system'
import billingTranslations from '../_i18n'

interface BillingSampleNoticeProps {
  /** Whether the screen is currently backed by sample data. */
  show: boolean
  /** Optional backend failure detail to surface alongside the notice. */
  error?: string | null
  dataTestId?: string
}

/**
 * Consistent backend state notice used across billing screens. It can show the
 * legacy sample-data notice, or just surface backend errors when no fallback is
 * used.
 */
export const BillingSampleNotice: React.FC<BillingSampleNoticeProps> = ({
  show,
  error,
  dataTestId = 'billing-sample-notice'
}) => {
  const { t } = useTranslation(billingTranslations)
  if (!show && !error) {
    return null
  }
  return (
    <Alert className="gba:mb-4" data-testid={dataTestId}>
      <AlertDescription>
        {show ? t('billing-sample-data-notice') : t('billing-backend-error-notice')}
        {error && (
          <span className="gba:block gba:mt-1 gba:text-muted-foreground" data-testid={`${dataTestId}-error`}>
            {`${t('billing-connection-detail')}: ${error}`}
          </span>
        )}
      </AlertDescription>
    </Alert>
  )
}

export default BillingSampleNotice
