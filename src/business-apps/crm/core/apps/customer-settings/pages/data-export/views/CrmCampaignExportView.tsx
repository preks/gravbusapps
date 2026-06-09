import React, { useCallback, useMemo } from 'react'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EntityExportPage } from '@/common/components/common-relations/apps/data-export'
import { RELATION_ENTITY_ICONS } from '@/common/components/common-relations/constants/relationEntityIcons'
import { useSalesCampaignQueries } from '@/business-apps/crm/campaigns/apps/campaign-management/components/campaign-list/hooks/useSalesCampaignQueries'
import { useGetCampaignTypes } from '@/business-apps/crm/campaigns/apps/campaign-management/components/campaign-list/hooks/useGetCampaignTypes'
import { cloneFilterConfiguration } from '@/common/components/common-relations/apps/data-export/utils/cloneFilterConfiguration'
import { createCrmCampaignExportDefinition } from '../crmCampaignExportDefinition'
import translations from '../_i18n'

export interface CrmCampaignExportViewProps extends BusinessAppContextProps {
  onBack?: () => void
}

function injectCampaignTypeOptions(
  config: FilterConfiguration,
  campaignTypeOptions: Array<{ id: string; label: string }>
): FilterConfiguration {
  const nextConfig = cloneFilterConfiguration(config)
  const typeGroup = nextConfig.groups.find(group => group.id === 'type-group')
  const typeFilter = typeGroup?.filters.find(filter => filter.id === 'types')

  if (typeFilter?.config && 'options' in typeFilter.config) {
    typeFilter.config.options = campaignTypeOptions.map(option => ({
      id: option.id,
      label: option.label
    }))
    typeFilter.config.totalCount = campaignTypeOptions.length
  }

  return nextConfig
}

export const CrmCampaignExportView: React.FC<CrmCampaignExportViewProps> = ({ onBack, ...context }) => {
  const { t } = useTranslation(translations)
  const accessToken = context.accessToken ?? ''
  const { fetchSalesCampaignsWithCount } = useSalesCampaignQueries({ accessToken })
  const { campaignTypeOptions, isLoading: isCampaignTypesLoading } = useGetCampaignTypes(context)

  const definition = useMemo(
    () => ({
      ...createCrmCampaignExportDefinition(fetchSalesCampaignsWithCount),
      entityLabel: t('campaign-entity-type')
    }),
    [fetchSalesCampaignsWithCount, t]
  )

  const enhanceFilterConfig = useCallback(
    (config: FilterConfiguration) => injectCampaignTypeOptions(config, campaignTypeOptions),
    [campaignTypeOptions]
  )

  return (
    <EntityExportPage
      {...context}
      definition={definition}
      headerIcon={RELATION_ENTITY_ICONS.campaign}
      headerTitle={t('campaign-page-title')}
      headerDescription={t('campaign-page-description')}
      onBack={onBack}
      prefixDataTestId="CrmCampaignExportView"
      enhanceFilterConfig={enhanceFilterConfig}
      externalFilterLoading={isCampaignTypesLoading}
    />
  )
}

export default CrmCampaignExportView
