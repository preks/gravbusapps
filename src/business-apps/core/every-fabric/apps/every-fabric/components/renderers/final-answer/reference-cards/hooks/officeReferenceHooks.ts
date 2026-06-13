import { NoteApiService } from '@/business-apps/platform/apps/note-apps/services/NoteApiService'
import { DocumentApiService } from '@/business-apps/core/office/apps/documents/services/DocumentApiService'
import { SlidesApiService } from '@/business-apps/platform/apps/slide-apps/services/SlidesApiService'
import {
  SpreadsheetApiService,
  setSpreadsheetApiAuthTokenProvider
} from '@/business-apps/core/office/apps/spreadsheets/services/SpreadsheetApiService'
import type { Note } from '@/business-apps/platform/apps/note-apps/types'
import type { Document } from '@/business-apps/core/office/apps/documents/types'
import type { Slide } from '@/business-apps/platform/apps/slide-apps/types'
import type { SpreadsheetApp } from '@/business-apps/core/office/apps/spreadsheets/types/spreadsheet'
import { useReferenceFetch, type ReferenceFetchState } from './useReferenceFetch'

/**
 * Every Office content lives in document-service and is reached through the
 * existing per-app REST services (no GraphQL). Each hook here is a thin by-id
 * read: it injects the agent's access token, then fetches the single record.
 *
 * We deliberately use the lighter service getters (`getNote`, `getDocument`,
 * `getSlide`, `getApp`) rather than the page-level list/editor hooks so a
 * reference card never triggers list state or full row hydration.
 */

export function useNoteReference(id: string, accessToken: string): ReferenceFetchState<Note> {
  return useReferenceFetch<Note>(async () => {
    NoteApiService.setAccessToken(accessToken)
    return NoteApiService.getNote(id)
  }, [id, accessToken])
}

export function useDocumentReference(id: string, accessToken: string): ReferenceFetchState<Document> {
  return useReferenceFetch<Document>(async () => {
    DocumentApiService.setAccessToken(accessToken)
    return DocumentApiService.getDocument(id, accessToken)
  }, [id, accessToken])
}

export function useSlideReference(id: string, accessToken: string): ReferenceFetchState<Slide> {
  return useReferenceFetch<Slide>(async () => {
    SlidesApiService.setAccessToken(accessToken)
    return SlidesApiService.getSlide(id)
  }, [id, accessToken])
}

export function useSpreadsheetReference(id: string, accessToken: string): ReferenceFetchState<SpreadsheetApp> {
  return useReferenceFetch<SpreadsheetApp>(async () => {
    // The spreadsheet service reads its token from a provider/localStorage
    // rather than a setter; point it at the agent token for this read.
    setSpreadsheetApiAuthTokenProvider(() => accessToken)
    return SpreadsheetApiService.getApp(id)
  }, [id, accessToken])
}
