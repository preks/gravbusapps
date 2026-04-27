/**
 * CrmEntityImportView
 *
 * CRM-flavored import view. Wires the shared `EntityImportView` with:
 *  - Campaign selection on the upload step (CRM-only)
 *  - The CRM submission strategy
 *
 * Enforced catalog selects (e.g. lead Status / Source / Rating) are driven
 * by `ImportConfig.enforcedSelects` and resolved inside `EntityImportView` —
 * this wrapper never touches them directly.
 *
 * Used by all four CRM data-import screens (lead / contact / account /
 * opportunity).
 */

import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import { useCrmImportSubmissionStrategy } from '@/common/components/common-relations/apps/data-import/hooks'
import { EntityImportView } from './EntityImportView'

export interface CrmEntityImportViewProps extends BusinessAppContextProps {
  config: ImportConfig
  headerTitle: string
  headerDescription: string
  entityType: string
  entityTypeSingular: string
  onBack?: () => void
  'data-testid'?: string
}

export const CrmEntityImportView: React.FC<CrmEntityImportViewProps> = ({
  config,
  headerTitle,
  headerDescription,
  entityType,
  entityTypeSingular,
  onBack,
  'data-testid': testId = 'crm-entity-import-view',
  ...context
}) => {
  const submissionStrategy = useCrmImportSubmissionStrategy(config)

  return (
    <EntityImportView
      config={config}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
      entityType={entityType}
      entityTypeSingular={entityTypeSingular}
      enableCampaignSelection
      submissionStrategy={submissionStrategy}
      onBack={onBack}
      data-testid={testId}
      {...context}
    />
  )
}

export default CrmEntityImportView
