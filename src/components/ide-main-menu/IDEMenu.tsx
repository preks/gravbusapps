import React from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
  useSidebar,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@newwork/nw-design-system'
import { CaretRightIcon, CaretDownIcon, PlayIcon, ArticleNyTimesIcon, ChatCircleIcon } from '@phosphor-icons/react'

export interface BusinessAppInfo {
  name: string
  path: string
  module: string
  subModule?: string
  screenKey: string
  type: BusinessAppType
}

type BusinessAppType = 'app' | 'form' | 'popup' | 'window'

export interface IDEMainMenuProps {
  businessApps: BusinessAppInfo[]
  selectedApp?: BusinessAppInfo | null
  openKeys?: string[]
  onOpenChange?: (keys: string[]) => void
  onAppSelect: (app: BusinessAppInfo) => void
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

const getTypeIcon = (type: 'app' | 'form' | 'popup' | 'window') => {
  switch (type) {
    case 'app':
      return <PlayIcon size={16} className="gba:text-info" />
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

const getTypeColor = (type: 'app' | 'form' | 'popup' | 'window') => {
  switch (type) {
    case 'app':
      return 'primary'
    case 'form':
      return 'secondary'
    case 'popup':
      return 'accent'
    case 'window':
      return 'info'
    default:
      return 'primary'
  }
}

export const IDEMainMenu: React.FC<IDEMainMenuProps> = ({
  businessApps,
  selectedApp,
  openKeys = [],
  onOpenChange,
  onAppSelect
}) => {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  // Hover management for collapsed state (shows flyout on hover)
  const [hoverModule, setHoverModule] = React.useState<string | null>(null)
  const hoverTimeoutRef = React.useRef<number | null>(null)
  // Nested hover for submodules
  const [hoverSubmodule, setHoverSubmodule] = React.useState<string | null>(null)
  const hoverSubTimeoutRef = React.useRef<number | null>(null)

  const grouped = React.useMemo(() => groupBusinessAppsByModule(businessApps), [businessApps])

  const handleToggleKey = React.useCallback(
    (key: string, open: boolean) => {
      if (!onOpenChange) return
      const set = new Set(openKeys)
      if (open) {
        set.add(key)
      } else {
        set.delete(key)
      }
      onOpenChange(Array.from(set))
    },
    [openKeys, onOpenChange]
  )

  const renderAppButton = (app: BusinessAppInfo) => {
    const isActive = selectedApp?.screenKey === app.screenKey
    return (
      <SidebarMenuSubItem key={app.screenKey}>
        <SidebarMenuSubButton
          asChild
          isActive={isActive}
          className={`gba:text-primary ${isActive ? 'gba:bg-accent gba:text-accent-foreground' : ''}`}
          data-testid={`ide-main-menu-new-app-${app.screenKey}`}
        >
          <button type="button" onClick={() => onAppSelect(app)}>
            <span className={`gba:mr-2 gba:text-${getTypeColor(app.type)}`}>{getTypeIcon(app.type)}</span>
            <span>{app.name}</span>
          </button>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    )
  }

  const renderSubModuleCollapsible = (moduleKey: string, subModule: string, apps: BusinessAppInfo[]) => {
    const key = `${moduleKey}/${subModule}`
    const defaultOpen = openKeys.includes(key)
    const firstSelectedSub = selectedApp?.subModule?.split('/')[0] ?? 'default'
    const isSubActive = selectedApp?.module === moduleKey && firstSelectedSub === subModule
    const isOpen = openKeys.includes(key)
    return (
      <Collapsible key={key} defaultOpen={defaultOpen} open={isOpen} onOpenChange={open => handleToggleKey(key, open)}>
        <SidebarMenuSubItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuSubButton
              className={`gba:text-primary ${isSubActive ? 'gba:bg-accent gba:text-accent-foreground' : ''}`}
              data-testid={`ide-main-menu-new-submodule-${key}`}
              isActive={isSubActive}
            >
              <span>{subModule.charAt(0).toUpperCase() + subModule.slice(1)}</span>
              {isOpen ? <CaretDownIcon className="gba:ml-auto" /> : <CaretRightIcon className="gba:ml-auto" />}
            </SidebarMenuSubButton>
          </CollapsibleTrigger>
        </SidebarMenuSubItem>
        <CollapsibleContent>
          <SidebarMenuSub>{apps.map(renderAppButton)}</SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  const renderModuleMenu = (moduleKey: string, subModules: Record<string, BusinessAppInfo[]>) => {
    const moduleLabel = moduleKey.toUpperCase()
    const moduleAbbrev = moduleKey.slice(0, 4).toUpperCase()
    const moduleOpen = openKeys.includes(moduleKey)
    const isModuleActive = selectedApp?.module === moduleKey

    // Expanded: use Collapsible to show nested structure
    if (!isCollapsed) {
      return (
        <Collapsible
          key={moduleKey}
          asChild
          defaultOpen={moduleOpen}
          open={moduleOpen}
          onOpenChange={open => handleToggleKey(moduleKey, open)}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                tooltip={moduleLabel}
                data-testid={`ide-main-menu-new-module-${moduleKey}`}
                isActive={isModuleActive}
                className={`${isModuleActive ? 'gba:bg-accent gba:text-accent-foreground' : ''}`}
              >
                <span>{moduleLabel}</span>
                {moduleOpen ? <CaretDownIcon className="gba:ml-auto" /> : <CaretRightIcon className="gba:ml-auto" />}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {Object.entries(subModules)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([sub, apps]) => {
                    if (sub === 'default') {
                      return apps.map(renderAppButton)
                    }
                    return renderSubModuleCollapsible(moduleKey, sub, apps)
                  })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      )
    }

    // Collapsed: show abbreviation and a hover flyout with items (Popover)
    return (
      <Popover
        key={moduleKey}
        open={hoverModule === moduleKey}
        onOpenChange={o => setHoverModule(o ? moduleKey : null)}
      >
        <SidebarMenuItem
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current)
            setHoverModule(moduleKey)
          }}
          onMouseLeave={() => {
            if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current)
            hoverTimeoutRef.current = window.setTimeout(() => setHoverModule(m => (m === moduleKey ? null : m)), 120)
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              data-testid={`ide-main-menu-new-module-${moduleKey}`}
              className={`gba:flex gba:w-full gba:h-8 gba:items-center gba:justify-center gba:rounded-md gba:p-2 gba:text-sm gba:hover:bg-accent gba:hover:text-accent-foreground ${isModuleActive ? 'gba:bg-accent gba:text-accent-foreground' : ''}`}
            >
              <span className="gba:text-xs gba:font-medium gba:leading-none">{moduleAbbrev}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            className="gba:w-64"
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current)
              setHoverModule(moduleKey)
            }}
            onMouseLeave={() => {
              if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current)
              hoverTimeoutRef.current = window.setTimeout(() => setHoverModule(m => (m === moduleKey ? null : m)), 120)
            }}
          >
            <div className="gba:px-2 gba:py-1">
              <div className="gba:text-xs gba:mb-1 gba:text-muted-foreground">{moduleLabel}</div>
              <div>
                {Object.entries(subModules)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([sub, apps]) => {
                    const subKey = `${moduleKey}-${sub}`
                    const firstSelectedSub = selectedApp?.subModule?.split('/')[0] ?? 'default'
                    const isSubActive = selectedApp?.module === moduleKey && firstSelectedSub === sub
                    if (sub === 'default') {
                      return (
                        <div key={subKey} className="gba:mb-1">
                          {apps.map(app => (
                            <button
                              key={app.screenKey}
                              onClick={() => onAppSelect(app)}
                              className={`gba:flex gba:w-full gba:text-left gba:items-center gba:gap-2 gba:rounded-md gba:px-2 gba:py-1.5 gba:hover:bg-accent gba:hover:text-accent-foreground ${selectedApp?.screenKey === app.screenKey ? 'gba:bg-accent gba:text-accent-foreground' : ''}`}
                              data-testid={`ide-main-menu-new-app-${app.screenKey}`}
                            >
                              <span className={`gba:text-${getTypeColor(app.type)}`}>{getTypeIcon(app.type)}</span>
                              <span className="gba:text-sm">{app.name}</span>
                            </button>
                          ))}
                        </div>
                      )
                    }
                    return (
                      <Popover
                        key={subKey}
                        open={hoverSubmodule === subKey}
                        onOpenChange={o => setHoverSubmodule(o ? subKey : null)}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`gba:flex gba:w-full gba:items-center gba:gap-2 gba:rounded-md gba:px-2 gba:py-1.5 gba:hover:bg-accent gba:hover:text-accent-foreground ${isSubActive ? 'gba:bg-accent gba:text-accent-foreground' : ''}`}
                            onMouseEnter={() => {
                              if (hoverSubTimeoutRef.current) window.clearTimeout(hoverSubTimeoutRef.current)
                              setHoverModule(moduleKey)
                              setHoverSubmodule(subKey)
                            }}
                            onMouseLeave={() => {
                              if (hoverSubTimeoutRef.current) window.clearTimeout(hoverSubTimeoutRef.current)
                              hoverSubTimeoutRef.current = window.setTimeout(
                                () => setHoverSubmodule(k => (k === subKey ? null : k)),
                                120
                              )
                            }}
                            data-testid={`ide-main-menu-new-submodule-${subKey}`}
                          >
                            <span className="gba:text-[11px] gba:uppercase gba:text-muted-foreground">{sub}</span>
                            <CaretRightIcon className="gba:ml-auto" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="right"
                          align="start"
                          className="gba:w-64"
                          onMouseEnter={() => {
                            if (hoverSubTimeoutRef.current) window.clearTimeout(hoverSubTimeoutRef.current)
                            setHoverModule(moduleKey)
                            setHoverSubmodule(subKey)
                          }}
                          onMouseLeave={() => {
                            if (hoverSubTimeoutRef.current) window.clearTimeout(hoverSubTimeoutRef.current)
                            hoverSubTimeoutRef.current = window.setTimeout(
                              () => setHoverSubmodule(k => (k === subKey ? null : k)),
                              120
                            )
                          }}
                        >
                          <div className="gba:px-2 gba:py-1">
                            {apps.map(app => (
                              <button
                                key={app.screenKey}
                                onClick={() => onAppSelect(app)}
                                className={`gba:flex gba:w-full gba:text-left gba:items-center gba:gap-2 gba:rounded-md gba:px-2 gba:py-1.5 gba:hover:bg-accent gba:hover:text-accent-foreground ${selectedApp?.screenKey === app.screenKey ? 'gba:bg-accent gba:text-accent-foreground' : ''}`}
                                data-testid={`ide-main-menu-new-app-${app.screenKey}`}
                              >
                                <span className={`gba:text-${getTypeColor(app.type)}`}>{getTypeIcon(app.type)}</span>
                                <span className="gba:text-sm">{app.name}</span>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )
                  })}
              </div>
            </div>
          </PopoverContent>
        </SidebarMenuItem>
      </Popover>
    )
  }

  return (
    <Sidebar collapsible="icon" data-testid="ide-main-menu-new" className="gba:select-none">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="gba:text-xs">Modules</SidebarGroupLabel>
          <SidebarMenu>
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([moduleKey, subModules]) => renderModuleMenu(moduleKey, subModules))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

export default IDEMainMenu
