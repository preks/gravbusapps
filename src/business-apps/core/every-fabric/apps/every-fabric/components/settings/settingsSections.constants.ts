import { BrainIcon, ChartBarIcon, GearIcon, ShieldCheckIcon, type Icon } from '@phosphor-icons/react'

export type SettingsSectionId = 'configuration' | 'memory' | 'policies' | 'metrics'

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = 'configuration'

export interface SettingsSectionDefinition {
  id: SettingsSectionId
  label: string
  icon: Icon
  testId: string
  devToolsOnly?: boolean
}

export const SETTINGS_SECTIONS: ReadonlyArray<SettingsSectionDefinition> = [
  {
    id: 'configuration',
    label: 'Configuration',
    icon: GearIcon,
    testId: 'settings-section-nav-configuration'
  },
  {
    id: 'memory',
    label: 'Memory',
    icon: BrainIcon,
    testId: 'settings-section-nav-memory'
  },
  {
    id: 'policies',
    label: 'Default Policies',
    icon: ShieldCheckIcon,
    testId: 'settings-section-nav-policies'
  },
  {
    id: 'metrics',
    label: 'Usage & Metrics',
    icon: ChartBarIcon,
    testId: 'settings-section-nav-metrics',
    devToolsOnly: true
  }
]

const VALID_SECTION_IDS: ReadonlySet<SettingsSectionId> = new Set(SETTINGS_SECTIONS.map(section => section.id))

export function getVisibleSettingsSections(devToolsEnabled: boolean): SettingsSectionDefinition[] {
  return SETTINGS_SECTIONS.filter(section => !section.devToolsOnly || devToolsEnabled)
}

export function isValidSettingsSectionId(value: string | null): value is SettingsSectionId {
  return value !== null && VALID_SECTION_IDS.has(value as SettingsSectionId)
}

export function normaliseSettingsSection(value: string | null, devToolsEnabled: boolean): SettingsSectionId {
  if (!isValidSettingsSectionId(value)) {
    return DEFAULT_SETTINGS_SECTION
  }

  const section = SETTINGS_SECTIONS.find(item => item.id === value)
  if (section?.devToolsOnly && !devToolsEnabled) {
    return DEFAULT_SETTINGS_SECTION
  }

  return value
}
