import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityExportPage } from '@/common/components/common-relations/apps/data-export'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { useCustomerOpportunities } from '@/common/data/customer/hooks/useCustomerOpportunities'
import { createCrmOpportunityExportDefinition } from '../crmOpportunityExportDefinition'
import translations from '../_i18n'

export interface CrmOpportunityExportViewProps extends BusinessAppContextProps {
  onBack?: () => void
}

export const CrmOpportunityExportView: React.FC<CrmOpportunityExportViewProps> = ({ onBack, ...context }) => {
  const { t } = useTranslation(translations)
  const { fetchCustomerOpportunities } = useCustomerOpportunities(context)

  const definition = useMemo(
    () => ({
      ...createCrmOpportunityExportDefinition(fetchCustomerOpportunities),
      entityLabel: t('opportunity-entity-type')
    }),
    [fetchCustomerOpportunities, t]
  )

  return (
    <EntityExportPage
      {...context}
      definition={definition}
      headerIcon={RELATION_ENTITY_ICONS.opportunity}
      headerTitle={t('opportunity-page-title')}
      headerDescription={t('opportunity-page-description')}
      onBack={onBack}
      prefixDataTestId="CrmOpportunityExportView"
    />
  )
}

export default CrmOpportunityExportView
