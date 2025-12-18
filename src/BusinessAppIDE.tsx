import { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
  toast,
  Toaster,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  ThemeProvider,
  ThemeSwitch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  Separator,
  LocalizationProvider,
  SupportedLocale,
  Badge
} from '@newwork/nw-design-system'
import { Gear, Info, Clock, Warning, CheckCircle, XCircle } from '@phosphor-icons/react'
import { IDEMainMenu, BusinessAppInfo } from '@/components/ide-main-menu'
import { IDERenderer } from '@/components/ide-renderer'
import { UserInfoProps } from './common/BusinessAppContext'
import ProcessEventListener, { ProcessLocalDevEvent } from './common/components/process/ProcessEventListener'
import { IDEStartScreen } from './components/ide-start-screen'
import HeaderLogo from './assets/icons/header_logo.svg'
import FeatureHubProvider from './common/components/feature/FeatureHubProvider'
import { useDynamicScreen } from './common/hooks/useDynamicScreen'
import { UiCatalogProvider } from '@newwork/gravity-ui-catalog'
import { useRewrapAntDStylesLive } from './common/hooks/useRewrapAntDStylesLive'
import { BlinkProvider } from './common/providers/BlinkProvider'

// Get available modules without eagerly loading them
const modulePatterns = import.meta.glob('./business-apps/**/index.ts', {
  eager: false
})

// Also load example entries from ./common/examples (apps, forms, popups)
const examplePatterns = import.meta.glob('./common/examples/**/index.ts', {
  eager: false
})

const businessApps: BusinessAppInfo[] = []

// Collect all module pattern paths for parent detection
const allModulePaths = Object.keys(modulePatterns)

// Build the businessApps array from index.ts files (matching getDynamicEntries logic)
for (const path in modulePatterns) {
  if (
    path.includes('/opportunity-tabs/') ||
    path.includes('/oportunity-tabs/') ||
    path.includes('/opportunity-components/')
  ) {
    continue
  }

  const excludedDirs = ['/components/', '/modules/', '/hooks/', '/lib/', '/utils/']
  if (excludedDirs.some(dir => path.includes(dir))) {
    continue
  }

  // Parse path: ./business-apps/module/sub-module/.../app-name/index.ts
  const pathParts = path.split('/')
  if (pathParts.length >= 3 && pathParts[pathParts.length - 1] === 'index.ts') {
    const moduleName = pathParts[2] // business-apps is at index 1, module at index 2
    const appName = pathParts[pathParts.length - 2] // Directory containing index.ts

    // Skip non-app directories that have index.ts files
    const nonAppDirectories = [
      'components',
      'hooks',
      'types',
      'utils',
      'queries',
      'context',
      'services',
      'modals',
      'tabs',
      'views',
      'charts'
    ]

    // Check if this is a non-app directory or if any parent directory is a non-app directory
    const isNonApp = pathParts.some(part => nonAppDirectories.includes(part))
    if (isNonApp) {
      continue
    }

    // Only include paths that are actual apps (typically in "apps", "forms", "popups", "windows", or "records" directories)
    const hasAppsFormsPopupsWindowsOrRecords = pathParts.some(
      part => part === 'apps' || part === 'forms' || part === 'popups' || part === 'windows' || part === 'records'
    )
    if (!hasAppsFormsPopupsWindowsOrRecords) {
      continue
    }

    // Check if a parent directory has an index.ts - if yes, this is internal organization, not a separate app
    const currentDirIndex = pathParts.length - 2 // Index of directory containing index.ts
    let hasParentIndex = false

    for (let i = currentDirIndex - 1; i >= 2; i--) {
      const parentPath = pathParts.slice(0, i + 1).join('/') + '/index.ts'
      if (allModulePaths.includes(parentPath)) {
        hasParentIndex = true
        break
      }
    }

    if (hasParentIndex) {
      continue // Skip nested index.ts files
    }

    // Determine the type based on the parent directory
    // Records are treated as apps (full-screen, not dialogs)
    let componentType: 'app' | 'form' | 'popup' | 'window' = 'app'
    if (pathParts.includes('forms')) {
      componentType = 'form'
    } else if (pathParts.includes('popups')) {
      componentType = 'popup'
    } else if (pathParts.includes('windows')) {
      componentType = 'window'
    } else if (pathParts.includes('records')) {
      componentType = 'app' // Records display as full-screen apps
    }

    let subModule = ''
    if (pathParts.length > 4) {
      // Get everything between module and app-name (excluding both index.ts and app directory)
      subModule = pathParts.slice(3, -2).join('/')
    }

    // Create screen key matching getDynamicEntries format
    const screenKey = subModule ? `${moduleName}/${subModule}/${appName}` : `${moduleName}/${appName}`

    // Convert app-name to PascalCase for display
    const displayName = appName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')

    businessApps.push({
      name: displayName,
      path,
      module: moduleName,
      subModule: subModule || undefined,
      screenKey,
      type: componentType
    })
  }
}

// Collect all example pattern paths for parent detection
const allExamplePaths = Object.keys(examplePatterns)

// Build the businessApps array from example index.ts files under ./common/examples
for (const path in examplePatterns) {
  const pathParts = path.split('/')
  // Example path: ./common/examples/forms/example-catalog-select-form/index.ts

  // Determine type based on directory
  let componentType: 'app' | 'form' | 'popup' | 'window' = 'app'
  if (pathParts.includes('forms')) {
    componentType = 'form'
  } else if (pathParts.includes('popups')) {
    componentType = 'popup'
  } else if (pathParts.includes('windows')) {
    componentType = 'window'
  }

  // Find index of "examples" segment
  const examplesIndex = pathParts.indexOf('examples')
  if (examplesIndex === -1) {
    continue
  }

  // Check if a parent directory has an index.ts - if yes, this is internal organization, not a separate app
  const currentDirIndex = pathParts.length - 2 // Index of directory containing index.ts
  let hasParentIndex = false

  for (let i = currentDirIndex - 1; i >= examplesIndex; i--) {
    const parentPath = pathParts.slice(0, i + 1).join('/') + '/index.ts'
    if (allExamplePaths.includes(parentPath)) {
      hasParentIndex = true
      break
    }
  }

  if (hasParentIndex) {
    continue // Skip nested index.ts files
  }

  // appName is directory containing index.ts
  const appName = pathParts[pathParts.length - 2]

  // screenKey: examples/<relativeDir from examples root to dir containing index.ts>
  const relativeDirParts = pathParts.slice(examplesIndex + 1, pathParts.length - 1)
  const screenKey = `examples/${relativeDirParts.join('/')}`

  // display name from folder name
  const displayName = appName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

  // subModule for grouping inside examples (e.g., forms, apps, popups)
  const subModule = relativeDirParts.length > 0 ? relativeDirParts[0] : undefined

  businessApps.push({
    name: displayName,
    path,
    module: 'examples',
    subModule,
    screenKey,
    type: componentType
  })
}

const STORAGE_KEY_USER_INFO = 'business-app-ide-user-info'
const STORAGE_KEY_ACCESS_TOKEN = 'business-app-ide-access-token'
const STORAGE_KEY_ADDITIONAL_DATA = 'business-app-ide-additional-data'
const STORAGE_KEY_SIDEBAR_COLLAPSED = 'business-app-ide-sidebar-collapsed'

export interface CompMeta {
  name: string
  layoutInfo?: any
}

const handleProcessLocalDevEvent = (event: ProcessLocalDevEvent) => {
  const { domain, processName, processInstanceId, startProcessBody, builderType, skipScreen } = event
  const parts = [
    `Domain: ${domain}`,
    `Process: ${processName}`,
    processInstanceId ? `ID: ${processInstanceId}` : null,
    builderType ? `Builder: ${builderType}` : null,
    skipScreen !== undefined ? `Skip Screen: ${skipScreen}` : null,
    `Process body: ${startProcessBody ? JSON.stringify(startProcessBody) : 'No process body'}`
  ].filter(Boolean)

  toast.success('Process Start Event Detected', {
    description: parts.join('\n'),
    position: 'top-right'
  })
}

export interface BusinessAppIDEProps {
  readonly packageName: string
  readonly packageVersion: string
}

export function BusinessAppIDE(props: Readonly<BusinessAppIDEProps>) {
  const { packageVersion } = props
  const { getPerformanceMetrics } = useDynamicScreen()

  useRewrapAntDStylesLive()

  const getAppByName = (name: string): BusinessAppInfo | null => {
    return businessApps.find(app => app.name === name) || null
  }

  const getAppByPath = (path: string): BusinessAppInfo | null => {
    return businessApps.find(app => app.screenKey === path) || null
  }

  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')

  // Check for different parameter types (app, form, popup, window)
  const appFromUrl = urlParams.get('app') || urlParams.get('form') || urlParams.get('popup') || urlParams.get('window')

  const [selectedApp, setSelectedApp] = useState<BusinessAppInfo | null>(
    // First try to find by full path (new format), then fallback to name (legacy format)
    getAppByPath(appFromUrl || '') || getAppByName(appFromUrl || '') || null
  )
  const [userInfo, setUserInfo] = useState<string>('')
  const [userInfoError, setUserInfoError] = useState<string>('')
  const [accessToken, setAccessToken] = useState<string>('')
  const [additionalData, setAdditionalData] = useState<string>('')
  const [additionalDataError, setAdditionalDataError] = useState<string>('')
  const [settingsModalVisible, setSettingsModalVisible] = useState<boolean>(false)
  const [performanceModalVisible, setPerformanceModalVisible] = useState<boolean>(false)
  const [collapsed, setCollapsed] = useState<boolean>(localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED) === 'true')

  // Density state (affects spacing multipliers across DS components)
  const [density, setDensity] = useState<'default' | 'compact' | 'comfortable'>('default')
  const densityClass =
    density === 'compact'
      ? 'gba:density-compact'
      : density === 'comfortable'
        ? 'gba:density-comfortable'
        : 'gba:density-default'

  // Locale state for LocalizationProvider
  const [locale, setLocale] = useState<SupportedLocale>('en-US')

  // Apply density globally on <html> to ensure DS components outside wrapper are affected
  useEffect(() => {
    const root = window?.document?.documentElement
    if (!root) return
    root.classList.remove('gba:density-default', 'gba:density-compact', 'gba:density-comfortable')
    root.classList.add(densityClass)
  }, [densityClass])

  const [lastPublishedDate, setLastPublishedDate] = useState<string>('')
  const [openKeys, setOpenKeys] = useState<string[]>([])

  // Token expiration tracking
  const [tokenStatus, setTokenStatus] = useState<{
    isValid: boolean
    isExpired: boolean
    expiresAt: Date | null
    remainingTime: string
    variant: 'success' | 'warning' | 'destructive' | 'secondary'
  } | null>(null)

  // Utility function to decode and analyze JWT token
  const analyzeToken = useCallback((token: string) => {
    if (!token || token.trim().length === 0) {
      return null
    }

    try {
      const tokenParts = token.split('.')
      if (tokenParts.length !== 3) {
        return null
      }

      const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')))

      if (!payload.exp) {
        return null
      }

      const expiresAt = new Date(payload.exp * 1000) // JWT exp is in seconds
      const now = new Date()
      const isExpired = now >= expiresAt
      const remainingMs = expiresAt.getTime() - now.getTime()

      let remainingTime = ''
      let variant: 'success' | 'warning' | 'destructive' | 'secondary' = 'success'

      if (isExpired) {
        remainingTime = 'Expired'
        variant = 'destructive'
      } else {
        const hours = Math.floor(remainingMs / (1000 * 60 * 60))
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))

        if (hours >= 2) {
          remainingTime = `${hours}h ${minutes}m`
          variant = 'success'
        } else if (hours >= 1) {
          remainingTime = `${hours}h ${minutes}m`
          variant = 'warning'
        } else if (minutes > 0) {
          remainingTime = `${minutes}m`
          variant = 'warning'
        } else {
          remainingTime = 'Expiring soon'
          variant = 'destructive'
        }
      }

      return {
        isValid: !isExpired,
        isExpired,
        expiresAt,
        remainingTime,
        variant
      }
    } catch (error) {
      console.error('Error analyzing token:', error)
      return null
    }
  }, [])

  // Update token status when accessToken changes
  useEffect(() => {
    const status = analyzeToken(accessToken)
    setTokenStatus(status)
  }, [accessToken, analyzeToken])

  // Auto-refresh token status every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (accessToken) {
        const status = analyzeToken(accessToken)
        setTokenStatus(status)
      }
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [accessToken, analyzeToken])

  useEffect(() => {
    const savedUserInfo = localStorage.getItem(STORAGE_KEY_USER_INFO)
    const savedAccessToken = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN)
    const savedAdditionalData = localStorage.getItem(STORAGE_KEY_ADDITIONAL_DATA)

    if (savedUserInfo) {
      setUserInfo(savedUserInfo)
      validateUserInfo(savedUserInfo)
    }

    if (savedAccessToken) {
      setAccessToken(savedAccessToken)
    }

    if (savedAdditionalData) {
      setAdditionalData(savedAdditionalData)
      validateAdditionalData(savedAdditionalData)
    }

    // Load saved density
    const savedDensity = localStorage.getItem('business-app-ide-density') as
      | 'default'
      | 'compact'
      | 'comfortable'
      | null
    if (savedDensity === 'default' || savedDensity === 'compact' || savedDensity === 'comfortable') {
      setDensity(savedDensity)
    }

    // Load saved locale
    const savedLocale = localStorage.getItem('business-app-ide-locale') as SupportedLocale | null
    if (savedLocale) {
      setLocale(savedLocale)
    }

    // Set open keys based on the currently selected app (from URL)
    // Only if menu is not collapsed initially and using legacy menu
    const initialSelectedApp = getAppByPath(appFromUrl || '') || getAppByName(appFromUrl || '')
    const initialCollapsed = localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED) === 'true'
    if (!initialCollapsed && initialSelectedApp) {
      const requiredKeys = getRequiredOpenKeysForApp(initialSelectedApp)
      setOpenKeys(requiredKeys)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, String(collapsed))

    // When menu expands, restore the path to current app
    if (!collapsed && selectedApp) {
      const requiredKeys = getRequiredOpenKeysForApp(selectedApp)
      setOpenKeys(requiredKeys)
    }
  }, [collapsed, selectedApp])

  useEffect(() => {
    // Update open keys when selected app changes to ensure the path is visible
    // Only do this when menu is not collapsed
    if (selectedApp && !collapsed) {
      const requiredKeys = getRequiredOpenKeysForApp(selectedApp)
      setOpenKeys(prevKeys => {
        // Only add required keys if they're not already open
        // This ensures the path to the selected app is visible without disrupting user's menu state
        const missingKeys = requiredKeys.filter(key => !prevKeys.includes(key))
        if (missingKeys.length > 0) {
          return [...prevKeys, ...missingKeys]
        }
        return prevKeys
      })
    }
  }, [selectedApp, collapsed])

  useEffect(() => {
    const url = new URL(window.location.href)

    // Clear all type parameters first
    url.searchParams.delete('app')
    url.searchParams.delete('form')
    url.searchParams.delete('popup')

    if (selectedApp) {
      // Set the appropriate parameter based on the app's type
      url.searchParams.set(selectedApp.type, selectedApp.screenKey)
      fetchLastPublishedDate(selectedApp)
    } else {
      setLastPublishedDate('')
    }
    window.history.pushState({}, '', url.toString())
  }, [selectedApp])

  /**
   * Fetches the last published date for a business app from Azure Storage
   */
  const fetchLastPublishedDate = async (app: BusinessAppInfo) => {
    if (!app.module) {
      setLastPublishedDate('')
      return
    }

    // Construct the full path including the app name
    const appPath = app.screenKey // Use the screenKey which includes the full path
    const timestamp = Date.now()
    const url = `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/screens/${appPath}/index.js?t=${timestamp}`

    try {
      // Note: CORS must be enabled on Azure Storage to allow these requests
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors' // This requires proper CORS configuration on Azure Storage
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const lastModified = response.headers.get('Last-Modified')
      if (lastModified) {
        const date = new Date(lastModified)
        const formattedDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        setLastPublishedDate(formattedDate)
      } else {
        setLastPublishedDate('')
      }
    } catch (error) {
      console.warn(`Failed to fetch last published date for ${app.name}:`, error)
      setLastPublishedDate('')
    }
  }

  /**
   * Calculates which menu keys should be open to show the path to the selected app
   */
  const getRequiredOpenKeysForApp = (app: BusinessAppInfo | null): string[] => {
    if (!app) return []

    const requiredKeys: string[] = []

    // Always open the module
    requiredKeys.push(app.module)

    // If there's a submodule, open it too
    if (app.subModule) {
      const subModuleParts = app.subModule.split('/')
      const firstSubModule = subModuleParts[0]
      if (firstSubModule !== 'default') {
        requiredKeys.push(`${app.module}/${firstSubModule}`)
      }
    }

    return requiredKeys
  }

  /**
   * Handles menu open keys change
   */
  const handleOpenChange = (keys: string[]): void => {
    setOpenKeys(keys)
  }

  // Recently used apps tracking - centralized tracking for both IDEStartScreen and IdeMainMenu
  const STORAGE_KEY_RECENT_APPS = 'business-app-ide-recent-apps'
  const MAX_RECENT_APPS = 5

  const updateRecentlyUsedApps = (app: BusinessAppInfo): void => {
    const savedRecentApps = localStorage.getItem(STORAGE_KEY_RECENT_APPS)
    let recentlyUsedApps: Array<{
      name: string
      module: string
      subModule?: string
      screenKey: string
      lastUsed: number
    }> = []

    if (savedRecentApps) {
      try {
        recentlyUsedApps = JSON.parse(savedRecentApps)
      } catch (error) {
        console.error('Failed to parse recent apps:', error)
      }
    }

    const now = Date.now()
    const existingIndex = recentlyUsedApps.findIndex(recentApp => recentApp.screenKey === app.screenKey)

    if (existingIndex !== -1) {
      recentlyUsedApps[existingIndex].lastUsed = now
    } else {
      recentlyUsedApps.push({
        name: app.name,
        module: app.module,
        subModule: app.subModule,
        screenKey: app.screenKey,
        lastUsed: now
      })
    }

    recentlyUsedApps = recentlyUsedApps.sort((a, b) => b.lastUsed - a.lastUsed).slice(0, MAX_RECENT_APPS)

    localStorage.setItem(STORAGE_KEY_RECENT_APPS, JSON.stringify(recentlyUsedApps))

    // Dispatch custom event to notify other components in the same window
    window.dispatchEvent(new CustomEvent('recentAppsUpdated'))
  }

  const handleAppSelect = (app: BusinessAppInfo) => {
    updateRecentlyUsedApps(app)
    setSelectedApp(app)
  }

  const goToStartScreen = () => {
    setSelectedApp(null)
  }

  const validateUserInfo = (value: string): void => {
    if (!value) {
      setUserInfoError('')
      return
    }

    try {
      JSON.parse(value)
      setUserInfoError('')
    } catch {
      setUserInfoError('Invalid JSON format')
    }
  }

  const validateAdditionalData = (value: string): void => {
    if (!value) {
      setAdditionalDataError('')
      return
    }

    try {
      JSON.parse(value)
      setAdditionalDataError('')
    } catch {
      setAdditionalDataError('Invalid JSON format')
    }
  }

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY_USER_INFO, userInfo)
    localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, accessToken)
    localStorage.setItem(STORAGE_KEY_ADDITIONAL_DATA, additionalData)
    setSettingsModalVisible(false)
  }

  // Persist density selection
  useEffect(() => {
    localStorage.setItem('business-app-ide-density', density)
  }, [density])

  // Persist locale selection
  useEffect(() => {
    localStorage.setItem('business-app-ide-locale', locale)
  }, [locale])

  const parsedUserInfo = useCallback((): UserInfoProps | undefined => {
    if (userInfo?.length > 2) {
      try {
        return JSON.parse(userInfo)
      } catch (e) {
        console.error('Failed to parse user info:', e)
        return undefined
      }
    }
    return undefined
  }, [userInfo])

  const parsedAdditionalData = useCallback((): { [k: string]: any } | undefined => {
    if (additionalData?.length > 2) {
      try {
        return JSON.parse(additionalData)
      } catch (e) {
        console.error('Failed to parse additional data:', e)
        return undefined
      }
    }
    return undefined
  }, [additionalData])

  return (
    <ThemeProvider defaultTheme="light" storageKey="business-app-ide-ui-theme">
      <LocalizationProvider locale={locale}>
        <div className={densityClass}>
          <BlinkProvider accessToken={accessToken || ''} currentUserId={parsedUserInfo()?.id || ''}>
            <UiCatalogProvider>
              <div className="gba:h-screen gba:flex gba:flex-col gba:overflow-hidden">
                <ProcessEventListener onLocalDevEvent={handleProcessLocalDevEvent} />
                <FeatureHubProvider userId={parsedUserInfo()?.id ?? ''} />

                {/* Sidebar + Inset layout */}
                <SidebarProvider open={!collapsed} onOpenChange={open => setCollapsed(!open)}>
                  <IDEMainMenu
                    businessApps={businessApps}
                    selectedApp={selectedApp}
                    openKeys={openKeys}
                    onOpenChange={handleOpenChange}
                    onAppSelect={handleAppSelect}
                  />
                  <SidebarInset>
                    {/* Header inside inset, responsive to collapsed state */}
                    <header className="gba:flex gba:h-12 gba:shrink-0 gba:items-center gba:gap-2 gba:transition-[width,height] gba:ease-linear">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4">
                        <SidebarTrigger className="gba:-ml-1" />
                        <Separator orientation="vertical" className="gba:mr-2" />
                        <a
                          href="#"
                          onClick={e => {
                            e.preventDefault()
                            goToStartScreen()
                          }}
                          className="gba:flex gba:items-center gba:gap-2"
                        >
                          <img
                            src={HeaderLogo}
                            alt="Business Apps IDE"
                            width="120"
                            height="14"
                            className="gba:w-[120px] gba:h-[14px]"
                          />
                          <span className="gba:text-xs gba:text-muted-foreground">v{packageVersion}</span>
                        </a>
                      </div>

                      <div className="gba:flex gba:flex-1 gba:items-center gba:justify-center">
                        <div className="gba:w-[250px] gba:h-[26px] gba:flex gba:items-center gba:justify-center gba:rounded-full gba:bg-input">
                          <div className="gba:text-sm gba:text-input-foreground" data-testid="GlobalSearchButton-Text">
                            Search in NEWWORK
                          </div>
                        </div>
                      </div>

                      <div className="gba:flex gba:items-center gba:justify-end gba:gap-4 gba:pr-4">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Select value={locale} onValueChange={v => setLocale(v as SupportedLocale)}>
                            <SelectTrigger data-testid="BusinessAppIDE-locale-select" aria-label="Language">
                              <SelectValue placeholder="Language" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en-US" data-testid="BusinessAppIDE-locale-en-US">
                                English (US)
                              </SelectItem>
                              <SelectItem value="de-DE" data-testid="BusinessAppIDE-locale-de-DE">
                                Deutsch (DE)
                              </SelectItem>
                              <SelectItem value="ro-RO" data-testid="BusinessAppIDE-locale-ro-RO">
                                Română (RO)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <ThemeSwitch data-testid="BusinessAppIDE-theme-switch" />
                          <Select
                            value={density}
                            onValueChange={v => setDensity(v as 'default' | 'compact' | 'comfortable')}
                          >
                            <SelectTrigger data-testid="BusinessAppIDE-density-select" aria-label="Density">
                              <SelectValue placeholder="Density" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default" data-testid="BusinessAppIDE-density-default">
                                Default
                              </SelectItem>
                              <SelectItem value="compact" data-testid="BusinessAppIDE-density-compact">
                                Compact
                              </SelectItem>
                              <SelectItem value="comfortable" data-testid="BusinessAppIDE-density-comfortable">
                                Comfortable
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {lastPublishedDate && (
                          <div className="gba:flex gba:items-center gba:text-sm" data-testid="LastPublishedDate">
                            <span className="gba:text-secondary-foreground">Last Published: {lastPublishedDate}</span>
                          </div>
                        )}
                        {tokenStatus && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant={tokenStatus.variant}
                                  className="gba:cursor-pointer gba:gap-1.5 gba:px-2.5 gba:py-1"
                                  onClick={() => setSettingsModalVisible(true)}
                                  data-testid="TokenStatusBadge"
                                >
                                  {tokenStatus.isExpired ? (
                                    <XCircle size={14} weight="fill" />
                                  ) : tokenStatus.variant === 'warning' ? (
                                    <Warning size={14} weight="fill" />
                                  ) : (
                                    <CheckCircle size={14} weight="fill" />
                                  )}
                                  <span className="gba:text-xs gba:font-medium">{tokenStatus.remainingTime}</span>
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="gba:space-y-1">
                                  <div className="gba:font-semibold">
                                    {tokenStatus.isExpired ? 'Token Expired' : 'Access Token Status'}
                                  </div>
                                  {tokenStatus.expiresAt && (
                                    <div className="gba:text-xs">Expires: {tokenStatus.expiresAt.toLocaleString()}</div>
                                  )}
                                  <div className="gba:text-xs gba:text-muted-foreground">Click to update token</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {!tokenStatus && accessToken && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="secondary"
                                  className="gba:cursor-pointer gba:gap-1.5 gba:px-2.5 gba:py-1"
                                  onClick={() => setSettingsModalVisible(true)}
                                  data-testid="TokenStatusBadge-Invalid"
                                >
                                  <Clock size={14} />
                                  <span className="gba:text-xs gba:font-medium">Invalid Token</span>
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="gba:space-y-1">
                                  <div className="gba:font-semibold">Invalid Token Format</div>
                                  <div className="gba:text-xs gba:text-muted-foreground">Click to update token</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setSettingsModalVisible(true)}>
                                <Gear size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Settings</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setPerformanceModalVisible(true)}>
                                <Info size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Performance Metrics</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </header>

                    <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:bg-background gba:rounded-xl">
                      {!selectedApp ? (
                        <IDEStartScreen businessApps={businessApps} onAppSelect={handleAppSelect} />
                      ) : (
                        <IDERenderer
                          selectedApp={selectedApp}
                          userInfo={parsedUserInfo()}
                          accessToken={accessToken ?? undefined}
                          additionalData={parsedAdditionalData()}
                          onAppSelect={setSelectedApp}
                        />
                      )}
                    </div>
                  </SidebarInset>
                </SidebarProvider>

                <Dialog open={settingsModalVisible} onOpenChange={setSettingsModalVisible}>
                  <DialogContent className="gba:max-w-[700px] gba:max-h-[90vh] gba:overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Business App Settings</DialogTitle>
                    </DialogHeader>
                    <div className="gba:space-y-6">
                      <div className="gba:space-y-2">
                        <Label htmlFor="userInfo">User Info (JSON format)</Label>
                        <Textarea
                          id="userInfo"
                          placeholder="Enter user info in JSON format"
                          rows={6}
                          value={userInfo}
                          onChange={e => {
                            setUserInfo(e.target.value)
                            validateUserInfo(e.target.value)
                          }}
                          className={`gba:w-full gba:resize-none gba:whitespace-pre-wrap gba:break-words ${userInfoError ? 'gba:border-red-500' : ''}`}
                          style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        />
                        {userInfoError && <p className="gba:text-sm gba:text-red-500">{userInfoError}</p>}
                      </div>

                      <div className="gba:space-y-2">
                        <Label htmlFor="accessToken">Access Token</Label>
                        <Textarea
                          id="accessToken"
                          placeholder="Enter your access token"
                          rows={3}
                          value={accessToken}
                          onChange={e => setAccessToken(e.target.value)}
                          className="gba:w-full gba:resize-none gba:whitespace-pre-wrap gba:break-words"
                          style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        />
                        {tokenStatus && (
                          <div
                            className={`gba:p-3 gba:rounded-lg gba:flex gba:items-start gba:gap-2 ${
                              tokenStatus.variant === 'destructive'
                                ? 'gba:bg-destructive-secondary gba:text-destructive-secondary'
                                : tokenStatus.variant === 'warning'
                                  ? 'gba:bg-warning-secondary gba:text-warning-secondary'
                                  : 'gba:bg-success-secondary gba:text-success-secondary'
                            }`}
                            data-testid="TokenStatusInfo"
                          >
                            <div className="gba:flex-shrink-0 gba:mt-0.5">
                              {tokenStatus.isExpired ? (
                                <XCircle size={18} weight="fill" />
                              ) : tokenStatus.variant === 'warning' ? (
                                <Warning size={18} weight="fill" />
                              ) : (
                                <CheckCircle size={18} weight="fill" />
                              )}
                            </div>
                            <div className="gba:flex-1 gba:space-y-1">
                              <div className="gba:font-semibold gba:text-sm">
                                {tokenStatus.isExpired
                                  ? 'Token Expired'
                                  : tokenStatus.variant === 'warning'
                                    ? 'Token Expiring Soon'
                                    : 'Token Valid'}
                              </div>
                              {tokenStatus.expiresAt && (
                                <div className="gba:text-xs">
                                  <div>Expires: {tokenStatus.expiresAt.toLocaleString()}</div>
                                  <div className="gba:font-medium gba:mt-0.5">
                                    {tokenStatus.isExpired
                                      ? 'Please update your token'
                                      : `${tokenStatus.remainingTime} remaining`}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {!tokenStatus && accessToken && (
                          <div
                            className="gba:p-3 gba:rounded-lg gba:flex gba:items-start gba:gap-2 gba:bg-secondary gba:text-secondary-foreground"
                            data-testid="TokenStatusInfo-Invalid"
                          >
                            <div className="gba:flex-shrink-0 gba:mt-0.5">
                              <Clock size={18} />
                            </div>
                            <div className="gba:flex-1">
                              <div className="gba:font-semibold gba:text-sm">Invalid Token Format</div>
                              <div className="gba:text-xs gba:mt-1">
                                The token format is invalid or cannot be decoded. Please ensure you're using a valid JWT
                                token.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="gba:space-y-2">
                        <Label htmlFor="additionalData">Additional Data (JSON format)</Label>
                        <Textarea
                          id="additionalData"
                          placeholder='Enter additional data in JSON format (e.g., {"employeeId": "123", "jobPositionId": "456"})'
                          rows={4}
                          value={additionalData}
                          onChange={e => {
                            setAdditionalData(e.target.value)
                            validateAdditionalData(e.target.value)
                          }}
                          className={`gba:w-full gba:resize-none gba:whitespace-pre-wrap gba:break-words ${additionalDataError ? 'gba:border-red-500' : ''}`}
                          style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        />
                        {additionalDataError && <p className="gba:text-sm gba:text-red-500">{additionalDataError}</p>}
                      </div>

                      <p className="gba:text-sm gba:text-gray-600">
                        These settings will be saved in your browser's local storage and persisted between sessions.
                        Additional Data is used to pass context information like employeeId, jobPositionId, etc.
                      </p>

                      <div className="gba:flex gba:justify-end gba:gap-2">
                        <Button variant="outline" onClick={() => setSettingsModalVisible(false)}>
                          Cancel
                        </Button>
                        <Button onClick={saveSettings}>Save Settings</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={performanceModalVisible} onOpenChange={setPerformanceModalVisible}>
                  <DialogContent className="gba:max-w-[800px]">
                    <DialogHeader>
                      <DialogTitle>Dynamic Screen Loading Performance</DialogTitle>
                    </DialogHeader>
                    <div className="gba:space-y-4">
                      <div className="gba:p-4 gba:bg-green-50 gba:border gba:border-green-200 gba:rounded-lg">
                        <h4 className="gba:text-green-800 gba:font-semibold gba:mb-2">Performance Improvements</h4>
                        <ul className="gba:text-green-700 gba:space-y-1">
                          <li>• Global caching: Components loaded once, reused across sessions</li>
                          <li>• Smart preloading: Common screens preloaded automatically</li>
                          <li>• Concurrent loading prevention: Multiple requests for same screen deduplicated</li>
                          <li>• Performance tracking: Load times monitored and optimized</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="gba:font-semibold gba:mb-2">Screen Loading Statistics</h4>
                        <div className="gba:max-h-64 gba:overflow-y-auto gba:border gba:border-gray-200 gba:rounded-lg">
                          <table className="gba:w-full gba:text-sm">
                            <thead className="gba:bg-gray-50">
                              <tr>
                                <th className="gba:p-2 gba:text-left gba:font-medium">Screen</th>
                                <th className="gba:p-2 gba:text-left gba:font-medium">Load Count</th>
                                <th className="gba:p-2 gba:text-left gba:font-medium">Avg Time (ms)</th>
                                <th className="gba:p-2 gba:text-left gba:font-medium">Last Load (ms)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from(getPerformanceMetrics().entries()).map(([screenKey, metrics]) => (
                                <tr key={screenKey} className="gba:border-t gba:border-gray-200">
                                  <td className="gba:p-2 gba:font-mono gba:text-xs">{screenKey}</td>
                                  <td className="gba:p-2">{metrics.loadCount}</td>
                                  <td className="gba:p-2">{(metrics.loadTime / metrics.loadCount).toFixed(1)}</td>
                                  <td className="gba:p-2">{metrics.lastLoadTime.toFixed(1)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {getPerformanceMetrics().size === 0 && (
                            <div className="gba:p-4 gba:text-center gba:text-gray-500">
                              No screens loaded yet. Navigate to a screen to see performance data.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="gba:flex gba:justify-end">
                        <Button onClick={() => setPerformanceModalVisible(false)}>Close</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Toaster />
              </div>
            </UiCatalogProvider>
          </BlinkProvider>
        </div>
      </LocalizationProvider>
    </ThemeProvider>
  )
}
