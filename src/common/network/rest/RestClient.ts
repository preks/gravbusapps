import { env } from '@/common/env/EnvUtils'

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

export enum ResponseType {
  JSON = 'json',
  TEXT = 'text',
  BLOB = 'blob',
  AUTO = 'auto'
}

export type RequestOptions = {
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean>
  responseType?: ResponseType
  withCredentials?: boolean // Whether to include credentials in the request
  signal?: AbortSignal
}

export type RequestOptionsWithBody = RequestOptions & {
  body?: any
}

export class RestClient {
  protected headers: Record<string, string> = {}
  protected baseUrl: string

  constructor(baseUrl?: string, headers: Record<string, string> = {}) {
    if (!baseUrl) {
      baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
    }

    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    this.headers = headers
  }

  private async request<T = any>(method: HttpMethod, path: string, options: RequestOptionsWithBody = {}): Promise<T> {
    const url = new URL(this.baseUrl + path)

    // Add query parameters if provided
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    // Start with default headers
    let headers = {
      ...this.headers,
      ...(options.headers || {})
    }

    // Handle FormData specially - don't set Content-Type for FormData
    // as the browser needs to set it with the proper multipart boundary
    const isFormData = options.body instanceof FormData

    if (!isFormData) {
      // Only set Content-Type for non-FormData requests
      headers = {
        'Content-Type': 'application/json',
        ...headers
      }
    } else if (headers['Content-Type']) {
      // Remove any Content-Type header for FormData requests
      const headersCopy = { ...headers }
      delete headersCopy['Content-Type']
      headers = headersCopy
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      credentials: options.withCredentials ? 'include' : 'same-origin',
      mode: 'cors',
      signal: options.signal
    }

    // Add body for non-GET/HEAD requests
    if (method !== HttpMethod.GET && method !== HttpMethod.HEAD && options.body !== undefined) {
      // Send FormData as-is without JSON.stringify
      requestOptions.body = isFormData ? options.body : JSON.stringify(options.body)
    }

    const response = await fetch(url.toString(), requestOptions)

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      let errorData: any = null

      try {
        errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
        // Log full error data for debugging
        if (errorData && errorData.errors && Array.isArray(errorData.errors)) {
          const details = errorData.errors.map((e: any) => e.detail || e.title).join('; ')
          if (details) {
            errorMessage = details
          }
        }
      } catch {
        errorMessage = response.statusText || errorMessage
      }

      const error = new Error(`REST request failed: ${response.status} - ${errorMessage}`)
      // Attach error data for debugging
      if (errorData) {
        ;(error as any).responseData = errorData
      }
      throw error
    }

    if (response.status === 204) {
      return null as unknown as T
    }

    try {
      // If responseType is specified in options, use that
      const responseType = options.responseType || ResponseType.AUTO

      if (responseType === ResponseType.JSON) {
        return await response.json()
      } else if (responseType === ResponseType.TEXT) {
        return (await response.text()) as unknown as T
      } else if (responseType === ResponseType.BLOB) {
        return (await response.blob()) as unknown as T
      } else {
        // Auto-detect based on Content-Type
        const contentType = response.headers.get('Content-Type')

        // Handle JSON responses
        if (contentType && contentType.includes('application/json')) {
          return await response.json()
        }
        // Handle text responses
        else if (contentType && (contentType.includes('text/') || contentType.includes('application/xml'))) {
          return (await response.text()) as unknown as T
        }
        // Handle blob/binary responses
        else if (
          contentType &&
          (contentType.includes('image/') ||
            contentType.includes('application/pdf') ||
            contentType.includes('application/octet-stream'))
        ) {
          return (await response.blob()) as unknown as T
        }
        // Default to JSON if can't determine
        else {
          return await response.json()
        }
      }
    } catch (e: unknown) {
      console.error('Failed to parse response:', e)
      const errorMessage = e instanceof Error ? e.message : String(e)
      throw new Error(`Failed to parse response: ${errorMessage}`)
    }
  }

  public async get<T = any>(path: string, options: Omit<RequestOptions, 'body'> = {}): Promise<T> {
    return this.request<T>(HttpMethod.GET, path, options)
  }

  public async post<T = any>(path: string, body?: any, options: Omit<RequestOptions, 'body'> = {}): Promise<T> {
    return this.request<T>(HttpMethod.POST, path, { ...options, body })
  }

  public async put<T = any>(path: string, body?: any, options: Omit<RequestOptions, 'body'> = {}): Promise<T> {
    return this.request<T>(HttpMethod.PUT, path, { ...options, body })
  }

  public async patch<T = any>(path: string, body?: any, options: Omit<RequestOptions, 'body'> = {}): Promise<T> {
    return this.request<T>(HttpMethod.PATCH, path, { ...options, body })
  }

  public async delete<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(HttpMethod.DELETE, path, options)
  }

  public async head(path: string, options: Omit<RequestOptions, 'body'> = {}): Promise<Headers> {
    const response = await fetch(this.baseUrl + path, {
      method: HttpMethod.HEAD,
      headers: {
        ...this.headers,
        ...(options.headers || {})
      },
      credentials: 'same-origin',
      mode: 'cors'
    })
    return response.headers
  }

  public async options(path: string, options: Omit<RequestOptions, 'body'> = {}): Promise<Response> {
    return fetch(this.baseUrl + path, {
      method: HttpMethod.OPTIONS,
      headers: {
        ...this.headers,
        ...(options.headers || {})
      },
      credentials: 'same-origin',
      mode: 'cors'
    })
  }
}
