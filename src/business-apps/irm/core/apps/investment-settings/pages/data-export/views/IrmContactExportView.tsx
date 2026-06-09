import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityExportPage } from '@/common/components/common-relations/apps/data-export'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { useInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import { createIrmContactExportDefinition } from '../irmContactExportDefinition'
import translations from '../_i18n'

export interface IrmContactExportViewProps extends BusinessAppContextProps {
  onBack?: () => void
}

export const IrmContactExportView: React.FC<IrmContactExportViewProps> = ({ onBack, ...context }) => {
  const { t } = useTranslation(translations)
  const { fetchInvestmentContacts } = useInvestmentContacts(context)

  const definition = useMemo(
    () => ({
      ...createIrmContactExportDefinition(fetchInvestmentContacts),
      entityLabel: t('contact-entity-type')
    }),
    [fetchInvestmentContacts, t]
  )

  return (
    <EntityExportPage
      {...context}
      definition={definition}
      headerIcon={RELATION_ENTITY_ICONS.contact}
      headerTitle={t('contact-page-title')}
      headerDescription={t('contact-page-description')}
      onBack={onBack}
      prefixDataTestId="IrmContactExportView"
    />
  )
}

export default IrmContactExportView
