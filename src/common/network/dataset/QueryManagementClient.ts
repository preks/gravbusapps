import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import { RestClient, type RequestOptions } from '../rest/RestClient'
import { Services } from '@/common/types/enums/Services'
import {
  QueryDefinition,
  QueryDefinitionListParams,
  QueryDefinitionPagedParams,
  QueryDefinitionPagedResponse,
  QueryStatus
} from './types'

export class QueryManagementClient extends RestClient {
  constructor(service: Services) {
    const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
    let url = `${baseUrl}${service}/api/v1`
    if (!url.endsWith('/')) {
      url += '/'
    }

    super(url, {})
  }

  private replacePathParams(path: string, params: Record<string, string | number> = {}): string {
    return Object.entries(params).reduce((result, [key, value]) => result.replace(`{${key}}`, String(value)), path)
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  /**
   * Create a new query definition
   */
  public async createQueryDefinition(
    queryDefinition: Omit<QueryDefinition, 'id' | 'createdAt' | 'updatedAt'>,
    validate?: boolean,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<QueryDefinition> {
    const queryParams: Record<string, boolean> = {}
    if (validate !== undefined) {
      queryParams.validate = validate
    }

    return this.post<QueryDefinition>('/query-definitions', queryDefinition, {
      ...options,
      params: {
        ...options.params,
        ...queryParams
      }
    })
  }

  /**
   * Update an existing query definition
   */
  public async updateQueryDefinition(
    id: string,
    queryDefinition: Partial<Omit<QueryDefinition, 'id' | 'createdAt' | 'updatedAt'>>,
    validate?: boolean,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<QueryDefinition> {
    const path = this.replacePathParams('/query-definitions/{id}', { id })

    const queryParams: Record<string, boolean> = {}
    if (validate !== undefined) {
      queryParams.validate = validate
    }

    return this.put<QueryDefinition>(path, queryDefinition, {
      ...options,
      params: {
        ...options.params,
        ...queryParams
      }
    })
  }

  /**
   * Update query status
   */
  public async updateQueryStatus(
    id: string,
    status: QueryStatus,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<QueryDefinition> {
    const path = this.replacePathParams('/query-definitions/{id}/status', { id })

    return this.put<QueryDefinition>(path, undefined, {
      ...options,
      params: {
        ...options.params,
        status
      }
    })
  }

  /**
   * Delete a query definition
   */
  public async deleteQueryDefinition(id: string, options: Omit<RequestOptions, 'body'> = {}): Promise<void> {
    const path = this.replacePathParams('/query-definitions/{id}', { id })

    return this.delete<void>(path, options)
  }

  /**
   * Get a query definition by ID
   */
  public async getQueryDefinition(id: string, options: Omit<RequestOptions, 'body'> = {}): Promise<QueryDefinition> {
    const path = this.replacePathParams('/query-definitions/{id}', { id })

    return this.get<QueryDefinition>(path, options)
  }

  /**
   * List query definitions with filters
   */
  public async listQueryDefinitions(
    params: QueryDefinitionListParams = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<QueryDefinition[]> {
    const queryParams: Record<string, string | number | boolean> = {}

    if (params.queryType !== undefined) {
      queryParams.queryType = params.queryType
    }
    if (params.status !== undefined) {
      queryParams.status = params.status
    }
    if ((params as any).search !== undefined && (params as any).search !== '') {
      queryParams.search = (params as any).search as string
    }

    return this.get<QueryDefinition[]>('/query-definitions', {
      ...options,
      params: {
        ...options.params,
        ...queryParams
      }
    })
  }

  /**
   * List query definitions with pagination
   */
  public async listQueryDefinitionsPaged(
    params: QueryDefinitionPagedParams = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<QueryDefinitionPagedResponse> {
    const queryParams: Record<string, string | number | boolean> = {}

    if (params.queryType !== undefined) {
      queryParams.queryType = params.queryType
    }
    if (params.status !== undefined) {
      queryParams.status = params.status
    }
    if (params.page !== undefined) {
      queryParams.page = params.page
    }
    if (params.size !== undefined) {
      queryParams.size = params.size
    }
    if (params.sort !== undefined) {
      queryParams.sort = params.sort
    }
    if ((params as any).search !== undefined && (params as any).search !== '') {
      queryParams.search = (params as any).search as string
    }

    return this.get<QueryDefinitionPagedResponse>('/query-definitions/paged', {
      ...options,
      params: {
        ...options.params,
        ...queryParams
      }
    })
  }
}

// Note: QueryManagementClient instances should be created with a specific service
// Example: const client = new QueryManagementClient(Services.EMPLOYEE);
