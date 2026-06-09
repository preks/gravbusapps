import React, { useCallback, useMemo } from 'react'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityExportPage } from '@/common/components/common-relations/apps/data-export'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useInvestmentAccountFilter } from '@/business-apps/irm/investments/apps/investment-management/views/investment-view/hooks/useInvestmentAccountFilter'
import { cloneFilterConfiguration } from '@/common/components/common-relations/apps/data-export/utils/cloneFilterConfiguration'
import { createIrmInvestmentExportDefinition } from '../irmInvestmentExportDefinition'
import translations from '../_i18n'

export interface IrmInvestmentExportViewProps extends BusinessAppContextProps {
  onBack?: () => void
}

function injectInvestmentAccountOptions(
  config: FilterConfiguration,
  accountOptions: Array<{ id: string; label: string }>
): FilterConfiguration {
  const nextConfig = cloneFilterConfiguration(config)
  const accountGroup = nextConfig.groups.find(group => group.id === 'account-group')
  const accountFilter = accountGroup?.filters.find(filter => filter.id === 'investmentAccountIds')

  if (accountFilter?.config && 'options' in accountFilter.config) {
    accountFilter.config.options = accountOptions.map(option => ({
      id: option.id,
      label: option.label
    }))
    accountFilter.config.totalCount = accountOptions.length
  }

  return nextConfig
}

export const IrmInvestmentExportView: React.FC<IrmInvestmentExportViewProps> = ({ onBack, ...context }) => {
  const { t } = useTranslation(translations)
  const accessToken = context.accessToken ?? ''
  const graphqlClient = useGraphQLClient(accessToken)
  const { accounts: accountOptions, isLoading: isAccountsLoading } = useInvestmentAccountFilter(accessToken, true)

  const definition = useMemo(
    () => ({
      ...createIrmInvestmentExportDefinition(graphqlClient),
      entityLabel: t('investment-entity-type')
    }),
    [graphqlClient, t]
  )

  const enhanceFilterConfig = useCallback(
    (config: FilterConfiguration) => injectInvestmentAccountOptions(config, accountOptions),
    [accountOptions]
  )

  return (
    <EntityExportPage
      {...context}
      definition={definition}
      headerIcon={RELATION_ENTITY_ICONS.investment}
      headerTitle={t('investment-page-title')}
      headerDescription={t('investment-page-description')}
      onBack={onBack}
      prefixDataTestId="IrmInvestmentExportView"
      enhanceFilterConfig={enhanceFilterConfig}
      externalFilterLoading={isAccountsLoading}
    />
  )
}

export default IrmInvestmentExportView
