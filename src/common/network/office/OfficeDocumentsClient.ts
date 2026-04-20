import type { RestClient } from '../rest/RestClient'
import { ResponseType, type RequestOptions } from '../rest/RestClient'

function shouldRetryWithLegacyPost(error: unknown): boolean {
  return error instanceof Error && /REST request failed: (404|405|501) - /.test(error.message)
}

export class OfficeDocumentsClient {
  constructor(private readonly client: RestClient) {}

  list<T = any>(params?: string, options?: RequestOptions) {
    return this.client.get<T>(`/documents${params ? `?${params}` : ''}`, options)
  }
  get<T = any>(id: string, options?: RequestOptions) {
    return this.client.get<T>(`/documents/${id}`, options)
  }
  getTrashedPreview<T = any>(id: string, options?: RequestOptions) {
    return this.client.get<T>(`/documents/${id}/trashed-preview`, options)
  }
  getDocumentFile(documentId: string, options?: RequestOptions) {
    return this.client.get<Blob>(`/documents/${documentId}/file`, {
      ...options,
      responseType: ResponseType.BLOB
    })
  }
  create<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/documents', body, options)
  }
  update<T = any>(id: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/documents/${id}`, body, options)
  }
  submitForApproval<T = any>(id: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/documents/${id}/submit-for-approval`, body, options)
  }
  getReviewContext<T = any>(id: string, version: number, options?: RequestOptions) {
    return this.client.get<T>(`/documents/${id}/review`, {
      ...options,
      params: { ...options?.params, version }
    } as any)
  }
  delete(id: string, options?: RequestOptions) {
    return this.client.delete(`/documents/${id}`, options)
  }
  duplicate<T = any>(id: string, options?: RequestOptions) {
    return this.client.post<T>(`/documents/${id}/duplicate`, undefined, options)
  }
  updateStatus<T = any>(id: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/documents/${id}/status`, body, options)
  }
  importPdf(body: FormData, options?: RequestOptions) {
    return this.client.post('/documents/import/pdf', body, options)
  }
  publish<T = any>(documentId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/documents/${documentId}/publish`, body, options)
  }
  unpublish(documentId: string, options?: RequestOptions) {
    return this.client.post(`/documents/${documentId}/unpublish`, undefined, options)
  }
  /** LLM routing (e.g. Azure OpenAI) is configured on document-service, not in this client. */
  aiEdit<T = any>(documentId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/documents/${documentId}/ai/edit`, body, options)
  }

  listTemplates<T = any>(params?: string, options?: RequestOptions) {
    return this.client.get<T>(`/templates${params ? `?${params}` : ''}`, options)
  }
  getTemplate<T = any>(id: string, options?: RequestOptions) {
    return this.client.get<T>(`/templates/${id}`, options)
  }
  getTemplateEntityFields<T = any>(entityKey: string, options?: RequestOptions) {
    return this.client.get<T>(`/templates/entities/${encodeURIComponent(entityKey)}/fields`, options)
  }
  createTemplate<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/templates', body, options)
  }
  updateTemplate<T = any>(id: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/templates/${id}`, body, options)
  }
  deleteTemplate(id: string, options?: RequestOptions) {
    return this.client.delete(`/templates/${id}`, options)
  }
  executeTemplateDynamic<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/templates/execute-dynamic', body, options)
  }

  getFlow<T = any>(workflowId: string, options?: RequestOptions) {
    return this.client.get<T>(`/flows/${workflowId}`, options)
  }
  updateFlow<T = any>(workflowId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/flows/${workflowId}`, body, options)
  }
  cancelFlow<T = any>(workflowId: string, options?: RequestOptions) {
    return this.client.post<T>(`/flows/${workflowId}/cancel`, undefined, options)
  }

  createApproval<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/approvals', body, options)
  }
  getApprovalRequest<T = any>(approvalId: string, options?: RequestOptions) {
    return this.client.get<T>(`/approvals/${approvalId}`, options)
  }
  getApprovalsForDocument<T = any>(documentId: string, options?: RequestOptions) {
    return this.client.get<T>(`/approvals/entity/document/${documentId}`, options)
  }
  listApprovalRequests<T = any>(params?: string, options?: RequestOptions) {
    return this.client.get<T>(`/approvals${params ? `?${params}` : ''}`, options)
  }
  respondToApproval<T = any>(approvalId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/approvals/${approvalId}/respond`, body, options)
  }
  syncApproval<T = any>(approvalId: string, options?: RequestOptions) {
    return this.client.post<T>(`/approvals/${approvalId}/sync`, undefined, options)
  }
  deleteApproval(approvalId: string, options?: RequestOptions) {
    return this.client.delete(`/approvals/${approvalId}`, options)
  }

  createVersion<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/versions', body, options)
  }
  getVersions<T = any>(body: any, options?: RequestOptions) {
    return this.createVersion<T>(body, options)
  }
  getDocumentVersions<T = any>(documentId: string, page?: number, limit?: number, options?: RequestOptions) {
    return this.client.get<T>(`/versions/document/${documentId}`, {
      ...options,
      params: { ...options?.params, page, limit }
    } as any)
  }
  getDocumentVersion<T = any>(documentId: string, versionNumber: number, options?: RequestOptions) {
    return this.client.get<T>(`/versions/document/${documentId}/${versionNumber}`, options)
  }
  compareDocumentVersions<T = any>(documentId: string, versionA: number, versionB: number, options?: RequestOptions) {
    return this.client.get<T>(`/versions/document/${documentId}/compare`, {
      ...options,
      params: { ...options?.params, versionA, versionB }
    } as any)
  }
  restoreDocumentVersion<T = any>(documentId: string, versionNumber: number, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/versions/document/${documentId}/${versionNumber}`, body, options)
  }
  deleteVersion(documentId: string, versionNumber: number, options?: RequestOptions) {
    return this.client.delete(`/versions/document/${documentId}/${versionNumber}`, options)
  }

  createComment<T = any>(documentId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/comments/document/${documentId}`, body, options)
  }
  getComments<T = any>(documentId: string, params?: string, options?: RequestOptions) {
    return this.client.get<T>(`/comments/document/${documentId}${params ? `?${params}` : ''}`, options)
  }
  updateComment<T = any>(commentId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/comments/${commentId}`, body, options)
  }
  deleteComment(commentId: string, options?: RequestOptions) {
    return this.client.delete(`/comments/${commentId}`, options)
  }
  async resolveComment(commentId: string, options?: RequestOptions) {
    try {
      return await this.client.patch(`/comments/${commentId}/resolve`, undefined, options)
    } catch (error) {
      if (!shouldRetryWithLegacyPost(error)) {
        throw error
      }
      return this.client.post(`/comments/${commentId}/resolve`, undefined, options)
    }
  }
  replyToComment<T = any>(commentId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/comments/${commentId}/reply`, body, options)
  }

  acquireLock<T = any>(documentId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/locks/document/${documentId}`, body, options)
  }
  releaseLock(documentId: string, options?: RequestOptions) {
    return this.client.delete(`/locks/document/${documentId}`, options)
  }
  getLock<T = any>(documentId: string, options?: RequestOptions) {
    return this.client.get<T>(`/locks/document/${documentId}`, options)
  }
  forceReleaseLock(documentId: string, options?: RequestOptions) {
    return this.client.delete(`/locks/document/${documentId}/force`, options)
  }

  listExternalSourceConnectors<T = any>(options?: RequestOptions) {
    return this.client.get<T>('/documents/external-sources/connectors', options)
  }
  previewExternalSources<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/documents/external-sources/preview', body, options)
  }
  startExternalSourceSync<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/documents/external-sources/start-sync', body, options)
  }
  getExternalSourceRunStatus<T = any>(runId: string, options?: RequestOptions) {
    return this.client.get<T>(`/documents/external-sources/runs/${runId}`, options)
  }
  cancelExternalSourceRun(runId: string, options?: RequestOptions) {
    return this.client.post(`/documents/external-sources/runs/${runId}/cancel`, undefined, options)
  }
  listExternalSourceRuns<T = any>(options?: RequestOptions) {
    return this.client.get<T>('/documents/external-sources/runs', options)
  }

  listSignatures<T = any>(options?: RequestOptions) {
    return this.client.get<T>('/signatures', options)
  }
  getSignature<T = any>(id: string, options?: RequestOptions) {
    return this.client.get<T>(`/signatures/${id}`, options)
  }
  createSignature<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/signatures', body, options)
  }
  updateSignature<T = any>(id: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/signatures/${id}`, body, options)
  }
  deleteSignature(id: string, options?: RequestOptions) {
    return this.client.delete(`/signatures/${id}`, options)
  }
  setDefaultSignature<T = any>(id: string, options?: RequestOptions) {
    return this.client.post<T>(`/signatures/${id}/default`, undefined, options)
  }
}
