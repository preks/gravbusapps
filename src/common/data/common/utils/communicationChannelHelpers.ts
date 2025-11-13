/**
 * Communication Channel Helper Functions
 * Utilities for working with communication channels using enums
 */

import { CommunicationChannelCode } from '../types/commonTypes'

/**
 * Build communication channel reference string from code
 * Format: CommunicationChannel:v1:<CODE>
 */
export const buildCommunicationChannelRef = (code: CommunicationChannelCode): string => {
  return `CommunicationChannel:v1:${code}`
}

/**
 * Get communication channel by code from array
 * Checks both communicationChannel.code and communicationChannelRef
 */
export const getChannelByCode = (channels: any[] | undefined, code: CommunicationChannelCode): any | undefined => {
  if (!channels || channels.length === 0) return undefined

  return channels.find(
    (ch: any) =>
      ch.communicationChannel?.code === code || ch.communicationChannelRef === buildCommunicationChannelRef(code)
  )
}

/**
 * Get email channel from communication channels array
 */
export const getEmailChannel = (channels: any[] | undefined): any | undefined => {
  return getChannelByCode(channels, CommunicationChannelCode.EMAIL)
}

/**
 * Get phone channel from communication channels array
 */
export const getPhoneChannel = (channels: any[] | undefined): any | undefined => {
  // Try Phone first, then TEL as fallback
  const phoneChannel = getChannelByCode(channels, CommunicationChannelCode.PHONE)
  if (phoneChannel) return phoneChannel

  // Fallback: check for TEL code (if it exists in enum)
  return channels?.find(
    (ch: any) =>
      ch.communicationChannel?.code === 'TEL' ||
      ch.communicationChannel?.code === 'Tel' ||
      ch.communicationChannelRef?.includes(':TEL') ||
      ch.communicationChannelRef?.includes(':Tel')
  )
}

/**
 * Get LinkedIn channel from communication channels array
 */
export const getLinkedInChannel = (channels: any[] | undefined): any | undefined => {
  return getChannelByCode(channels, CommunicationChannelCode.LINKEDIN)
}

/**
 * Get Xing channel from communication channels array
 */
export const getXingChannel = (channels: any[] | undefined): any | undefined => {
  return getChannelByCode(channels, CommunicationChannelCode.XING)
}
