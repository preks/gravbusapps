import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityImportView } from '@/common/components/common-relations/apps/data-import/components'
import { investmentLeadImportConfig } from '@/common/data/investment/types/investmentLeadImportConfig'
import translations from './_i18n'

export interface LeadImportViewProps extends BusinessAppContextProps {
  onBack?: () => void
  'data-testid'?: string
}

export const LeadImportView: React.FC<LeadImportViewProps> = ({
  onBack,
  'data-testid': testId = 'lead-import-view',
  ...context
}) => {
  const { t } = useTranslation(translations)

  return (
    <EntityImportView
      config={investmentLeadImportConfig}
      headerTitle={t('page-title')}
      headerDescription={t('page-description')}
      entityType={t('entity-type')}
      entityTypeSingular={t('entity-type-singular')}
      onBack={onBack}
      data-testid={testId}
      {...context}
    />
  )
}

export default LeadImportView
