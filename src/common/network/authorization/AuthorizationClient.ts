import { RestClient } from '../rest/RestClient';
import { env } from '../../env/EnvUtils';

// Define the permission check request structure based on OpenAPI
export interface CheckPermissionsRequestDTO {
  domain: string;
  resource: string;
  resourceId: string;
  permissions: string[];
}

// Define the permission check response structure based on OpenAPI
export interface CheckPermissionsResponseDTO {
  domain: string;
  resource: string;
  resourceId: string;
  userId: string;
  permissions: Record<string, boolean>;
}

/**
 * Client for interacting with the Authorization API
 */
export class AuthorizationClient extends RestClient {
  private static instance: AuthorizationClient;

  private constructor() {
    // Using the base URL from environment variables
    // Strip '/api/v1' from the permissions API URL to get the base URL
    const permissionsApiUrl = `${env('NEXT_PUBLIC_BASE_URL')}/authorization/api/v1` || '';
    const baseUrl = permissionsApiUrl.replace(/\/api\/v1$/, '');
    super(baseUrl);
  }

  /**
   * Get singleton instance of the AuthorizationClient
   */
  public static getInstance(): AuthorizationClient {
    if (!AuthorizationClient.instance) {
      AuthorizationClient.instance = new AuthorizationClient();
    }
    return AuthorizationClient.instance;
  }

  /**
   * Set authorization token for requests
   */
  public setAccessToken(token: string): void {
    this.headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`
    };
  }

  /**
   * Check a single permission
   */
  public async checkPermission(
    domain: string,
    resource: string,
    resourceId: string,
    permission: string
  ): Promise<boolean> {
    const response = await this.post<CheckPermissionsResponseDTO>(
      '/api/v1/permissions/check',
      {
        domain,
        resource,
        resourceId,
        permissions: [permission]
      }
    );
    
    return response.permissions[permission] || false;
  }

  /**
   * Check multiple permissions in bulk
   */
  public async bulkCheckPermissions(
    requests: CheckPermissionsRequestDTO[]
  ): Promise<CheckPermissionsResponseDTO[]> {
    return this.post<CheckPermissionsResponseDTO[]>(
      '/api/v1/permissions/bulk-check',
      requests
    );
  }
}

export default AuthorizationClient;
