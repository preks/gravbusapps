import type { ActivityTabType, ActivityViewFilter } from '../types'

export type Activity360View = 'home' | 'entity-picker' | 'activities'

export type AppScreen =
  | { screen: 'view-selector' }
  | { screen: 'entity-selector'; filter: ActivityViewFilter }
  | {
      screen: 'activity-view'
      filter: ActivityViewFilter
      entityId?: string
      entityName?: string
    }

export interface Activity360UrlSnapshot {
  appScreen: AppScreen
  tab: ActivityTabType
}

const VALID_FILTERS = new Set<ActivityViewFilter>([
  'all',
  'by-employee',
  'by-account',
  'by-contact',
  'by-lead',
  'by-opportunity',
  'by-general'
])

const ENTITY_PICKER_FILTERS = new Set<ActivityViewFilter>([
  'by-employee',
  'by-account',
  'by-contact',
  'by-lead',
  'by-opportunity'
])

const LEGACY_CEO_VIEW_ALIASES: Record<
  string,
  { view: Activity360View; filter: ActivityViewFilter; tab: ActivityTabType }
> = {
  timeline: { view: 'activities', filter: 'all', tab: 'calendar' },
  team: { view: 'activities', filter: 'all', tab: 'comparison' },
  analytics: { view: 'activities', filter: 'all', tab: 'comparison' }
}

const LEGACY_SCREEN_TO_VIEW: Record<string, Activity360View> = {
  'view-selector': 'home',
  'entity-selector': 'entity-picker',
  'activity-view': 'activities'
}

const isValidFilter = (value: string | null): value is ActivityViewFilter =>
  !!value && VALID_FILTERS.has(value as ActivityViewFilter)

const isEntityPickerFilter = (filter: ActivityViewFilter): boolean => ENTITY_PICKER_FILTERS.has(filter)

const getDefaultTab = (): ActivityTabType => 'list'

const normalizeTab = (tab: string | null, filter: ActivityViewFilter): ActivityTabType => {
  if (tab === 'list' || tab === 'calendar') {
    return tab
  }

  if (tab === 'comparison' && filter === 'all') {
    return 'comparison'
  }

  return getDefaultTab()
}

const readSearchParams = (): URLSearchParams => new URLSearchParams(globalThis.location.search)

const copyDevAppParam = (target: URLSearchParams): void => {
  const app = readSearchParams().get('app')
  if (app) {
    target.set('app', app)
  }
}

const resolveViewFromParams = (params: URLSearchParams): Activity360View | null => {
  const view = params.get('view')

  if (view === 'home' || view === 'entity-picker' || view === 'activities') {
    return view
  }

  if (view && LEGACY_CEO_VIEW_ALIASES[view]) {
    return LEGACY_CEO_VIEW_ALIASES[view].view
  }

  const legacyScreen = params.get('screen')
  if (legacyScreen && LEGACY_SCREEN_TO_VIEW[legacyScreen]) {
    return LEGACY_SCREEN_TO_VIEW[legacyScreen]
  }

  return null
}

export const parseActivity360Url = (): Activity360UrlSnapshot => {
  const params = readSearchParams()
  const legacyCeoView = params.get('view')
  const legacyAlias = legacyCeoView ? LEGACY_CEO_VIEW_ALIASES[legacyCeoView] : undefined

  const filterFromUrl = params.get('filter')
  const filter = isValidFilter(filterFromUrl) ? filterFromUrl : (legacyAlias?.filter ?? null)

  const entityId = params.get('entityId') ?? params.get('employeeId') ?? undefined
  const entityNameRaw = params.get('entityName')
  const entityName = entityNameRaw ? decodeURIComponent(entityNameRaw) : undefined

  const tab = normalizeTab(params.get('tab') ?? legacyAlias?.tab ?? null, filter ?? 'all')

  const view = resolveViewFromParams(params) ?? 'home'

  if (view === 'activities' && filter) {
    return {
      appScreen: {
        screen: 'activity-view',
        filter,
        entityId,
        entityName
      },
      tab
    }
  }

  if (view === 'entity-picker' && filter && isEntityPickerFilter(filter)) {
    return {
      appScreen: { screen: 'entity-selector', filter },
      tab: getDefaultTab()
    }
  }

  return {
    appScreen: { screen: 'view-selector' },
    tab: 'list'
  }
}

export const updateActivity360Url = (snapshot: Activity360UrlSnapshot): void => {
  const params = new URLSearchParams()

  copyDevAppParam(params)

  const { appScreen, tab } = snapshot

  if (appScreen.screen === 'view-selector') {
    writeUrl(params)
    return
  }

  if (appScreen.screen === 'entity-selector') {
    params.set('view', 'entity-picker')
    params.set('filter', appScreen.filter)
    writeUrl(params)
    return
  }

  params.set('view', 'activities')
  params.set('filter', appScreen.filter)
  params.set('tab', tab)

  if (appScreen.entityId) {
    params.set('entityId', appScreen.entityId)
    if (appScreen.filter === 'by-employee') {
      params.set('employeeId', appScreen.entityId)
    }
  }

  if (appScreen.entityName) {
    params.set('entityName', encodeURIComponent(appScreen.entityName))
  }

  writeUrl(params)
}

export const initializeActivity360Url = (snapshot: Activity360UrlSnapshot): void => {
  const params = readSearchParams()

  const needsView = !params.has('view') && !params.has('screen')
  const needsTab = snapshot.appScreen.screen === 'activity-view' && !params.has('tab')

  if (needsView || needsTab) {
    updateActivity360Url(snapshot)
  }
}

const writeUrl = (params: URLSearchParams): void => {
  const merged = new URLSearchParams()

  copyDevAppParam(merged)

  for (const [key, value] of params.entries()) {
    if (key !== 'app') {
      merged.set(key, value)
    }
  }

  const query = merged.toString()
  const querySuffix = query ? `?${query}` : ''
  const newUrl = `${globalThis.location.pathname}${querySuffix}`
  globalThis.history.replaceState({}, '', newUrl)
}

export const buildActivity360PlatformUrl = (snapshot: Activity360UrlSnapshot): string => {
  const params: Record<string, string> = {}

  const { appScreen, tab } = snapshot

  if (appScreen.screen === 'entity-selector') {
    params.view = 'entity-picker'
    params.filter = appScreen.filter
  } else if (appScreen.screen === 'activity-view') {
    params.view = 'activities'
    params.filter = appScreen.filter
    params.tab = tab

    if (appScreen.entityId) {
      params.entityId = appScreen.entityId
      if (appScreen.filter === 'by-employee') {
        params.employeeId = appScreen.entityId
      }
    }

    if (appScreen.entityName) {
      params.entityName = appScreen.entityName
    }
  }

  const basePath = '/platform/crm/sales-activity-360'
  if (Object.keys(params).length === 0) {
    return basePath
  }

  return `${basePath}?${new URLSearchParams(params).toString()}`
}
