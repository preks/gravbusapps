import { RestClient, type RequestOptions } from "../rest/RestClient";
import { env } from "../../env/EnvUtils";
import { setAccessTokenToAuthorizationHeader } from "../HeaderUtils";
import { FilePathParams, FileQueryParams } from "@/common/types/FileTypes";

export class FileClient extends RestClient {
  constructor() {
    super(env("NEXT_PUBLIC_FILE_SERVICE_ENDPOINT") ?? "");
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {};
    }

    this.headers["Authorization"] =
      setAccessTokenToAuthorizationHeader(accessToken);
  }

  /**
   * Get a file by ID
   *
   * @param pathParams - Path parameters for the file request
   * @param queryParams - Query parameters for the file request
   * @param options - Additional request options
   * @returns A Promise that resolves to a Blob containing the file data
   */
  public async getFile(
    path: FilePathParams,
    params: FileQueryParams = {},
    options: Omit<RequestOptions, "body"> = {}
  ): Promise<Blob> {
    const queryPath = `/${path.accessScope}/files/${path.fileId}`;

    // Create a clean params object without undefined values
    const queryParams: Record<string, string | number | boolean> = {};
    
    // Only add defined properties from params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams[key] = value;
      }
    });

    // Use the base URL and path to construct the full URL
    const baseUrl = env("NEXT_PUBLIC_FILE_SERVICE_ENDPOINT") ?? "";
    const url = new URL(baseUrl + queryPath);
    
    // Add query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
    
    // Prepare headers
    const headers = {
      ...this.headers,
      ...(options.headers || {}),
    };
    
    console.log(`FileClient: Fetching file from ${url.toString()}`);
    console.log('FileClient: Using headers:', headers);
    
    try {
      // Make the request directly to get the binary data
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      
      console.log(`FileClient: Response status: ${response.status}`);
      console.log(`FileClient: Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error(`FileClient: Error response body: ${errorText}`);
        throw new Error(`File request failed: ${response.status} - ${response.statusText}\nDetails: ${errorText}`);
      }
      
      // Get content type to verify we're getting the expected response
      const contentType = response.headers.get('content-type');
      console.log(`FileClient: Content-Type of response: ${contentType}`);
      
      // Return the response as a blob
      const blob = await response.blob();
      console.log(`FileClient: Blob received - size: ${blob.size}, type: ${blob.type}`);
      return blob;
    } catch (error) {
      console.error('FileClient: Error fetching file:', error);
      throw error;
    }
  }
}

export const fileClient = new FileClient();
