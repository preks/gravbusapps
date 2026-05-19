import type {
  GlobalSearchConfigurationResponse,
  GlobalSearchEventRequest,
  GlobalSearchQueryRequest,
  GlobalSearchQueryResponse
} from '../types'
import { GlobalSearchClient } from '@/common/network/global-search/GlobalSearchClient'
import type { GlobalSearchAdapter, GlobalSearchRequestOptions } from './types'

export interface ApiGlobalSearchAdapterOptions {
  client?: GlobalSearchClient
  accessToken?: string
}

export class ApiGlobalSearchAdapter implements GlobalSearchAdapter {
  private readonly client: GlobalSearchClient

  constructor(options: ApiGlobalSearchAdapterOptions = {}) {
    this.client = options.client ?? new GlobalSearchClient()
    if (options.accessToken) {
      this.client.setAccessToken(options.accessToken)
    }
  }

  async getConfiguration(): Promise<GlobalSearchConfigurationResponse> {
    return this.client.getConfiguration()
  }

  async runQuery(
    request: GlobalSearchQueryRequest,
    options?: GlobalSearchRequestOptions
  ): Promise<GlobalSearchQueryResponse> {
    return this.client.runQuery(request, options)
  }

  async trackEvents(request: GlobalSearchEventRequest): Promise<void> {
    await this.client.trackEvents(request)
  }
}
