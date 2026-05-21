import { GLOBAL_SEARCH_API_URL } from '@/common/utils/serviceResolver'
import { assignBearerAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient, type RequestOptions } from '@/common/network/rest/RestClient'
import type {
  GlobalSearchConfigurationResponse,
  GlobalSearchEventRequest,
  GlobalSearchQueryRequest,
  GlobalSearchQueryResponse,
  SearchActionMenu,
  SearchContext,
  SearchCustomAction,
  SearchItem,
  SearchSuggestion,
  SearchTarget
} from '@/business-apps/core/use/apps/global-search/types'

export type GlobalSearchEntityKind = 'PROFILE' | 'RECORD' | 'COLLECTION' | 'FILE' | 'PAGE' | 'ACTION' | 'ACTIVITY'
export type GlobalSearchAccessControlType = 'ACL' | 'OWNER' | 'PUBLIC'
export type GlobalSearchEntitySeedMode = 'FILL' | 'UPSERT' | 'RESET'
export type GlobalSearchAnalyticsSeedPreset = 'SMALL' | 'MEDIUM' | 'LARGE' | 'STRESS'

export interface GlobalSearchPaging {
  limit: number
  offset: number
  totalRecords: number
}

export interface GlobalSearchEntityActionConfig {
  endpoint?: string
  contexts?: Array<{
    context: string
    contextDataMapping: Record<string, string>
  }>
  actions?: Array<{
    id: string
    label: string
    icon?: string
    endpoint: string
  }>
}

export interface GlobalSearchEntityType {
  entityType: string
  entityTypeLabel: string
  categoryKey: string
  categoryLabel: string
  kind: GlobalSearchEntityKind
  icon: string
  searchConfig: Record<string, unknown>
  actionConfig: GlobalSearchEntityActionConfig
  accessControlType: GlobalSearchAccessControlType
  active: boolean
  sortOrder: number
}

export type GlobalSearchEntityTypePayload = GlobalSearchEntityType

export interface GlobalSearchEntityTypeListResponse {
  data: GlobalSearchEntityType[]
}

export interface GlobalSearchEntitySeedResponse {
  inserted: number
  updated: number
  deleted: number
}

export interface GlobalSearchJobView {
  id: string
  queue: string
  name: string
  state: string
  attemptsMade: number
  progress: { current: number; total: number; percentage: number } | null
  result: unknown
  failedReason: string | null
  requestedByUserId: string | null
  triggerType: string | null
  triggerSource: string | null
  createdAt: string
  finishedAt: string | null
}

export interface GlobalSearchJobsResponse {
  data: GlobalSearchJobView[]
  paging: GlobalSearchPaging
}

export interface GlobalSearchAnalyticsOverview {
  events: {
    totalEvents: number
    totalSearches: number
    totalClicks: number
    uniqueUsers: number
    uniqueQueries: number
  }
  queries: {
    trackedQueries: number
    totalSearchCount: number
    totalClickCount: number
    overallClickThroughRate: number
  }
  entities: {
    trackedEntities: number
    uniqueEntityTypes: number
    totalEntityClicks: number
  }
}

export interface GlobalSearchTrendScore {
  normalizedQuery: string
  categoryId: string | null
  searchCount: number
  clickCount: number
  trendScore: number
  lastSearchedAt?: string | null
}

export interface GlobalSearchTopQuery {
  normalizedQuery: string
  categoryId: string | null
  searchCount: number
  clickCount: number
  clickThroughRate: number
}

export interface GlobalSearchPopularEntity {
  entityType: string
  documentId: string
  userId: string
  clickCount: number
  trendScore: number
  lastClickedAt?: string | null
}

export interface GlobalSearchClickThroughRate {
  categoryId: string
  searches: number
  clicks: number
  clickThroughRate: number
}

export interface GlobalSearchVolumeBucket {
  bucket: string
  eventCount: number
  searches: number
  clicks: number
}

export interface GlobalSearchZeroResultQuery {
  normalizedQuery: string
  categoryId: string | null
  searchCount: number
  lastSearchedAt: string | null
}

export interface GlobalSearchPagedAnalyticsResponse<T> {
  data: T[]
  paging: GlobalSearchPaging
}

export interface GlobalSearchListResponse<T> {
  data: T[]
}

export interface GlobalSearchJobReferencesResponse {
  jobs: Array<{ queue: string; jobId: string }>
}

export interface GlobalSearchAnalyticsSeedResponse {
  preset: GlobalSearchAnalyticsSeedPreset
  seeded: number
}

export class GlobalSearchClient extends RestClient {
  constructor() {
    super(GLOBAL_SEARCH_API_URL, {})
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    assignBearerAuthorizationHeader(this.headers, accessToken)
  }

  private toUrlTarget(href: string): SearchTarget {
    return {
      kind: 'URL',
      href,
      openIn: 'SAME_TAB'
    }
  }

  private toCustomActions(
    actions: Array<{ id: string; label: string; icon?: string; endpoint: string }> | undefined
  ): SearchCustomAction[] | undefined {
    if (!actions || actions.length === 0) {
      return undefined
    }

    return actions.map(action => ({
      id: action.id,
      label: action.label,
      icon: action.icon,
      target: this.toUrlTarget(action.endpoint)
    }))
  }

  private toActionMenu(
    contexts: SearchContext[] | undefined,
    actions: Array<{ id: string; label: string; icon?: string; endpoint: string }> | undefined
  ): SearchActionMenu | undefined {
    if ((!contexts || contexts.length === 0) && (!actions || actions.length === 0)) {
      return undefined
    }

    return {
      variant: 'LIST_ITEM',
      contexts: contexts ?? [],
      customActions: this.toCustomActions(actions)
    }
  }

  private normalizeItem(
    item: SearchItem & {
      endpoint?: string
      contexts?: SearchContext[]
      actions?: Array<{ id: string; label: string; icon?: string; endpoint: string }>
    }
  ): SearchItem {
    const actionMenu = item.actionMenu ?? this.toActionMenu(item.contexts, item.actions)
    const primaryTarget = item.primaryTarget ?? this.resolvePrimaryTarget(item.endpoint, actionMenu)

    return {
      ...item,
      primaryTarget,
      actionMenu
    }
  }

  private resolvePrimaryTarget(
    endpoint: string | undefined,
    actionMenu: SearchActionMenu | undefined
  ): SearchTarget | undefined {
    if (endpoint) {
      return this.toUrlTarget(endpoint)
    }
    if (actionMenu) {
      return {
        kind: 'APP_ACTION',
        contexts: actionMenu.contexts ?? [],
        customActions: actionMenu.customActions,
        lazyLoad: actionMenu.lazyLoad,
        autoExecute: actionMenu.autoExecute,
        variant: actionMenu.variant
      }
    }
    return undefined
  }

  private normalizeSuggestion(
    suggestion: SearchSuggestion & {
      endpoint?: string
      contexts?: SearchContext[]
      actions?: Array<{ id: string; label: string; icon?: string; endpoint: string }>
    }
  ): SearchSuggestion {
    const actionMenu = suggestion.actionMenu ?? this.toActionMenu(suggestion.contexts, suggestion.actions)
    const primaryTarget =
      suggestion.primaryTarget ?? (suggestion.endpoint ? this.toUrlTarget(suggestion.endpoint) : undefined)

    return {
      ...suggestion,
      primaryTarget,
      actionMenu
    }
  }

  private normalizeConfigurationResponse(
    response: GlobalSearchConfigurationResponse
  ): GlobalSearchConfigurationResponse {
    return {
      ...response,
      data: {
        ...response.data,
        sections: response.data.sections.map(section => ({
          ...section,
          items: section.items.map(item =>
            this.normalizeItem(
              item as SearchItem & {
                endpoint?: string
                contexts?: SearchContext[]
                actions?: Array<{ id: string; label: string; icon?: string; endpoint: string }>
              }
            )
          )
        }))
      }
    }
  }

  private normalizeQueryResponse(response: GlobalSearchQueryResponse): GlobalSearchQueryResponse {
    const categories = Array.isArray(response.categories) ? response.categories : []

    return {
      ...response,
      categories,
      data: (Array.isArray(response.data) ? response.data : []).map(section => ({
        ...section,
        items: section.items.map(item =>
          this.normalizeItem(
            item as SearchItem & {
              endpoint?: string
              contexts?: SearchContext[]
              actions?: Array<{ id: string; label: string; icon?: string; endpoint: string }>
            }
          )
        )
      })),
      suggestions: response.suggestions?.map(suggestion => this.normalizeSuggestion(suggestion))
    }
  }

  async getConfiguration(): Promise<GlobalSearchConfigurationResponse> {
    const response = await this.get<GlobalSearchConfigurationResponse>('/categories')
    return this.normalizeConfigurationResponse(response)
  }

  async runQuery(
    request: GlobalSearchQueryRequest,
    options: Pick<RequestOptions, 'signal'> = {}
  ): Promise<GlobalSearchQueryResponse> {
    const response = await this.get<GlobalSearchQueryResponse>('/results', {
      signal: options.signal,
      params: {
        ...(request.q ? { q: request.q } : {}),
        ...(request.categoryIds?.length ? { categoryIds: request.categoryIds.join(',') } : {}),
        limit: request.paging?.limit ?? 8,
        offset: request.paging?.offset ?? 0
      }
    })
    return this.normalizeQueryResponse(response)
  }

  async trackEvents(request: GlobalSearchEventRequest): Promise<void> {
    await this.post<void>('/events', request)
  }

  async getJobs(params: {
    limit?: number
    offset?: number
    queue?: string
    state?: string
  }): Promise<GlobalSearchJobsResponse> {
    return this.get<GlobalSearchJobsResponse>('/jobs', {
      params: {
        limit: params.limit ?? 25,
        offset: params.offset ?? 0,
        ...(params.queue ? { queue: params.queue } : {}),
        ...(params.state ? { state: params.state } : {})
      }
    })
  }

  async getJob(queue: string, jobId: string): Promise<GlobalSearchJobView> {
    return this.get<GlobalSearchJobView>(`/jobs/${encodeURIComponent(queue)}/${encodeURIComponent(jobId)}`)
  }

  async getEntityTypes(): Promise<GlobalSearchEntityTypeListResponse> {
    return this.get<GlobalSearchEntityTypeListResponse>('/entities')
  }

  async getEntityType(entityType: string): Promise<GlobalSearchEntityType> {
    return this.get<GlobalSearchEntityType>(`/entities/${encodeURIComponent(entityType)}`)
  }

  async createEntityType(body: GlobalSearchEntityTypePayload): Promise<GlobalSearchEntityType> {
    return this.post<GlobalSearchEntityType>('/entities', body)
  }

  async updateEntityType(
    entityType: string,
    body: Omit<GlobalSearchEntityTypePayload, 'entityType'>
  ): Promise<GlobalSearchEntityType> {
    return this.put<GlobalSearchEntityType>(`/entities/${encodeURIComponent(entityType)}`, body)
  }

  async deleteEntityType(entityType: string): Promise<void> {
    await this.delete<void>(`/entities/${encodeURIComponent(entityType)}`)
  }

  async seedEntityTypes(mode: GlobalSearchEntitySeedMode): Promise<GlobalSearchEntitySeedResponse> {
    return this.post<GlobalSearchEntitySeedResponse>('/entities/seed', undefined, { params: { mode } })
  }

  async getSearchStatistics(): Promise<GlobalSearchAnalyticsOverview> {
    return this.get<GlobalSearchAnalyticsOverview>('/analytics/search-statistics')
  }

  async getTrendScores(limit = 15): Promise<GlobalSearchPagedAnalyticsResponse<GlobalSearchTrendScore>> {
    return this.get<GlobalSearchPagedAnalyticsResponse<GlobalSearchTrendScore>>('/analytics/trend-scores', {
      params: { limit }
    })
  }

  async getPopularEntities(limit = 15): Promise<GlobalSearchPagedAnalyticsResponse<GlobalSearchPopularEntity>> {
    return this.get<GlobalSearchPagedAnalyticsResponse<GlobalSearchPopularEntity>>('/analytics/popular-entities', {
      params: { limit }
    })
  }

  async getTopQueries(limit = 15): Promise<GlobalSearchPagedAnalyticsResponse<GlobalSearchTopQuery>> {
    return this.get<GlobalSearchPagedAnalyticsResponse<GlobalSearchTopQuery>>('/analytics/top-queries', {
      params: { limit }
    })
  }

  async getClickThroughRates(): Promise<GlobalSearchListResponse<GlobalSearchClickThroughRate>> {
    return this.get<GlobalSearchListResponse<GlobalSearchClickThroughRate>>('/analytics/click-through-rates')
  }

  async getSearchVolume(): Promise<GlobalSearchListResponse<GlobalSearchVolumeBucket>> {
    return this.get<GlobalSearchListResponse<GlobalSearchVolumeBucket>>('/analytics/search-volume')
  }

  async getZeroResultQueries(limit = 15): Promise<GlobalSearchPagedAnalyticsResponse<GlobalSearchZeroResultQuery>> {
    return this.get<GlobalSearchPagedAnalyticsResponse<GlobalSearchZeroResultQuery>>('/analytics/zero-result-queries', {
      params: { limit }
    })
  }

  async triggerAnalyticsMaintenance(): Promise<GlobalSearchJobReferencesResponse> {
    return this.post<GlobalSearchJobReferencesResponse>('/synchronizations/analytics-maintenance')
  }

  async seedAnalytics(preset: GlobalSearchAnalyticsSeedPreset): Promise<GlobalSearchAnalyticsSeedResponse> {
    return this.post<GlobalSearchAnalyticsSeedResponse>('/debug/seeds', undefined, { params: { preset } })
  }

  async deleteAnalyticsSeeds(): Promise<void> {
    await this.delete<void>('/debug/seeds')
  }
}

export const globalSearchClient = new GlobalSearchClient()
