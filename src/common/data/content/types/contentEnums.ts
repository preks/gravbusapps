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
