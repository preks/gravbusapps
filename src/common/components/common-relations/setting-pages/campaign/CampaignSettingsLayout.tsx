import React, { useEffect, useMemo, useState } from 'react'
import { PageLayout, Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { MegaphoneIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '../hooks/useCatalogSettings'
import { getCatalogUsageCheckSpecs, useCatalogDeleteAvailability } from '../hooks/useCatalogDeleteAvailability'
import { CatalogTab } from '../components/CatalogTab'
import {
  CAMPAIGN_SETTINGS_GROUP_CATALOGS,
  resolveCampaignSettingsNavigation,
  syncCampaignSettingsUrl,
  type CampaignSettingsCatalog,
  type CampaignSettingsGroup
} from './campaignSettingsNavigation'

export type { CampaignSettingsCatalog, CampaignSettingsGroup } from './campaignSettingsNavigation'

export interface CampaignSettingsConfig {
  typeCatalog: string
  statusCatalog: string
  segmentCatalog: string
  personaCatalog: string
  valuePackFocusCatalog: string
  funnelStageCatalog: string
  channelCatalog: string
  distributionTypeCatalog: string
  engagementLevelCatalog: string
  dataTestIdPrefix: string
  headerTitle?: string
  headerDescription?: string
  groupLabels: Record<CampaignSettingsGroup, string>
}

export interface CampaignSettingsLayoutProps extends BusinessAppContextProps {
  config: CampaignSettingsConfig
  initialGroup?: CampaignSettingsGroup
  initialCatalog?: CampaignSettingsCatalog
  /** @deprecated Prefer initialGroup + initialCatalog; leaf catalog IDs still resolve correctly. */
  initialTab?: CampaignSettingsCatalog
  onBack?: () => void
  className?: string
}

const CATALOG_LABELS: Record<CampaignSettingsCatalog, string> = {
  types: 'Types',
  statuses: 'Statuses',
  segments: 'Segments',
  personas: 'Personas',
  'value-pack-focus': 'Value Pack Focus',
  'funnel-stages': 'Funnel Stages',
  channels: 'Channels',
  'distribution-types': 'Distribution Types',
  'engagement-levels': 'Engagement Levels'
}

const CATALOG_ENTITY_NAMES: Record<CampaignSettingsCatalog, string> = {
  types: 'Campaign Type',
  statuses: 'Campaign Status',
  segments: 'Campaign Segment',
  personas: 'Customer Persona',
  'value-pack-focus': 'Value Pack Focus',
  'funnel-stages': 'Marketing Funnel Stage',
  channels: 'Marketing Channel',
  'distribution-types': 'Marketing Distribution Type',
  'engagement-levels': 'Engagement Level'
}

const readInitialNavigation = (
  initialGroup?: CampaignSettingsGroup,
  initialCatalog?: CampaignSettingsCatalog,
  initialTab?: CampaignSettingsCatalog
) => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const fromUrl = resolveCampaignSettingsNavigation(urlParams.get('tab'), urlParams.get('catalog'))

  if (initialGroup) {
    const catalogs = CAMPAIGN_SETTINGS_GROUP_CATALOGS[initialGroup]
    const catalog = initialCatalog && catalogs.includes(initialCatalog) ? initialCatalog : catalogs[0]
    return { group: initialGroup, catalog }
  }

  if (initialTab) {
    return resolveCampaignSettingsNavigation(initialTab, initialCatalog ?? null)
  }

  return fromUrl
}

export const CampaignSettingsLayout: React.FC<CampaignSettingsLayoutProps> = ({
  config,
  initialGroup,
  initialCatalog,
  initialTab,
  onBack,
  className,
  ...context
}) => {
  const initialNavigation = useMemo(
    () => readInitialNavigation(initialGroup, initialCatalog, initialTab),
    [initialGroup, initialCatalog, initialTab]
  )
  const [activeGroup, setActiveGroup] = useState<CampaignSettingsGroup>(initialNavigation.group)
  const [activeCatalog, setActiveCatalog] = useState<CampaignSettingsCatalog>(initialNavigation.catalog)

  useEffect(() => {
    syncCampaignSettingsUrl(activeGroup, activeCatalog)
  }, [activeGroup, activeCatalog])

  const types = useCatalogSettings(context, config.typeCatalog)
  const statuses = useCatalogSettings(context, config.statusCatalog)
  const segments = useCatalogSettings(context, config.segmentCatalog)
  const personas = useCatalogSettings(context, config.personaCatalog)
  const valuePackFocus = useCatalogSettings(context, config.valuePackFocusCatalog)
  const funnelStages = useCatalogSettings(context, config.funnelStageCatalog)
  const channels = useCatalogSettings(context, config.channelCatalog)
  const distributionTypes = useCatalogSettings(context, config.distributionTypeCatalog)
  const engagementLevels = useCatalogSettings(context, config.engagementLevelCatalog)

  const getTypeDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    CATALOG_ENTITY_NAMES.types,
    getCatalogUsageCheckSpecs(config.typeCatalog)
  )
  const getStatusDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    CATALOG_ENTITY_NAMES.statuses,
    getCatalogUsageCheckSpecs(config.statusCatalog)
  )
  const getSegmentDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    CATALOG_ENTITY_NAMES.segments,
    getCatalogUsageCheckSpecs(config.segmentCatalog)
  )
  const getPersonaDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    CATALOG_ENTITY_NAMES.personas,
    getCatalogUsageCheckSpecs(config.personaCatalog)
  )
  const getValuePackFocusDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    CATALOG_ENTITY_NAMES['value-pack-focus'],
    getCatalogUsageCheckSpecs(config.valuePackFocusCatalog)
  )
  const getFunnelStageDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    CATALOG_ENTITY_NAMES['funnel-stages'],
    getCatalogUsageCheckSpecs(config.funnelStageCatalog)
  )
  const getChannelDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    CATALOG_ENTITY_NAMES.channels,
    getCatalogUsageCheckSpecs(config.channelCatalog)
  )
  const getDistributionTypeDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    CATALOG_ENTITY_NAMES['distribution-types'],
    getCatalogUsageCheckSpecs(config.distributionTypeCatalog)
  )
  const getEngagementLevelDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    CATALOG_ENTITY_NAMES['engagement-levels'],
    getCatalogUsageCheckSpecs(config.engagementLevelCatalog)
  )

  const catalogPanels = useMemo(
    () => ({
      types: { settings: types, getDeleteAvailability: getTypeDeleteAvailability },
      statuses: { settings: statuses, getDeleteAvailability: getStatusDeleteAvailability },
      segments: { settings: segments, getDeleteAvailability: getSegmentDeleteAvailability },
      personas: { settings: personas, getDeleteAvailability: getPersonaDeleteAvailability },
      'value-pack-focus': {
        settings: valuePackFocus,
        getDeleteAvailability: getValuePackFocusDeleteAvailability
      },
      'funnel-stages': { settings: funnelStages, getDeleteAvailability: getFunnelStageDeleteAvailability },
      channels: { settings: channels, getDeleteAvailability: getChannelDeleteAvailability },
      'distribution-types': {
        settings: distributionTypes,
        getDeleteAvailability: getDistributionTypeDeleteAvailability
      },
      'engagement-levels': {
        settings: engagementLevels,
        getDeleteAvailability: getEngagementLevelDeleteAvailability
      }
    }),
    [
      types,
      statuses,
      segments,
      personas,
      valuePackFocus,
      funnelStages,
      channels,
      distributionTypes,
      engagementLevels,
      getTypeDeleteAvailability,
      getStatusDeleteAvailability,
      getSegmentDeleteAvailability,
      getPersonaDeleteAvailability,
      getValuePackFocusDeleteAvailability,
      getFunnelStageDeleteAvailability,
      getChannelDeleteAvailability,
      getDistributionTypeDeleteAvailability,
      getEngagementLevelDeleteAvailability
    ]
  )

  const handleGroupChange = (group: CampaignSettingsGroup) => {
    setActiveGroup(group)
    const catalogs = CAMPAIGN_SETTINGS_GROUP_CATALOGS[group]
    if (!catalogs.includes(activeCatalog)) {
      setActiveCatalog(catalogs[0])
    }
  }

  const renderCatalogPanel = (catalog: CampaignSettingsCatalog) => {
    const panel = catalogPanels[catalog]
    return (
      <CatalogTab
        entityName={CATALOG_ENTITY_NAMES[catalog]}
        dataTestId={`${config.dataTestIdPrefix}-${catalog}`}
        getDeleteAvailability={panel.getDeleteAvailability}
        {...panel.settings}
      />
    )
  }

  const renderGroupCatalogTabs = (group: CampaignSettingsGroup) => {
    const catalogs = CAMPAIGN_SETTINGS_GROUP_CATALOGS[group]

    if (catalogs.length === 1) {
      return renderCatalogPanel(catalogs[0])
    }

    return (
      <Tabs
        value={activeCatalog}
        onValueChange={value => setActiveCatalog(value as CampaignSettingsCatalog)}
        data-testid={`${config.dataTestIdPrefix}-${group}-CatalogTabs`}
      >
        <TabsList>
          {catalogs.map(catalog => (
            <TabsTrigger key={catalog} value={catalog}>
              {CATALOG_LABELS[catalog]}
            </TabsTrigger>
          ))}
        </TabsList>
        {catalogs.map(catalog => (
          <TabsContent key={catalog} value={catalog}>
            {renderCatalogPanel(catalog)}
          </TabsContent>
        ))}
      </Tabs>
    )
  }

  return (
    <PageLayout
      headerIcon={MegaphoneIcon}
      headerTitle={config.headerTitle || 'Campaign Data'}
      headerDescription={config.headerDescription}
      onBack={onBack}
      className={className}
      data-testid={`${config.dataTestIdPrefix}-Container`}
    >
      <Tabs
        value={activeGroup}
        onValueChange={value => handleGroupChange(value as CampaignSettingsGroup)}
        data-testid={`${config.dataTestIdPrefix}-GroupTabs`}
      >
        <TabsList>
          {(Object.keys(CAMPAIGN_SETTINGS_GROUP_CATALOGS) as CampaignSettingsGroup[]).map(group => (
            <TabsTrigger key={group} value={group}>
              {config.groupLabels[group]}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(CAMPAIGN_SETTINGS_GROUP_CATALOGS) as CampaignSettingsGroup[]).map(group => (
          <TabsContent key={group} value={group}>
            {activeGroup === group ? renderGroupCatalogTabs(group) : null}
          </TabsContent>
        ))}
      </Tabs>
    </PageLayout>
  )
}
