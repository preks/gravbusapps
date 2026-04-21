import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { IrmEntityImportView } from '@/common/components/common-relations/apps/data-import/components'
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
    <IrmEntityImportView
      config={investmentLeadImportConfig}
      headerTitle={t('lead-page-title')}
      headerDescription={t('lead-page-description')}
      entityType={t('lead-entity-type')}
      entityTypeSingular={t('lead-entity-type-singular')}
      onBack={onBack}
      data-testid={testId}
      {...context}
    />
  )
}

export default LeadImportView
