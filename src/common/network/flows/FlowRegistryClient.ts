import { RestClient, type RequestOptions } from '../rest/RestClient';
import { env } from '../../env/EnvUtils';
import { GetPermissionFlowItemsV1Params, GetPermissionFlowItemsV2Body, GetMainContextDataBody, GetPermissionFlowItemsResponse, GetMainContextDataResponse } from '../../types/FlowRegistryTypes';

export class FlowRegistryClient extends RestClient {
  
  constructor() {
    super(env('NEXT_PUBLIC_FLOW_REGISTRY_SERVICE_API') ?? '');
  }

  public async getPermissionFlowItemsV1(
    accessToken: string,
    params: GetPermissionFlowItemsV1Params,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetPermissionFlowItemsResponse> {

    const queryParams = {
      ...params,
      contexts: params.contexts.join('&contexts=')
    };

    return this.get<GetPermissionFlowItemsResponse>(
      '/permissions/flow-items',
      accessToken,
      {
        ...options,
        params: queryParams,
      }
    );
  }

  public async getPermissionFlowItemsV2(
    accessToken: string,
    body: GetPermissionFlowItemsV2Body,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetPermissionFlowItemsResponse> {
    
    return this.post<GetPermissionFlowItemsResponse>(
      '/permissions/flow-items/by-contexts',
      accessToken,
      {
        ...body,
      },
      options
    );
  }

  public async getMainContextData(
    accessToken: string,
    body: GetMainContextDataBody,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetMainContextDataResponse> {

    return this.post<GetMainContextDataResponse>(
      '/contexts/main-context-data',
      accessToken,
      {
        ...body,
      },
      options
    );
  }
}

export const flowRegistryClient = new FlowRegistryClient();