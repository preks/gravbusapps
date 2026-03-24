export const BREADCRUMB_OVERRIDE_EVENT = 'com.newwork.breadcrumb.override'
export const BREADCRUMB_CLEAR_EVENT = 'com.newwork.breadcrumb.clear'

export interface BreadcrumbOverrideChildItem {
  id: string
  label: string
  href?: string
  visible?: boolean
}

export interface BreadcrumbOverrideItem {
  id: string
  label: string
  href?: string
  visible?: boolean
  children?: BreadcrumbOverrideChildItem[]
}

export interface BreadcrumbOverridePayload {
  screenKey: string
  version: 1
  mode: 'replace' | 'merge'
  items: BreadcrumbOverrideItem[]
  context?: Record<string, string | number | boolean | null | undefined>
}
