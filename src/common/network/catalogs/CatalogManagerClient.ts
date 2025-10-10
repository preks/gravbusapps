import { env } from '../../env/EnvUtils'
import {
  CatalogEntry,
  GetCatalogEntriesParams,
  GetCatalogEntriesResponse,
  GetCatalogsParams,
  GetCatalogsResponse,
  // Catalog Management Types - Only for catalog administration, not business usage
  CatalogManagement,
  CatalogEntryManagement,
  ParentCatalog,
  CatalogImportResponse,
  CatalogExportRequest,
  ImportCatalogEntriesParams
} from '../../types/CatalogTypes'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import { RestClient, type RequestOptions, ResponseType } from '../rest/RestClient'

const BASE_PATH = 'api/v1'

export class CatalogManagerClient extends RestClient {
  constructor() {
    let url: string = env('NEXT_PUBLIC_CATALOG_API') ?? ''
    if (!url.endsWith('/')) {
      url += '/'
    }

    url += BASE_PATH

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

  public async getCatalogEntriesList(
    pathParams: GetCatalogEntriesParams,
    params: GetCatalogsParams = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetCatalogEntriesResponse> {
    const { limit, offset, value, parentEntryId, ...restParams } = params
    const path = this.replacePathParams('/catalogs/{catalogIdentifier}/{version}/entries', {
      catalogIdentifier: pathParams.catalogIdentifier,
      version: pathParams.version || 'v1' // Default to 'v1' if not provided
    })

    const queryParams: Record<string, string | number | boolean> = {
      ...restParams
    }

    if (limit !== undefined) {
      queryParams.limit = limit
    }
    if (offset !== undefined) {
      queryParams.offset = offset
    }

    if (value !== undefined) {
      queryParams.value = value
    }

    if (parentEntryId !== undefined) {
      queryParams.parentEntryId = parentEntryId
    }

    return this.get<GetCatalogEntriesResponse>(path, {
      ...options,
      params: queryParams
    })
  }

  public async getCatalogs(
    params: GetCatalogsParams = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<GetCatalogsResponse> {
    const { limit, offset, ...restParams } = params
    const queryParams: Record<string, string | number | boolean> = {
      ...restParams
    }

    if (limit !== undefined) {
      queryParams.limit = limit
    }
    if (offset !== undefined) {
      queryParams.offset = offset
    }

    return this.get<GetCatalogsResponse>('/catalogs', {
      ...options,
      params: queryParams
    })
  }

  public async createCatalogEntry(
    catalogIdentifier: string,
    version: string,
    entry: Omit<CatalogEntry, 'id' | 'type'>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<CatalogEntry> {
    const path = this.replacePathParams('/catalogs/{catalogIdentifier}/{version}/entries', {
      catalogIdentifier,
      version: version || 'v1' // Default to 'v1' if not provided
    })

    return this.post<CatalogEntry>(path, entry, options)
  }

  public async updateCatalogEntry(
    _catalogIdentifier: string,
    _version: string,
    entryId: string,
    entry: Partial<Omit<CatalogEntry, 'id' | 'type'>>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<CatalogEntry> {
    const path = this.replacePathParams('/catalog-entries/{entryId}', {
      entryId: entryId
    })

    return this.put<CatalogEntry>(path, entry, options)
  }

  public async deleteCatalogEntry(
    _catalogIdentifier: string,
    _version: string,
    entryId: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<void> {
    const path = this.replacePathParams('/catalog-entries/{entryId}', {
      entryId: entryId
    })

    return this.delete(path, options)
  }

  public async getCatalogEntryById(entryId: string, options: Omit<RequestOptions, 'body'> = {}): Promise<CatalogEntry> {
    const path = this.replacePathParams('/catalog-entries/{entryId}', {
      entryId: entryId
    })

    return this.get<CatalogEntry>(path, options)
  }

  // =====================================================================================
  // CATALOG MANAGEMENT METHODS - FOR CATALOG ADMINISTRATION ONLY
  // =====================================================================================
  // WARNING: These methods are intended for catalog management and administration
  // purposes only. They should NOT be used for everyday business operations or
  // regular catalog entry queries. Use the methods above for standard business usage.
  // =====================================================================================

  /**
   * Creates a new catalog - FOR CATALOG MANAGEMENT ONLY
   * Do not use for business operations - use getCatalogEntriesList instead
   */
  public async createCatalog(
    catalog: Omit<CatalogManagement, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<CatalogManagement> {
    return this.post<CatalogManagement>('/catalogs', catalog, options)
  }

  /**
   * Reads a specific catalog by identifier and version - FOR CATALOG MANAGEMENT ONLY
   * Do not use for business operations - use getCatalogEntriesList instead
   */
  public async readCatalog(
    identifier: string,
    version: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<CatalogManagement> {
    const path = this.replacePathParams('/catalogs/{identifier}/{version}', {
      identifier,
      version
    })

    return this.get<CatalogManagement>(path, options)
  }

  /**
   * Updates an existing catalog - FOR CATALOG MANAGEMENT ONLY
   * Do not use for business operations - use updateCatalogEntry instead
   */
  public async updateCatalog(
    identifier: string,
    version: string,
    catalog: Partial<CatalogManagement>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<CatalogManagement> {
    const path = this.replacePathParams('/catalogs/{identifier}/{version}', {
      identifier,
      version
    })

    return this.put<CatalogManagement>(path, catalog, options)
  }

  /**
   * Deletes a catalog - FOR CATALOG MANAGEMENT ONLY
   * Do not use for business operations - use deleteCatalogEntry instead
   */
  public async deleteCatalog(
    identifier: string,
    version: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<void> {
    const path = this.replacePathParams('/catalogs/{identifier}/{version}', {
      identifier,
      version
    })

    return this.delete(path, options)
  }

  /**
   * Gets all ancestors of a catalog - FOR CATALOG MANAGEMENT ONLY
   * Do not use for business operations
   */
  public async getCatalogAncestors(
    catalogId: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ParentCatalog[]> {
    const path = this.replacePathParams('/catalogs/{id}/ancestors', {
      id: catalogId
    })

    return this.get<ParentCatalog[]>(path, options)
  }

  /**
   * Removes parent catalog relationship - FOR CATALOG MANAGEMENT ONLY
   * Do not use for business operations
   */
  public async deleteParentCatalog(
    identifier: string,
    version: string,
    parentId: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<void> {
    const path = this.replacePathParams('/catalogs/{identifier}/{version}/remove-parent/{parentId}', {
      identifier,
      version,
      parentId
    })

    return this.delete(path, options)
  }

  /**
   * Reads a single catalog entry by ID - FOR CATALOG MANAGEMENT ONLY
   * Do not use for business operations - use getCatalogEntriesList instead
   */
  public async readCatalogEntryById(
    catalogEntryId: string,
    params: {
      localeCode?: string
      includeTranslations?: boolean
    } = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<CatalogEntryManagement> {
    const path = this.replacePathParams('/catalog-entries/{catalogEntryId}', {
      catalogEntryId
    })

    const queryParams: Record<string, string | boolean> = {}
    if (params.localeCode) {
      queryParams.localeCode = params.localeCode
    }
    if (params.includeTranslations !== undefined) {
      queryParams.includeTranslations = params.includeTranslations
    }

    return this.get<CatalogEntryManagement>(path, {
      ...options,
      params: queryParams
    })
  }

  /**
   * Imports catalog entries via CSV file upload - FOR CATALOG MANAGEMENT ONLY
   * Do not use for business operations
   */
  public async importCatalogEntries(
    params: ImportCatalogEntriesParams,
    file: File,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<CatalogEntryManagement[]> {
    const path = this.replacePathParams('/catalogs/{catalogIdentifier}/{version}/import/{importMode}', {
      catalogIdentifier: params.catalogIdentifier,
      version: params.version,
      importMode: params.importMode
    })

    const formData = new FormData()
    formData.append('file', file)

    const queryParams: Record<string, string> = {}
    if (params.parentEntryId) queryParams.parentEntryId = params.parentEntryId
    if (params.localeCode) queryParams.localeCode = params.localeCode
    if (params.catalogEntryId) queryParams.catalogEntryId = params.catalogEntryId
    if (params.fileEncoding) queryParams.fileEncoding = params.fileEncoding

    return this.post<CatalogEntryManagement[]>(path, formData, {
      ...options,
      params: queryParams,
      headers: {
        ...options.headers
        // Don't set Content-Type, let browser set it with boundary for FormData
      }
    })
  }

  /**
   * Removes parent entry relationship - FOR CATALOG MANAGEMENT ONLY
   * Do not use for business operations
   */
  public async deleteParentEntryCatalog(
    catalogEntryId: string,
    parentEntryId: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<void> {
    const path = this.replacePathParams('/catalog-entries/{catalogEntryId}/remove-parent/{parentEntryId}', {
      catalogEntryId,
      parentEntryId
    })

    return this.delete(path, options)
  }

  /**
   * Imports full catalog data from JSON file - FOR CATALOG MANAGEMENT ONLY
   * Do not use for business operations
   */
  public async importCatalogs(
    file: File,
    overwrite: boolean = true,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<CatalogImportResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const queryParams: Record<string, boolean> = {
      overwrite
    }

    return this.post<CatalogImportResponse>('/catalogs/transfer/import', formData, {
      ...options,
      params: queryParams,
      headers: {
        ...options.headers
        // Don't set Content-Type, let browser set it with boundary for FormData
      }
    })
  }

  /**
   * Exports catalog data to JSON - FOR CATALOG MANAGEMENT ONLY
   * Do not use for business operations
   */
  public async exportCatalogs(
    exportRequest: CatalogExportRequest = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<Blob> {
    return this.post<Blob>('/catalogs/transfer/export', exportRequest, {
      ...options,
      responseType: ResponseType.BLOB
    })
  }
}

export const catalogManagerClient = new CatalogManagerClient()
