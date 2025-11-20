/**
 * Content Module Enums
 * Based on new DBML schema
 */

/**
 * Content Role - defines the purpose of a content entry
 */
export enum ContentRole {
  ROOT = 'ROOT',
  COMMENT = 'COMMENT'
}

/**
 * Document Type - for content attachments
 */
export enum DocumentType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  ARCHIVE = 'ARCHIVE',
  OTHER = 'OTHER'
}

/**
 * Record State - standard states for content entries
 */
export enum RecordState {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}
