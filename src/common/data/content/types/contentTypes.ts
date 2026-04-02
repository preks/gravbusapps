export interface ContentType {
  id: string
  name?: string | null
  nameI18n?: Record<string, string> | null
  contentGroup?: string | null
}

export interface ContentCategory {
  id: string
  name?: string | null
  nameI18n?: Record<string, string> | null
}

export interface ContentTag {
  id: string
  name?: string | null
  nameI18n?: Record<string, string> | null
}
