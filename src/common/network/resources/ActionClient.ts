import type { RequestOptions } from '../rest/RestClient'
import { env } from '../../env/EnvUtils'
import type { ResourceClient } from './ResourceClient'
import { capLimit } from './paginationConstants'
import type { ActionDTO, ActionPage, GetActionsParams } from '@/common/data/resources/types/action.types'
import type { ContextDTO, ContextPage, GetContextsParams } from '@/common/data/resources/types/context.types'
import type {
  ActionAssignmentDTO,
  ActionAssignmentPage,
  GetActionAssignmentsParams
} from '@/common/data/resources/types/assignment.types'

type QueryParams = Record<string, string | number | boolean>

export class ActionClient {
  constructor(private readonly resourceClient: ResourceClient) {}

  private get baseUrl(): string {
    const flowRegistryBaseUrl = env('NEXT_PUBLIC_FLOW_REGISTRY_SERVICE_API') ?? ''
    return flowRegistryBaseUrl.endsWith('/') ? flowRegistryBaseUrl.slice(0, -1) : flowRegistryBaseUrl
  }

  private get userManagementBaseUrl(): string {
    const userManagementBaseUrl = env('NEXT_PUBLIC_USER_MANAGEMENT_API') ?? ''
    return userManagementBaseUrl.endsWith('/') ? userManagementBaseUrl.slice(0, -1) : userManagementBaseUrl
  }

  public async getActions(params?: GetActionsParams, options: Omit<RequestOptions, 'body'> = {}): Promise<ActionPage> {
    const actionParams: GetActionsParams = {
      ...params,
      returnTotalRecords: params?.returnTotalRecords ?? true,
      limit: capLimit(params?.limit),
      offset: params?.offset ?? 0
    }

    const response = await this.resourceClient['get']<ActionPage | ActionDTO[]>(
      '/flow-items',
      {
        ...options,
        params: actionParams as ActionClientParams,
        withCredentials: false
      },
      this.baseUrl
    )

    // Handle different response structures
    if (Array.isArray(response)) {
      return {
        data: response,
        paging: {
          limit: actionParams.limit ?? 20,
          offset: actionParams.offset ?? 0,
          totalRecords: response.length
        }
      }
    }

    return response
  }

  public async getAction(id: string, options: Omit<RequestOptions, 'body'> = {}): Promise<ActionDTO | null> {
    try {
      return await this.resourceClient['get']<ActionDTO>(
        `/flow-items/${id}`,
        {
          ...options,
          withCredentials: false
        },
        this.baseUrl
      )
    } catch (error) {
      console.error('ActionClient: Error getting action by ID:', error)
      return null
    }
  }

  public async createAction(
    data: Omit<ActionDTO, 'id'>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ActionDTO> {
    return this.resourceClient['post']<ActionDTO>(
      '/flow-items',
      data,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
  }

  public async updateAction(
    id: string,
    data: Partial<ActionDTO>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ActionDTO> {
    return this.resourceClient['put']<ActionDTO>(
      `/flow-items/${id}`,
      data,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
  }

  public async deleteAction(id: string, options: Omit<RequestOptions, 'body'> = {}): Promise<void> {
    return this.resourceClient['delete'](
      `/flow-items/${id}`,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
  }

  public async getContexts(
    params?: GetContextsParams,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ContextPage> {
    const response = await this.resourceClient['get']<ContextPage | ContextDTO[]>(
      '/contexts',
      {
        ...options,
        params: params as QueryParams,
        withCredentials: false
      },
      this.baseUrl
    )

    // Handle different response structures
    if (Array.isArray(response)) {
      return {
        data: response,
        paging: {
          limit: params?.limit || 20,
          offset: params?.offset || 0,
          totalRecords: response.length
        }
      }
    }

    return response
  }

  public async getContext(id: string, options: Omit<RequestOptions, 'body'> = {}): Promise<ContextDTO | null> {
    try {
      return await this.resourceClient['get']<ContextDTO>(
        `/contexts/${id}`,
        {
          ...options,
          withCredentials: false
        },
        this.baseUrl
      )
    } catch (error) {
      console.error('ActionClient: Error getting context by ID:', error)
      return null
    }
  }

  public async createContext(
    data: Omit<ContextDTO, 'id'>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<string> {
    // Backend returns only the ID as a string, not the full object
    return this.resourceClient['post']<string>(
      '/contexts',
      data,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
  }

  public async updateContext(
    id: string,
    data: ContextDTO,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ContextDTO> {
    return this.resourceClient['put']<ContextDTO>(
      `/contexts/${id}`,
      data,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
  }

  public async deleteContext(id: string, options: Omit<RequestOptions, 'body'> = {}): Promise<void> {
    return this.resourceClient['delete'](
      `/contexts/${id}`,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
  }

  public async createActionAssignment(
    data: Omit<ActionAssignmentDTO, 'id'>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ActionAssignmentDTO> {
    return this.resourceClient['post']<ActionAssignmentDTO>(
      '/flow-assignments',
      data,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
  }

  public async updateActionAssignment(
    id: string,
    data: Partial<ActionAssignmentDTO>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ActionAssignmentDTO> {
    return this.resourceClient['put']<ActionAssignmentDTO>(
      `/flow-assignments/${id}`,
      data,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
  }

  public async deleteActionAssignment(id: string, options: Omit<RequestOptions, 'body'> = {}): Promise<void> {
    return this.resourceClient['delete'](
      `/flow-assignments/${id}`,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
  }

  public async getActionAssignments(
    params?: GetActionAssignmentsParams,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ActionAssignmentPage> {
    const assignmentParams: GetActionAssignmentsParams = {
      ...params,
      returnTotalRecords: params?.returnTotalRecords ?? true,
      limit: capLimit(params?.limit),
      offset: params?.offset ?? 0
    }

    const response = await this.resourceClient['get']<ActionAssignmentPage | ActionAssignmentDTO[]>(
      '/flow-assignments',
      {
        ...options,
        params: assignmentParams as Record<string, string | number | boolean>,
        withCredentials: false
      },
      this.baseUrl
    )

    // Handle different response structures
    if (Array.isArray(response)) {
      return {
        data: response,
        paging: {
          limit: assignmentParams.limit,
          offset: assignmentParams.offset ?? 0,
          totalRecords: response.length
        }
      }
    }

    return response
  }

  public async getActionAssignment(
    id: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ActionAssignmentDTO | null> {
    try {
      return await this.resourceClient['get']<ActionAssignmentDTO>(
        `/flow-assignments/${id}`,
        {
          ...options,
          withCredentials: false
        },
        this.baseUrl
      )
    } catch (error) {
      console.error('ActionClient: Error getting action assignment by ID:', error)
      return null
    }
  }

  public async getDomainProcesses(
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<Array<{ domain: string; processes: string[] }>> {
    try {
      const endpoint = '/target-desktop/processes'

      const response = await this.resourceClient['get']<
        | Array<{ domain: string; processes: string[] }>
        | { data: Array<{ domain: string; processes: string[] }> }
        | { processDefinitions: Array<{ domain: string; processes: string[] }> }
      >(
        endpoint,
        {
          ...options,
          withCredentials: false
        },
        this.baseUrl
      )

      // Handle different response structures
      if (Array.isArray(response)) {
        return response
      }

      if (response && typeof response === 'object') {
        // Check for processDefinitions key (most common structure)
        if ('processDefinitions' in response) {
          const data = (response as { processDefinitions: Array<{ domain: string; processes: string[] }> })
            .processDefinitions
          return Array.isArray(data) ? data : []
        }

        // Check for data key
        if ('data' in response) {
          const data = (response as { data: Array<{ domain: string; processes: string[] }> }).data
          return Array.isArray(data) ? data : []
        }
      }

      return []
    } catch (error) {
      console.error('ActionClient: Error getting domain processes:', error)
      return []
    }
  }

  public async getServices(options: Omit<RequestOptions, 'body'> = {}): Promise<Array<{ id: string; name: string }>> {
    try {
      // Use the correct endpoint: target-desktop/processes
      const response = await this.resourceClient['get']<Array<{ domain: string; processes: string[] }>>(
        '/target-desktop/processes',
        {
          ...options,
          withCredentials: false
        },
        this.baseUrl
      )

      // Extract domains from the response
      const domains = Array.isArray(response) ? response.map(item => item.domain) : []

      return domains.toSorted((a, b) => a.localeCompare(b)).map(domain => ({ id: domain, name: domain }))
    } catch (error) {
      console.error('ActionClient: Error getting services:', error)
      return []
    }
  }

  public async getProcessesForDomain(
    domain: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<Array<{ id: string; name: string }>> {
    try {
      // Use the correct endpoint: target-desktop/processes
      const response = await this.resourceClient['get']<Array<{ domain: string; processes: string[] }>>(
        '/target-desktop/processes',
        {
          ...options,
          withCredentials: false
        },
        this.baseUrl
      )

      // Find the domain in the response and return its processes
      const domainData = Array.isArray(response) ? response.find(item => item.domain === domain) : null

      if (!domainData?.processes) {
        return []
      }

      return domainData.processes
        .toSorted((a, b) => a.localeCompare(b))
        .map(processName => ({ id: processName, name: processName }))
    } catch (error) {
      console.error('ActionClient: Error getting processes for domain:', error)
      return []
    }
  }

  public async getRoles(params?: {
    limit?: number
    offset?: number
    name?: string
    includeRoles?: string
  }): Promise<{ data: any[]; paging?: { limit: number; offset: number; totalRecords: number } }> {
    let baseUrl = this.userManagementBaseUrl

    // Remove /api/v1 from baseUrl if present, as we'll add it to the path
    if (baseUrl.endsWith('/api/v1')) {
      baseUrl = baseUrl.slice(0, -7)
    } else if (baseUrl.endsWith('/api/v1/')) {
      baseUrl = baseUrl.slice(0, -8)
    }

    const response = await this.resourceClient['get']<{ data: any[]; paging?: any } | any[]>(
      '/api/v1/roles',
      {
        params: params as Record<string, string | number | boolean>
      },
      baseUrl
    )

    if (Array.isArray(response)) {
      return { data: response }
    }
    if (response?.data && Array.isArray(response.data)) {
      return { data: response.data, paging: response.paging }
    }
    return { data: [] }
  }

  public async getGroups(params?: {
    limit?: number
    offset?: number
    searchParam?: string
  }): Promise<{ data: any[]; paging?: { limit: number; offset: number; totalRecords: number } }> {
    let baseUrl = this.userManagementBaseUrl

    // Remove /api/v1 from baseUrl if present, as we'll add it to the path
    if (baseUrl.endsWith('/api/v1')) {
      baseUrl = baseUrl.slice(0, -7)
    } else if (baseUrl.endsWith('/api/v1/')) {
      baseUrl = baseUrl.slice(0, -8)
    }

    const response = await this.resourceClient['get']<{ data: any[]; paging?: any } | any[]>(
      '/api/v1/groups',
      {
        params: params as Record<string, string | number | boolean>
      },
      baseUrl
    )

    if (Array.isArray(response)) {
      return { data: response }
    }
    if (response?.data && Array.isArray(response.data)) {
      return { data: response.data, paging: response.paging }
    }
    return { data: [] }
  }

  public async getFeatures(): Promise<string[]> {
    const response = await this.resourceClient['get']<{ features: string[] } | string[]>('/features', {}, this.baseUrl)

    if (Array.isArray(response)) {
      return response
    }
    if (response?.features && Array.isArray(response.features)) {
      return response.features
    }
    return []
  }
}
