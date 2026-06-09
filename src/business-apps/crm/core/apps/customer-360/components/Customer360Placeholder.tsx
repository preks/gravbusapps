import React from 'react'
import { EmptyState, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import customer360I18n from '../_i18n'

interface Customer360PlaceholderProps {
  /** Stable test id for the owning view. */
  testId: string
  /** i18n key for the placeholder title (typically the tab label). */
  titleKey: string
}

/**
 * Shared empty/loading placeholder used by every Phase 0 tab view. Feature
 * workers replace their view body with real content and drop this placeholder.
 */
const Customer360Placeholder: React.FC<Customer360PlaceholderProps> = ({ testId, titleKey }) => {
  const { t } = useFluentTranslation(customer360I18n)

  return (
    <div className="gba:col-span-12" data-testid={testId}>
      <EmptyState type="custom" title={t(titleKey)} description={t('placeholder-description')} />
    </div>
  )
}

export default Customer360Placeholder
export { Customer360Placeholder }
