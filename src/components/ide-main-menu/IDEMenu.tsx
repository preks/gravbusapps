import React from 'react'
import {
  ShellSidebar,
  type SidebarSection,
  type SidebarNavigationItem,
  type ShellSidebarBrand
} from '@newwork/nw-design-system'
import { PlayIcon, ArticleNyTimesIcon, ChatCircleIcon, HouseIcon, FolderIcon } from '@phosphor-icons/react'
import { NAVIGATION_BASE_PATH } from '@/common/utils/navigationUtils'
import { type MenuConfiguration, resolveNodeConfiguration, renderConfiguredPhosphorIcon } from './menuConfiguration'

const getBasePath = (): string => (typeof window !== 'undefined' ? window.location.pathname || '/' : '/')
const DEFAULT_SUBMODULE_ID = 'default'
const EXAMPLES_MODULE_ID = 'examples'
const PUBLIC_LOGOMARK_URL = '/logomark.svg'
const PUBLIC_WORDMARK_URL = '/wordmark.svg'

export interface BusinessAppInfo {
  name: string
  path: string
  module: string
  subModule?: string
  screenKey: string
  type: BusinessAppType
}

type BusinessAppType = 'app' | 'record' | 'form' | 'popup' | 'window'

const BUSINESS_APP_SORT_ORDER: Record<BusinessAppType, number> = {
  app: 0,
  record: 1,
  form: 2,
  window: 3,
  popup: 4
}

export interface IDEMenuProps {
  businessApps: BusinessAppInfo[]
  menuConfiguration?: MenuConfiguration
  activeMainModuleFilter?: string | null
  activeSubModuleFilter?: string | null
  selectedApp?: BusinessAppInfo | null
  onAppSelect: (app: BusinessAppInfo) => void
  onHomeClick: () => void
}

type GroupedApps = Record<string, Record<string, BusinessAppInfo[]>>

const groupBusinessAppsByModule = (businessApps: BusinessAppInfo[]): GroupedApps => {
  const moduleGroups: GroupedApps = {}

  businessApps.forEach(app => {
    if (!moduleGroups[app.module]) {
      moduleGroups[app.module] = {}
    }

    let subModuleName = 'default'
    if (app.subModule) {
      const parts = app.subModule.split('/')
      subModuleName = parts[0]
    }

    if (!moduleGroups[app.module][subModuleName]) {
      moduleGroups[app.module][subModuleName] = []
    }

    moduleGroups[app.module][subModuleName].push(app)
  })

  return moduleGroups
}

const getPrimarySubModuleId = (businessApp: BusinessAppInfo): string =>
  businessApp.subModule?.split('/')[0] || DEFAULT_SUBMODULE_ID

const formatMenuLabel = (value: string): string => {
  if (value === DEFAULT_SUBMODULE_ID) {
    return 'General'
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

const getMenuAbbreviation = (value: string): string => formatMenuLabel(value).slice(0, 3).toUpperCase()

const createAppHref = (basePath: string, businessApp: BusinessAppInfo): string =>
  `${basePath}?${businessApp.type}=${encodeURIComponent(businessApp.screenKey)}`

const compareBusinessApps = (leftBusinessApp: BusinessAppInfo, rightBusinessApp: BusinessAppInfo): number => {
  const leftSortOrder = BUSINESS_APP_SORT_ORDER[leftBusinessApp.type]
  const rightSortOrder = BUSINESS_APP_SORT_ORDER[rightBusinessApp.type]

  if (leftSortOrder !== rightSortOrder) {
    return leftSortOrder - rightSortOrder
  }

  const nameComparison = leftBusinessApp.name.localeCompare(rightBusinessApp.name, undefined, { sensitivity: 'base' })
  if (nameComparison !== 0) {
    return nameComparison
  }

  return leftBusinessApp.screenKey.localeCompare(rightBusinessApp.screenKey)
}

const getTypeIcon = (type: BusinessAppType) => {
  switch (type) {
    case 'app':
      return <PlayIcon size={16} className="gba:text-info" />
    case 'record':
      return <PlayIcon size={16} className="gba:text-destructive" />
    case 'form':
      return <ArticleNyTimesIcon size={16} className="gba:text-success" />
    case 'popup':
      return <ChatCircleIcon size={16} className="gba:text-warning" />
    case 'window':
      return <ArticleNyTimesIcon size={16} className="gba:text-destructive" />
    default:
      return <PlayIcon size={16} className="gba:text-primary" />
  }
}

export const IDEMenu: React.FC<IDEMenuProps> = ({
  businessApps,
  menuConfiguration,
  activeMainModuleFilter,
  activeSubModuleFilter,
  selectedApp,
  onAppSelect,
  onHomeClick
}) => {
  const grouped = React.useMemo(() => groupBusinessAppsByModule(businessApps), [businessApps])
  const basePath = getBasePath()
  const homePath = NAVIGATION_BASE_PATH

  const sections: SidebarSection[] = React.useMemo(() => {
    const getModulePath = (moduleKey: string): string => moduleKey
    const getSubModulePath = (moduleKey: string, subModuleKey: string): string => `${moduleKey}/${subModuleKey}`
    const getAppPath = (businessApp: BusinessAppInfo): string =>
      businessApp.subModule ? `${businessApp.module}/${businessApp.subModule}` : businessApp.module

    const createAppNavigationItem = (businessApp: BusinessAppInfo): SidebarNavigationItem => ({
      id: `app:${businessApp.screenKey}`,
      label:
        resolveNodeConfiguration(menuConfiguration, [
          `app:${businessApp.screenKey}`,
          businessApp.screenKey,
          getAppPath(businessApp)
        ]).menuLabel ?? businessApp.name,
      icon:
        renderConfiguredPhosphorIcon(
          resolveNodeConfiguration(menuConfiguration, [
            `app:${businessApp.screenKey}`,
            businessApp.screenKey,
            getAppPath(businessApp)
          ]).icon,
          { size: 16 }
        ) ?? getTypeIcon(businessApp.type),
      active: selectedApp?.screenKey === businessApp.screenKey,
      href: createAppHref(basePath, businessApp),
      onClick: () => onAppSelect(businessApp)
    })

    const createSubModuleNavigationItem = (
      moduleKey: string,
      subModuleKey: string,
      subModuleApps: BusinessAppInfo[]
    ): SidebarNavigationItem => {
      const subModulePath = getSubModulePath(moduleKey, subModuleKey)
      const subModuleConfiguration = resolveNodeConfiguration(menuConfiguration, [
        `submodule:${moduleKey}:${subModuleKey}`,
        subModulePath
      ])
      const configuredSubModuleIcon = renderConfiguredPhosphorIcon(subModuleConfiguration.icon, {
        size: 16,
        className: 'gba:text-muted-foreground'
      })

      return {
        id: `submodule:${moduleKey}:${subModuleKey}`,
        label: subModuleConfiguration.menuLabel ?? formatMenuLabel(subModuleKey),
        icon: configuredSubModuleIcon ?? <FolderIcon size={16} className="gba:text-muted-foreground" />,
        abbreviation: getMenuAbbreviation(subModuleConfiguration.menuLabel ?? subModuleKey),
        active: selectedApp?.module === moduleKey && getPrimarySubModuleId(selectedApp) === subModuleKey,
        children: [...subModuleApps].sort(compareBusinessApps).map(createAppNavigationItem)
      }
    }

    const createModuleNavigationItem = (
      moduleKey: string,
      subModules: Record<string, BusinessAppInfo[]>
    ): SidebarNavigationItem => {
      const sortedSubModuleEntries = Object.entries(subModules).sort(([leftSubModuleKey], [rightSubModuleKey]) =>
        leftSubModuleKey.localeCompare(rightSubModuleKey)
      )
      const moduleConfiguration = resolveNodeConfiguration(menuConfiguration, [
        `module:${moduleKey}`,
        getModulePath(moduleKey)
      ])
      const configuredModuleIcon = renderConfiguredPhosphorIcon(moduleConfiguration.icon, { size: 16 })
      const moduleLabel = moduleConfiguration.menuLabel ?? formatMenuLabel(moduleKey)

      return {
        id: `module:${moduleKey}`,
        label: moduleLabel,
        icon: configuredModuleIcon ?? undefined,
        abbreviation: getMenuAbbreviation(moduleLabel),
        active: selectedApp?.module === moduleKey,
        children: sortedSubModuleEntries.map(([subModuleKey, subModuleApps]) =>
          createSubModuleNavigationItem(moduleKey, subModuleKey, subModuleApps)
        )
      }
    }

    const filterableModules = Object.entries(grouped)
      .filter(([moduleKey]) => moduleKey !== EXAMPLES_MODULE_ID)
      .sort(([leftModuleKey], [rightModuleKey]) => leftModuleKey.localeCompare(rightModuleKey))

    const hasExamples = grouped[EXAMPLES_MODULE_ID] && Object.keys(grouped[EXAMPLES_MODULE_ID]).length > 0
    const exampleItems: SidebarNavigationItem[] = hasExamples
      ? [createModuleNavigationItem(EXAMPLES_MODULE_ID, grouped[EXAMPLES_MODULE_ID])]
      : []

    let moduleItems: SidebarNavigationItem[]
    if (!activeMainModuleFilter) {
      moduleItems = filterableModules.map(([moduleKey, subModules]) =>
        createModuleNavigationItem(moduleKey, subModules)
      )
    } else if (!activeSubModuleFilter) {
      moduleItems = Object.entries(grouped[activeMainModuleFilter] || {})
        .sort(([leftSubModuleKey], [rightSubModuleKey]) => leftSubModuleKey.localeCompare(rightSubModuleKey))
        .map(([subModuleKey, subModuleApps]) =>
          createSubModuleNavigationItem(activeMainModuleFilter, subModuleKey, subModuleApps)
        )
    } else {
      moduleItems = [...(grouped[activeMainModuleFilter]?.[activeSubModuleFilter] || [])]
        .sort(compareBusinessApps)
        .map(createAppNavigationItem)
    }
    const homeConfiguration = resolveNodeConfiguration(menuConfiguration, ['home'])
    const configuredHomeIcon = renderConfiguredPhosphorIcon(homeConfiguration.icon, { size: 16 })
    const activeModuleConfiguration = activeMainModuleFilter
      ? resolveNodeConfiguration(menuConfiguration, [`module:${activeMainModuleFilter}`, activeMainModuleFilter])
      : null
    const activeSubModuleConfiguration =
      activeMainModuleFilter && activeSubModuleFilter
        ? resolveNodeConfiguration(menuConfiguration, [
            `submodule:${activeMainModuleFilter}:${activeSubModuleFilter}`,
            `${activeMainModuleFilter}/${activeSubModuleFilter}`
          ])
        : null
    const examplesConfiguration = resolveNodeConfiguration(menuConfiguration, [
      `module:${EXAMPLES_MODULE_ID}`,
      EXAMPLES_MODULE_ID
    ])

    const modulesSectionLabel = !activeMainModuleFilter
      ? 'Modules'
      : !activeSubModuleFilter
        ? (activeModuleConfiguration?.menuLabel ?? formatMenuLabel(activeMainModuleFilter))
        : (activeSubModuleConfiguration?.menuLabel ?? formatMenuLabel(activeSubModuleFilter))

    const sections: SidebarSection[] = [
      {
        id: 'ide-home-navigation',
        label: 'Home',
        items: [
          {
            id: 'home',
            label: homeConfiguration.menuLabel ?? 'Home',
            icon: configuredHomeIcon ?? <HouseIcon size={16} />,
            active: !selectedApp,
            href: homePath,
            onClick: onHomeClick
          }
        ]
      }
    ]

    if (moduleItems.length > 0) {
      sections.push({
        id: 'ide-modules-navigation',
        label: modulesSectionLabel,
        items: moduleItems
      })
    }

    if (exampleItems.length > 0) {
      sections.push({
        id: 'ide-examples-navigation',
        label: examplesConfiguration.menuLabel ?? 'Examples',
        items: exampleItems
      })
    }

    return sections
  }, [
    activeMainModuleFilter,
    activeSubModuleFilter,
    grouped,
    selectedApp,
    menuConfiguration,
    onAppSelect,
    onHomeClick,
    basePath,
    homePath
  ])

  const brand: ShellSidebarBrand = React.useMemo(
    () => ({
      logomark: <img src={PUBLIC_LOGOMARK_URL} alt="" className="nw:size-8 nw:object-contain" />,
      wordmark: <img src={PUBLIC_WORDMARK_URL} alt="" className="nw:h-8 nw:w-auto nw:object-contain" />,
      href: homePath,
      onClick: onHomeClick,
      ariaLabel: 'Home'
    }),
    [homePath, onHomeClick]
  )

  return <ShellSidebar brand={brand} sections={sections} data-testid="ide-main-menu" />
}

export const IDEMainMenu = IDEMenu

export default IDEMenu
