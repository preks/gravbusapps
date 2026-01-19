import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import { RestClient, type RequestOptions } from '../rest/RestClient'
import { Services } from '@/common/types/enums/Services'
import { DatasetDTO, QueryDefinition, QueryExecutionParams, QueryType } from './types'

export class QueryExecutionClient extends RestClient {
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
   * Get all available dataset queries
   */
  public async getDatasetQueries(options: Omit<RequestOptions, 'body'> = {}): Promise<QueryDefinition[]> {
    const response = await this.get<{ queries: QueryDefinition[] }>('/queries/dataset', options)
    return response.queries || []
  }

  /**
   * Execute a dataset query by name
   */
  public async executeDatasetQuery(
    queryName: string,
    parameters: QueryExecutionParams = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<DatasetDTO> {
    const path = this.replacePathParams('/queries/dataset/{queryName}', {
      queryName
    })

    // Format parameters as semicolon-separated key=value pairs
    const parameterString = Object.entries(parameters)
      .map(([key, value]) => `${key}=${value}`)
      .join(';')

    const queryParams: Record<string, string> = {}
    if (parameterString) {
      queryParams.parameters = parameterString
    }

    return this.post<DatasetDTO>(
      path,
      undefined, // No body content
      {
        ...options,
        params: {
          ...options.params,
          ...queryParams
        }
      }
    )
  }

  /**
   * Get all available timeseries queries
   */
  public async getTimeseriesQueries(options: Omit<RequestOptions, 'body'> = {}): Promise<QueryDefinition[]> {
    const response = await this.get<{ queries: QueryDefinition[] }>('/queries/timeseries', options)
    return response.queries || []
  }

  /**
   * Execute a timeseries query by name
   */
  public async executeTimeseriesQuery(
    queryName: string,
    parameters: QueryExecutionParams = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<DatasetDTO> {
    const path = this.replacePathParams('/queries/timeseries/{queryName}', {
      queryName
    })

    // Format parameters as semicolon-separated key=value pairs
    const parameterString = Object.entries(parameters)
      .map(([key, value]) => `${key}=${value}`)
      .join(';')

    const queryParams: Record<string, string> = {}
    if (parameterString) {
      queryParams.parameters = parameterString
    }

    return this.post<DatasetDTO>(
      path,
      undefined, // No body content
      {
        ...options,
        params: {
          ...options.params,
          ...queryParams
        }
      }
    )
  }

  /**
   * Execute a query by name and type
   */
  public async executeQuery(
    queryName: string,
    queryType: QueryType,
    parameters: QueryExecutionParams = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<DatasetDTO> {
    if (queryType === QueryType.DATASET) {
      return this.executeDatasetQuery(queryName, parameters, options)
    } else {
      return this.executeTimeseriesQuery(queryName, parameters, options)
    }
  }

  /**
   * Get all available queries (both dataset and timeseries)
   */
  public async getAllQueries(options: Omit<RequestOptions, 'body'> = {}): Promise<QueryDefinition[]> {
    const [datasetQueries, timeseriesQueries] = await Promise.all([
      this.getDatasetQueries(options),
      this.getTimeseriesQueries(options)
    ])

    return [...datasetQueries, ...timeseriesQueries]
  }
}

// Note: QueryExecutionClient instances should be created with a specific service
// Example: const client = new QueryExecutionClient(Services.EMPLOYEE);
