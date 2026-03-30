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
 * Content Groups - scalar enum stored directly on content_entry.content_group
 * Values match the CHECK constraint on nw_content.content_entry
 */
export enum ContentGroup {
  UNKNOWN = 'UNKNOWN_CONTENT_GROUP',
  NEWS = 'NEWS_CONTENT_GROUP',
  KNOWLEDGE = 'KNOWLEDGE_CONTENT_GROUP',
  GLOSSARY = 'GLOSSARY_CONTENT_GROUP',
  QUESTION = 'QUESTION_CONTENT_GROUP',
  DOCUMENT = 'DOCUMENT_CONTENT_GROUP',
  POLICY = 'POLICY_CONTENT_GROUP'
}
