import type { CrmNoteType } from '@/common/data/relations/types/noteTypes'

function normalizeNoteType(raw: string | null | undefined): CrmNoteType | null {
  if (raw == null) return null
  return raw as CrmNoteType
}

/**
 * Maps a raw CrmNote GraphQL row (nested or list) to normalized title/text/noteType.
 * Cycle-free utility for use from opportunity/account mappers and toCustomerNote.
 */
export function mapRawCrmNoteGraphQLRow(base: any): any {
  return {
    ...base,
    title: base.noteTitle || base.title,
    text: base.noteText || base.text,
    noteType: normalizeNoteType(base.noteType)
  }
}
