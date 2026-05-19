import type {
  GlobalSearchConfigurationResponse,
  GlobalSearchEventRequest,
  GlobalSearchQueryRequest,
  GlobalSearchQueryResponse
} from '../types'

export interface GlobalSearchRequestOptions {
  signal?: AbortSignal
}

export interface GlobalSearchAdapter {
  getConfiguration: () => Promise<GlobalSearchConfigurationResponse>
  runQuery: (
    request: GlobalSearchQueryRequest,
    options?: GlobalSearchRequestOptions
  ) => Promise<GlobalSearchQueryResponse>
  trackEvents: (request: GlobalSearchEventRequest) => Promise<void>
}
