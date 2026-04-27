import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type ManagerTableColumnEntry = {
  readonly id: string
  readonly i18nKey: string
  readonly fallback: string
}

/**
 * Shared machinery for manager list tables: column ids, i18n headers, default visibility, and {@link getColumnHeader}.
 */
export function defineManagerTableColumns<const T extends readonly ManagerTableColumnEntry[]>(definitions: T) {
  type ColumnId = T[number]['id']
  type Entry = T[number]

  const headerById = Object.fromEntries(definitions.map(column => [column.id, column])) as Record<ColumnId, Entry>

  function getColumnHeader(id: ColumnId): string {
    const column = headerById[id]
    return getTranslationFromI18nKeyAndLabel(column.i18nKey, column.fallback)
  }

  const defaultVisibleColumnIds = definitions.map(column => column.id) as ColumnId[]

  return {
    columnDefinitions: definitions,
    defaultVisibleColumnIds,
    getColumnHeader
  }
}
