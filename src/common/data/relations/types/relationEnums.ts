/**
 * Central Enums for Relations
 * Shared enums used across Customer and Investment modules
 */

import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// Re-export CommunicationChannel enums from common types
export { CommunicationChannelType, CommunicationChannelCode } from '@/common/data/common/types/commonTypes'

/**
 * Address Type Enum
 * Values that can be stored in the database
 */
export enum AddressType {
  UNKNOWN_ADDRESS = 'UNKNOWN_ADDRESS',
  PRIMARY_ADDRESS = 'PRIMARY_ADDRESS',
  SECONDARY_ADDRESS = 'SECONDARY_ADDRESS'
}

/**
 * Get human-readable, translatable label for Address Type
 */
export const getAddressTypeLabel = (value?: AddressType | string | null): string => {
  if (!value) return 'Unknown'

  const defaultLabels: Record<string, string> = {
    [AddressType.PRIMARY_ADDRESS]: 'Primary Address',
    [AddressType.SECONDARY_ADDRESS]: 'Secondary Address',
    [AddressType.UNKNOWN_ADDRESS]: 'Unknown Address'
  }

  const defaultLabel = defaultLabels[value] || value
  return getTranslationFromI18nKeyAndLabel(`relations.enums.addressType.${value}`, defaultLabel)
}

/**
 * Address Type Options for Select Components
 */
export const ADDRESS_TYPE_OPTIONS = [
  {
    value: AddressType.PRIMARY_ADDRESS,
    label: getAddressTypeLabel(AddressType.PRIMARY_ADDRESS)
  },
  {
    value: AddressType.SECONDARY_ADDRESS,
    label: getAddressTypeLabel(AddressType.SECONDARY_ADDRESS)
  }
] as const
