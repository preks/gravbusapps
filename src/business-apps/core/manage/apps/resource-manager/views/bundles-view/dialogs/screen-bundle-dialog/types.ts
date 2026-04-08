import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface MenuEntryRow {
  icon: string
  name: string
  parentId: string | null
  hubId: string | null
  nameError?: string
  useCustomName?: boolean
  pathString?: string
  definePath?: boolean
  rank?: number
}

export interface FlowQueryParam {
  key: string
  expression: string
}

export interface FlowEntryRow {
  flowType: 'NAVIGATION' | 'REPORT'
  flowName: string
  queryParams: FlowQueryParam[]
  targetMobileOverride: string
  contextId: string | null
}

export interface UrlRow {
  navigationId?: string
  url: string
  roles: string[]
  features: string[]
  urlError?: string
  menuEntries: MenuEntryRow[]
  flows: FlowEntryRow[]
  useCustomName?: boolean
  customName?: string
}

export type MenuSpaceType = 'USE' | 'CREATE' | 'MANAGE'

export interface PendingMenuItem {
  tempId: string
  parentNodeId: string
  parentIsHub: boolean
  rootHubId: string
  name: string
  rank: number
}

export interface ScreenBundleDialogInitialData {
  componentPath?: string
  componentVersion?: string
  name?: string
  code?: string
  screenKey?: string
  existingComponentId?: string
}

export interface ScreenBundleDialogProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  initialData?: ScreenBundleDialogInitialData
  'data-testid'?: string
}
