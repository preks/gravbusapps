import React from 'react'
import { Card, CardContent, Button, Badge } from '@newwork/nw-design-system'
import {
  Play,
  Folder,
  AppWindow,
  Article,
  ChatCircle,
  SquaresFour,
  Clock,
  CaretDown,
  CaretRight
} from '@phosphor-icons/react'

import { PageLayout } from '../layout/pageLayout'

// Removed antd Typography and Collapse imports - using nw-design-system instead

interface BusinessAppInfo {
  name: string
  path: string
  module: string
  subModule?: string
  screenKey: string
  type: 'app' | 'form' | 'popup'
}

interface RecentlyUsedApp {
  name: string
  module: string
  subModule?: string
  screenKey: string
  lastUsed: number
}

interface IDEStartScreenProps {
  businessApps: BusinessAppInfo[]
  onAppSelect: (app: BusinessAppInfo) => void
}

export const IDEStartScreen: React.FC<IDEStartScreenProps> = ({ businessApps, onAppSelect }) => {
  const [recentlyUsedApps, setRecentlyUsedApps] = React.useState<RecentlyUsedApp[]>([])

  // Load and sync recently used apps from centralized tracking in BusinessAppIDE
  React.useEffect(() => {
    const savedRecentApps = localStorage.getItem('business-app-ide-recent-apps')
    if (savedRecentApps) {
      try {
        const parsed = JSON.parse(savedRecentApps)
        setRecentlyUsedApps(parsed)
      } catch (error) {
        console.error('Failed to parse recent apps:', error)
      }
    }
  }, [])

  // Listen for changes to recently used apps
  React.useEffect(() => {
    const handleStorageChange = () => {
      const savedRecentApps = localStorage.getItem('business-app-ide-recent-apps')
      if (savedRecentApps) {
        try {
          const parsed = JSON.parse(savedRecentApps)
          setRecentlyUsedApps(parsed)
        } catch (error) {
          console.error('Failed to parse recent apps:', error)
        }
      }
    }

    // Listen for custom event when localStorage changes in the same window
    const handleCustomStorageChange = () => {
      handleStorageChange()
    }

    // Initial load
    handleStorageChange()

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('recentAppsUpdated', handleCustomStorageChange)

    // Periodic refresh as fallback (every 5 seconds)
    const intervalId = setInterval(handleStorageChange, 5000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('recentAppsUpdated', handleCustomStorageChange)
      clearInterval(intervalId)
    }
  }, [])

  const handleAppClick = (app: BusinessAppInfo) => {
    onAppSelect(app)
  }

  // Group business apps by module and sub-module
  const groupedApps = businessApps.reduce(
    (acc, app) => {
      if (!acc[app.module]) {
        acc[app.module] = {}
      }

      const subModuleName = app.subModule?.split('/')[0] || 'default'
      if (!acc[app.module][subModuleName]) {
        acc[app.module][subModuleName] = []
      }

      acc[app.module][subModuleName].push(app)
      return acc
    },
    {} as Record<string, Record<string, BusinessAppInfo[]>>
  )

  const createAppURL = (app: BusinessAppInfo): string => {
    const baseUrl = window.location.origin + window.location.pathname
    return `${baseUrl}?${app.type}=${app.screenKey}`
  }

  const handleAppLinkClick = (event: React.MouseEvent, app: BusinessAppInfo) => {
    // Allow middle-click and Ctrl+click to work with browser defaults
    if (event.button === 1 || event.ctrlKey || event.metaKey) {
      return // Let browser handle middle-click and Ctrl+click
    }

    // For left-click, prevent default and handle navigation
    event.preventDefault()
    handleAppClick(app)
  }

  const getRecentApps = (): BusinessAppInfo[] => {
    return recentlyUsedApps
      .map(recent => businessApps.find(app => app.screenKey === recent.screenKey))
      .filter(Boolean) as BusinessAppInfo[]
  }

  const formatModuleName = (module: string): string => {
    return module.charAt(0).toUpperCase() + module.slice(1)
  }

  const formatSubModuleName = (subModule: string): string => {
    return subModule === 'default' ? 'General' : subModule.charAt(0).toUpperCase() + subModule.slice(1)
  }

  const getTypeIcon = (type: 'app' | 'form' | 'popup') => {
    switch (type) {
      case 'app':
        return <Play />
      case 'form':
        return <Article />
      case 'popup':
        return <ChatCircle />
      default:
        return <Play />
    }
  }

  const getTypeLabel = (type: 'app' | 'form' | 'popup'): string => {
    switch (type) {
      case 'app':
        return 'App'
      case 'form':
        return 'Form'
      case 'popup':
        return 'Popup'
      default:
        return 'App'
    }
  }

  // Tailwind token-based classes to replace inline color styles
  const getTypeTextClass = (type: 'app' | 'form' | 'popup'): string => {
    switch (type) {
      case 'app':
        return 'gba:text-ext-1'
      case 'form':
        return 'gba:text-ext-2'
      case 'popup':
        return 'gba:text-ext-3'
      default:
        return 'gba:text-primary'
    }
  }

  const getTypeBadgeClasses = (type: 'app' | 'form' | 'popup'): string => {
    switch (type) {
      case 'app':
        return 'gba:bg-ext-1-secondary gba:text-ext-1-secondary-foreground'
      case 'form':
        return 'gba:bg-ext-2-secondary gba:text-ext-2-secondary-foreground'
      case 'popup':
        return 'gba:bg-ext-3-secondary gba:text-ext-3-secondary-foreground'
      default:
        return 'gba:bg-primary-secondary gba:text-primary-secondary-foreground'
    }
  }

  const renderAppButton = (app: BusinessAppInfo) => (
    <a
      key={app.name}
      href={createAppURL(app)}
      onClick={e => handleAppLinkClick(e, app)}
      onAuxClick={e => {
        // Handle middle-click specifically
        if (e.button === 1) {
          // Allow browser to open in new tab
          e.stopPropagation()
        }
      }}
      className="gba:flex gba:items-center gba:mb-1 gba:h-8 gba:w-full gba:text-left gba:justify-start gba:no-underline hover:gba:bg-gray-100 gba:text-gray-700 hover:gba:text-gray-900 gba:px-2 gba:rounded gba:transition-colors gba:duration-200 gba:text-inherit"
    >
      <span className={`${getTypeTextClass(app.type)} gba:mr-2 gba:text-sm`}>{getTypeIcon(app.type)}</span>
      <span className="gba:text-xs gba:truncate gba:text-left gba:flex-grow">{app.name}</span>
      <Badge variant="secondary" className={`${getTypeBadgeClasses(app.type)} gba:ml-2 gba:text-xs`}>
        {getTypeLabel(app.type)}
      </Badge>
    </a>
  )

  // Move state management to component level
  const [expandedSubModules, setExpandedSubModules] = React.useState<Set<string>>(new Set())

  const toggleSubModule = (subModule: string) => {
    const newExpanded = new Set(expandedSubModules)
    if (newExpanded.has(subModule)) {
      newExpanded.delete(subModule)
    } else {
      newExpanded.add(subModule)
    }
    setExpandedSubModules(newExpanded)
  }

  const renderSubModuleContent = (subModules: Record<string, BusinessAppInfo[]>) => {
    const subModuleEntries = Object.entries(subModules)

    // If only one sub-module and it's 'default', show apps directly
    if (subModuleEntries.length === 1 && subModuleEntries[0][0] === 'default') {
      return <div className="gba:space-y-1 gba:text-left">{subModuleEntries[0][1].map(renderAppButton)}</div>
    }

    // Show sub-modules with collapsible sections
    return (
      <div className="gba:w-full gba:space-y-2">
        {subModuleEntries.map(([subModule, apps]) => {
          const isExpanded = expandedSubModules.has(subModule)
          return (
            <div key={subModule} className="gba:bg-secondary gba:rounded gba:mb-2">
              <Button
                variant="ghost"
                onClick={() => toggleSubModule(subModule)}
                className="gba:w-full gba:justify-between gba:px-4 gba:py-2 gba:text-left"
              >
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Folder className="gba:text-blue-500" />
                  <span className="gba:text-sm gba:font-medium">{formatSubModuleName(subModule)}</span>
                  <Badge variant="secondary">{apps.length}</Badge>
                </div>
                {isExpanded ? <CaretDown size={16} /> : <CaretRight size={16} />}
              </Button>
              {isExpanded && (
                <div className="gba:px-4 gba:pb-2 gba:space-y-1 gba:text-left">{apps.map(renderAppButton)}</div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Derive Examples from provided businessApps
  const exampleItems = React.useMemo(() => {
    const items = businessApps.filter(app => app.module === 'examples')
    const apps = items.filter(i => i.type === 'app')
    const forms = items.filter(i => i.type === 'form')
    const popups = items.filter(i => i.type === 'popup')
    return { items, apps, forms, popups }
  }, [businessApps])

  return (
    <div data-testid="IDE-StartScreen" className="gba:min-h-full gba:bg-gradient-decorative-1">
      <PageLayout
        variant="display"
        headerIcon={<SquaresFour className="gba:text-foreground" />}
        headerLabel="Business Applications"
        headerLabelClassName="gba:!text-black"
        className="gba:h-full gba:!bg-transparent gba:!shadow-none gba:!rounded-none"
        contentContainer={
          <div className="gba:p-6">
            {/* Examples Section */}
            {exampleItems.items.length > 0 && (
              <div className="gba:mb-8" data-testid="IDE-Examples-Section">
                <h4 className="gba:mb-4 gba:flex gba:items-center gba:gap-2 gba:text-black gba:text-lg gba:font-semibold">
                  <SquaresFour className="gba:text-foreground" />
                  Examples
                </h4>
                <div
                  className="gba:grid gba:gap-6"
                  style={{
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    display: 'grid'
                  }}
                >
                  {/* Apps */}
                  {exampleItems.apps.length > 0 && (
                    <Card
                      className="gba:shadow-sm hover:gba:shadow-md gba:transition-shadow"
                      style={{ display: 'flex', flexDirection: 'column' }}
                    >
                      <CardContent
                        className="gba:p-3"
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                      >
                        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                          <span className="gba:flex gba:items-center gba:gap-2 gba:font-semibold">
                            <Play className="gba:text-blue-600" />
                            Apps
                          </span>
                          <Badge variant="secondary">{exampleItems.apps.length}</Badge>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                          <div className="gba:space-y-1 gba:text-left">{exampleItems.apps.map(renderAppButton)}</div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {/* Forms */}
                  {exampleItems.forms.length > 0 && (
                    <Card
                      className="gba:shadow-sm hover:gba:shadow-md gba:transition-shadow"
                      style={{ display: 'flex', flexDirection: 'column' }}
                    >
                      <CardContent
                        className="gba:p-3"
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                      >
                        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                          <span className="gba:flex gba:items-center gba:gap-2 gba:font-semibold">
                            <Article className="gba:text-green-600" />
                            Forms
                          </span>
                          <Badge variant="secondary">{exampleItems.forms.length}</Badge>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                          <div className="gba:space-y-1 gba:text-left">{exampleItems.forms.map(renderAppButton)}</div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {/* Popups */}
                  {exampleItems.popups.length > 0 && (
                    <Card
                      className="gba:shadow-sm hover:gba:shadow-md gba:transition-shadow"
                      style={{ display: 'flex', flexDirection: 'column' }}
                    >
                      <CardContent
                        className="gba:p-3"
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                      >
                        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                          <span className="gba:flex gba:items-center gba:gap-2 gba:font-semibold">
                            <ChatCircle className="gba:text-orange-600" />
                            Popups
                          </span>
                          <Badge variant="secondary">{exampleItems.popups.length}</Badge>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                          <div className="gba:space-y-1 gba:text-left">{exampleItems.popups.map(renderAppButton)}</div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
            {/* Recently Used Section */}
            {recentlyUsedApps.length > 0 && (
              <div className="gba:mb-8">
                <h4 className="gba:mb-4 gba:flex gba:items-center gba:gap-2 gba:text-black gba:text-lg gba:font-semibold">
                  <Clock className="gba:text-foreground" />
                  Recently Used
                </h4>
                <div className="gba:grid gba:gap-4 gba:grid-cols-5">
                  {getRecentApps().map(app => (
                    <Card
                      key={app.name}
                      className="gba:shadow-sm hover:gba:shadow-md gba:transition-shadow gba:cursor-pointer"
                    >
                      <CardContent className="gba:p-3">
                        <a
                          href={createAppURL(app)}
                          onClick={e => handleAppLinkClick(e, app)}
                          onAuxClick={e => {
                            // Handle middle-click specifically
                            if (e.button === 1) {
                              // Allow browser to open in new tab
                              e.stopPropagation()
                            }
                          }}
                          className="gba:block gba:no-underline gba:text-inherit"
                        >
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                            <div className={`${getTypeTextClass(app.type)} gba:text-lg`}>{getTypeIcon(app.type)}</div>
                            <div className="gba:text-sm gba:font-medium gba:truncate gba:flex-1" title={app.name}>
                              {app.name}
                            </div>
                          </div>
                          <div className="gba:text-xs gba:text-secondary-foreground gba:mb-2">
                            {formatModuleName(app.module)}
                            {app.subModule && app.subModule !== 'default' && (
                              <span> › {formatSubModuleName(app.subModule.split('/')[0])}</span>
                            )}
                          </div>
                          <Badge variant="secondary" className={`${getTypeBadgeClasses(app.type)} gba:text-xs`}>
                            {getTypeLabel(app.type)}
                          </Badge>
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Module Cards */}
            <div className="gba:mb-4">
              <h4 className="gba:mb-4 gba:flex gba:items-center gba:gap-2 gba:text-black gba:text-lg gba:font-semibold">
                <AppWindow className="gba:text-foreground" />
                All Applications
              </h4>
              {Object.keys(groupedApps).length === 0 ? (
                <div className="gba:py-12 gba:text-center">
                  <div className="gba:text-secondary-foreground gba:text-lg">No business applications found</div>
                </div>
              ) : (
                <div className="gba:grid gba:gap-6 gba:grid-cols-5">
                  {Object.entries(groupedApps).map(([module, subModules]) => {
                    const totalApps = Object.values(subModules).reduce((sum, apps) => sum + apps.length, 0)

                    return (
                      <Card
                        key={module}
                        className="gba:shadow-sm hover:gba:shadow-md gba:transition-shadow gba:flex gba:flex-col gba:h-96"
                      >
                        <CardContent className="gba:p-3 gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:h-full">
                          <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                            <span className="gba:flex gba:items-center gba:gap-2 gba:font-semibold">
                              <AppWindow className="gba:text-blue-600" />
                              {formatModuleName(module)}
                            </span>
                            <Badge variant="secondary">{totalApps}</Badge>
                          </div>
                          <div className="gba:flex-1 gba:overflow-y-auto gba:min-h-0 gba:max-h-full">
                            {renderSubModuleContent(subModules)}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        }
      />
    </div>
  )
}

export default IDEStartScreen
