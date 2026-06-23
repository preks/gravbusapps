import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { IrmEntityImportView } from '@/common/components/common-relations/apps/data-import/components'
import { equityInvestmentRoundImportConfig } from '../../config/equityInvestmentRoundImportConfig'
import translations from './_i18n'

export interface EquityInvestmentRoundImportViewProps extends BusinessAppContextProps {
  onBack?: () => void
  'data-testid'?: string
}

export const EquityInvestmentRoundImportView: React.FC<EquityInvestmentRoundImportViewProps> = ({
  onBack,
  'data-testid': testId = 'equity-investment-round-import-view',
  ...context
}) => {
  const { t } = useTranslation(translations)

  return (
    <IrmEntityImportView
      config={equityInvestmentRoundImportConfig}
      headerTitle={t('page-title')}
      headerDescription={t('page-description')}
      entityType={t('entity-plural')}
      entityTypeSingular={t('entity-singular')}
      onBack={onBack}
      data-testid={testId}
      {...context}
    />
  )
}

export default EquityInvestmentRoundImportView
