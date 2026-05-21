import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BreadcrumbItemConfig } from '@newwork/nw-design-system'
import type { BusinessAppInfo } from '@/components/ide-main-menu'
import { NAVIGATION_BASE_PATH, PLATFORM_URL_TO_APP_MAPPING, navigateTo } from '@/common/utils/navigationUtils'
import {
  BREADCRUMB_CLEAR_EVENT,
  BREADCRUMB_OVERRIDE_EVENT,
  type BreadcrumbOverrideChildItem,
  type BreadcrumbOverrideItem,
  type BreadcrumbOverridePayload
} from '@/common/events/breadcrumbOverride'

const BREADCRUMB_HISTORY_STATE_KEY = '__gbaIdeBreadcrumbEntryId'
const IGNORED_QUERY_PARAM_KEYS = new Set([
  'app',
  'record',
  'form',
  'popup',
  'window',
  '_refresh',
  'code',
  'state',
  'session_state',
  'iss'
])
const CONTEXT_QUERY_PARAM_PRIORITY = [
  'view',
  'tab',
  'subView',
  'section',
  'mode',
  'folderId',
  'noteId',
  'spaceId',
  'docId',
  'documentId',
  'recordId',
  'employeeId',
  'contactId',
  'leadId',
  'accountId',
  'campaignId',
  'taskId',
  'sessionId',
  'id',
  'namespace',
  'modelId'
] as const

type HistoryChangeMode = 'push' | 'replace' | 'pop'

interface LocationSnapshot {
  pathname: string
  search: string
  hash: string
}

interface BreadcrumbHistoryEntry {
  id: string
  historyEntryId: string
  label: string
  locationKey: string
  targetUrl: string
}

let breadcrumbEntrySequence = 0

function normalizePathname(pathname: string): string {
  const normalizedPathname = pathname?.replace(/\/$/, '') || ''
  return normalizedPathname.startsWith('/') ? normalizedPathname : `/${normalizedPathname}`
}

function getLocationKey(locationSnapshot: LocationSnapshot): string {
  return `${locationSnapshot.pathname}${locationSnapshot.search}${locationSnapshot.hash}`
}

function isIdeHomeLocation(locationSnapshot: LocationSnapshot): boolean {
  const normalizedPathname = normalizePathname(locationSnapshot.pathname)
  return normalizedPathname === NAVIGATION_BASE_PATH || normalizedPathname === '/'
}

function getAppPathForPlatformUrl(pathname: string): string | undefined {
  return PLATFORM_URL_TO_APP_MAPPING[normalizePathname(pathname)]
}

function getPlatformPathForAppPath(appPath: string): string | undefined {
  if (!appPath) {
    return undefined
  }

  return Object.keys(PLATFORM_URL_TO_APP_MAPPING).find(
    platformPath => PLATFORM_URL_TO_APP_MAPPING[platformPath] === appPath
  )
}

function getCurrentLocationSnapshot(): LocationSnapshot {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash
  }
}

function getSelectedAppFromLocation(
  businessApps: BusinessAppInfo[],
  locationSnapshot: LocationSnapshot
): BusinessAppInfo | null {
  const queryParams = new URLSearchParams(locationSnapshot.search)
  const appFromQuery =
    queryParams.get('app') ||
    queryParams.get('record') ||
    queryParams.get('form') ||
    queryParams.get('popup') ||
    queryParams.get('window')
  const appPathFromPathname = getAppPathForPlatformUrl(locationSnapshot.pathname)
  const effectiveAppPath = appPathFromPathname ?? appFromQuery

  if (!effectiveAppPath) {
    return null
  }

  return businessApps.find(app => app.screenKey === effectiveAppPath || app.name === effectiveAppPath) ?? null
}

function toTitleCase(value: string): string {
  return value
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function truncateValue(value: string, maxLength = 18): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value
}

function getReadableContextValue(paramKey: string, paramValue: string): string {
  const readableValue = toTitleCase(decodeURIComponent(paramValue))
  if (paramKey.toLowerCase().endsWith('id')) {
    const readableKey = toTitleCase(paramKey.replace(/Id$/i, ''))
    return `${readableKey} ${truncateValue(paramValue, 10)}`
  }

  return readableValue
}

function getBreadcrumbContextLabel(locationSnapshot: LocationSnapshot): string | null {
  const queryParams = new URLSearchParams(locationSnapshot.search)

  for (const paramKey of CONTEXT_QUERY_PARAM_PRIORITY) {
    const paramValue = queryParams.get(paramKey)
    if (paramValue) {
      return getReadableContextValue(paramKey, paramValue)
    }
  }

  for (const [paramKey, paramValue] of queryParams.entries()) {
    if (IGNORED_QUERY_PARAM_KEYS.has(paramKey) || !paramValue) {
      continue
    }

    return `${toTitleCase(paramKey)} ${truncateValue(paramValue)}`
  }

  if (locationSnapshot.hash) {
    return toTitleCase(locationSnapshot.hash.replace(/^#/, ''))
  }

  return null
}

function getFallbackLabelFromPathname(pathname: string): string {
  const pathSegments = normalizePathname(pathname).split('/').filter(Boolean)
  const lastPathSegment = pathSegments[pathSegments.length - 1]
  return lastPathSegment ? toTitleCase(lastPathSegment) : 'Page'
}

function buildBreadcrumbLabel(businessApp: BusinessAppInfo | null, locationSnapshot: LocationSnapshot): string {
  const contextLabel = getBreadcrumbContextLabel(locationSnapshot)

  if (contextLabel) {
    return contextLabel
  }

  return businessApp?.name ?? getFallbackLabelFromPathname(locationSnapshot.pathname)
}

function getHistoryEntryId(historyState: unknown): string | null {
  if (!historyState || typeof historyState !== 'object' || Array.isArray(historyState)) {
    return null
  }

  const maybeHistoryEntryId = (historyState as Record<string, unknown>)[BREADCRUMB_HISTORY_STATE_KEY]
  return typeof maybeHistoryEntryId === 'string' ? maybeHistoryEntryId : null
}

function createHistoryEntryId(): string {
  breadcrumbEntrySequence += 1
  return `gba-breadcrumb-${breadcrumbEntrySequence}`
}

function withHistoryEntryId(historyState: unknown, fallbackHistoryEntryId?: string): Record<string, unknown> {
  const existingHistoryEntryId = getHistoryEntryId(historyState)
  if (existingHistoryEntryId) {
    return historyState as Record<string, unknown>
  }

  const nextHistoryEntryId = fallbackHistoryEntryId ?? createHistoryEntryId()
  if (historyState && typeof historyState === 'object' && !Array.isArray(historyState)) {
    return {
      ...(historyState as Record<string, unknown>),
      [BREADCRUMB_HISTORY_STATE_KEY]: nextHistoryEntryId
    }
  }

  return {
    [BREADCRUMB_HISTORY_STATE_KEY]: nextHistoryEntryId
  }
}

function buildTargetUrlForApp(app: BusinessAppInfo): string {
  const currentUrl = new URL(window.location.href)
  const platformPath = getPlatformPathForAppPath(app.screenKey)

  currentUrl.searchParams.delete('app')
  currentUrl.searchParams.delete('record')
  currentUrl.searchParams.delete('form')
  currentUrl.searchParams.delete('popup')
  currentUrl.searchParams.delete('window')

  if (platformPath) {
    currentUrl.pathname = platformPath
  } else {
    currentUrl.searchParams.set(app.type, app.screenKey)
  }

  return currentUrl.pathname + currentUrl.search + currentUrl.hash
}

function createBreadcrumbHistoryEntry(
  businessApps: BusinessAppInfo[],
  historyEntryId: string,
  locationSnapshot: LocationSnapshot
): BreadcrumbHistoryEntry | null {
  const businessApp = getSelectedAppFromLocation(businessApps, locationSnapshot)
  if (!businessApp && isIdeHomeLocation(locationSnapshot)) {
    return null
  }

  return {
    id: `${historyEntryId}:${getLocationKey(locationSnapshot)}`,
    historyEntryId,
    label: buildBreadcrumbLabel(businessApp, locationSnapshot),
    locationKey: getLocationKey(locationSnapshot),
    targetUrl: getLocationKey(locationSnapshot)
  }
}

function resolveNavigationTarget(href: string): string {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href
  }

  try {
    const resolvedUrl = new URL(href, window.location.href)
    return resolvedUrl.pathname + resolvedUrl.search + resolvedUrl.hash
  } catch {
    return href
  }
}

function mapOverrideChildToConfig(child: BreadcrumbOverrideChildItem): BreadcrumbItemConfig {
  const targetHref = child.href
  return {
    id: child.id,
    label: child.label,
    onClick: targetHref ? () => navigateTo(resolveNavigationTarget(targetHref)) : undefined
  }
}

function mapOverrideItemToConfig(item: BreadcrumbOverrideItem): BreadcrumbItemConfig {
  const visibleChildren = (item.children ?? []).filter(child => child.visible !== false)
  const targetHref = item.href
  const base: BreadcrumbItemConfig = {
    id: item.id,
    label: item.label,
    onClick: targetHref ? () => navigateTo(resolveNavigationTarget(targetHref)) : undefined
  }

  if (visibleChildren.length === 0) {
    return base
  }

  return {
    ...base,
    children: visibleChildren.map(mapOverrideChildToConfig)
  } as BreadcrumbItemConfig
}

export interface UseIDEBreadcrumbResult {
  breadcrumbItems: BreadcrumbItemConfig[]
  goBack: () => void
  resetBreadcrumbToHome: () => void
  resetBreadcrumbToApp: (app: BusinessAppInfo) => void
}

export function useIDEBreadcrumb(businessApps: BusinessAppInfo[]): UseIDEBreadcrumbResult {
  const [breadcrumbEntries, setBreadcrumbEntries] = useState<BreadcrumbHistoryEntry[]>([])
  const breadcrumbEntriesRef = useRef<BreadcrumbHistoryEntry[]>([])
  const [breadcrumbOverride, setBreadcrumbOverride] = useState<BreadcrumbOverridePayload | null>(null)

  useEffect(() => {
    breadcrumbEntriesRef.current = breadcrumbEntries
  }, [breadcrumbEntries])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleBreadcrumbOverride = (event: Event) => {
      const customEvent = event as CustomEvent<unknown>
      const detail = customEvent.detail as BreadcrumbOverridePayload | undefined
      if (!detail || detail.version !== 1 || typeof detail.screenKey !== 'string' || !Array.isArray(detail.items)) {
        return
      }

      setBreadcrumbOverride(detail)
    }

    const handleBreadcrumbClear = (event: Event) => {
      const customEvent = event as CustomEvent<{ screenKey?: string } | undefined>
      const targetScreenKey = customEvent.detail?.screenKey

      setBreadcrumbOverride(currentOverride => {
        if (!currentOverride) {
          return null
        }

        if (!targetScreenKey || targetScreenKey === currentOverride.screenKey) {
          return null
        }

        return currentOverride
      })
    }

    window.addEventListener(BREADCRUMB_OVERRIDE_EVENT, handleBreadcrumbOverride)
    window.addEventListener(BREADCRUMB_CLEAR_EVENT, handleBreadcrumbClear)

    return () => {
      window.removeEventListener(BREADCRUMB_OVERRIDE_EVENT, handleBreadcrumbOverride)
      window.removeEventListener(BREADCRUMB_CLEAR_EVENT, handleBreadcrumbClear)
    }
  }, [])

  const applyHistoryChange = useCallback(
    (mode: HistoryChangeMode) => {
      const locationSnapshot = getCurrentLocationSnapshot()
      const historyEntryId = getHistoryEntryId(window.history.state) ?? createHistoryEntryId()
      const nextEntry = createBreadcrumbHistoryEntry(businessApps, historyEntryId, locationSnapshot)

      setBreadcrumbEntries(previousEntries => {
        if (!nextEntry) {
          return []
        }

        const currentEntry = previousEntries[previousEntries.length - 1]
        if (
          currentEntry?.historyEntryId === nextEntry.historyEntryId ||
          currentEntry?.locationKey === nextEntry.locationKey
        ) {
          if (
            currentEntry.label === nextEntry.label &&
            currentEntry.targetUrl === nextEntry.targetUrl &&
            currentEntry.id === nextEntry.id
          ) {
            return previousEntries
          }

          return [...previousEntries.slice(0, -1), nextEntry]
        }

        if (mode === 'replace') {
          if (previousEntries.length === 0) {
            return [nextEntry]
          }

          return [...previousEntries.slice(0, -1), nextEntry]
        }

        if (mode === 'pop') {
          const existingEntryIndex = previousEntries.findIndex(
            entry => entry.historyEntryId === nextEntry.historyEntryId || entry.locationKey === nextEntry.locationKey
          )
          if (existingEntryIndex !== -1) {
            const nextEntries = previousEntries.slice(0, existingEntryIndex + 1)
            nextEntries[existingEntryIndex] = nextEntry
            return nextEntries
          }

          return [nextEntry]
        }

        return [...previousEntries, nextEntry]
      })
    },
    [businessApps]
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const originalPushState = window.history.pushState.bind(window.history)
    const originalReplaceState = window.history.replaceState.bind(window.history)

    window.history.pushState = function patchedPushState(state, unused, url) {
      const nextState = withHistoryEntryId(state)
      originalPushState(nextState, unused, url)
      applyHistoryChange('push')
    }

    window.history.replaceState = function patchedReplaceState(state, unused, url) {
      const nextState = withHistoryEntryId(state, getHistoryEntryId(window.history.state) ?? undefined)
      originalReplaceState(nextState, unused, url)
      applyHistoryChange('replace')
    }

    const currentLocationSnapshot = getCurrentLocationSnapshot()
    const currentTargetUrl = getLocationKey(currentLocationSnapshot)
    if (getHistoryEntryId(window.history.state) == null) {
      originalReplaceState(withHistoryEntryId(window.history.state), '', currentTargetUrl)
    }
    applyHistoryChange('replace')

    const handlePopState = () => {
      applyHistoryChange('pop')
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      window.removeEventListener('popstate', handlePopState)
    }
  }, [applyHistoryChange])

  const navigateToBreadcrumbIndex = useCallback((breadcrumbIndex: number) => {
    const currentBreadcrumbEntries = breadcrumbEntriesRef.current
    const targetEntry = currentBreadcrumbEntries[breadcrumbIndex]

    if (!targetEntry) {
      setBreadcrumbEntries([])
      navigateTo(NAVIGATION_BASE_PATH)
      return
    }

    setBreadcrumbEntries(currentBreadcrumbEntries.slice(0, breadcrumbIndex + 1))
    navigateTo(targetEntry.targetUrl)
  }, [])

  const resetBreadcrumbToHome = useCallback(() => {
    setBreadcrumbEntries([])
  }, [])

  const resetBreadcrumbToApp = useCallback((app: BusinessAppInfo) => {
    const nextEntry: BreadcrumbHistoryEntry = {
      id: `root:${app.screenKey}`,
      historyEntryId: `root:${app.screenKey}`,
      label: app.name,
      locationKey: buildTargetUrlForApp(app),
      targetUrl: buildTargetUrlForApp(app)
    }

    setBreadcrumbEntries([nextEntry])
  }, [])

  const goBack = useCallback(() => {
    const currentBreadcrumbEntries = breadcrumbEntriesRef.current

    if (currentBreadcrumbEntries.length <= 1) {
      setBreadcrumbEntries([])
      navigateTo(NAVIGATION_BASE_PATH)
      return
    }

    const previousEntryIndex = currentBreadcrumbEntries.length - 2
    const nextBreadcrumbEntries = currentBreadcrumbEntries.slice(0, previousEntryIndex + 1)
    const previousEntry = nextBreadcrumbEntries[previousEntryIndex]

    setBreadcrumbEntries(nextBreadcrumbEntries)
    navigateTo(previousEntry.targetUrl)
  }, [])

  const breadcrumbItems = useMemo<BreadcrumbItemConfig[]>(() => {
    const locationSnapshot = getCurrentLocationSnapshot()
    const selectedApp = getSelectedAppFromLocation(businessApps, locationSnapshot)
    const activeScreenKey = selectedApp?.screenKey ?? null

    const shouldApplyOverride =
      breadcrumbOverride &&
      activeScreenKey &&
      breadcrumbOverride.screenKey === activeScreenKey &&
      breadcrumbOverride.mode === 'replace'

    if (shouldApplyOverride) {
      const visibleItems = breadcrumbOverride.items.filter(item => item.visible !== false)

      return [
        {
          id: 'home',
          label: 'Home',
          onClick: () => {
            resetBreadcrumbToHome()
            navigateTo(NAVIGATION_BASE_PATH)
          }
        },
        ...visibleItems.map(mapOverrideItemToConfig)
      ]
    }

    return [
      {
        id: 'home',
        label: 'Home',
        onClick: () => {
          resetBreadcrumbToHome()
          navigateTo(NAVIGATION_BASE_PATH)
        }
      },
      ...breadcrumbEntries.map((entry, entryIndex) => ({
        id: entry.id,
        label: entry.label,
        onClick: entryIndex < breadcrumbEntries.length - 1 ? () => navigateToBreadcrumbIndex(entryIndex) : undefined
      }))
    ]
  }, [breadcrumbEntries, breadcrumbOverride, businessApps, navigateToBreadcrumbIndex, resetBreadcrumbToHome])

  return {
    breadcrumbItems,
    goBack,
    resetBreadcrumbToHome,
    resetBreadcrumbToApp
  }
}
