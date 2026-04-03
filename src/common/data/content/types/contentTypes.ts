export interface ContentType {
  id: string
  name?: string | null
  nameI18n?: Record<string, string> | null
  contentGroup?: string | null
  contentEntriesAggregate?: {
    aggregate?: {
      count?: number | null
    } | null
  } | null
  entryCount?: number
}

export interface ContentCategory {
  id: string
  name?: string | null
  nameI18n?: Record<string, string> | null
  contentEntryCategoriesAggregate?: {
    aggregate?: {
      count?: number | null
    } | null
  } | null
  entryCount?: number
}

export interface ContentTag {
  id: string
  name?: string | null
  nameI18n?: Record<string, string> | null
  contentEntryTagsAggregate?: {
    aggregate?: {
      count?: number | null
    } | null
  } | null
  entryCount?: number
}
