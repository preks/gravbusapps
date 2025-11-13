/**
 * Common Types for Relations
 * Shared interfaces used across Customer and Investment modules
 */

import type { CatalogEntry } from '@/common/network/graphql/commonTypes'

/**
 * Communication Channel Types
 * These correspond to the 'type' field in CommunicationChannel catalog entries
 */
export enum CommunicationChannelType {
  TEL = 'tel',
  URL = 'url',
  TEXT = 'text',
  EMAIL = 'email'
}

export enum CommunicationChannelCode {
  EMAIL = 'e-mail',
  FACEBOOK = 'Facebook',
  FAX = 'Fax',
  INSTAGRAM = 'Instagram',
  LINKEDIN = 'LinkedIn',
  MESSENGER = 'Messenger',
  MOBILE = 'Mobile',
  PAGER = 'Pager',
  PHONE = 'Phone',
  Slack = 'Slack',
  WEBSITE = 'WEBSITE',
  X = 'X',
  XING = 'Xing',
  YOUTUBE = 'Youtube'
}

/**
 * Address Interface
 * Standardized address structure
 */
export interface Address {
  id: string
  source?: string
  addressType?: string
  addressLine?: string | { lines: string[] } | any
  locality?: string // Will replace "city"
  postalCode?: string
  region?: CatalogEntry
  regionRef?: string
  country?: CatalogEntry
  countryRef?: string
}

/**
 * Communication Channel Interface
 * Standardized communication channel structure
 */
export interface CommunicationChannel {
  id: string
  source?: string
  communicationChannel?: CatalogEntry & {
    type?: CommunicationChannelType | string // Catalog entry type field
  }
  communicationChannelRef?: string
  value?: string
  valueExtension?: string
}
