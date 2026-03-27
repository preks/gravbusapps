import type { RestClient } from '../rest/RestClient'
import type { RequestOptions } from '../rest/RestClient'

export class OfficeNotesClient {
  constructor(private readonly client: RestClient) {}

  getTree<T = any>(options?: RequestOptions) {
    return this.client.get<T>('/notes/tree', options)
  }
  list<T = any>(params?: string, options?: RequestOptions) {
    return this.client.get<T>(`/notes${params ? `?${params}` : ''}`, options)
  }
  get<T = any>(id: string, options?: RequestOptions) {
    return this.client.get<T>(`/notes/${id}`, options)
  }
  create<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/notes', body, options)
  }
  update<T = any>(id: string, body: any, options?: RequestOptions) {
    return this.client.put<T>(`/notes/${id}`, body, options)
  }
  delete(id: string, options?: RequestOptions) {
    return this.client.delete(`/notes/${id}`, options)
  }
  duplicate<T = any>(id: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/notes/${id}/duplicate`, body, options)
  }
  pin<T = any>(id: string, body: any, options?: RequestOptions) {
    return this.client.put<T>(`/notes/${id}/pin`, body, options)
  }
  archive<T = any>(id: string, body: any, options?: RequestOptions) {
    return this.client.put<T>(`/notes/${id}/archive`, body, options)
  }
  unarchive<T = any>(id: string, body: any, options?: RequestOptions) {
    return this.client.put<T>(`/notes/${id}/unarchive`, body, options)
  }
  move<T = any>(id: string, body: any, options?: RequestOptions) {
    return this.client.put<T>(`/notes/${id}/move`, body, options)
  }
  publish<T = any>(noteId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/notes/${noteId}/publish`, body, options)
  }
  unpublish(noteId: string, options?: RequestOptions) {
    return this.client.post(`/notes/${noteId}/unpublish`, undefined, options)
  }
  getPublishStatus<T = any>(noteId: string, options?: RequestOptions) {
    return this.client.get<T>(`/notes/${noteId}/publish-status`, options)
  }
  updatePublishStatus<T = any>(noteId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/notes/${noteId}/publish-status`, body, options)
  }
  updateStatus<T = any>(noteId: string, body: any, options?: RequestOptions) {
    return this.updatePublishStatus<T>(noteId, body, options)
  }
  createVersion<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/versions', body, options)
  }
  getVersions<T = any>(noteId: string, page?: number, limit?: number, options?: RequestOptions) {
    return this.client.get<T>(`/versions/note/${noteId}`, {
      ...options,
      params: { ...options?.params, page, limit }
    } as any)
  }
  compareVersions<T = any>(noteId: string, versionA: number, versionB: number, options?: RequestOptions) {
    return this.client.get<T>(`/versions/note/${noteId}/compare`, {
      ...options,
      params: { ...options?.params, versionA, versionB }
    } as any)
  }
  getVersion<T = any>(noteId: string, versionNumber: number, options?: RequestOptions) {
    return this.client.get<T>(`/versions/note/${noteId}/${versionNumber}`, options)
  }
  restoreVersion<T = any>(noteId: string, versionNumber: number, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/versions/note/${noteId}/${versionNumber}`, body, options)
  }
  createComment<T = any>(noteId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/comments/note/${noteId}`, body, options)
  }
  getComments<T = any>(noteId: string, params?: string, options?: RequestOptions) {
    return this.client.get<T>(`/comments/note/${noteId}${params ? `?${params}` : ''}`, options)
  }
  updateComment<T = any>(commentId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/comments/${commentId}`, body, options)
  }
  resolveComment<T = any>(commentId: string, body?: any, options?: RequestOptions) {
    return this.client.patch<T>(`/comments/${commentId}/resolve`, body ?? {}, options)
  }
  resolveCommentPatch<T = any>(commentId: string, body?: any, options?: RequestOptions) {
    return this.resolveComment<T>(commentId, body, options)
  }
  deleteComment(commentId: string, options?: RequestOptions) {
    return this.client.delete(`/comments/${commentId}`, options)
  }
  replyToComment<T = any>(commentId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/comments/${commentId}/reply`, body, options)
  }
  acquireLock<T = any>(noteId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/locks/note/${noteId}`, body, options)
  }
  releaseLock(noteId: string, options?: RequestOptions) {
    return this.client.delete(`/locks/note/${noteId}`, options)
  }
  getLock<T = any>(noteId: string, options?: RequestOptions) {
    return this.client.get<T>(`/locks/note/${noteId}`, options)
  }
  forceReleaseLock(noteId: string, options?: RequestOptions) {
    return this.client.delete(`/locks/note/${noteId}/force`, options)
  }
}
