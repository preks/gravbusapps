import type { RestClient } from '../rest/RestClient'
import type { RequestOptions } from '../rest/RestClient'

export class OfficeSpacesClient {
  constructor(private readonly client: RestClient) {}

  list<T = any>(id?: string, params?: string, options?: RequestOptions) {
    return this.client.get<T>(id ? `/spaces/${id}${params ?? ''}` : '/spaces', options)
  }
  create<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/spaces', body, options)
  }
  get<T = any>(spaceId: string, options?: RequestOptions) {
    return this.client.get<T>(`/spaces/${spaceId}`, options)
  }
  patch<T = any>(spaceId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/spaces/${spaceId}`, body, options)
  }
  delete(spaceId: string, options?: RequestOptions) {
    return this.client.delete(`/spaces/${spaceId}`, options)
  }
  getMembers<T = any>(spaceId: string, options?: RequestOptions) {
    return this.client.get<T>(`/spaces/${spaceId}/members`, options)
  }
  postMembersBulk(spaceId: string, body: any, options?: RequestOptions) {
    return this.client.post(`/spaces/${spaceId}/members/bulk`, body, options)
  }
  postMember<T = any>(spaceId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/spaces/${spaceId}/members`, body, options)
  }
  putMember(spaceId: string, userId: string, body: any, options?: RequestOptions) {
    return this.client.put(`/spaces/${spaceId}/members/${userId}`, body, options)
  }
  patchMember<T = any>(spaceId: string, userId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/spaces/${spaceId}/members/${userId}`, body, options)
  }
  deleteMember(spaceId: string, userId: string, options?: RequestOptions) {
    return this.client.delete(`/spaces/${spaceId}/members/${userId}`, options)
  }
  getContent<T = any>(spaceId: string, options?: RequestOptions) {
    return this.client.get<T>(`/spaces/${spaceId}/content`, options)
  }
  postContent<T = any>(spaceId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/spaces/${spaceId}/content`, body, options)
  }
  putContent(spaceId: string, body: any, options?: RequestOptions) {
    return this.client.put(`/spaces/${spaceId}/content`, body, options)
  }
  postContentBulk<T = any>(
    spaceId: string,
    body: { items: { entityType: string; entityId: string }[] },
    options?: RequestOptions
  ) {
    return this.client.post<T>(`/spaces/${spaceId}/content/bulk`, body, options)
  }
  getContentEntity<T = any>(spaceId: string, entityType: string, entityId: string, options?: RequestOptions) {
    return this.client.get<T>(`/spaces/${spaceId}/content/${entityType}/${entityId}`, options)
  }
  deleteContentEntity(spaceId: string, entityType: string, entityId: string, options?: RequestOptions) {
    return this.client.delete(`/spaces/${spaceId}/content/${entityType}/${entityId}`, options)
  }
  getFolders<T = any>(spaceId: string, options?: RequestOptions) {
    return this.client.get<T>(`/spaces/${spaceId}/folders`, options)
  }
  postFolder<T = any>(spaceId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/spaces/${spaceId}/folders`, body, options)
  }
  getFolder<T = any>(spaceId: string, folderId: string, options?: RequestOptions) {
    return this.client.get<T>(`/spaces/${spaceId}/folders/${folderId}`, options)
  }
  putFolder(spaceId: string, folderId: string, body: any, options?: RequestOptions) {
    return this.client.put(`/spaces/${spaceId}/folders/${folderId}`, body, options)
  }
  deleteFolder(spaceId: string, folderId: string, options?: RequestOptions) {
    return this.client.delete(`/spaces/${spaceId}/folders/${folderId}`, options)
  }
  getActivity<T = any>(spaceId: string, limit?: number, options?: RequestOptions) {
    return this.client.get<T>(`/spaces/${spaceId}/activity`, {
      ...options,
      params: { ...options?.params, limit }
    } as any)
  }
}
