import { RestClient, type RequestOptions } from '../rest/RestClient'
import { env } from '../../env/EnvUtils'
import {
  GetPermissionFlowItemsV1Params,
  GetPermissionFlowItemsV2Body,
  GetMainContextDataBody,
  GetPermissionFlowItemsResponse,
  GetMainContextDataResponse
} from '../../types/FlowRegistryTypes'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'

export class FlowRegistryClient extends RestClient {
  constructor() {
    super(env('NEXT_PUBLIC_FLOW_REGISTRY_SERVICE_API') ?? '')
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  public async getPermissionFlowItemsV1(
    params: GetPermissionFlowItemsV1Params,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetPermissionFlowItemsResponse> {
    const queryParams = {
      ...params,
      contexts: params.contexts.join('&contexts=')
    }

    return this.get<GetPermissionFlowItemsResponse>('/permissions/flow-items', {
      ...options,
      params: queryParams,
      withCredentials: false // Disable credentials to avoid CORS issues with wildcard origins
    })
  }

  public async getPermissionFlowItemsV2(
    body: GetPermissionFlowItemsV2Body,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetPermissionFlowItemsResponse> {
    return this.post<GetPermissionFlowItemsResponse>(
      '/permissions/flow-items/by-contexts',
      {
        ...body
      },
      {
        ...options,
        withCredentials: false // Disable credentials to avoid CORS issues with wildcard origins
      }
    )
  }

  public async getMainContextData(
    body: GetMainContextDataBody,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetMainContextDataResponse> {
    return this.post<GetMainContextDataResponse>(
      '/contexts/main-context-data',
      {
        ...body
      },
      {
        ...options,
        withCredentials: false // Disable credentials to avoid CORS issues with wildcard origins
      }
    )
  }
}

export const flowRegistryClient = new FlowRegistryClient()
