import { ResponseType, type RequestOptions, type RestClient } from '../rest/RestClient'

type OfficeDriveListParams = {
  section?: string
  folderId?: string
  spaceId?: string
  type?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  page?: number
  limit?: number
}

type OfficeDriveEntityReference = {
  entityType: string
  entityId: string
}

export class OfficeDriveClient {
  constructor(private readonly client: RestClient) {}

  list<T = any>(params?: OfficeDriveListParams, options?: RequestOptions) {
    return this.client.get<T>('/drive', {
      ...options,
      params: { ...options?.params, ...params }
    } as RequestOptions)
  }

  listFolders<T = any>(parentId?: string, options?: RequestOptions) {
    return this.client.get<T>('/drive/folders', {
      ...options,
      params: { ...options?.params, parentId }
    } as RequestOptions)
  }

  getFolder<T = any>(folderId: string, options?: RequestOptions) {
    return this.client.get<T>(`/drive/folders/${folderId}`, options)
  }

  getBreadcrumbs<T = any>(folderId: string, options?: RequestOptions) {
    return this.client.get<T>(`/drive/folders/${folderId}/breadcrumbs`, options)
  }

  createFolder<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/drive/folders', body, options)
  }

  updateFolder<T = any>(folderId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/drive/folders/${folderId}`, body, options)
  }

  deleteFolder(folderId: string, options?: RequestOptions) {
    return this.client.delete(`/drive/folders/${folderId}`, options)
  }

  addFavorite<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/drive/favorites', body, options)
  }

  removeFavorite(entityType: string, entityId: string, options?: RequestOptions) {
    return this.client.delete(`/drive/favorites/${entityType}/${entityId}`, options)
  }

  listFavorites<T = any>(options?: RequestOptions) {
    return this.client.get<T>('/drive/favorites', options)
  }

  moveItems<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/drive/move', body, options)
  }

  createShortcut<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/drive/shortcuts', body, options)
  }

  moveShortcut<T = any>(shortcutId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/drive/shortcuts/${shortcutId}`, body, options)
  }

  deleteShortcut(shortcutId: string, options?: RequestOptions) {
    return this.client.delete(`/drive/shortcuts/${shortcutId}`, options)
  }

  trashItems<T = any>(body: { items: OfficeDriveEntityReference[] }, options?: RequestOptions) {
    return this.client.post<T>('/drive/trash', body, options)
  }

  restoreItems<T = any>(body: { items: OfficeDriveEntityReference[] }, options?: RequestOptions) {
    return this.client.post<T>('/drive/restore', body, options)
  }

  emptyTrash<T = any>(options?: RequestOptions) {
    return this.client.delete<T>('/drive/trash', options)
  }

  search<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/drive/search', body, options)
  }

  downloadFile(fileId: string, options?: RequestOptions) {
    return this.client.get<Blob>(`/drive/files/${fileId}/download`, {
      ...options,
      responseType: ResponseType.BLOB
    } as RequestOptions)
  }

  renameFile<T = any>(fileId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/drive/files/${fileId}`, body, options)
  }

  uploadFile<T = any>(body: FormData, options?: RequestOptions) {
    return this.client.post<T>('/drive/files/upload', body, options)
  }

  shareItem<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/sharing', body, options)
  }

  getSharedUsers<T = any>(entityType: string, entityId: string, options?: RequestOptions) {
    return this.client.get<T>(`/sharing/${entityType}/${entityId}`, options)
  }

  updateSharePermission<T = any>(shareId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/sharing/${shareId}`, body, options)
  }

  revokeShare(shareId: string, options?: RequestOptions) {
    return this.client.delete(`/sharing/${shareId}`, options)
  }

  createShareLink<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/sharing/links', body, options)
  }

  getShareLinks<T = any>(entityType: string, entityId: string, options?: RequestOptions) {
    return this.client.get<T>(`/sharing/links/${entityType}/${entityId}`, options)
  }

  deactivateShareLink(linkId: string, options?: RequestOptions) {
    return this.client.patch(`/sharing/links/${linkId}/deactivate`, undefined, options)
  }

  deleteShareLink(linkId: string, options?: RequestOptions) {
    return this.client.delete(`/sharing/links/${linkId}`, options)
  }
}
