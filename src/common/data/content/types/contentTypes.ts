export interface ContentType {
  id: string
  version?: number | null
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
  version?: number | null
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
  version?: number | null
  name?: string | null
  nameI18n?: Record<string, string> | null
  contentEntryTagsAggregate?: {
    aggregate?: {
      count?: number | null
    } | null
  } | null
  entryCount?: number
}
