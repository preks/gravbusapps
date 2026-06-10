import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityExportPage } from '@/common/components/common-relations/apps/data-export'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { useCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'
import { createCrmContactExportDefinition } from '../crmContactExportDefinition'
import translations from '../_i18n'

export interface CrmContactExportViewProps extends BusinessAppContextProps {
  onBack?: () => void
}

export const CrmContactExportView: React.FC<CrmContactExportViewProps> = ({ onBack, ...context }) => {
  const { t } = useTranslation(translations)
  const { fetchCustomerContacts } = useCustomerContacts(context)

  const definition = useMemo(
    () => ({
      ...createCrmContactExportDefinition(fetchCustomerContacts),
      entityLabel: t('contact-entity-type')
    }),
    [fetchCustomerContacts, t]
  )

  return (
    <EntityExportPage
      {...context}
      definition={definition}
      headerIcon={RELATION_ENTITY_ICONS.contact}
      headerTitle={t('contact-page-title')}
      headerDescription={t('contact-page-description')}
      onBack={onBack}
      prefixDataTestId="CrmContactExportView"
    />
  )
}

export default CrmContactExportView
