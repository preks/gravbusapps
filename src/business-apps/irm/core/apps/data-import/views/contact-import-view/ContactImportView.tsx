import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityImportView } from '@/common/components/common-relations/apps/data-import/components'
import { investmentContactImportConfig } from '@/common/data/investment/types/investmentContactImportConfig'
import translations from './_i18n'

export interface ContactImportViewProps extends BusinessAppContextProps {
  onBack?: () => void
  'data-testid'?: string
}

export const ContactImportView: React.FC<ContactImportViewProps> = ({
  onBack,
  'data-testid': testId = 'contact-import-view',
  ...context
}) => {
  const { t } = useTranslation(translations)

  return (
    <EntityImportView
      config={investmentContactImportConfig}
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

export default ContactImportView
