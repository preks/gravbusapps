import { env } from "../../env/EnvUtils";
import {
  CatalogEntry,
  GetCatalogEntriesParams,
  GetCatalogEntriesResponse,
  GetCatalogsParams,
  GetCatalogsResponse,
} from "../../types/CatalogTypes";
import { setAccessTokenToAuthorizationHeader } from "../HeaderUtils";
import { RestClient, type RequestOptions } from "../rest/RestClient";

const BASE_PATH = "api/v1";

export class CatalogManagerClient extends RestClient {
  constructor() {
    let url: string = env("NEXT_PUBLIC_CATALOG_API") ?? "";
    if (!url.endsWith("/")) {
      url += "/";
    }

    url += BASE_PATH;

    super(url, {});
  }

  private replacePathParams(
    path: string,
    params: Record<string, string | number> = {}
  ): string {
    return Object.entries(params).reduce(
      (result, [key, value]) => result.replace(`{${key}}`, String(value)),
      path
    );
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {};
    }

    this.headers["Authorization"] =
      setAccessTokenToAuthorizationHeader(accessToken);
  }

  public async getCatalogEntriesList(
    pathParams: GetCatalogEntriesParams,
    params: GetCatalogsParams = {},
    options: Omit<RequestOptions, "body"> = {}
  ): Promise<GetCatalogEntriesResponse> {
    const { limit, offset, value, ...restParams } = params;
    const path = this.replacePathParams(
      "/catalogs/{catalogIdentifier}/{version}/entries",
      {
        catalogIdentifier: pathParams.catalogIdentifier,
        version: pathParams.version || "v1", // Default to 'v1' if not provided
      }
    );

    const queryParams: Record<string, string | number | boolean> = {
      ...restParams,
    };

    if (limit !== undefined) {
      queryParams.limit = limit;
    }
    if (offset !== undefined) {
      queryParams.offset = offset;
    }

    if (value !== undefined) {
      queryParams.value = value;
    }

    return this.get<GetCatalogEntriesResponse>(path, {
      ...options,
      params: queryParams,
    });
  }

  public async getCatalogs(
    params: GetCatalogsParams = {},
    options: Omit<RequestOptions, "body"> = {}
  ): Promise<GetCatalogsResponse> {
    const { limit, offset, ...restParams } = params;
    const queryParams: Record<string, string | number | boolean> = {
      ...restParams,
    };

    if (limit !== undefined) {
      queryParams.limit = limit;
    }
    if (offset !== undefined) {
      queryParams.offset = offset;
    }

    return this.get<GetCatalogsResponse>("/catalogs", {
      ...options,
      params: queryParams,
    });
  }

  public async createCatalogEntry(
    catalogIdentifier: string,
    version: string,
    entry: Omit<CatalogEntry, "id" | "type">,
    options: Omit<RequestOptions, "body"> = {}
  ): Promise<CatalogEntry> {
    const path = this.replacePathParams(
      "/catalogs/{catalogIdentifier}/{version}/entries",
      {
        catalogIdentifier,
        version: version || "v1", // Default to 'v1' if not provided
      }
    );

    return this.post<CatalogEntry>(path, entry, options);
  }

  public async updateCatalogEntry(
    catalogIdentifier: string,
    version: string,
    entryId: string,
    entry: Partial<Omit<CatalogEntry, "id" | "type">>,
    options: Omit<RequestOptions, "body"> = {}
  ): Promise<CatalogEntry> {
    const path = this.replacePathParams("/catalog-entries/{entryId}", {
      entryId: entryId,
    });

    return this.put<CatalogEntry>(path, entry, options);
  }

  public async deleteCatalogEntry(
    catalogIdentifier: string,
    version: string,
    entryId: string,
    options: Omit<RequestOptions, "body"> = {}
  ): Promise<void> {
    const path = this.replacePathParams("/catalog-entries/{entryId}", {
      entryId: entryId,
    });

    return this.delete(path, options);
  }
}

export const catalogManagerClient = new CatalogManagerClient();
