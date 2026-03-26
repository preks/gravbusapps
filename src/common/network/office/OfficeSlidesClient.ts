import type { RestClient } from '../rest/RestClient'
import type { RequestOptions } from '../rest/RestClient'

export class OfficeSlidesClient {
  constructor(private readonly client: RestClient) {}

  list<T = any>(params?: string, options?: RequestOptions) {
    return this.client.get<T>(`/slides${params ? `?${params}` : ''}`, options)
  }
  get<T = any>(id: string, options?: RequestOptions) {
    return this.client.get<T>(`/slides/${id}`, options)
  }
  create<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/slides', body, options)
  }
  generate<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/slides/generate', body, options)
  }
  update<T = any>(id: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/slides/${id}`, body, options)
  }
  delete(id: string, options?: RequestOptions) {
    return this.client.delete(`/slides/${id}`, options)
  }
  duplicate<T = any>(id: string, options?: RequestOptions) {
    return this.client.post<T>(`/slides/${id}/duplicate`, undefined, options)
  }
  getVersions<T = any>(slideId: string, page?: number, limit?: number, options?: RequestOptions) {
    return this.client.get<T>(`/versions/slide/${slideId}`, {
      ...options,
      params: { ...options?.params, page, limit }
    } as any)
  }
  getVersion<T = any>(slideId: string, versionNumber: number, options?: RequestOptions) {
    return this.client.get<T>(`/versions/slide/${slideId}/${versionNumber}`, options)
  }
  compareVersions<T = any>(slideId: string, versionA: number, versionB: number, options?: RequestOptions) {
    return this.client.get<T>(`/versions/slide/${slideId}/compare`, {
      ...options,
      params: { ...options?.params, versionA, versionB }
    } as any)
  }
  acquireLock<T = any>(slideId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/locks/slide/${slideId}`, body, options)
  }
  releaseLock(slideId: string, options?: RequestOptions) {
    return this.client.delete(`/locks/slide/${slideId}`, options)
  }
  getLock<T = any>(slideId: string, options?: RequestOptions) {
    return this.client.get<T>(`/locks/slide/${slideId}`, options)
  }
  forceReleaseLock(slideId: string, options?: RequestOptions) {
    return this.client.delete(`/locks/slide/${slideId}/force`, options)
  }
}
