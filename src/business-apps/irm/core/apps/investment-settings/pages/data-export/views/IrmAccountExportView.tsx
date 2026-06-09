import React, { useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityExportPage } from '@/common/components/common-relations/apps/data-export'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { toInvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import type { InvestmentAccountQueryVariables } from '@/common/data/investment/queries/investmentAccountQueries'
import { createIrmAccountExportDefinition } from '../irmAccountExportDefinition'
import translations from '../_i18n'

export interface IrmAccountExportViewProps extends BusinessAppContextProps {
  onBack?: () => void
}

export const IrmAccountExportView: React.FC<IrmAccountExportViewProps> = ({ onBack, ...context }) => {
  const { t } = useTranslation(translations)
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context)

  const fetchAccounts = useCallback(
    async (variables: InvestmentAccountQueryVariables) => {
      const result = await fetchInvestmentAccounts(variables)
      return {
        accounts: (result.InvestmentAccount ?? []).map(toInvestmentAccount),
        total: result.InvestmentAccountAggregate?.aggregate?.count ?? 0
      }
    },
    [fetchInvestmentAccounts]
  )

  const definition = useMemo(
    () => ({
      ...createIrmAccountExportDefinition(fetchAccounts),
      entityLabel: t('account-entity-type')
    }),
    [fetchAccounts, t]
  )

  return (
    <EntityExportPage
      {...context}
      definition={definition}
      headerIcon={RELATION_ENTITY_ICONS.account}
      headerTitle={t('account-page-title')}
      headerDescription={t('account-page-description')}
      onBack={onBack}
      prefixDataTestId="IrmAccountExportView"
    />
  )
}

export default IrmAccountExportView
