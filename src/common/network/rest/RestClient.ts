export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

export type RequestOptions = {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
};

export type RequestOptionsWithBody = RequestOptions & {
  body?: any;
};

export class RestClient {
  protected headers: Record<string, string> = {};
  private baseUrl: string;

  constructor(baseUrl: string, headers: Record<string, string> = {}) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.headers = headers;
  }

  private async request<T = any>(
    method: HttpMethod,
    path: string,
    options: RequestOptionsWithBody = {}
  ): Promise<T> {
    const url = new URL(this.baseUrl + path);

    // Add query parameters if provided
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      ...this.headers,
      ...(options.headers || {}),
    };

    const requestOptions: RequestInit = {
      method,
      headers,
      credentials: 'include',
      mode: 'cors',
    };

    // Add body for non-GET/HEAD requests
    if (method !== HttpMethod.GET && method !== HttpMethod.HEAD && options.body !== undefined) {
      requestOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url.toString(), requestOptions);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }

      throw new Error(`REST request failed: ${response.status} - ${errorMessage}`);
    }

    if (response.status === 204) {
      return null as unknown as T;
    }

    try {
      return await response.json();
    } catch (e) {
      throw new Error('Failed to parse JSON response');
    }
  }

  public async get<T = any>(
    path: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<T> {

    return this.request<T>(HttpMethod.GET, path, options);
  }

  public async post<T = any>(
    path: string,
    body?: any,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<T> {
    return this.request<T>(HttpMethod.POST, path, { ...options, body });
  }

  public async put<T = any>(
    path: string,
    body?: any,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<T> {
    return this.request<T>(HttpMethod.PUT, path, { ...options, body });
  }

  public async patch<T = any>(
    path: string,
    body?: any,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<T> {
    return this.request<T>(HttpMethod.PATCH, path, { ...options, body });
  }

  public async delete<T = any>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.request<T>(HttpMethod.DELETE, path, options);
  }

  public async head(
    path: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<Headers> {
    const response = await fetch(this.baseUrl + path, {
      method: HttpMethod.HEAD,
      headers: {
        ...this.headers,
        ...(options.headers || {}),
      },
      credentials: 'include',
      mode: 'cors',
    });
    return response.headers;
  }

  public async options(
    path: string,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<Response> {
    return fetch(this.baseUrl + path, {
      method: HttpMethod.OPTIONS,
      headers: {
        ...this.headers,
        ...(options.headers || {}),
      },
      credentials: 'include',
      mode: 'cors',
    });
  }
}