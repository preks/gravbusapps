import { env } from '../../env/EnvUtils';
import { GetCatalogEntriesParams, GetCatalogEntriesResponse, GetCatalogsParams, GetCatalogsResponse } from '../../types/CatalogTypes';
import { RestClient, type RequestOptions } from '../rest/RestClient';

const BASE_PATH = 'api/v1/catalogs';

export class CatalogManagerClient extends RestClient {
  
  constructor() {
    let url: string = env('NEXT_PUBLIC_CATALOG_API') ?? '';
    if (!url.endsWith('/')) {
      url += '/';
    }

    url += BASE_PATH;

    super(url);
  }

  private replacePathParams(path: string, params: Record<string, string | number> = {}): string {
    return Object.entries(params).reduce(
      (result, [key, value]) => result.replace(`{${key}}`, String(value)),
      path
    );
  }

  public async getCatalogEntriesList(
    accessToken: string,
    pathParams: GetCatalogEntriesParams,
    params: GetCatalogsParams = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetCatalogEntriesResponse> {

    const { limit, offset, ...restParams } = params;
    const path = this.replacePathParams('/{catalogIdentifier}/{version}/entries', {
      catalogIdentifier: pathParams.catalogIdentifier,
      version: pathParams.version,
    });

    const queryParams: Record<string, string | number | boolean> = { ...restParams };
    
    if (limit !== undefined) {
      queryParams.limit = limit;
    }
    if (offset !== undefined) {
      queryParams.offset = offset;
    }

    return this.get<GetCatalogEntriesResponse>(
      path,
      accessToken,
      {
        ...options,
        params: queryParams,
      }
    );
  }

  public async getCatalogs(
    accessToken: string,
    params: GetCatalogsParams = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetCatalogsResponse> {

    const { limit, offset, ...restParams } = params;
    const queryParams: Record<string, string | number | boolean> = { ...restParams };
    
    if (limit !== undefined) {
      queryParams.limit = limit;
    }
    if (offset !== undefined) {
      queryParams.offset = offset;
    }

    return this.get<GetCatalogsResponse>(
      '',
      accessToken,
      {
        ...options,
        params: queryParams,
      }
    );
  }
}

export const catalogManagerClient = new CatalogManagerClient();