import React from 'react'
import { Alert, AlertDescription, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { InfoIcon } from '@phosphor-icons/react'
import customer360I18n from '../../_i18n'

interface ProvisionalNoteProps {
  testId?: string
}

/**
 * Discloses that portfolio health metrics are heuristic placeholders derived
 * from CRM fields until the `customer-summary-list` backend aggregation lands.
 */
const ProvisionalNote: React.FC<ProvisionalNoteProps> = ({ testId = 'customer-360-provisional-note' }) => {
  const { t } = useFluentTranslation(customer360I18n)
  return (
    <Alert variant="default" data-testid={testId}>
      <InfoIcon className="gba:size-4" />
      <AlertDescription>{t('home-provisional-note')}</AlertDescription>
    </Alert>
  )
}

export default ProvisionalNote
export { ProvisionalNote }
