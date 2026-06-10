import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityExportPage } from '@/common/components/common-relations/apps/data-export'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { useCustomerLeads } from '@/common/data/customer/hooks/useCustomerLeads'
import { createCrmLeadExportDefinition } from '../crmLeadExportDefinition'
import translations from '../_i18n'

export interface CrmLeadExportViewProps extends BusinessAppContextProps {
  onBack?: () => void
}

export const CrmLeadExportView: React.FC<CrmLeadExportViewProps> = ({ onBack, ...context }) => {
  const { t } = useTranslation(translations)
  const { fetchCustomerLeads } = useCustomerLeads(context)

  const definition = useMemo(
    () => ({
      ...createCrmLeadExportDefinition(fetchCustomerLeads),
      entityLabel: t('lead-entity-type')
    }),
    [fetchCustomerLeads, t]
  )

  return (
    <EntityExportPage
      {...context}
      definition={definition}
      headerIcon={RELATION_ENTITY_ICONS.lead}
      headerTitle={t('lead-page-title')}
      headerDescription={t('lead-page-description')}
      onBack={onBack}
      prefixDataTestId="CrmLeadExportView"
    />
  )
}

export default CrmLeadExportView
