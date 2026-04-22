/**
 * Error state shown on the IRM Data Import index when the
 * `InvestmentGroup` catalog fails to load. Without those entries the
 * import flow has no valid `investmentGroupRef` to send to the backend, so
 * we explicitly stop the user instead of letting them fill out a CSV that
 * would be rejected on submit. The retry button calls back into
 * `useInvestmentImportGroups.refetch`, no page reload required.
 */

import React from 'react'
import { Alert, AlertDescription, AlertTitle, Button, PageLayout, useTranslation } from '@newwork/nw-design-system'
import { FileArrowUpIcon } from '@phosphor-icons/react'
import translations from '../_i18n'

export interface DataImportErrorProps {
  errorMessage: string
  onRetry: () => void
  'data-testid'?: string
}

export const DataImportError: React.FC<DataImportErrorProps> = ({
  errorMessage,
  onRetry,
  'data-testid': testId = 'DataImport-error'
}) => {
  const { t } = useTranslation(translations)
  return (
    <PageLayout headerIcon={FileArrowUpIcon} headerTitle={t('data-import-header-title')} data-testid={testId}>
      <Alert variant="destructive" data-testid={`${testId}-alert`}>
        <AlertTitle>{t('data-import-load-error-title')}</AlertTitle>
        <AlertDescription>
          <p>{t('data-import-load-error-description')}</p>
          <p className="gba:mt-2 gba:text-sm gba:opacity-80">{errorMessage}</p>
          <Button variant="outline" size="sm" onClick={onRetry} className="gba:mt-3" data-testid={`${testId}-retry`}>
            {t('data-import-load-error-retry')}
          </Button>
        </AlertDescription>
      </Alert>
    </PageLayout>
  )
}

export default DataImportError
