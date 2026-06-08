export type CampaignSettingsGroup = 'setup' | 'targeting' | 'distribution' | 'engagement'

export type CampaignSettingsCatalog =
  | 'types'
  | 'statuses'
  | 'segments'
  | 'personas'
  | 'value-pack-focus'
  | 'funnel-stages'
  | 'channels'
  | 'distribution-types'
  | 'engagement-levels'

export const CAMPAIGN_SETTINGS_GROUP_CATALOGS: Record<CampaignSettingsGroup, CampaignSettingsCatalog[]> = {
  setup: ['types', 'statuses'],
  targeting: ['segments', 'personas', 'value-pack-focus'],
  distribution: ['funnel-stages', 'channels', 'distribution-types'],
  engagement: ['engagement-levels']
}

const buildCatalogToGroupMap = (): Record<CampaignSettingsCatalog, CampaignSettingsGroup> => {
  const catalogToGroup = {} as Record<CampaignSettingsCatalog, CampaignSettingsGroup>
  const groups = Object.keys(CAMPAIGN_SETTINGS_GROUP_CATALOGS) as CampaignSettingsGroup[]

  for (const group of groups) {
    for (const catalog of CAMPAIGN_SETTINGS_GROUP_CATALOGS[group]) {
      catalogToGroup[catalog] = group
    }
  }

  return catalogToGroup
}

const CATALOG_TO_GROUP = buildCatalogToGroupMap()

const isCampaignSettingsGroup = (value: string): value is CampaignSettingsGroup =>
  value in CAMPAIGN_SETTINGS_GROUP_CATALOGS

const isCampaignSettingsCatalog = (value: string): value is CampaignSettingsCatalog => value in CATALOG_TO_GROUP

const normalizeGroupTabParam = (tabParam?: string | null): string | null | undefined => {
  if (!tabParam) {
    return tabParam
  }
  if (tabParam === 'content') {
    return 'distribution'
  }
  return tabParam
}

const resolveCatalogInGroup = (group: CampaignSettingsGroup, catalogParam?: string | null): CampaignSettingsCatalog => {
  const catalogs = CAMPAIGN_SETTINGS_GROUP_CATALOGS[group]
  if (catalogParam && isCampaignSettingsCatalog(catalogParam) && catalogs.includes(catalogParam)) {
    return catalogParam
  }
  return catalogs[0]
}

export const resolveCampaignSettingsNavigation = (
  tabParam?: string | null,
  catalogParam?: string | null
): { group: CampaignSettingsGroup; catalog: CampaignSettingsCatalog } => {
  const normalizedTab = normalizeGroupTabParam(tabParam)

  if (normalizedTab && isCampaignSettingsGroup(normalizedTab)) {
    return { group: normalizedTab, catalog: resolveCatalogInGroup(normalizedTab, catalogParam) }
  }

  if (normalizedTab && isCampaignSettingsCatalog(normalizedTab)) {
    return { group: CATALOG_TO_GROUP[normalizedTab], catalog: normalizedTab }
  }

  if (tabParam && isCampaignSettingsCatalog(tabParam)) {
    return { group: CATALOG_TO_GROUP[tabParam], catalog: tabParam }
  }

  if (catalogParam && isCampaignSettingsCatalog(catalogParam)) {
    return { group: CATALOG_TO_GROUP[catalogParam], catalog: catalogParam }
  }

  return { group: 'setup', catalog: 'types' }
}

export const syncCampaignSettingsUrl = (group: CampaignSettingsGroup, catalog: CampaignSettingsCatalog) => {
  const params = new URLSearchParams(globalThis.location.search)
  if (!params.get('page')) {
    return
  }
  params.set('tab', group)
  params.set('catalog', catalog)
  const newUrl = `${globalThis.location.pathname}?${params.toString()}`
  globalThis.history.replaceState({}, '', newUrl)
}
