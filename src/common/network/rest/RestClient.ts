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

function createRequestUrl(baseUrl: string, path: string, params?: Record<string, string | number | boolean>): URL {
  const fullPath = baseUrl + path
  const url = fullPath.startsWith('http') ? new URL(fullPath) : new URL(fullPath, window.location.origin)
  if (!params) {
    return url
  }
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value))
    }
  })
  return url
}

function mergeHeadersForRequest(
  baseHeaders: Record<string, string>,
  optionHeaders: Record<string, string> | undefined,
  isFormData: boolean
): Record<string, string> {
  const headers = {
    ...baseHeaders,
    ...(optionHeaders || {})
  }
  if (!isFormData) {
    return {
      'Content-Type': 'application/json',
      ...headers
    }
  }
  if (headers['Content-Type']) {
    const headersCopy = { ...headers }
    delete headersCopy['Content-Type']
    return headersCopy
  }
  return headers
}

/** FastAPI `detail` and JSON:API `errors` shapes */
function extractHttpErrorMessage(errorData: any, statusFallback: string): string {
  let message = statusFallback
  if (errorData.detail === undefined) {
    message = errorData.message || errorData.error || message
  } else {
    if (typeof errorData.detail === 'string') {
      message = errorData.detail
    } else if (Array.isArray(errorData.detail)) {
      message = errorData.detail.map((e: any) => (e.msg ? `${e.loc?.join('.')} — ${e.msg}` : String(e))).join('; ')
    }
  }
  if (errorData.errors && Array.isArray(errorData.errors)) {
    const details = errorData.errors.map((e: any) => e.detail || e.title).join('; ')
    if (details) {
      message = details
    }
  }
  return message
}

async function buildErrorFromFailedResponse(response: Response): Promise<Error> {
  const defaultMessage = `HTTP error! status: ${response.status}`
  let errorMessage = defaultMessage
  let errorData: any = null
  try {
    errorData = await response.json()
    errorMessage = extractHttpErrorMessage(errorData, defaultMessage)
  } catch {
    errorMessage = response.statusText || errorMessage
  }
  const error = new Error(`REST request failed: ${response.status} - ${errorMessage}`)
  if (errorData) {
    ;(error as any).responseData = errorData
  }
  return error
}

async function parseResponseBodyAuto<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('Content-Type')
  if (contentType?.includes('application/json')) {
    return await response.json()
  }
  if (contentType?.includes('text/') || contentType?.includes('application/xml')) {
    return (await response.text()) as unknown as T
  }
  if (
    contentType?.includes('image/') ||
    contentType?.includes('application/pdf') ||
    contentType?.includes('application/octet-stream')
  ) {
    return (await response.blob()) as unknown as T
  }
  return await response.json()
}

async function parseResponseBody<T>(response: Response, responseType: ResponseType): Promise<T> {
  if (responseType === ResponseType.JSON) {
    return await response.json()
  }
  if (responseType === ResponseType.TEXT) {
    return (await response.text()) as unknown as T
  }
  if (responseType === ResponseType.BLOB) {
    return (await response.blob()) as unknown as T
  }
  return parseResponseBodyAuto<T>(response)
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
    const url = createRequestUrl(this.baseUrl, path, options.params)
    const isFormData = options.body instanceof FormData
    const headers = mergeHeadersForRequest(this.headers, options.headers, isFormData)

    const requestOptions: RequestInit = {
      method,
      headers,
      credentials: options.withCredentials ? 'include' : 'same-origin',
      mode: 'cors',
      signal: options.signal
    }

    if (method !== HttpMethod.GET && method !== HttpMethod.HEAD && options.body !== undefined) {
      requestOptions.body = isFormData ? options.body : JSON.stringify(options.body)
    }

    const response = await fetch(url.toString(), requestOptions)

    if (!response.ok) {
      throw await buildErrorFromFailedResponse(response)
    }

    if (response.status === 204) {
      return null as unknown as T
    }

    try {
      const responseType = options.responseType || ResponseType.AUTO
      return await parseResponseBody<T>(response, responseType)
    } catch (e: unknown) {
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

  public async delete<T = any>(path: string, options: RequestOptionsWithBody = {}): Promise<T> {
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
