import { RestClient, type RequestOptions, ResponseType } from '../rest/RestClient'
import { env } from '../../env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import { FilePathParams, FileQueryParams, FileUploadResponse } from '../../types/FileTypes'

export class FileClient extends RestClient {
  constructor() {
    super(env('NEXT_PUBLIC_FILE_SERVICE_ENDPOINT') ?? '')
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  /**
   * Upload a file to the file service
   *
   * @param file - The file to upload
   * @param fieldName - The form field name to use (default: 'employeeProfile')
   * @param path - The path to upload to (default: '/files')
   * @param options - Additional request options
   * @returns A Promise that resolves to a FileUploadResponse containing the file metadata
   */
  public async uploadFile(
    file: File,
    path: FilePathParams,
    params: FileQueryParams = {},
    fieldName: string = 'fileContent',
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<FileUploadResponse> {
    const queryPath = `/${path.accessScope}/files`

    // Create a clean params object without undefined values
    const queryParams: URLSearchParams = new URLSearchParams()

    // Only add defined properties from params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    // Create FormData for file upload
    const formData = new FormData()
    formData.append(fieldName, file)

    // Upload the file
    try {
      return await this.post(`${encodeURI(queryPath)}?${queryParams.toString()}`, formData, options)
    } catch (error) {
      console.error('FileClient: Error uploading file:', error)
      throw error
    }
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
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<Blob> {
    const queryPath = `/${path.accessScope}/files/${path.fileId}`

    // Create a clean params object without undefined values
    const queryParams: URLSearchParams = new URLSearchParams()

    // Only add defined properties from params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    // Prepare headers
    const headers = {
      ...this.headers,
      ...(options.headers || {})
    }

    try {
      // Always force BLOB response type for file downloads
      return await this.get(`${encodeURI(queryPath)}?${queryParams.toString()}`, {
        headers,
        responseType: ResponseType.BLOB
      })
    } catch (error) {
      console.error('FileClient: Error fetching file:', error)
      throw error
    }
  }

  /**
   * Download a file using a complete API path (e.g., from reportPath)
   * This method handles pre-constructed file paths like those from investment reports
   *
   * @param filePath - Complete API path to the file (e.g., '/api/v1/tenant/downloads/...')
   * @param accessToken - Access token for authentication
   * @param options - Additional request options
   * @returns A Promise that resolves to a Blob containing the file data
   */
  public async downloadFileByPath(
    filePath: string,
    accessToken: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<Blob> {
    if (!accessToken) {
      throw new Error('accessToken is required for downloadFileByPath')
    }
    if (!filePath) {
      throw new Error('filePath is required for downloadFileByPath')
    }

    // Prepare headers with authentication
    const headers = {
      ...this.headers,
      ...options.headers,
      Authorization: setAccessTokenToAuthorizationHeader(accessToken),
      Accept: 'application/pdf, application/octet-stream, */*'
    }

    // File service returns download paths in different shapes depending on endpoint:
    // - Upload/PUT often returns: /tenant/...
    // - Download paths are commonly: /api/v1/tenant/downloads/...
    //
    // Our RestClient baseUrl for FileClient is NEXT_PUBLIC_FILE_SERVICE_ENDPOINT, usually:
    //   https://<host>/files/api/v1
    // For /api/v1/... paths, we must call https://<host>/files + <path> (NOT /files/api/v1 + /api/v1/...).
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`
    const fileServiceEndpoint = this.baseUrl // e.g. https://newwork-dev.newwork.com/files/api/v1
    const filesBaseUrl = fileServiceEndpoint.replace(/\/api\/v1\/?$/, '') // -> https://newwork-dev.newwork.com/files

    const url = normalizedPath.startsWith('/api/v1/')
      ? `${filesBaseUrl}${normalizedPath}`
      : `${fileServiceEndpoint}${normalizedPath}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: options.withCredentials ? 'include' : 'same-origin',
        mode: 'cors',
        signal: options.signal
      })

      if (!response.ok) {
        let errorMessage = response.statusText || `HTTP error! status: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData?.message || errorData?.error || errorMessage
        } catch {
          // ignore JSON parse errors for non-JSON error bodies
        }
        throw new Error(`REST request failed: ${response.status} - ${errorMessage}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('FileClient: Error downloading file by path:', error)
      throw error
    }
  }

  /**
   * Delete a file by ID
   *
   * @param path - Path parameters for the file request
   * @param params - Query parameters for the file request
   * @param options - Additional request options
   * @returns A Promise that resolves to true if deleted successfully
   */
  public async deleteFile(
    path: FilePathParams,
    params: FileQueryParams = {},
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<boolean> {
    const queryPath = `/${path.accessScope}/files/${path.fileId}`

    // Create a clean params object without undefined values
    const queryParams: URLSearchParams = new URLSearchParams()

    // Only add defined properties from params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    try {
      await this.delete(`${encodeURI(queryPath)}?${queryParams.toString()}`, options)
      return true
    } catch (error) {
      console.error('FileClient: Error deleting file:', error)
      return false
    }
  }

  /**
   * Update a file in place (same fileId, new content)
   *
   * This updates the file content without creating a new file.
   * The fileId and path remain the same.
   *
   * @param file - The new file content
   * @param path - Path parameters including accessScope and fileId
   * @param params - Query parameters (appName required, folderPath optional)
   * @param fieldName - The form field name (default: 'fileContent')
   * @param options - Additional request options
   * @returns A Promise that resolves to a FileUploadResponse
   */
  public async updateFile(
    file: File,
    path: FilePathParams,
    params: FileQueryParams = {},
    fieldName: string = 'fileContent',
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<FileUploadResponse> {
    if (!path.fileId) {
      throw new Error('fileId is required for updateFile')
    }

    const queryPath = `/${path.accessScope}/files/${path.fileId}`

    // Create a clean params object without undefined values
    const queryParams: URLSearchParams = new URLSearchParams()

    // Only add defined properties from params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    // Create FormData for file upload
    const formData = new FormData()
    formData.append(fieldName, file)

    // Use PUT to update the file in place
    try {
      return await this.put(`${encodeURI(queryPath)}?${queryParams.toString()}`, formData, options)
    } catch (error) {
      console.error('FileClient: Error updating file:', error)
      throw error
    }
  }
}

export const fileClient = new FileClient()
