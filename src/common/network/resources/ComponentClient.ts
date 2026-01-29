import type { RequestOptions } from '../rest/RestClient'
import { env } from '../../env/EnvUtils'
import type { ResourceClient } from './ResourceClient'
import type { Component, ComponentApiResponse } from '@/common/data/resources/types/component.types'

export class ComponentClient {
  constructor(private readonly resourceClient: ResourceClient) {}

  private get baseUrl(): string {
    const screenManagementBaseUrl = env('NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API') ?? ''
    return screenManagementBaseUrl.endsWith('/') ? screenManagementBaseUrl.slice(0, -1) : screenManagementBaseUrl
  }

  public async getComponents(
    params?: {
      searchParameter?: string
      filter?: {
        appId?: string
        screenKey?: string
        builderType?: 'LOWCODER' | 'FORMIO' | 'NATIVE_SCREEN'
      }
      sort?: {
        field: string
        order: 'ASC' | 'DESC'
      }
      limit?: number
      offset?: number
      returnTotalRecords?: boolean
    },
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ComponentApiResponse> {
    // Build query parameters according to OpenAPI spec
    // filter and sort are required by API, so we always send them
    const queryParams: Record<string, string | number | boolean> = {}

    if (params?.searchParameter) {
      queryParams.searchParameter = params.searchParameter
    }

    // Filter is required by API - send empty object if not specified
    const filter = params?.filter || {}
    queryParams.filter = JSON.stringify(filter)

    // Sort is required by API - provide default sort if not specified
    const sort = params?.sort || { field: 'name', order: 'ASC' }
    queryParams.sort = JSON.stringify(sort)

    if (params?.limit !== undefined) {
      queryParams.limit = params.limit
    }

    if (params?.offset !== undefined) {
      queryParams.offset = params.offset
    }

    if (params?.returnTotalRecords !== undefined) {
      queryParams.returnTotalRecords = params.returnTotalRecords
    }

    const response = await this.resourceClient['get']<ComponentApiResponse>(
      '/screen',
      {
        ...options,
        params: queryParams,
        withCredentials: false
      },
      this.baseUrl
    )

    return response
  }

  public async getComponent(id: string, options: Omit<RequestOptions, 'body'> = {}): Promise<Component | null> {
    try {
      const response = await this.resourceClient['get']<{ data: Component[] }>(
        `/screen/${id}`,
        {
          ...options,
          withCredentials: false
        },
        this.baseUrl
      )

      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0]
      }

      return null
    } catch (error) {
      console.error('ComponentClient: Error getting component by ID:', error)
      return null
    }
  }

  public async createComponent(
    data: Omit<Component, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isDeleted'>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<Component> {
    const response = await this.resourceClient['post']<Component>(
      '/screen',
      data,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )

    return response
  }

  public async updateComponent(
    id: string,
    data: Partial<Component>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<Component> {
    const response = await this.resourceClient['put']<Component>(
      `/screen/${id}`,
      data,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )

    return response
  }

  public async deleteComponent(id: string, options: Omit<RequestOptions, 'body'> = {}): Promise<void> {
    await this.resourceClient['delete']<void>(
      `/screen/${id}`,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
  }
}
