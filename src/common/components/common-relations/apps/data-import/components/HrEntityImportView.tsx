/**
 * HrEntityImportView
 *
 * HR-flavored import view. Wires the shared `EntityImportView` with the HR
 * submission strategy. The HR flow does not use the CRM campaign selector or
 * any IRM-style analyzer context; enforced catalog selects (Salutation /
 * Contract Type / Employment Type) come from `ImportConfig.enforcedSelects`
 * and are resolved inside `EntityImportView`.
 *
 * Used by the Employee data-import screen under HR.
 */

import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import { useHrImportSubmissionStrategy } from '@/common/components/common-relations/apps/data-import/hooks'
import { EntityImportView } from './EntityImportView'

export interface HrEntityImportViewProps extends BusinessAppContextProps {
  config: ImportConfig
  headerTitle: string
  headerDescription: string
  entityType: string
  entityTypeSingular: string
  onBack?: () => void
  'data-testid'?: string
}

export const HrEntityImportView: React.FC<HrEntityImportViewProps> = ({
  config,
  headerTitle,
  headerDescription,
  entityType,
  entityTypeSingular,
  onBack,
  'data-testid': testId = 'hr-entity-import-view',
  ...context
}) => {
  const submissionStrategy = useHrImportSubmissionStrategy(config)

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

export default HrEntityImportView
