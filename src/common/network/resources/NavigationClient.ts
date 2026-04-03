import type { RequestOptions } from '../rest/RestClient'
import { env } from '../../env/EnvUtils'
import type { ResourceClient } from './ResourceClient'
import { capLimit } from './paginationConstants'
import type { NavigationDTO, GetNavigationsParams } from '@/common/data/resources/types/navigation.types'
import type { MenuItemDTO, MenuItemUpsertRequestDTO } from '@/common/data/resources/types/menuItem.types'

type HubType = 'USE' | 'CREATE' | 'MANAGE'

export class NavigationClient {
  constructor(private readonly resourceClient: ResourceClient) {}

  private get baseUrl(): string {
    const navigationBaseUrl = env('NEXT_PUBLIC_NAVIGATION_SERVICE_API') ?? ''
    return navigationBaseUrl.endsWith('/') ? navigationBaseUrl.slice(0, -1) : navigationBaseUrl
  }

  public async getNavigations(
    params?: GetNavigationsParams,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<{ data: NavigationDTO[]; totalCount: number }> {
    const endpoint = '/resource-url'
    const safeParams = {
      ...params,
      limit: capLimit(params?.limit),
      offset: params?.offset ?? 0
    }

    const response = await this.resourceClient['get']<
      | NavigationDTO[]
      | { data: NavigationDTO[]; totalElements?: number; totalCount?: number; paging?: { totalRecords?: number } }
      | { content: NavigationDTO[]; totalElements?: number; totalCount?: number }
      | { resourceUrlList: NavigationDTO[]; totalElements?: number; totalCount?: number }
    >(
      endpoint,
      {
        ...options,
        params: safeParams as Record<string, string | number | boolean>,
        withCredentials: false
      },
      this.baseUrl
    )

    // Handle different response structures
    if (Array.isArray(response)) {
      return { data: response, totalCount: response.length }
    } else if (response && 'resourceUrlList' in response && Array.isArray(response.resourceUrlList)) {
      return {
        data: response.resourceUrlList,
        totalCount: response.totalCount ?? response.totalElements ?? response.resourceUrlList.length
      }
    } else if (response && 'data' in response && Array.isArray(response.data)) {
      // Check for paging.totalRecords first (new API format)
      const totalCount =
        (response as any).paging?.totalRecords ?? response.totalCount ?? response.totalElements ?? response.data.length
      return { data: response.data, totalCount }
    } else if (response && 'content' in response && Array.isArray(response.content)) {
      return {
        data: response.content,
        totalCount: response.totalCount ?? response.totalElements ?? response.content.length
      }
    }

    return { data: [], totalCount: 0 }
  }

  public async getNavigation(id: string, options: Omit<RequestOptions, 'body'> = {}): Promise<NavigationDTO | null> {
    try {
      return await this.resourceClient['get']<NavigationDTO>(
        `/resource-url/${id}`,
        {
          ...options,
          withCredentials: false
        },
        this.baseUrl
      )
    } catch (error) {
      console.error('NavigationClient: Error getting navigation by ID:', error)
      return null
    }
  }

  /**
   * Filter resource URLs by url path (e.g. platform/a/b/c from screen key url_a~b~c).
   * API: GET /resource-url/filter?url=<path>
   */
  public async getResourceUrlsByFilter(
    url: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<{ data: NavigationDTO[] }> {
    const response = await this.resourceClient['get']<
      | NavigationDTO[]
      | NavigationDTO
      | { data: NavigationDTO[] }
      | { resourceUrlList: NavigationDTO[] }
    >(
      '/resource-url/filter',
      {
        ...options,
        params: { url },
        withCredentials: false
      },
      this.baseUrl
    )
    if (Array.isArray(response)) return { data: response }
    if (response && 'resourceUrlList' in response && Array.isArray(response.resourceUrlList)) {
      return { data: response.resourceUrlList }
    }
    if (response && 'data' in response && Array.isArray(response.data)) return { data: response.data }
    if (response && typeof response === 'object' && 'id' in response && 'url' in response) {
      return { data: [response as NavigationDTO] }
    }
    return { data: [] }
  }

  /**
   * Filter hubs (menu) by url. API: GET /hubs/filter?url=<path>
   */
  public async getHubsByFilter(
    url: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<{ data: Array<{ id: string; name?: string; menuItems?: MenuItemDTO[] }> }> {
    const response = await this.resourceClient['get']<
      | Array<{ id: string; name?: string; menuItems?: MenuItemDTO[] }>
      | { data: Array<{ id: string; name?: string; menuItems?: MenuItemDTO[] }> }
      | { hubs: Array<{ id: string; name?: string; menuItems?: MenuItemDTO[] }> }
    >(
      '/hubs/filter',
      {
        ...options,
        params: { url },
        withCredentials: false
      },
      this.baseUrl
    )
    if (Array.isArray(response)) return { data: response }
    if (response && 'hubs' in response && Array.isArray(response.hubs)) return { data: response.hubs }
    if (response && 'data' in response && Array.isArray(response.data)) return { data: response.data }
    return { data: [] }
  }

  public async createNavigation(
    data: Omit<NavigationDTO, 'id'>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<NavigationDTO> {
    return this.resourceClient['post']<NavigationDTO>(
      '/resource-url',
      data,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
  }

  public async updateNavigation(
    id: string,
    data: Partial<NavigationDTO>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<NavigationDTO | null> {
    try {
      const result = await this.resourceClient['put']<NavigationDTO>(
        `/resource-url/${id}`,
        data,
        {
          ...options,
          withCredentials: false
        },
        this.baseUrl
      )
      return result
    } catch (error) {
      // If JSON parsing fails due to empty response, fetch the updated navigation
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Unexpected end of JSON input') || errorMessage.includes('Failed to parse response')) {
        // Backend returned empty response, fetch the updated navigation
        return await this.getNavigation(id, options)
      }
      // Re-throw other errors
      throw error
    }
  }

  public async deleteNavigation(id: string, options: Omit<RequestOptions, 'body'> = {}): Promise<void> {
    return this.resourceClient['delete'](
      `/resource-url/${id}`,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
  }

  public async getMenuItems(
    params?: { hubType?: HubType },
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<MenuItemDTO[]> {
    // Fetch hubs - they already contain all menu items nested in hub.menuItems
    const hubsResponse = await this.resourceClient['get']<
      | {
          hubs: Array<{
            id: string
            name: string
            icon?: string
            description?: string
            rank?: number
            nameTranslated?: Record<string, string>
            descriptionTranslated?: Record<string, string>
            resourceUrlId?: string
            resourceUrl?: any
            menuItems?: MenuItemDTO[]
            code?: string
            type?: HubType
            hasChildren?: boolean
            codeTranslated?: Record<string, string>
          }>
        }
      | Array<{
          id: string
          name: string
          icon?: string
          description?: string
          rank?: number
          nameTranslated?: Record<string, string>
          descriptionTranslated?: Record<string, string>
          resourceUrlId?: string
          resourceUrl?: any
          menuItems?: MenuItemDTO[]
          code?: string
          type?: 'USE' | 'CREATE' | 'MANAGE'
          hasChildren?: boolean
          codeTranslated?: Record<string, string>
        }>
    >(
      '/hubs',
      {
        ...options,
        params: params as Record<string, string | number | boolean>,
        withCredentials: false
      },
      this.baseUrl
    )

    // Process hubs
    let hubs: Array<{
      id: string
      name: string
      icon?: string
      description?: string
      rank?: number
      nameTranslated?: Record<string, string>
      descriptionTranslated?: Record<string, string>
      resourceUrlId?: string
      resourceUrl?: any
      menuItems?: MenuItemDTO[]
      code?: string
      type?: 'USE' | 'CREATE' | 'MANAGE'
      hasChildren?: boolean
      codeTranslated?: Record<string, string>
    }> = []
    if (Array.isArray(hubsResponse)) {
      hubs = hubsResponse
    } else if (hubsResponse && 'hubs' in hubsResponse && Array.isArray(hubsResponse.hubs)) {
      hubs = hubsResponse.hubs
    }

    // Convert hubs to menu items (level 0) with nested children
    const unifiedMenuItems: MenuItemDTO[] = hubs.map(hub => this.hubToMenuItem(hub, 0))

    return unifiedMenuItems
  }

  public async getMenuItem(id: string, options: Omit<RequestOptions, 'body'> = {}): Promise<MenuItemDTO | null> {
    try {
      // Try hub first, then menu item
      try {
        const hub = await this.resourceClient['get']<{
          id: string
          name: string
          icon?: string
          description?: string
          rank?: number
          nameTranslated?: Record<string, string>
          descriptionTranslated?: Record<string, string>
          resourceUrlId?: string
          resourceUrl?: any
          menuItems?: MenuItemDTO[]
          code?: string
          type?: 'USE' | 'CREATE' | 'MANAGE'
          hasChildren?: boolean
          codeTranslated?: Record<string, string>
        }>(
          `/hubs/${id}`,
          {
            ...options,
            withCredentials: false
          },
          this.baseUrl
        )
        if (hub) {
          return this.hubToMenuItem(hub, 0)
        }
      } catch {
        // Not a hub, try menu item
      }

      const menuItem = await this.resourceClient['get']<MenuItemDTO>(
        `/menuItems/${id}`,
        {
          ...options,
          withCredentials: false
        },
        this.baseUrl
      )

      if (menuItem) {
        return this.menuItemToMenuItem(menuItem, menuItem.hubId ? 1 : 0)
      }

      return null
    } catch (error) {
      console.error('NavigationClient: Error getting menu item by ID:', error)
      return null
    }
  }

  public async createHub(
    data: MenuItemUpsertRequestDTO,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<MenuItemDTO> {
    // If parentId starts with 'SPACE_', extract the space type
    const spaceType = data.parentId?.startsWith('SPACE_')
      ? (data.parentId.replace('SPACE_', '') as 'USE' | 'CREATE' | 'MANAGE')
      : undefined

    const hubData: any = {
      name: data.name,
      icon: data.icon,
      description: data.description,
      rank: data.rank,
      nameTranslated: data.nameTranslated,
      descriptionTranslated: data.descriptionTranslated,
      resourceUrlId: data.resourceUrlId,
      code: data.code
    }

    // Set type from spaceType (extracted from parentId) or data.type
    if (spaceType) {
      hubData.type = spaceType
    } else if (data.type) {
      hubData.type = data.type
    }

    const hubResponse = await this.resourceClient['post']<{
      id: string
      name: string
      icon?: string
      description?: string
      rank?: number
      nameTranslated?: Record<string, string>
      descriptionTranslated?: Record<string, string>
      resourceUrlId?: string
      resourceUrl?: any
      menuItems?: MenuItemDTO[]
      code?: string
      type?: 'USE' | 'CREATE' | 'MANAGE'
      hasChildren?: boolean
      codeTranslated?: Record<string, string>
    }>(
      '/hubs',
      hubData,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )

    return this.hubToMenuItem(hubResponse, 0)
  }

  public async createMenuItemChild(
    data: MenuItemUpsertRequestDTO,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<MenuItemDTO> {
    const menuItemData: any = {
      name: data.name,
      icon: data.icon,
      description: data.description,
      rank: data.rank,
      nameTranslated: data.nameTranslated,
      descriptionTranslated: data.descriptionTranslated,
      resourceUrlId: data.resourceUrlId
    }

    // If parentId is set and doesn't start with 'SPACE_', it's a menu item or hub ID
    if (data.parentId && !data.parentId.startsWith('SPACE_')) {
      menuItemData.parentId = data.parentId
    } else if (data.hubId) {
      menuItemData.hubId = data.hubId
    }

    const menuItemResponse = await this.resourceClient['post']<MenuItemDTO>(
      '/menuItems',
      menuItemData,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )

    return this.menuItemToMenuItem(menuItemResponse, menuItemResponse.hubId ? 1 : 0)
  }

  public async createMenuItem(
    data: MenuItemUpsertRequestDTO,
    isHub: boolean,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<MenuItemDTO> {
    return isHub ? this.createHub(data, options) : this.createMenuItemChild(data, options)
  }

  public async updateHub(
    id: string,
    data: Partial<MenuItemUpsertRequestDTO>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<MenuItemDTO | undefined> {
    const hubResponse = await this.resourceClient['put']<{
      id: string
      name: string
      icon?: string
      description?: string
      rank?: number
      nameTranslated?: Record<string, string>
      descriptionTranslated?: Record<string, string>
      resourceUrlId?: string
      resourceUrl?: any
      menuItems?: MenuItemDTO[]
      code?: string
      type?: 'USE' | 'CREATE' | 'MANAGE'
      hasChildren?: boolean
      codeTranslated?: Record<string, string>
    }>(
      `/hubs/${id}`,
      data,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
    if (!hubResponse) {
      return undefined
    }
    return this.hubToMenuItem(hubResponse, 0)
  }

  public async updateMenuItemChild(
    id: string,
    data: Partial<MenuItemUpsertRequestDTO>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<MenuItemDTO | undefined> {
    const menuItemResponse = await this.resourceClient['put']<MenuItemDTO>(
      `/menuItems/${id}`,
      data,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
    if (!menuItemResponse) {
      return undefined
    }
    return this.menuItemToMenuItem(menuItemResponse, menuItemResponse.hubId ? 1 : 0)
  }

  public async updateMenuItem(
    id: string,
    data: Partial<MenuItemUpsertRequestDTO>,
    isHub: boolean,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<MenuItemDTO | undefined> {
    return isHub ? this.updateHub(id, data, options) : this.updateMenuItemChild(id, data, options)
  }

  public async deleteHub(id: string, options: Omit<RequestOptions, 'body'> = {}): Promise<void> {
    return this.resourceClient['delete'](
      `/hubs/${id}`,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
  }

  public async deleteMenuItemChild(id: string, options: Omit<RequestOptions, 'body'> = {}): Promise<void> {
    return this.resourceClient['delete'](
      `/menuItems/${id}`,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
  }

  public async deleteMenuItem(id: string, isHub: boolean, options: Omit<RequestOptions, 'body'> = {}): Promise<void> {
    return isHub ? this.deleteHub(id, options) : this.deleteMenuItemChild(id, options)
  }

  private hubToMenuItem(
    hub: {
      id: string
      name: string
      icon?: string
      description?: string
      rank?: number
      nameTranslated?: Record<string, string>
      descriptionTranslated?: Record<string, string>
      resourceUrlId?: string
      resourceUrl?: any
      menuItems?: MenuItemDTO[]
      code?: string
      type?: 'USE' | 'CREATE' | 'MANAGE'
      hasChildren?: boolean
      codeTranslated?: Record<string, string>
    },
    level: number = 0
  ): MenuItemDTO {
    return {
      id: hub.id,
      name: hub.name,
      icon: hub.icon,
      description: hub.description,
      rank: hub.rank,
      nameTranslated: hub.nameTranslated,
      descriptionTranslated: hub.descriptionTranslated,
      resourceUrlId: hub.resourceUrlId,
      resourceUrl: hub.resourceUrl,
      children: hub.menuItems?.map(child => this.menuItemToMenuItem(child, level + 1)),
      level,
      code: hub.code,
      type: hub.type,
      hasChildren: hub.hasChildren,
      codeTranslated: hub.codeTranslated
    }
  }

  private menuItemToMenuItem(item: MenuItemDTO, level: number): MenuItemDTO {
    return {
      ...item,
      level,
      children: item.children?.map(child => this.menuItemToMenuItem(child, level + 1))
    }
  }
}
