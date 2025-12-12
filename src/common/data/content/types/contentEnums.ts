/**
 * Content Module Enums
 * Based on new DBML schema
 */

/**
 * Content Role - defines the purpose of a content entry
 * Keys are readable, values match database strings
 */
export enum ContentRole {
  UNKNOWN = 'UNKNOWN_CONTENT_ROLE',
  ROOT = 'ROOT_CONTENT_ROLE',
  COMMENT = 'COMMENT_CONTENT_ROLE'
}

/**
 * Content Groups - Core module groups
 * These are Catalog Entries with translations
 * Use getCatalogEntryValue() to get localized display names
 */
export enum ContentGroup {
  NEWS = 'ContentGroup:v1:NEWS',
  KNOWLEDGE = 'ContentGroup:v1:KNOWLEDGE',
  DOCUMENT = 'ContentGroup:v1:DOCUMENT',
  QUESTION = 'ContentGroup:v1:QUESTION',
  INTRANET = 'ContentGroup:v1:INTRANET',
  GLOSSARY = 'ContentGroup:v1:GLOSSARY'
}
