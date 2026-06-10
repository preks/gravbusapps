import React, { useMemo } from 'react'
import { useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import {
  CampaignSettingsLayout,
  type CampaignSettingsCatalog,
  type CampaignSettingsGroup
} from '@/common/components/common-relations/setting-pages/campaign'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  CAMPAIGN_SEGMENT,
  CAMPAIGN_STATUS,
  CAMPAIGN_TYPE,
  CUSTOMER_ENGAGEMENT_LEVEL,
  CUSTOMER_PERSONA,
  MARKETING_CHANNEL,
  MARKETING_DISTRIBUTION_TYPE,
  MARKETING_FUNNEL_STAGE,
  VALUE_PACK_FOCUS
} from '@/common/data/customer/constants/customerCatalogs'
import customerSettingsI18n from '../../_i18n'

export interface CampaignDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
  initialGroup?: CampaignSettingsGroup
  initialCatalog?: CampaignSettingsCatalog
  /** @deprecated Use initialGroup; leaf catalog tab IDs still work for deep links. */
  initialTab?: CampaignSettingsCatalog
}

const getCatalogIdentifier = (catalogRef: string) => catalogRef.split(':')[0]

const CampaignDataPage: React.FC<CampaignDataPageProps> = props => {
  const { t } = useFluentTranslation(customerSettingsI18n)

  const config = useMemo(
    () => ({
      typeCatalog: getCatalogIdentifier(CAMPAIGN_TYPE),
      statusCatalog: getCatalogIdentifier(CAMPAIGN_STATUS),
      segmentCatalog: getCatalogIdentifier(CAMPAIGN_SEGMENT),
      personaCatalog: getCatalogIdentifier(CUSTOMER_PERSONA),
      valuePackFocusCatalog: getCatalogIdentifier(VALUE_PACK_FOCUS),
      funnelStageCatalog: getCatalogIdentifier(MARKETING_FUNNEL_STAGE),
      channelCatalog: getCatalogIdentifier(MARKETING_CHANNEL),
      distributionTypeCatalog: getCatalogIdentifier(MARKETING_DISTRIBUTION_TYPE),
      engagementLevelCatalog: getCatalogIdentifier(CUSTOMER_ENGAGEMENT_LEVEL),
      dataTestIdPrefix: 'CustomerCampaignDataPage',
      headerTitle: t('campaign-data-title'),
      headerDescription: t('campaign-data-description'),
      groupLabels: {
        setup: t('campaign-group-setup'),
        targeting: t('campaign-group-targeting'),
        distribution: t('campaign-group-distribution'),
        engagement: t('campaign-group-engagement')
      } satisfies Record<CampaignSettingsGroup, string>
    }),
    [t]
  )

  return <CampaignSettingsLayout config={config} {...props} />
}

export default CampaignDataPage
