import type { RequestOptions } from '../rest/RestClient'
import { env } from '../../env/EnvUtils'
import type { ResourceClient } from './ResourceClient'
import type { Component, ComponentApiResponse } from '@/common/data/resources/types/component.types'

export class ComponentClient {
  constructor(private resourceClient: ResourceClient) {}

  private get baseUrl(): string {
    const screenManagementBaseUrl = env('NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API') ?? ''
    return screenManagementBaseUrl.endsWith('/') ? screenManagementBaseUrl.slice(0, -1) : screenManagementBaseUrl
  }

  public async getComponents(
    params?: {
      builderType?: string
      limit?: number
      offset?: number
      returnTotalRecords?: boolean
    },
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ComponentApiResponse> {
    const response = await this.resourceClient['get']<ComponentApiResponse>(
      '/screen',
      {
        ...options,
        params: params as Record<string, string | number | boolean>,
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
}
