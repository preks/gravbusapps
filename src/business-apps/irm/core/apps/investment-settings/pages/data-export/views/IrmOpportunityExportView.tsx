import React, { useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityExportPage } from '@/common/components/common-relations/apps/data-export'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { createIrmOpportunityExportDefinition } from '../irmOpportunityExportDefinition'
import translations from '../_i18n'

export interface IrmOpportunityExportViewProps extends BusinessAppContextProps {
  onBack?: () => void
}

export const IrmOpportunityExportView: React.FC<IrmOpportunityExportViewProps> = ({ onBack, ...context }) => {
  const { t } = useTranslation(translations)
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)

  const fetchOpportunities = useCallback(
    async (variables: InvestmentOpportunityQueryVariables) => {
      const result = await fetchInvestmentOpportunities(variables)
      return {
        opportunities: result.InvestmentOpportunity ?? [],
        total: result.InvestmentOpportunityAggregate?.aggregate?.count ?? 0
      }
    },
    [fetchInvestmentOpportunities]
  )

  const definition = useMemo(
    () => ({
      ...createIrmOpportunityExportDefinition(fetchOpportunities),
      entityLabel: t('opportunity-entity-type')
    }),
    [fetchOpportunities, t]
  )

  return (
    <EntityExportPage
      {...context}
      definition={definition}
      headerIcon={RELATION_ENTITY_ICONS.opportunity}
      headerTitle={t('opportunity-page-title')}
      headerDescription={t('opportunity-page-description')}
      onBack={onBack}
      prefixDataTestId="IrmOpportunityExportView"
    />
  )
}

export default IrmOpportunityExportView
