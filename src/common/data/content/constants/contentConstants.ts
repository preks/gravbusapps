import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type { ContentType, ContentCategory, ContentTag } from '../types/contentTypes'

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum ContentRole {
  UNKNOWN = 'UNKNOWN_CONTENT_ROLE',
  ROOT = 'ROOT_CONTENT_ROLE',
  COMMENT = 'COMMENT_CONTENT_ROLE'
}

export enum ContentGroup {
  UNKNOWN = 'UNKNOWN_CONTENT_GROUP',
  NEWS = 'NEWS_CONTENT_GROUP',
  KNOWLEDGE = 'KNOWLEDGE_CONTENT_GROUP',
  GLOSSARY = 'GLOSSARY_CONTENT_GROUP',
  QUESTION = 'QUESTION_CONTENT_GROUP',
  DOCUMENT = 'DOCUMENT_CONTENT_GROUP',
  POLICY = 'POLICY_CONTENT_GROUP'
}

// ─── Content Group Constants ──────────────────────────────────────────────────

/** English fallback labels for non-component contexts (e.g. table configs). */
export const CONTENT_GROUP_LABEL: Record<ContentGroup, string> = {
  [ContentGroup.UNKNOWN]: 'Unknown',
  [ContentGroup.NEWS]: 'News',
  [ContentGroup.KNOWLEDGE]: 'Knowledge',
  [ContentGroup.GLOSSARY]: 'Glossary',
  [ContentGroup.QUESTION]: 'Question',
  [ContentGroup.DOCUMENT]: 'Document',
  [ContentGroup.POLICY]: 'Policy'
}

/** FTL translation keys for ContentGroup labels. Defined in src/business-apps/core/content/_i18n/*.ftl. */
export const CONTENT_GROUP_KEY: Record<ContentGroup, string> = {
  [ContentGroup.UNKNOWN]: 'content-group-unknown',
  [ContentGroup.NEWS]: 'content-group-news',
  [ContentGroup.KNOWLEDGE]: 'content-group-knowledge',
  [ContentGroup.GLOSSARY]: 'content-group-glossary',
  [ContentGroup.QUESTION]: 'content-group-question',
  [ContentGroup.DOCUMENT]: 'content-group-document',
  [ContentGroup.POLICY]: 'content-group-policy'
}

/** Ordered ContentGroup values for building translated select options inside components. */
export const CONTENT_GROUP_VALUES: ContentGroup[] = [
  ContentGroup.NEWS,
  ContentGroup.KNOWLEDGE,
  ContentGroup.GLOSSARY,
  ContentGroup.QUESTION,
  ContentGroup.DOCUMENT,
  ContentGroup.POLICY
]

// ─── Taxonomy Name Resolvers ──────────────────────────────────────────────────

type LocalizedEntity = { name?: string | null; nameI18n?: Record<string, string> | null }

function resolveLocalizedName(entity: LocalizedEntity | null | undefined): string {
  if (!entity) return ''
  if (entity.nameI18n) {
    const locale = getCurrentActiveUserLocale()
    const localized = entity.nameI18n[locale]
    if (localized) return localized
  }
  return entity.name ?? ''
}

/** Resolves the localized display name for a ContentType entity. */
export function resolveContentTypeName(contentType: ContentType | null | undefined): string {
  return resolveLocalizedName(contentType)
}

/** Resolves the localized display name for a ContentCategory entity. */
export function resolveContentCategoryName(contentCategory: ContentCategory | null | undefined): string {
  return resolveLocalizedName(contentCategory)
}

/** Resolves the localized display name for a ContentTag entity. */
export function resolveContentTagName(contentTag: ContentTag | null | undefined): string {
  return resolveLocalizedName(contentTag)
}
