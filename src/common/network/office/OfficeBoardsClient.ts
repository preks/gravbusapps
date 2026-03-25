import type { RestClient } from '../rest/RestClient'
import type { RequestOptions } from '../rest/RestClient'

export class OfficeBoardsClient {
  constructor(private readonly client: RestClient) {}

  list<T = any>(params?: Record<string, string | number>, options?: RequestOptions) {
    return this.client.get<T>('/boards', { ...options, params: { ...options?.params, ...params } } as any)
  }
  getStats<T = any>(options?: RequestOptions) {
    return this.client.get<T>('/boards/stats', options)
  }
  getMyWork<T = any>(params?: string, options?: RequestOptions) {
    return this.client.get<T>(`/boards/my-work${params ? `?${params}` : ''}`, options)
  }
  get<T = any>(boardId: string, options?: RequestOptions) {
    return this.client.get<T>(`/boards/${boardId}`, options)
  }
  create<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/boards', body, options)
  }
  update<T = any>(boardId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/boards/${boardId}`, body, options)
  }
  delete(boardId: string, options?: RequestOptions) {
    return this.client.delete(`/boards/${boardId}`, options)
  }
  duplicate<T = any>(boardId: string, options?: RequestOptions) {
    return this.client.post<T>(`/boards/${boardId}/duplicate`, undefined, options)
  }
  getSheetRows<T = any>(boardId: string, sheetId: string, params?: string, options?: RequestOptions) {
    return this.client.get<T>(`/boards/${boardId}/sheets/${sheetId}/rows${params ? `?${params}` : ''}`, options)
  }
  createSheetRow<T = any>(boardId: string, sheetId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/boards/${boardId}/sheets/${sheetId}/rows`, body, options)
  }
  getSheetRow<T = any>(boardId: string, sheetId: string, rowId: string, options?: RequestOptions) {
    return this.client.get<T>(`/boards/${boardId}/sheets/${sheetId}/rows/${rowId}`, options)
  }
  updateSheetRow<T = any>(boardId: string, sheetId: string, rowId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/boards/${boardId}/sheets/${sheetId}/rows/${rowId}`, body, options)
  }
  deleteSheetRow(boardId: string, sheetId: string, rowId: string, options?: RequestOptions) {
    return this.client.delete(`/boards/${boardId}/sheets/${sheetId}/rows/${rowId}`, options)
  }
  reorderSheetRows<T = any>(boardId: string, sheetId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/boards/${boardId}/sheets/${sheetId}/rows/reorder`, body, options)
  }
  locateSheetRow<T = any>(boardId: string, sheetId: string, rowId: string, options?: RequestOptions) {
    return this.client.get<T>(`/boards/${boardId}/sheets/${sheetId}/rows/${rowId}/locate`, options)
  }
  getSheetRowPage<T = any>(boardId: string, sheetId: string, rowId: string, options?: RequestOptions) {
    return this.client.get<T>(`/boards/${boardId}/sheets/${sheetId}/rows/${rowId}/page`, options)
  }
  createSheetRowPage<T = any>(boardId: string, sheetId: string, rowId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/boards/${boardId}/sheets/${sheetId}/rows/${rowId}/page`, body, options)
  }
  updateSheetRowPage<T = any>(boardId: string, sheetId: string, rowId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/boards/${boardId}/sheets/${sheetId}/rows/${rowId}/page`, body, options)
  }
  getSheet<T = any>(boardId: string, sheetId: string, options?: RequestOptions) {
    return this.client.get<T>(`/boards/${boardId}/sheets/${sheetId}`, options)
  }
  updateSheet<T = any>(boardId: string, sheetId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/boards/${boardId}/sheets/${sheetId}`, body, options)
  }
  search<T = any>(boardId: string, params: string, options?: RequestOptions) {
    return this.client.get<T>(`/boards/${boardId}/search?${params}`, options)
  }
  importSheet<T = any>(boardId: string, sheetId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/boards/${boardId}/sheets/${sheetId}/import`, body, options)
  }
  exportSheet(boardId: string, sheetId: string, params?: string, options?: RequestOptions) {
    return this.client.get(`/boards/${boardId}/sheets/${sheetId}/export${params ? `?${params}` : ''}`, options)
  }
  getSheetColumnTags<T = any>(
    boardId: string,
    sheetId: string,
    columnName: string,
    params?: string,
    options?: RequestOptions
  ) {
    return this.client.get<T>(
      `/boards/${boardId}/sheets/${sheetId}/columns/${encodeURIComponent(columnName)}/tags${params ? `?${params}` : ''}`,
      options
    )
  }
  queryAnalytics<T = any>(boardId: string, sheetId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/boards/${boardId}/sheets/${sheetId}/analytics/query`, body, options)
  }
  listExternalSourceConnectors<T = any>(boardId: string, sheetId: string, options?: RequestOptions) {
    return this.client.get<T>(`/boards/${boardId}/sheets/${sheetId}/external-sources/connectors`, options)
  }
  previewExternalSource<T = any>(boardId: string, sheetId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/boards/${boardId}/sheets/${sheetId}/external-sources/preview`, body, options)
  }
  startExternalSourceSync<T = any>(boardId: string, sheetId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/boards/${boardId}/sheets/${sheetId}/external-sources/start-sync`, body, options)
  }
  getExternalSourceRun<T = any>(boardId: string, sheetId: string, runId: string, options?: RequestOptions) {
    return this.client.get<T>(`/boards/${boardId}/sheets/${sheetId}/external-sources/runs/${runId}`, options)
  }
  cancelExternalSourceRun<T = any>(boardId: string, sheetId: string, runId: string, options?: RequestOptions) {
    return this.client.post<T>(
      `/boards/${boardId}/sheets/${sheetId}/external-sources/runs/${runId}/cancel`,
      undefined,
      options
    )
  }
  syncSheetFromEntity<T = any>(boardId: string, sheetId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/boards/${boardId}/sheets/${sheetId}/sync-from-entity`, body, options)
  }
}
