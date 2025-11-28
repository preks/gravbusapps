import type { RequestOptions } from '../rest/RestClient'
import { env } from '../../env/EnvUtils'
import type { ResourceClient } from './ResourceClient'
import type { NavigationDTO, GetNavigationsParams } from '@/common/data/resources/types/navigation.types'
import type {
  MenuItemDTO,
  MenuItemResultDTO,
  MenuItemUpsertRequestDTO
} from '@/common/data/resources/types/menuItem.types'

export class NavigationClient {
  constructor(private resourceClient: ResourceClient) {}

  private get baseUrl(): string {
    const navigationBaseUrl = env('NEXT_PUBLIC_NAVIGATION_SERVICE_API') ?? ''
    return navigationBaseUrl.endsWith('/') ? navigationBaseUrl.slice(0, -1) : navigationBaseUrl
  }

  public async getNavigations(
    params?: GetNavigationsParams,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<NavigationDTO[]> {
    const endpoint = params?.search || params?.sort ? '/resource-url/search' : '/resource-url'

    const response = await this.resourceClient['get']<
      NavigationDTO[] | { data: NavigationDTO[] } | { content: NavigationDTO[] } | { resourceUrlList: NavigationDTO[] }
    >(
      endpoint,
      {
        ...options,
        params: params as Record<string, string | number | boolean>,
        withCredentials: false
      },
      this.baseUrl
    )

    // Handle different response structures
    if (Array.isArray(response)) {
      return response
    } else if (response && 'resourceUrlList' in response && Array.isArray(response.resourceUrlList)) {
      return response.resourceUrlList
    } else if (response && 'data' in response && Array.isArray(response.data)) {
      return response.data
    } else if (response && 'content' in response && Array.isArray(response.content)) {
      return response.content
    }

    return []
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
  ): Promise<NavigationDTO> {
    return this.resourceClient['put']<NavigationDTO>(
      `/resource-url/${id}`,
      data,
      {
        ...options,
        withCredentials: false
      },
      this.baseUrl
    )
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
    params?: { hubType?: 'USE' | 'CREATE' | 'MANAGE' },
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<MenuItemDTO[]> {
    // Fetch both hubs and menu items, then combine them
    const [hubsResponse, menuItemsResponse] = await Promise.all([
      this.resourceClient['get']<
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
              type?: 'USE' | 'CREATE' | 'MANAGE'
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
      ),
      this.resourceClient['get']<MenuItemResultDTO | MenuItemDTO[]>(
        '/menuItems',
        {
          ...options,
          withCredentials: false
        },
        this.baseUrl
      )
    ])

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

    // Process menu items
    let menuItems: MenuItemDTO[] = []
    if (Array.isArray(menuItemsResponse)) {
      menuItems = menuItemsResponse
    } else if (menuItemsResponse && 'menuItems' in menuItemsResponse && Array.isArray(menuItemsResponse.menuItems)) {
      menuItems = menuItemsResponse.menuItems
    }

    // Convert hubs to menu items (level 0) and attach their menu items (level 1+)
    const unifiedMenuItems: MenuItemDTO[] = hubs.map(hub => this.hubToMenuItem(hub, 0))

    // Add standalone menu items (those not attached to hubs) as level 1 items
    menuItems.forEach(item => {
      if (!item.hubId) {
        unifiedMenuItems.push(this.menuItemToMenuItem(item, 1))
      }
    })

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

  public async createMenuItem(
    data: MenuItemUpsertRequestDTO,
    isHub: boolean,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<MenuItemDTO> {
    if (isHub) {
      // Create as Hub
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
        resourceUrlId: data.resourceUrlId
      }

      if (spaceType) {
        hubData.type = spaceType
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
    } else {
      // Create as Menu Item
      // Determine if parent is a hub or another menu item
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
        // Check if parent is a hub (level 0) or menu item
        // For now, we'll use parentId for menu items and hubId for hubs
        // The backend should handle this correctly
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
  }

  public async updateMenuItem(
    id: string,
    data: Partial<MenuItemUpsertRequestDTO>,
    isHub: boolean,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<MenuItemDTO> {
    if (isHub) {
      // Update as Hub
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
      return this.hubToMenuItem(hubResponse, 0)
    } else {
      // Update as Menu Item
      const menuItemResponse = await this.resourceClient['put']<MenuItemDTO>(
        `/menuItems/${id}`,
        data,
        {
          ...options,
          withCredentials: false
        },
        this.baseUrl
      )
      return this.menuItemToMenuItem(menuItemResponse, menuItemResponse.hubId ? 1 : 0)
    }
  }

  public async deleteMenuItem(id: string, isHub: boolean, options: Omit<RequestOptions, 'body'> = {}): Promise<void> {
    if (isHub) {
      // Delete as Hub
      return this.resourceClient['delete'](
        `/hubs/${id}`,
        {
          ...options,
          withCredentials: false
        },
        this.baseUrl
      )
    } else {
      // Delete as Menu Item
      return this.resourceClient['delete'](
        `/menuItems/${id}`,
        {
          ...options,
          withCredentials: false
        },
        this.baseUrl
      )
    }
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
