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

/**
 * Address Interface
 * Standardized address structure
 */
export interface Address {
  id: string
  addressType?: string
  addressLine?: string | { lines: string[] } | any
  locality?: string // Will replace "city"
  postalCode?: string
  region?: CatalogEntry
  country?: CatalogEntry
}

/**
 * Communication Channel Interface
 * Standardized communication channel structure
 */
export interface CommunicationChannel {
  id: string
  communicationChannel?: CatalogEntry & {
    type?: CommunicationChannelType | string // Catalog entry type field
  }
  value?: string
  valueExtension?: string
}
