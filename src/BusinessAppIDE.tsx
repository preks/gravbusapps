import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  toast,
  Toaster,
  ThemeProvider,
  LocalizationProvider,
  ShellProvider,
  ShellLayout,
  type ModuleSelectorProps
} from '@newwork/nw-design-system'
import { IDEMenu, BusinessAppInfo } from '@/components/ide-main-menu'
import { useIDEBreadcrumb } from '@/components/ide-breadcrumb/useIDEBreadcrumb'
import { IDEHeader } from '@/components/ide-header'
import type { TokenStatus, DensityOption } from '@/components/ide-header'
import { IDEContextPanel } from '@/components/ide-context-panel'
import {
  GlobalSearchCommand,
  SettingsDialog,
  PublishConfirmDialog,
  PerformanceWindow
} from '@/components/ide-header/components'
import { IDERenderer } from '@/components/ide-renderer'
import { IDEStartScreen } from './components/ide-start-screen'
import { UserInfoProps } from './common/BusinessAppContext'
import ProcessEventListener, { ProcessLocalDevEvent } from './common/components/process/ProcessEventListener'
import FeatureHubProvider from './common/components/feature/FeatureHubProvider'
import { UiCatalogProvider } from '@newwork/gravity-ui-catalog'
import { useRewrapAntDStylesLive } from './common/hooks/useRewrapAntDStylesLive'
import { BlinkProvider } from './common/providers/BlinkProvider'
import { useBusinessAuth } from './common/auth/useBusinessAuth'
import { useUserProfileFromKeycloak } from './common/user-profile/useUserProfileFromKeycloak'
import { useBrandingLogo } from './common/hooks/useBrandingLogo'
import {
  STORAGE_KEY_USER_INFO,
  STORAGE_KEY_ACCESS_TOKEN,
  STORAGE_KEY_ADDITIONAL_DATA
} from './common/constants/ideStorageKeys'
import { NAVIGATION_BASE_PATH, PLATFORM_URL_TO_APP_MAPPING, navigateTo } from './common/utils/navigationUtils'
import menuConfiguration from '@/components/ide-main-menu/menu-configuration.json'

type Locales = 'en-US' | 'de-DE' | 'ro-RO'
const PERFORMANCE_WINDOW_OPEN_STORAGE_KEY = 'gba:performance-window-open'

function readPersistedPerformanceWindowOpen(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return window.sessionStorage.getItem(PERFORMANCE_WINDOW_OPEN_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function getAppPathForPlatformUrl(pathname: string): string | undefined {
  const normalized = pathname?.replace(/\/$/, '') || ''
  const withLeading = normalized.startsWith('/') ? normalized : `/${normalized}`
  return PLATFORM_URL_TO_APP_MAPPING[withLeading]
}

function getPlatformPathForAppPath(appPath: string): string | undefined {
  if (!appPath) return undefined
  return Object.keys(PLATFORM_URL_TO_APP_MAPPING).find(
    platformPath => PLATFORM_URL_TO_APP_MAPPING[platformPath] === appPath
  )
}

const ALL_MAIN_MODULE_ID = 'all-main-modules'
const ALL_SUBMODULE_ID = 'all-submodules'
const DEFAULT_SUBMODULE_ID = 'default'
const EXAMPLES_MODULE_ID = 'examples'

function getPrimarySubModuleId(businessApp: BusinessAppInfo): string {
  return businessApp.subModule?.split('/')[0] || DEFAULT_SUBMODULE_ID
}

function formatFilterLabel(value: string): string {
  if (value === DEFAULT_SUBMODULE_ID) {
    return 'General'
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

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
    let componentType: 'app' | 'record' | 'form' | 'popup' | 'window' = 'app'
    if (pathParts.includes('forms')) {
      componentType = 'form'
    } else if (pathParts.includes('popups')) {
      componentType = 'popup'
    } else if (pathParts.includes('windows')) {
      componentType = 'window'
    } else if (pathParts.includes('records')) {
      componentType = 'record'
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
  let componentType: 'app' | 'record' | 'form' | 'popup' | 'window' = 'app'
  if (pathParts.includes('forms')) {
    componentType = 'form'
  } else if (pathParts.includes('popups')) {
    componentType = 'popup'
  } else if (pathParts.includes('windows')) {
    componentType = 'window'
  } else if (pathParts.includes('records')) {
    componentType = 'record'
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

const filterableBusinessApps = businessApps.filter(businessApp => businessApp.module !== EXAMPLES_MODULE_ID)

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
    skipScreen === undefined ? null : `Skip Screen: ${skipScreen}`,
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
  const { breadcrumbItems, goBack, resetBreadcrumbToHome, resetBreadcrumbToApp } = useIDEBreadcrumb(businessApps)

  useRewrapAntDStylesLive()

  const getAppByName = (name: string): BusinessAppInfo | null => {
    return businessApps.find(app => app.name === name) || null
  }

  const getAppByPath = (path: string): BusinessAppInfo | null => {
    return businessApps.find(app => app.screenKey === path) || null
  }

  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')

  // Check for different parameter types (app, record, form, popup, window)
  const appFromUrl =
    urlParams.get('app') ||
    urlParams.get('record') ||
    urlParams.get('form') ||
    urlParams.get('popup') ||
    urlParams.get('window')

  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  // /platform is home (no app); only paths under /platform/... with a mapping resolve to an app
  const appPathFromPathname =
    pathname && pathname !== NAVIGATION_BASE_PATH ? getAppPathForPlatformUrl(pathname) : undefined
  const inferredAppFromPath =
    !appPathFromPathname && !appFromUrl && (pathname.startsWith('/flow-creator') || pathname.startsWith('/flow/draft'))
      ? 'flow/apps/creator'
      : null
  const effectiveAppFromUrl = appPathFromPathname ?? appFromUrl ?? inferredAppFromPath

  const [selectedApp, setSelectedApp] = useState<BusinessAppInfo | null>(
    // First try to find by full path (new format), then fallback to name (legacy format)
    getAppByPath(effectiveAppFromUrl || '') || getAppByName(effectiveAppFromUrl || '') || null
  )
  const [selectedMainModuleId, setSelectedMainModuleId] = useState(ALL_MAIN_MODULE_ID)
  const [selectedSubModuleId, setSelectedSubModuleId] = useState(ALL_SUBMODULE_ID)
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false)
  const [userInfo, setUserInfo] = useState<string>('')
  const [userInfoError, setUserInfoError] = useState<string>('')
  const [accessToken, setAccessToken] = useState<string>('')
  const [additionalData, setAdditionalData] = useState<string>('')
  const [additionalDataError, setAdditionalDataError] = useState<string>('')
  const [searchCommandOpen, setSearchCommandOpen] = useState<boolean>(false)
  const [performanceWindowOpen, setPerformanceWindowOpen] = useState<boolean>(readPersistedPerformanceWindowOpen)
  const [density, setDensity] = useState<DensityOption>(
    (localStorage.getItem('business-app-ide-ui-density') as DensityOption) || 'default'
  )
  const [enableChat, setEnableChat] = useState<boolean>(localStorage.getItem('business-app-ide-enable-chat') === 'true')
  const [settingsModalVisible, setSettingsModalVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.sessionStorage.setItem(PERFORMANCE_WINDOW_OPEN_STORAGE_KEY, String(performanceWindowOpen))
    } catch {
      // Ignore storage errors to keep the profiler passive.
    }
  }, [performanceWindowOpen])

  const mainModuleOptions = useMemo<NonNullable<ModuleSelectorProps['spaces']>>(
    () => [
      { id: ALL_MAIN_MODULE_ID, label: 'All' },
      ...Array.from(new Set(filterableBusinessApps.map(businessApp => businessApp.module)))
        .sort((leftModuleId, rightModuleId) => leftModuleId.localeCompare(rightModuleId))
        .map(moduleId => ({
          id: moduleId,
          label: formatFilterLabel(moduleId)
        }))
    ],
    []
  )

  const activeMainModuleFilter = selectedMainModuleId === ALL_MAIN_MODULE_ID ? null : selectedMainModuleId

  const availableSubModuleOptions = useMemo<NonNullable<ModuleSelectorProps['modules']>>(() => {
    if (!activeMainModuleFilter) {
      return []
    }

    return [
      { id: ALL_SUBMODULE_ID, label: 'All' },
      ...Array.from(
        new Set(
          filterableBusinessApps
            .filter(businessApp => businessApp.module === activeMainModuleFilter)
            .map(getPrimarySubModuleId)
        )
      )
        .sort((leftSubModuleId, rightSubModuleId) => leftSubModuleId.localeCompare(rightSubModuleId))
        .map(subModuleId => ({
          id: subModuleId,
          label: formatFilterLabel(subModuleId)
        }))
    ]
  }, [activeMainModuleFilter])

  useEffect(() => {
    if (!activeMainModuleFilter) {
      if (selectedSubModuleId !== ALL_SUBMODULE_ID) {
        setSelectedSubModuleId(ALL_SUBMODULE_ID)
      }
      return
    }

    const hasSelectedSubModule = availableSubModuleOptions.some(moduleOption => moduleOption.id === selectedSubModuleId)
    if (!hasSelectedSubModule) {
      setSelectedSubModuleId(ALL_SUBMODULE_ID)
    }
  }, [activeMainModuleFilter, availableSubModuleOptions, selectedSubModuleId])

  const activeSubModuleFilter =
    activeMainModuleFilter && selectedSubModuleId !== ALL_SUBMODULE_ID ? selectedSubModuleId : null

  const filteredCatalogBusinessApps = useMemo(() => {
    return filterableBusinessApps.filter(businessApp => {
      if (activeMainModuleFilter && businessApp.module !== activeMainModuleFilter) {
        return false
      }

      if (activeSubModuleFilter && getPrimarySubModuleId(businessApp) !== activeSubModuleFilter) {
        return false
      }

      return true
    })
  }, [activeMainModuleFilter, activeSubModuleFilter])

  const moduleSelectorConfig = useMemo<ModuleSelectorProps>(
    () => ({
      spaces: mainModuleOptions,
      currentSpaceId: selectedMainModuleId,
      onSpaceChange: setSelectedMainModuleId,
      modules: activeMainModuleFilter ? availableSubModuleOptions : undefined,
      currentModuleId: activeMainModuleFilter ? selectedSubModuleId : undefined,
      onModuleChange: activeMainModuleFilter ? setSelectedSubModuleId : undefined
    }),
    [activeMainModuleFilter, availableSubModuleOptions, mainModuleOptions, selectedMainModuleId, selectedSubModuleId]
  )

  // Density state (affects spacing multipliers across DS components)
  const densityClass =
    density === 'compact'
      ? 'nw:density-compact'
      : density === 'comfortable'
        ? 'nw:density-comfortable'
        : 'nw:density-default'

  // Locale state for LocalizationProvider
  const [locale, setLocale] = useState<Locales>('en-US')
  const [enableIdeStructureIdAutofill, setEnableIdeStructureIdAutofill] = useState(true)

  // Persist density changes
  useEffect(() => {
    localStorage.setItem('business-app-ide-ui-density', density)
  }, [density])

  // Apply density globally on <html> to ensure DS components outside wrapper are affected
  useEffect(() => {
    const root = window?.document?.documentElement
    if (!root) return
    root.classList.remove('nw:density-default', 'nw:density-compact', 'nw:density-comfortable')
    root.classList.add(densityClass)
  }, [densityClass])

  const [lastPublishedDate, setLastPublishedDate] = useState<string>('')

  // Token expiration tracking
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null)

  // Publish screen state
  const [publishConfirmDialogVisible, setPublishConfirmDialogVisible] = useState(false)

  // Actually publish the screen after confirmation
  const handleConfirmPublish = useCallback(async () => {
    if (!selectedApp) return

    setPublishConfirmDialogVisible(false)

    try {
      const response = await fetch('/__publish-screen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ screenPath: selectedApp.screenKey })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Screen published successfully', {
          description: (
            <span className="gba:text-foreground">
              <code className="gba:font-medium">{selectedApp.screenKey}</code>
            </span>
          ),
          position: 'top-right'
        })
        // Update last published date
        setLastPublishedDate(new Date().toLocaleString())
      } else {
        toast.error('Publish failed', {
          description: <span className="gba:text-foreground">{result.error || 'An unknown error occurred'}</span>,
          position: 'top-right'
        })
        console.error('Publish error details:', result)
      }
    } catch (error) {
      console.error('Publish error:', error)
      toast.error('Publish failed', {
        description: (
          <span className="gba:text-foreground">{error instanceof Error ? error.message : 'Network error'}</span>
        ),
        position: 'top-right'
      })
    }
  }, [selectedApp])

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
      let variant: 'success' | 'warning' | 'destructive' = 'success'

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
    const savedDensity = localStorage.getItem('business-app-ide-ui-density') as
      | 'default'
      | 'compact'
      | 'comfortable'
      | null
    if (savedDensity === 'default' || savedDensity === 'compact' || savedDensity === 'comfortable') {
      setDensity(savedDensity)
    }

    // Load saved locale
    const savedLocale = localStorage.getItem('business-app-ide-locale') as Locales | null
    if (savedLocale) {
      setLocale(savedLocale)
    }

    // Load saved structure id autofill toggle
    const savedAutofill = localStorage.getItem('business-app-ide-structure-id-autofill')
    if (savedAutofill === 'true' || savedAutofill === 'false') {
      setEnableIdeStructureIdAutofill(savedAutofill === 'true')
    }

    setHasLoadedSettings(true)
  }, [])

  useEffect(() => {
    if (!selectedApp) {
      setLastPublishedDate('')
      return
    }

    fetchLastPublishedDate(selectedApp)

    const platformPath = getPlatformPathForAppPath(selectedApp.screenKey)
    const url = new URL(window.location.href)

    if (platformPath) {
      url.pathname = platformPath
      url.searchParams.delete('app')
      url.searchParams.delete('record')
      url.searchParams.delete('form')
      url.searchParams.delete('popup')
      url.searchParams.delete('window')
    } else {
      url.searchParams.delete('app')
      url.searchParams.delete('record')
      url.searchParams.delete('form')
      url.searchParams.delete('popup')
      url.searchParams.delete('window')
      url.searchParams.set(selectedApp.type, selectedApp.screenKey)
    }
    const targetUrl = url.pathname + (url.search || '')
    const currentUrl = window.location.pathname + window.location.search
    if (targetUrl !== currentUrl) {
      window.history.pushState({}, '', targetUrl)
    }
  }, [selectedApp])

  // Redirect root to platform home so localhost:3002 lands on /platform.
  // Do not touch the URL when it has OAuth callback params (code, state) – Keycloak must process them first; overwriting causes a login loop.
  useEffect(() => {
    const path = window.location.pathname
    const search = window.location.search
    const hasOAuthParams = search.includes('code=') || search.includes('state=')
    if ((path === '/' || path === '') && !hasOAuthParams) {
      window.history.replaceState({}, '', NAVIGATION_BASE_PATH)
    }
  }, [])

  // Sync selectedApp from URL when user navigates back/forward (pathname or query)
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname
      const params = new URLSearchParams(window.location.search)
      const appFromQuery =
        params.get('app') || params.get('record') || params.get('form') || params.get('popup') || params.get('window')
      const appPathFromPathname = getAppPathForPlatformUrl(pathname)
      const effectivePath = appPathFromPathname ?? appFromQuery
      if (effectivePath) {
        const app = getAppByPath(effectivePath) || getAppByName(effectivePath)
        setSelectedApp(app)
      } else {
        setSelectedApp(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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
    resetBreadcrumbToApp(app)
    setSelectedApp(app)
  }

  const handleHomeClick = () => {
    resetBreadcrumbToHome()
    setSelectedApp(null)
    navigateTo(NAVIGATION_BASE_PATH)
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
  }

  // Persist locale selection
  useEffect(() => {
    localStorage.setItem('business-app-ide-locale', locale)
  }, [locale])

  // Persist structure id autofill selection
  useEffect(() => {
    localStorage.setItem('business-app-ide-structure-id-autofill', String(enableIdeStructureIdAutofill))
  }, [enableIdeStructureIdAutofill])

  // Persist chat enable selection
  useEffect(() => {
    localStorage.setItem('business-app-ide-enable-chat', String(enableChat))
  }, [enableChat])

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

  const getIdeActiveStructureId = useCallback((): string | undefined => {
    if (typeof process !== 'undefined' && process.env?.IDE_ACTIVE_STRUCTURE_ID) {
      return String(process.env.IDE_ACTIVE_STRUCTURE_ID)
    }

    return undefined
  }, [])

  useEffect(() => {
    if (!hasLoadedSettings || !enableIdeStructureIdAutofill) return
    const ideStructureId = getIdeActiveStructureId()
    if (!ideStructureId) return

    if (!additionalData || additionalData.trim().length === 0) {
      setAdditionalData(JSON.stringify({ platformContext: { structureId: ideStructureId } }, null, 2))
      return
    }

    const existingAdditionalData = parsedAdditionalData()
    if (!existingAdditionalData) return

    const hasStructureId =
      existingAdditionalData?.platformContext?.structureId ||
      existingAdditionalData?.structureId ||
      existingAdditionalData?.activeStructureId

    if (hasStructureId) return

    const mergedAdditionalData = {
      ...existingAdditionalData,
      platformContext: {
        ...existingAdditionalData.platformContext,
        structureId: ideStructureId
      }
    }

    const serialized = JSON.stringify(mergedAdditionalData, null, 2)
    if (serialized !== additionalData) {
      setAdditionalData(serialized)
    }
  }, [additionalData, enableIdeStructureIdAutofill, getIdeActiveStructureId, hasLoadedSettings, parsedAdditionalData])

  // Provide a local platform context for localhost IDE usage.
  // This mirrors platform-provided values without hardcoding any IDs.
  useEffect(() => {
    if (typeof globalThis === 'undefined') return

    const localUserInfo = parsedUserInfo()
    const localAdditionalData = parsedAdditionalData()
    if (!localUserInfo && !localAdditionalData) return

    const lowcoder = ((globalThis as any).lowcoder ??= {})
    const platformContext = { ...lowcoder.platformContext }
    const additionalPlatformContext = localAdditionalData?.platformContext ?? {}

    const structureId =
      platformContext.structureId ||
      additionalPlatformContext.structureId ||
      localAdditionalData?.structureId ||
      localAdditionalData?.activeStructureId

    if (structureId && !platformContext.structureId) {
      platformContext.structureId = structureId
    }

    if (structureId && !lowcoder.activeStructureId) {
      lowcoder.activeStructureId = structureId
    }

    if (localUserInfo?.employeeDetails?.employeeId && !platformContext.employeeId) {
      platformContext.employeeId = localUserInfo.employeeDetails.employeeId
    }

    if (localUserInfo?.employeeDetails?.organizationalUnit?.id && !platformContext.organizationalUnitId) {
      platformContext.organizationalUnitId = localUserInfo.employeeDetails.organizationalUnit.id
    }

    if (localUserInfo?.employeeDetails?.supervisor?.id && !platformContext.managerId) {
      platformContext.managerId = localUserInfo.employeeDetails.supervisor.id
    }

    if (localUserInfo?.id && !platformContext.userId) {
      platformContext.userId = localUserInfo.id
    }

    lowcoder.platformContext = platformContext
  }, [parsedAdditionalData, parsedUserInfo])

  // --- Authentication & user profile (Keycloak-based) ---
  const {
    initialized: authInitialized,
    accessToken: authToken,
    tokenParsed,
    logout,
    refreshToken,
    isMsOAuthCallback
  } = useBusinessAuth()
  const { userInfo: profileUserInfo, loading: profileLoading } = useUserProfileFromKeycloak(authToken, tokenParsed)
  const { wordmarkUrl: brandingWordmarkUrl, logomarkUrl: brandingLogomarkUrl } = useBrandingLogo(authToken)

  // When auth/profile become available, synchronize into IDE state and localStorage
  useEffect(() => {
    if (!authInitialized || !authToken) return

    setAccessToken(authToken)
    try {
      localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, authToken)
    } catch {
      // ignore storage errors
    }
  }, [authInitialized, authToken])

  useEffect(() => {
    if (!profileUserInfo) return
    try {
      const serialized = JSON.stringify(profileUserInfo, null, 2)
      setUserInfo(serialized)
      validateUserInfo(serialized)
      localStorage.setItem(STORAGE_KEY_USER_INFO, serialized)
    } catch {
      // ignore serialization or storage errors
    }
  }, [profileUserInfo])

  // After auth init, sync selectedApp from URL (covers path restore after reload)
  useEffect(() => {
    if (!authInitialized) return
    const pathname = window.location.pathname
    const params = new URLSearchParams(window.location.search)
    const appFromQuery =
      params.get('app') || params.get('record') || params.get('form') || params.get('popup') || params.get('window')
    const appPathFromPathname = getAppPathForPlatformUrl(pathname)
    const effectivePath = appPathFromPathname ?? appFromQuery
    if (effectivePath) {
      const app = getAppByPath(effectivePath) || getAppByName(effectivePath)
      setSelectedApp(app)
    } else if (pathname === '' || pathname === '/' || pathname === NAVIGATION_BASE_PATH) {
      setSelectedApp(null)
    }
  }, [authInitialized])

  const handleLogout = useCallback(async () => {
    await logout()
    setAccessToken('')
    setUserInfo('')
    setAdditionalData('')
    setTokenStatus(null)
  }, [logout])

  const handleTokenBadgeClick = useCallback(async () => {
    await refreshToken()
  }, [refreshToken])

  // While authentication is initializing, show a minimal loading shell.
  // Only block on profile loading when we do not have profile yet (avoids fullscreen "Signing in" on token refresh).
  // Exception: if this is a Microsoft OAuth callback, render immediately so email app can handle it.
  const hasSavedReturnPath = typeof window !== 'undefined' && sessionStorage.getItem('keycloak_return_path') != null
  if (!authInitialized || (profileLoading && !profileUserInfo && !isMsOAuthCallback)) {
    const loadingLabel = isMsOAuthCallback
      ? 'Completing Microsoft sign-in…'
      : hasSavedReturnPath
        ? 'Loading…'
        : 'Signing you in to NEWWORK…'
    return (
      <ThemeProvider defaultTheme="light" storageKey="business-app-ide-ui-theme">
        <LocalizationProvider locale={locale}>
          <div className={densityClass}>
            <div className="gba:h-screen gba:flex gba:items-center gba:justify-center">
              <div className="gba:text-sm gba:text-muted-foreground">{loadingLabel}</div>
            </div>
          </div>
        </LocalizationProvider>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="business-app-ide-ui-theme">
      <LocalizationProvider locale={locale}>
        <BlinkProvider accessToken={accessToken || ''} currentUserId={parsedUserInfo()?.id || ''}>
          <UiCatalogProvider>
            <ProcessEventListener onLocalDevEvent={handleProcessLocalDevEvent} />
            <FeatureHubProvider userId={parsedUserInfo()?.id ?? ''} />

            <ShellProvider config={{ appName: 'Business Apps IDE', persistence: true }}>
              <ShellLayout
                sidebar={
                  <IDEMenu
                    businessApps={businessApps}
                    menuConfiguration={menuConfiguration}
                    activeMainModuleFilter={activeMainModuleFilter}
                    activeSubModuleFilter={activeSubModuleFilter}
                    selectedApp={selectedApp}
                    onAppSelect={handleAppSelect}
                    onHomeClick={handleHomeClick}
                    wordmarkUrl={brandingWordmarkUrl}
                    logomarkUrl={brandingLogomarkUrl}
                  />
                }
                header={
                  <IDEHeader
                    packageVersion={packageVersion}
                    onBack={goBack}
                    locale={locale}
                    onLocaleChange={setLocale}
                    density={density}
                    onDensityChange={setDensity}
                    tokenStatus={tokenStatus}
                    onTokenBadgeClick={handleTokenBadgeClick}
                    lastPublishedDate={lastPublishedDate}
                    userInfo={userInfo}
                    onUserInfoChange={value => {
                      setUserInfo(value)
                      validateUserInfo(value)
                    }}
                    userInfoError={userInfoError}
                    accessToken={accessToken}
                    onAccessTokenChange={setAccessToken}
                    additionalData={additionalData}
                    onAdditionalDataChange={value => {
                      setAdditionalData(value)
                      validateAdditionalData(value)
                    }}
                    additionalDataError={additionalDataError}
                    enableStructureIdAutofill={enableIdeStructureIdAutofill}
                    onEnableStructureIdAutofillChange={setEnableIdeStructureIdAutofill}
                    onSettingsSave={saveSettings}
                    onLogout={handleLogout}
                    breadcrumbItems={breadcrumbItems}
                    moduleSelector={moduleSelectorConfig}
                    performanceWindowOpen={performanceWindowOpen}
                    onPerformanceOpen={() => setPerformanceWindowOpen(currentWindowOpen => !currentWindowOpen)}
                    onSearchOpen={() => setSearchCommandOpen(true)}
                    onSettingsOpen={() => setSettingsModalVisible(true)}
                    enableChat={enableChat}
                    onEnableChatChange={setEnableChat}
                    selectedAppName={selectedApp?.name ?? null}
                    onPublishClick={() => setPublishConfirmDialogVisible(true)}
                    searchCommandOpen={searchCommandOpen}
                    settingsModalVisible={settingsModalVisible}
                    publishConfirmDialogVisible={publishConfirmDialogVisible}
                  />
                }
                contextPanel={
                  <IDEContextPanel accessToken={accessToken || ''} userInfo={parsedUserInfo()} enabled={enableChat} />
                }
              >
                <div className="gba:flex gba:flex-1 gba:flex-col gba:min-h-0 gba:bg-background gba:rounded-xl">
                  {!selectedApp ? (
                    <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto">
                      <IDEStartScreen
                        filteredBusinessApps={filteredCatalogBusinessApps}
                        allBusinessApps={businessApps}
                        onAppSelect={handleAppSelect}
                      />
                    </div>
                  ) : (
                    <div className="gba:flex gba:flex-1 gba:flex-col gba:min-h-0 gba:overflow-hidden">
                      <IDERenderer
                        selectedApp={selectedApp}
                        userInfo={parsedUserInfo()}
                        accessToken={accessToken || ''}
                        additionalData={parsedAdditionalData()}
                        onAppSelect={setSelectedApp}
                      />
                    </div>
                  )}
                </div>
              </ShellLayout>

              <PerformanceWindow open={performanceWindowOpen} onClose={() => setPerformanceWindowOpen(false)} />

              <GlobalSearchCommand
                open={searchCommandOpen}
                onOpenChange={setSearchCommandOpen}
                businessApps={businessApps}
                menuConfiguration={menuConfiguration}
                onAppSelect={handleAppSelect}
              />
            </ShellProvider>

            <PublishConfirmDialog
              open={publishConfirmDialogVisible}
              onOpenChange={setPublishConfirmDialogVisible}
              selectedApp={selectedApp ?? null}
              onConfirm={handleConfirmPublish}
            />

            <SettingsDialog
              open={settingsModalVisible}
              onOpenChange={setSettingsModalVisible}
              userInfo={userInfo}
              onUserInfoChange={(value: string) => {
                setUserInfo(value)
                validateUserInfo(value)
              }}
              userInfoError={userInfoError}
              accessToken={accessToken}
              onAccessTokenChange={setAccessToken}
              tokenStatus={tokenStatus}
              additionalData={additionalData}
              onAdditionalDataChange={(value: string) => {
                setAdditionalData(value)
                validateAdditionalData(value)
              }}
              additionalDataError={additionalDataError}
              enableStructureIdAutofill={enableIdeStructureIdAutofill}
              onEnableStructureIdAutofillChange={setEnableIdeStructureIdAutofill}
              onSave={() => {
                saveSettings()
                setSettingsModalVisible(false)
              }}
              onLogout={handleLogout}
              onCancel={() => setSettingsModalVisible(false)}
            />

            <Toaster />
          </UiCatalogProvider>
        </BlinkProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}
