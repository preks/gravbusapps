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
 * Consistent sample-data notice used across billing screens. Shows a short
 * explanation that data is illustrative, plus the underlying connection error
 * (when a backend was configured but failed) so issues are diagnosable in-app.
 */
export const BillingSampleNotice: React.FC<BillingSampleNoticeProps> = ({
  show,
  error,
  dataTestId = 'billing-sample-notice'
}) => {
  const { t } = useTranslation(billingTranslations)
  if (!show) {
    return null
  }
  return (
    <Alert className="gba:mb-4" data-testid={dataTestId}>
      <AlertDescription>
        {t('billing-sample-data-notice')}
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
