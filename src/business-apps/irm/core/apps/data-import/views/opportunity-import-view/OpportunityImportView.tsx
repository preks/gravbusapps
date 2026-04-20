import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityImportView } from '@/common/components/common-relations/apps/data-import/components'
import { investmentOpportunityImportConfig } from '@/common/data/investment/types/investmentOpportunityImportConfig'
import translations from './_i18n'

export interface OpportunityImportViewProps extends BusinessAppContextProps {
  onBack?: () => void
  'data-testid'?: string
}

export const OpportunityImportView: React.FC<OpportunityImportViewProps> = ({
  onBack,
  'data-testid': testId = 'opportunity-import-view',
  ...context
}) => {
  const { t } = useTranslation(translations)

  return (
    <EntityImportView
      config={investmentOpportunityImportConfig}
      headerTitle={t('opportunity-page-title')}
      headerDescription={t('opportunity-page-description')}
      entityType={t('opportunity-entity-type')}
      entityTypeSingular={t('opportunity-entity-type-singular')}
      onBack={onBack}
      data-testid={testId}
      {...context}
    />
  )
}

export default OpportunityImportView
