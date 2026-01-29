/**
 * Communication Channel Transformation Utilities
 * Transforms flat email/phone/social fields into communicationChannels array structure
 */

import { CommunicationChannelCode } from '@/common/data/common/types/commonTypes'
import { ConvertedEntity, CommunicationChannel } from '@/common/components/common-relations/apps/data-import/types'

const COMMUNICATION_CHANNEL = 'CommunicationChannel'

/**
 * Communication channel field mapping
 * Maps flat field names to their catalog codes
 */
const CHANNEL_FIELD_MAP: Record<string, string> = {
  email: CommunicationChannelCode.EMAIL,
  phoneNumber: CommunicationChannelCode.PHONE,
  mobileNumber: CommunicationChannelCode.MOBILE,
  faxNumber: CommunicationChannelCode.FAX,
  linkedInUrl: CommunicationChannelCode.LINKEDIN,
  xingUrl: CommunicationChannelCode.XING,
  facebookUrl: CommunicationChannelCode.FACEBOOK,
  instagramUrl: CommunicationChannelCode.INSTAGRAM,
  messengerUrl: CommunicationChannelCode.MESSENGER,
  websiteUrl: CommunicationChannelCode.WEBSITE,
  xUrl: CommunicationChannelCode.X,
  youtubeUrl: CommunicationChannelCode.YOUTUBE,
  slackUrl: CommunicationChannelCode.Slack
}

/**
 * Transform flat communication fields into communicationChannels array
 *
 * Takes an entity with flat fields like:
 * { email: "john@example.com", phoneNumber: "+1234567890" }
 *
 * And transforms it to:
 * {
 *   communicationChannels: [
 *     { communicationChannelRef: "CommunicationChannel:e-mail", value: "john@example.com" },
 *     { communicationChannelRef: "CommunicationChannel:Phone", value: "+1234567890" }
 *   ]
 * }
 *
 * @param entity - Entity with flat communication fields
 * @returns Entity with communicationChannels array
 */
export function transformCommunicationChannels(entity: ConvertedEntity): ConvertedEntity {
  const communicationChannels: CommunicationChannel[] = []

  // Process each known communication field
  Object.entries(CHANNEL_FIELD_MAP).forEach(([fieldName, catalogCode]) => {
    const value = entity[fieldName]

    if (value && typeof value === 'string' && value.trim() !== '') {
      communicationChannels.push({
        communicationChannelRef: `${COMMUNICATION_CHANNEL}:${catalogCode}`,
        value: value.trim(),
        valueExtension: undefined
      })

      // Remove the flat field from entity
      delete entity[fieldName]
    }
  })

  // Only add communicationChannels if we found any
  if (communicationChannels.length > 0) {
    entity.communicationChannels = communicationChannels
  }

  return entity
}

/**
 * Get list of communication channel field names
 * Used in import configs to define target fields
 */
export function getCommunicationChannelFields(): string[] {
  return Object.keys(CHANNEL_FIELD_MAP)
}

/**
 * Get communication channel catalog codes
 * Used for validation
 */
export function getCommunicationChannelCodes(): string[] {
  return Object.values(CHANNEL_FIELD_MAP)
}
