import { RestClient, type RequestOptions } from '../rest/RestClient'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import { DOCUMENT_API_URL } from '@/common/utils/serviceResolver'
import { OfficeBoardsClient } from './OfficeBoardsClient'
import { OfficeDriveClient } from './OfficeDriveClient'
import { OfficeEmailsClient } from './OfficeEmailsClient'
import { OfficeSpacesClient } from './OfficeSpacesClient'
import { OfficeDocumentsClient } from './OfficeDocumentsClient'
import { OfficeNotesClient } from './OfficeNotesClient'
import { OfficeSlidesClient } from './OfficeSlidesClient'
import { OfficeSpreadsheetsClient } from './OfficeSpreadsheetsClient'

function shouldRetryWithLegacyHttpMethod(error: unknown): boolean {
  return error instanceof Error && /REST request failed: (404|405|501) - /.test(error.message)
}

/**
 * Office client for the document-service API.
 * Direct methods: overview, chat sessions, sessions, artifacts, sharing, drawings.
 * Sub-clients: boards, drive, emails, spaces, documents, notes, slides, spreadsheets.
 */
export class OfficeClient extends RestClient {
  readonly boards: OfficeBoardsClient
  readonly drive: OfficeDriveClient
  readonly emails: OfficeEmailsClient
  readonly spaces: OfficeSpacesClient
  readonly documents: OfficeDocumentsClient
  readonly notes: OfficeNotesClient
  readonly slides: OfficeSlidesClient
  readonly spreadsheets: OfficeSpreadsheetsClient

  constructor() {
    super(DOCUMENT_API_URL, {})
    this.boards = new OfficeBoardsClient(this)
    this.drive = new OfficeDriveClient(this)
    this.emails = new OfficeEmailsClient(this)
    this.spaces = new OfficeSpacesClient(this)
    this.documents = new OfficeDocumentsClient(this)
    this.notes = new OfficeNotesClient(this)
    this.slides = new OfficeSlidesClient(this)
    this.spreadsheets = new OfficeSpreadsheetsClient(this)
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) this.headers = {}
    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  getBaseUrl(): string {
    return DOCUMENT_API_URL.endsWith('/') ? DOCUMENT_API_URL.slice(0, -1) : DOCUMENT_API_URL
  }

  // --- Overview ---
  getOverview<T = any>(params?: string, options?: RequestOptions) {
    return this.get<T>(`/desk/overview${params ? `?${params}` : ''}`, options)
  }

  // --- Chat sessions ---
  getChatSessions<T = any>(params?: string, options?: RequestOptions) {
    return this.get<T>(`/chat/sessions${params ? `?${params}` : ''}`, options)
  }
  getChatSession<T = any>(sessionId: string, options?: RequestOptions) {
    return this.get<T>(`/chat/sessions/${sessionId}`, options)
  }
  getChatSessionHistory<T = any>(sessionId: string, options?: RequestOptions) {
    return this.get<T>(`/chat/sessions/${sessionId}/history`, options)
  }
  createChatSession<T = any>(body: any, options?: RequestOptions) {
    return this.post<T>('/chat/sessions', body, options)
  }
  updateChatSession<T = any>(sessionId: string, body: any, options?: RequestOptions) {
    return this.patch<T>(`/chat/sessions/${sessionId}`, body, options)
  }
  deleteChatSession(sessionId: string, options?: RequestOptions) {
    return this.delete(`/chat/sessions/${sessionId}`, options)
  }

  // --- Sessions (editing/collaboration) ---
  getSessions<T = any>(options?: RequestOptions) {
    return this.get<T>('/nexus/sessions', options)
  }
  createSession<T = any>(body: any, options?: RequestOptions) {
    return this.post<T>('/nexus/sessions', body, options)
  }
  getSession<T = any>(sessionId: string, options?: RequestOptions) {
    return this.get<T>(`/nexus/sessions/${sessionId}`, options)
  }
  deleteSession(sessionId: string, options?: RequestOptions) {
    return this.delete(`/nexus/sessions/${sessionId}`, options)
  }

  // --- Artifacts ---
  saveArtifact(artifactId: string, body: any, options?: RequestOptions) {
    return this.put(`/nexus/artifacts/${artifactId}/save`, body, options)
  }
  getArtifact<T = any>(artifactId: string, options?: RequestOptions) {
    return this.get<T>(`/nexus/artifacts/${artifactId}`, options)
  }
  updateArtifact<T = any>(artifactId: string, body: any, options?: RequestOptions) {
    return this.put<T>(`/nexus/artifacts/${artifactId}`, body, options)
  }

  // --- Sharing ---
  createShare<T = any>(body: any, options?: RequestOptions) {
    return this.post<T>('/sharing', body, options)
  }
  getSharingForEntity<T = any>(entityType: string, entityId: string, options?: RequestOptions) {
    return this.get<T>(`/sharing/${entityType}/${entityId}`, options)
  }
  getSharingForDocument<T = any>(documentId: string, options?: RequestOptions) {
    return this.get<T>(`/sharing/document/${documentId}`, options)
  }
  getSharingForSlide<T = any>(slideId: string, options?: RequestOptions) {
    return this.get<T>(`/sharing/slide/${slideId}`, options)
  }
  getSharingForBoard<T = any>(boardId: string, options?: RequestOptions) {
    return this.get<T>(`/sharing/spreadsheet_app/${boardId}`, options)
  }
  getSharingForNote<T = any>(noteId: string, options?: RequestOptions) {
    return this.get<T>(`/sharing/note/${noteId}`, options)
  }
  getSharingForSpreadsheet<T = any>(appId: string, options?: RequestOptions) {
    return this.get<T>(`/sharing/spreadsheet_app/${appId}`, options)
  }
  createSharingLink<T = any>(body: any, options?: RequestOptions) {
    return this.post<T>('/sharing/links', body, options)
  }
  getSharingLinks<T = any>(entityType: string, entityId: string, options?: RequestOptions) {
    return this.get<T>(`/sharing/links/${entityType}/${entityId}`, options)
  }
  getSharingLinksForNote<T = any>(noteId: string, options?: RequestOptions) {
    return this.getSharingLinks<T>('note', noteId, options)
  }
  deleteSharingLink(linkId: string, options?: RequestOptions) {
    return this.delete(`/sharing/links/${linkId}`, options)
  }
  updateShare<T = any>(shareId: string, body: any, options?: RequestOptions) {
    return this.patch<T>(`/sharing/${shareId}`, body, options)
  }
  deleteShare(shareId: string, options?: RequestOptions) {
    return this.delete(`/sharing/${shareId}`, options)
  }
  async deactivateSharingLink(linkId: string, options?: RequestOptions) {
    try {
      return await this.patch(`/sharing/links/${linkId}/deactivate`, undefined, options)
    } catch (error) {
      if (!shouldRetryWithLegacyHttpMethod(error)) {
        throw error
      }
      return this.post(`/sharing/links/${linkId}/deactivate`, undefined, options)
    }
  }

  // --- Drawings ---
  listDrawings<T = any>(params?: string, options?: RequestOptions) {
    return this.get<T>(`/drawings${params ? `?${params}` : ''}`, options)
  }
  getDrawingsByEntity<T = any>(entityType: string, entityId: string, options?: RequestOptions) {
    return this.get<T>(`/drawings`, { ...options, params: { ...options?.params, entityType, entityId } as any })
  }
  getDrawing<T = any>(drawingId: string, options?: RequestOptions) {
    return this.get<T>(`/drawings/${drawingId}`, options)
  }
  createDrawing<T = any>(body: any, options?: RequestOptions) {
    return this.post<T>('/drawings', body, options)
  }
  updateDrawing<T = any>(drawingId: string, body: any, options?: RequestOptions) {
    return this.put<T>(`/drawings/${drawingId}`, body, options)
  }
  deleteDrawing(drawingId: string, options?: RequestOptions) {
    return this.delete(`/drawings/${drawingId}`, options)
  }
  getDrawingOcr<T = any>(drawingId: string, options?: RequestOptions) {
    return this.get<T>(`/drawings/${drawingId}/ocr`, options)
  }
  triggerDrawingOcr<T = any>(drawingId: string, options?: RequestOptions) {
    return this.post<T>(`/drawings/${drawingId}/ocr`, undefined, options)
  }
  searchDrawings<T = any>(query: string, options?: RequestOptions) {
    return this.get<T>(`/drawings/search`, { ...options, params: { ...options?.params, q: query } } as any)
  }
}

// TODO(client-streamlining): Migrate direct consumers to `useOfficeClient(...)`
// before restricting this compatibility singleton export.
export const officeClient = new OfficeClient()
