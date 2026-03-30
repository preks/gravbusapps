/**
 * Entity types for ContentType, ContentCategory, and ContentTag.
 * These were previously backed by the catalog service; they now have their
 * own tables in nw_content with UUID primary keys.
 */

export interface ContentType {
  id: string
  name?: string | null
  contentGroup?: string | null
}

export interface ContentCategory {
  id: string
  name?: string | null
}

export interface ContentTag {
  id: string
  name?: string | null
}
