/**
 * IrmEntityImportView
 *
 * IRM-flavored import view. Wires the shared `EntityImportView` with the
 * IRM submission strategy.
 *
 * Enforced catalog selects (lead Status / Source / Rating, Investment Type,
 * Liquid Fund Type, …) are driven by `ImportConfig.enforcedSelects` and
 * resolved inside `EntityImportView` — this wrapper never touches them
 * directly.
 *
 * No campaign selection (CRM-only). Used by all IRM data-import screens.
 */

import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import { useIrmImportSubmissionStrategy } from '@/common/components/common-relations/apps/data-import/hooks'
import { EntityImportView } from './EntityImportView'

export interface IrmEntityImportViewProps extends BusinessAppContextProps {
  config: ImportConfig
  headerTitle: string
  headerDescription: string
  entityType: string
  entityTypeSingular: string
  onBack?: () => void
  'data-testid'?: string
}

export const IrmEntityImportView: React.FC<IrmEntityImportViewProps> = ({
  config,
  headerTitle,
  headerDescription,
  entityType,
  entityTypeSingular,
  onBack,
  'data-testid': testId = 'irm-entity-import-view',
  ...context
}) => {
  const submissionStrategy = useIrmImportSubmissionStrategy(config)

  return (
    <EntityImportView
      config={config}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
      entityType={entityType}
      entityTypeSingular={entityTypeSingular}
      submissionStrategy={submissionStrategy}
      onBack={onBack}
      data-testid={testId}
      {...context}
    />
  )
}

export default IrmEntityImportView
