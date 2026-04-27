import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { IrmEntityImportView } from '@/common/components/common-relations/apps/data-import/components'
import { investmentAccountImportConfig } from '@/common/data/investment/types/investmentAccountImportConfig'
import translations from './_i18n'

export interface AccountImportViewProps extends BusinessAppContextProps {
  onBack?: () => void
  'data-testid'?: string
}

export const AccountImportView: React.FC<AccountImportViewProps> = ({
  onBack,
  'data-testid': testId = 'account-import-view',
  ...context
}) => {
  const { t } = useTranslation(translations)

  return (
    <IrmEntityImportView
      config={investmentAccountImportConfig}
      headerTitle={t('account-page-title')}
      headerDescription={t('account-page-description')}
      entityType={t('account-entity-type')}
      entityTypeSingular={t('account-entity-type-singular')}
      onBack={onBack}
      data-testid={testId}
      {...context}
    />
  )
}

export default AccountImportView
