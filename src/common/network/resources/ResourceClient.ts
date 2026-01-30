import { RestClient, type RequestOptions } from '../rest/RestClient'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import { NavigationClient } from './NavigationClient'
import { ComponentClient } from './ComponentClient'
import { ActionClient } from './ActionClient'

// ==================== ResourceClient Main Class ====================

export class ResourceClient extends RestClient {
  public navigation: NavigationClient
  public component: ComponentClient
  public action: ActionClient

  constructor() {
    super() // RestClient without baseUrl - we'll use different URLs per method
    this.navigation = new NavigationClient(this)
    this.component = new ComponentClient(this)
    this.action = new ActionClient(this)
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }
    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  // ==================== Override RestClient methods to support custom baseUrl ====================

  public async get<T = any>(path: string, options: RequestOptions = {}, customBaseUrl?: string): Promise<T> {
    const baseUrl = customBaseUrl || this.baseUrl
    const url = new URL(baseUrl + path)

    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const headers = {
      ...this.headers,
      ...options.headers
    }

    headers['Content-Type'] = 'application/json'

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      credentials: options.withCredentials ? 'include' : 'same-origin',
      mode: 'cors',
      signal: options.signal
    })

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(`REST request failed: ${response.status} - ${errorMessage}`)
    }

    return await response.json()
  }

  public async post<T = any>(
    path: string,
    body: any,
    options: RequestOptions = {},
    customBaseUrl?: string
  ): Promise<T> {
    const baseUrl = customBaseUrl || this.baseUrl
    const url = new URL(baseUrl + path)

    const headers = {
      ...this.headers,
      ...options.headers
    }

    const isFormData = body instanceof FormData
    if (!isFormData) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body),
      credentials: options.withCredentials ? 'include' : 'same-origin',
      mode: 'cors',
      signal: options.signal
    })

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(`REST request failed: ${response.status} - ${errorMessage}`)
    }

    return await response.json()
  }

  public async put<T = any>(path: string, body: any, options: RequestOptions = {}, customBaseUrl?: string): Promise<T> {
    const baseUrl = customBaseUrl || this.baseUrl
    const url = new URL(baseUrl + path)

    const headers = {
      ...this.headers,
      ...options.headers
    }

    const isFormData = body instanceof FormData
    if (!isFormData) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers,
      body: isFormData ? body : JSON.stringify(body),
      credentials: options.withCredentials ? 'include' : 'same-origin',
      mode: 'cors',
      signal: options.signal
    })

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(`REST request failed: ${response.status} - ${errorMessage}`)
    }

    if (response.status !== 204) {
      return (await response.json()) as T
    }
    return undefined as T
  }

  public async delete<T = any>(path: string, options: RequestOptions = {}, customBaseUrl?: string): Promise<T> {
    const baseUrl = customBaseUrl || this.baseUrl
    const url = new URL(baseUrl + path)

    const headers = {
      ...this.headers,
      ...options.headers
    }

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers,
      credentials: options.withCredentials ? 'include' : 'same-origin',
      mode: 'cors',
      signal: options.signal
    })

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(`REST request failed: ${response.status} - ${errorMessage}`)
    }

    if (response.status !== 204) {
      return (await response.json()) as T
    }
    return undefined as T
  }
}
