import type { FileInfo } from '@/common/types/FileTypes'

export type SearchCategorySelectionMode = 'SINGLE' | 'MULTIPLE'
export type SearchSectionKind = 'RESULTS' | 'TOP_MATCH' | 'RECENT' | 'SUGGESTIONS' | 'TRENDING' | 'ANSWERS' | 'ACTIONS'
export type SearchSectionPresentation = 'LIST' | 'COMPACT_LIST' | 'GRID' | 'HERO'
export type SearchBadgeTone = 'NEUTRAL' | 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL'
export type SearchTargetKind = 'URL' | 'APP_ACTION' | 'COMMAND'
export type SearchOpenMode = 'SAME_TAB' | 'NEW_TAB'
export type SearchActionVariant = 'LIST_ITEM' | 'TABLE_ROW' | 'CUSTOM'
export type SearchSuggestionKind = 'QUERY' | 'ITEM' | 'ACTION' | 'TOPIC' | 'RECENT'
export type SearchEventType = 'SEARCH_COMMITTED' | 'ZERO_RESULT_QUERY' | 'RESULT_CLICKED' | 'ACTION_TRIGGERED'

export interface SearchAnalytics {
  provider: string
  trackingId: string
  rank: number
}

export interface SearchCategory {
  id: string
  label: string
  icon?: string
  count?: number
  selected?: boolean
}

export interface SearchSection {
  id: string
  kind: SearchSectionKind
  title: string
  presentation: SearchSectionPresentation
  total?: number
  items: SearchItem[]
}

export interface SearchItem {
  id: string
  type: string
  typeLabel: string
  /** Provider hint (e.g. FILE) — used for lead icon when type is an office format */
  kind?: string
  categoryIds: string[]
  name: string
  description?: string
  media?: {
    imageUrl?: string
    fileInfo?: FileInfo
    icon?: string
    fallbackIcon?: string
  }
  badges?: Array<{
    id: string
    label: string
    tone?: SearchBadgeTone
  }>
  highlights?: Record<string, string>
  primaryTarget?: SearchTarget
  actionMenu?: SearchActionMenu
  analytics: SearchAnalytics
}

export type SearchTarget =
  | {
      kind: 'URL'
      href: string
      openIn?: SearchOpenMode
    }
  | {
      kind: 'APP_ACTION'
      variant?: SearchActionVariant
      contexts: SearchContext[]
      customActions?: SearchCustomAction[]
      lazyLoad?: boolean
      autoExecute?: boolean
    }
  | {
      kind: 'COMMAND'
      commandId: string
      payload?: Record<string, unknown>
    }

export interface SearchActionMenu {
  variant?: SearchActionVariant
  contexts?: SearchContext[]
  customActions?: SearchCustomAction[]
  lazyLoad?: boolean
  autoExecute?: boolean
}

export interface SearchContext {
  context: string
  contextData: Record<string, unknown>
}

export interface SearchCustomAction {
  id: string
  label: string
  icon?: string
  target: SearchTarget
}

export interface SearchSuggestion {
  id: string
  kind: SearchSuggestionKind
  label: string
  description?: string
  queryValue?: string
  categoryIds?: string[]
  imageUrl?: string
  icon?: string
  primaryTarget?: SearchTarget
  actionMenu?: SearchActionMenu
  analytics?: SearchAnalytics
}

export interface GlobalSearchConfigurationResponse {
  data: {
    config: {
      minQueryLength: number
      debounceMs: number
      pageSize: number
      categorySelectionMode: SearchCategorySelectionMode
      placeholder: string
    }
    categories: SearchCategory[]
    sections: SearchSection[]
  }
}

export interface GlobalSearchQueryRequest {
  q: string
  categoryIds?: string[]
  paging?: {
    limit: number
    offset?: number
    cursor?: string
    returnTotalRecords?: boolean
  }
  context?: {
    appId?: string
    currentUri?: string
  }
}

export interface GlobalSearchQueryResponse {
  data: SearchSection[]
  categories: SearchCategory[]
  /** Present for empty-query / discovery responses from GET /results (same payload as configuration suggestions). */
  suggestions?: SearchSuggestion[]
  paging?: {
    limit: number
    offset?: number
    totalRecords?: number
  }
  _links?: {
    self: string
    first?: string
    prev?: string
    next?: string
    last?: string
  }
  query: {
    q?: string
    categoryIds?: string[]
  }
  meta: {
    trackingToken: string
  }
}

export interface GlobalSearchSuggestionsResponse {
  data: SearchSuggestion[]
  query: {
    q?: string
    categoryIds?: string[]
  }
  meta?: {
    trackingToken?: string
  }
}

export interface GlobalSearchEventRequest {
  trackingToken?: string
  events: Array<{
    type: SearchEventType
    resultId?: string
    suggestionId?: string
    categoryId?: string
    q?: string
    rank?: number
    metadata?: Record<string, unknown>
    occurredAt?: string
  }>
}

export interface StandardError {
  code: string
  title: string
  detail: string
  source: string
  timestamp: string
}

export interface ErrorsObject {
  errors: StandardError[]
}
