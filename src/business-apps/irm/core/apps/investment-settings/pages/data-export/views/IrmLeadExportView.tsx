import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityExportPage } from '@/common/components/common-relations/apps/data-export'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { useInvestmentLeads } from '@/common/data/investment/hooks/useInvestmentLeads'
import { createIrmLeadExportDefinition } from '../irmLeadExportDefinition'
import translations from '../_i18n'

export interface IrmLeadExportViewProps extends BusinessAppContextProps {
  onBack?: () => void
}

export const IrmLeadExportView: React.FC<IrmLeadExportViewProps> = ({ onBack, ...context }) => {
  const { t } = useTranslation(translations)
  const { fetchInvestmentLeads } = useInvestmentLeads(context)

  const definition = useMemo(
    () => ({
      ...createIrmLeadExportDefinition(fetchInvestmentLeads),
      entityLabel: t('lead-entity-type')
    }),
    [fetchInvestmentLeads, t]
  )

  return (
    <EntityExportPage
      {...context}
      definition={definition}
      headerIcon={RELATION_ENTITY_ICONS.lead}
      headerTitle={t('lead-page-title')}
      headerDescription={t('lead-page-description')}
      onBack={onBack}
      prefixDataTestId="IrmLeadExportView"
    />
  )
}

export default IrmLeadExportView
