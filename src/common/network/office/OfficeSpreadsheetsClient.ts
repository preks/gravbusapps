import type { RestClient } from '../rest/RestClient'
import type { RequestOptions } from '../rest/RestClient'
import { getSpreadsheetApiBasePath } from '@/business-apps/platform/apps/shared/utils/spreadsheetServiceUrl'

const spreadsheetPath = (suffix = ''): string => `${getSpreadsheetApiBasePath()}${suffix}`

export class OfficeSpreadsheetsClient {
  constructor(private readonly client: RestClient) {}

  list<T = any>(params?: string, options?: RequestOptions) {
    return this.client.get<T>(spreadsheetPath(params ? `?${params}` : ''), options)
  }
  get<T = any>(id: string, options?: RequestOptions) {
    return this.client.get<T>(spreadsheetPath(`/${id}`), options)
  }
  create<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>(spreadsheetPath(), body, options)
  }
  update<T = any>(id: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(spreadsheetPath(`/${id}`), body, options)
  }
  delete(id: string, options?: RequestOptions) {
    return this.client.delete(spreadsheetPath(`/${id}`), options)
  }
  duplicate<T = any>(id: string, options?: RequestOptions) {
    return this.client.post<T>(spreadsheetPath(`/${id}/duplicate`), undefined, options)
  }
  getSheet<T = any>(appId: string, sheetId: string, options?: RequestOptions) {
    return this.client.get<T>(spreadsheetPath(`/${appId}/sheets/${sheetId}`), options)
  }
  createSheet<T = any>(appId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(spreadsheetPath(`/${appId}/sheets`), body, options)
  }
  updateSheet<T = any>(appId: string, sheetId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(spreadsheetPath(`/${appId}/sheets/${sheetId}`), body, options)
  }
  deleteSheet(appId: string, sheetId: string, options?: RequestOptions) {
    return this.client.delete(spreadsheetPath(`/${appId}/sheets/${sheetId}`), options)
  }
  getSheetRows<T = any>(appId: string, sheetId: string, params?: string, options?: RequestOptions) {
    return this.client.get<T>(spreadsheetPath(`/${appId}/sheets/${sheetId}/rows${params ? `?${params}` : ''}`), options)
  }
  createSheetRow<T = any>(appId: string, sheetId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(spreadsheetPath(`/${appId}/sheets/${sheetId}/rows`), body, options)
  }
  getSheetRow<T = any>(appId: string, sheetId: string, rowId: string, options?: RequestOptions) {
    return this.client.get<T>(spreadsheetPath(`/${appId}/sheets/${sheetId}/rows/${rowId}`), options)
  }
  updateSheetRow<T = any>(appId: string, sheetId: string, rowId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(spreadsheetPath(`/${appId}/sheets/${sheetId}/rows/${rowId}`), body, options)
  }
  deleteSheetRow(appId: string, sheetId: string, rowId: string, options?: RequestOptions) {
    return this.client.delete(spreadsheetPath(`/${appId}/sheets/${sheetId}/rows/${rowId}`), options)
  }
  reorderSheetRows<T = any>(appId: string, sheetId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(spreadsheetPath(`/${appId}/sheets/${sheetId}/rows/reorder`), body, options)
  }
  bulkUpdateSheetRows<T = any>(appId: string, sheetId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(spreadsheetPath(`/${appId}/sheets/${sheetId}/rows/bulk`), body, options)
  }
  restore<T = any>(appId: string, versionNumber: number, options?: RequestOptions) {
    return this.client.post<T>(spreadsheetPath(`/${appId}/restore/${versionNumber}`), undefined, options)
  }
  publish<T = any>(appId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(spreadsheetPath(`/${appId}/publish`), body, options)
  }
  unpublish(appId: string, options?: RequestOptions) {
    return this.client.post(spreadsheetPath(`/${appId}/unpublish`), undefined, options)
  }
  getPublishStatus<T = any>(appId: string, options?: RequestOptions) {
    return this.client.get<T>(spreadsheetPath(`/${appId}/publish-status`), options)
  }
  updatePublishStatus<T = any>(appId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(spreadsheetPath(`/${appId}/publish-status`), body, options)
  }
  updateStatus<T = any>(appId: string, body: any, options?: RequestOptions) {
    return this.updatePublishStatus<T>(appId, body, options)
  }
  createVersion<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/versions', body, options)
  }
  getVersions<T = any>(appId: string, page?: number, limit?: number, options?: RequestOptions) {
    return this.client.get<T>(`/versions/spreadsheet_app/${appId}`, {
      ...options,
      params: { ...options?.params, page, limit }
    } as any)
  }
  compareVersions<T = any>(appId: string, versionA: number, versionB: number, options?: RequestOptions) {
    return this.client.get<T>(`/versions/spreadsheet_app/${appId}/compare`, {
      ...options,
      params: { ...options?.params, versionA, versionB }
    } as any)
  }
  getVersion<T = any>(appId: string, versionNumber: number, options?: RequestOptions) {
    return this.client.get<T>(`/versions/spreadsheet_app/${appId}/${versionNumber}`, options)
  }
  restoreVersion<T = any>(appId: string, versionNumber: number, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/versions/spreadsheet_app/${appId}/${versionNumber}`, body, options)
  }
  deleteVersion(appId: string, versionNumber: number, options?: RequestOptions) {
    return this.client.delete(`/versions/spreadsheet_app/${appId}/${versionNumber}`, options)
  }
  createComment<T = any>(appId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/comments/spreadsheet_app/${appId}`, body, options)
  }
  getComments<T = any>(appId: string, params?: string, options?: RequestOptions) {
    return this.client.get<T>(`/comments/spreadsheet_app/${appId}${params ? `?${params}` : ''}`, options)
  }
  updateComment<T = any>(commentId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/comments/${commentId}`, body, options)
  }
  resolveComment<T = any>(commentId: string, options?: RequestOptions) {
    return this.client.patch<T>(`/comments/${commentId}/resolve`, undefined, options)
  }
  unresolveComment<T = any>(commentId: string, options?: RequestOptions) {
    return this.client.patch<T>(`/comments/${commentId}/unresolve`, undefined, options)
  }
  deleteComment(commentId: string, options?: RequestOptions) {
    return this.client.delete(`/comments/${commentId}`, options)
  }
  replyToComment<T = any>(commentId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/comments/${commentId}/reply`, body, options)
  }
  acquireLock<T = any>(appId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/locks/spreadsheet_app/${appId}`, body, options)
  }
  releaseLock(appId: string, options?: RequestOptions) {
    return this.client.delete(`/locks/spreadsheet_app/${appId}`, options)
  }
  getLock<T = any>(appId: string, options?: RequestOptions) {
    return this.client.get<T>(`/locks/spreadsheet_app/${appId}`, options)
  }
  forceReleaseLock(appId: string, options?: RequestOptions) {
    return this.client.delete(`/locks/spreadsheet_app/${appId}/force`, options)
  }
  analyzeExcelFile(body: FormData, options?: RequestOptions) {
    return this.client.post('/files/analyze/excel', body, options)
  }
  getAutomationsForApp<T = any>(appId: string, options?: RequestOptions) {
    return this.client.get<T>(`/automations/app/${appId}`, options)
  }
  createAutomation<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/automations', body, options)
  }
  runAutomation<T = any>(automationId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/automations/${automationId}/run`, body, options)
  }
  listAutomationRuns<T = any>(automationId: string, options?: RequestOptions) {
    return this.client.get<T>(`/automations/${automationId}/runs`, options)
  }
  aggregateBulkResponses<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/automations/webhooks/spreadsheet/aggregate-bulk', body, options)
  }
  markAutomationRunSubmissionComplete<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/automations/runs/submissions/complete', body, options)
  }
}
