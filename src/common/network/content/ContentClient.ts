import type { ContentCategory, ContentTag, ContentType } from '@/common/data/content/types/contentTypes'
import { CONTENT_REACTION_IDENTIFIER, CONTENT_REACTION_VERSION } from '@/common/data/content/constants/contentCatalogs'
import { catalogManagerClient } from '@/common/network/catalogs/CatalogManagerClient'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import { CONTENT_API_URL } from '@/common/utils/serviceResolver'

export interface ContentCategoryPayload {
  id?: string
  version?: number
  name: string
  nameI18n?: Record<string, unknown>
}

export interface ContentTagPayload {
  id?: string
  version?: number
  name: string
  nameI18n?: Record<string, unknown>
}

export interface ContentTypePayload {
  id?: string
  version?: number
  name: string
  contentGroup: string
  nameI18n?: Record<string, unknown>
}

export interface ContentReactionPayload {
  id?: string
  code?: string
  alternativeCode?: string
  displayOrder?: number
  value?: string
  description?: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  type?: string
  objectValue?: CatalogEntry['objectValue']
  parentEntryId?: string
  translations?: CatalogEntry['translations']
  valueTranslations?: Record<string, unknown>
  additionalValue1Translations?: Record<string, unknown>
  additionalValue2Translations?: Record<string, unknown>
  additionalValue3Translations?: Record<string, unknown>
}

type ContentReactionCatalogEntryPayload = Omit<CatalogEntry, 'id' | 'type'>

function toContentReactionCatalogEntryPayload(
  contentReaction: ContentReactionPayload
): ContentReactionCatalogEntryPayload {
  const { code, translations, value, ...optionalFields } = contentReaction

  if (!code) {
    throw new Error('Failed to create content reaction: code is missing')
  }

  if (!value) {
    throw new Error('Failed to create content reaction: value is missing')
  }

  return {
    ...optionalFields,
    code,
    value,
    translations: translations ?? []
  }
}

function toPartialContentReactionCatalogEntryPayload(
  contentReaction: Partial<ContentReactionPayload>
): Partial<ContentReactionCatalogEntryPayload> {
  const { translations, ...optionalFields } = contentReaction

  if (translations == null) {
    return optionalFields
  }

  return {
    ...optionalFields,
    translations
  }
}

export class ContentClient extends RestClient {
  constructor() {
    super(CONTENT_API_URL, {})
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    this.headers.Authorization = setAccessTokenToAuthorizationHeader(accessToken)
    catalogManagerClient.setAccessToken(accessToken)
  }

  async createContentCategory(contentCategory: ContentCategoryPayload): Promise<ContentCategory> {
    return this.post<ContentCategory>('/createContentCategory', { contentCategory })
  }

  async updateContentCategory(contentCategory: ContentCategoryPayload): Promise<ContentCategory> {
    return this.post<ContentCategory>('/updateContentCategory', { contentCategory })
  }

  async deleteContentCategory(id: string, version: number): Promise<void> {
    await this.post('/deleteContentCategory', {
      contentCategory: { id, version }
    })
  }

  async createContentTag(contentTag: ContentTagPayload): Promise<ContentTag> {
    return this.post<ContentTag>('/createContentTag', { contentTag })
  }

  async updateContentTag(contentTag: ContentTagPayload): Promise<ContentTag> {
    return this.post<ContentTag>('/updateContentTag', { contentTag })
  }

  async deleteContentTag(id: string, version: number): Promise<void> {
    await this.post('/deleteContentTag', {
      contentTag: { id, version }
    })
  }

  async createContentType(contentType: ContentTypePayload): Promise<ContentType> {
    return this.post<ContentType>('/createContentType', { contentType })
  }

  async updateContentType(contentType: ContentTypePayload): Promise<ContentType> {
    return this.post<ContentType>('/updateContentType', { contentType })
  }

  async deleteContentType(id: string, version: number): Promise<void> {
    await this.post('/deleteContentType', {
      contentType: { id, version }
    })
  }

  async createContentReaction(contentReaction: ContentReactionPayload): Promise<CatalogEntry> {
    return catalogManagerClient.createCatalogEntry(
      CONTENT_REACTION_IDENTIFIER,
      CONTENT_REACTION_VERSION,
      toContentReactionCatalogEntryPayload(contentReaction)
    )
  }

  async updateContentReaction(id: string, contentReaction: Partial<ContentReactionPayload>): Promise<CatalogEntry> {
    return catalogManagerClient.updateCatalogEntry(
      CONTENT_REACTION_IDENTIFIER,
      CONTENT_REACTION_VERSION,
      id,
      toPartialContentReactionCatalogEntryPayload(contentReaction)
    )
  }

  async deleteContentReaction(id: string): Promise<void> {
    await catalogManagerClient.deleteCatalogEntry(CONTENT_REACTION_IDENTIFIER, CONTENT_REACTION_VERSION, id)
  }
}

export const contentClient = new ContentClient()
