import React, { useCallback, useMemo } from 'react'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityExportPage } from '@/common/components/common-relations/apps/data-export'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useInvestmentAccountFilter } from '@/business-apps/irm/investments/apps/investment-management/views/investment-view/hooks/useInvestmentAccountFilter'
import { useInvestmentGroups } from '@/business-apps/irm/investments/apps/investment-management/views/investment-view/hooks/useInvestmentGroups'
import { cloneFilterConfiguration } from '@/common/components/common-relations/apps/data-export/utils/cloneFilterConfiguration'
import { createIrmInvestmentReportExportDefinition } from '../irmInvestmentReportExportDefinition'
import translations from '../_i18n'

export interface IrmInvestmentReportExportViewProps extends BusinessAppContextProps {
  onBack?: () => void
}

function injectInvestmentGroupOptions(
  config: FilterConfiguration,
  groupOptions: Array<{ id: string; label: string }>
): FilterConfiguration {
  const nextConfig = cloneFilterConfiguration(config)
  const investmentGroup = nextConfig.groups.find(group => group.id === 'investment-group-group')
  const groupFilter = investmentGroup?.filters.find(filter => filter.id === 'investmentGroupIds')

  if (groupFilter?.config && 'options' in groupFilter.config) {
    groupFilter.config.options = groupOptions.map(option => ({
      id: option.id,
      label: option.label
    }))
    groupFilter.config.totalCount = groupOptions.length
  }

  return nextConfig
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

export const IrmInvestmentReportExportView: React.FC<IrmInvestmentReportExportViewProps> = ({ onBack, ...context }) => {
  const { t } = useTranslation(translations)
  const accessToken = context.accessToken ?? ''
  const graphqlClient = useGraphQLClient(accessToken)
  const { accounts: accountOptions, isLoading: isAccountsLoading } = useInvestmentAccountFilter(accessToken, true)
  const { investmentGroups, isLoading: isGroupsLoading } = useInvestmentGroups(accessToken)

  const groupOptions = useMemo(
    () => investmentGroups.map(group => ({ id: group.id, label: group.label })),
    [investmentGroups]
  )

  const definition = useMemo(
    () => ({
      ...createIrmInvestmentReportExportDefinition(graphqlClient),
      entityLabel: t('investment-report-entity-type')
    }),
    [graphqlClient, t]
  )

  const enhanceFilterConfig = useCallback(
    (config: FilterConfiguration) =>
      injectInvestmentGroupOptions(injectInvestmentAccountOptions(config, accountOptions), groupOptions),
    [accountOptions, groupOptions]
  )

  return (
    <EntityExportPage
      {...context}
      definition={definition}
      headerIcon={RELATION_ENTITY_ICONS.investmentReport}
      headerTitle={t('investment-report-page-title')}
      headerDescription={t('investment-report-page-description')}
      onBack={onBack}
      prefixDataTestId="IrmInvestmentReportExportView"
      enhanceFilterConfig={enhanceFilterConfig}
      externalFilterLoading={isAccountsLoading || isGroupsLoading}
    />
  )
}

export default IrmInvestmentReportExportView
