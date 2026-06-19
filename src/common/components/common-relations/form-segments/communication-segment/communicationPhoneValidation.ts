import { isValidPhoneNumberWithMetadata } from '@/common/utils/validation/phoneNumberValidation'

export interface CommunicationPhoneCandidate {
  communicationChannelRef?: string | null
  value?: string | null
}

const PHONE_CHANNEL_CODES = new Set(['phone', 'mobile'])

export const getCommunicationChannelCode = (channelRef: string | null | undefined): string => {
  return (channelRef || '').split(':').pop()?.trim().toLowerCase() || ''
}

export const isPhoneOrMobileCommunicationChannel = (channelRef: string | null | undefined): boolean => {
  return PHONE_CHANNEL_CODES.has(getCommunicationChannelCode(channelRef))
}

export const isValidOptionalPhoneCommunicationValue = (channel: CommunicationPhoneCandidate): boolean => {
  const value = (channel.value || '').trim()

  if (!isPhoneOrMobileCommunicationChannel(channel.communicationChannelRef) || !value) {
    return true
  }

  return isValidPhoneNumberWithMetadata(value)
}

export const getInvalidPhoneCommunicationChannelIndexes = (
  channels: CommunicationPhoneCandidate[] | null | undefined
): number[] => {
  if (!Array.isArray(channels)) {
    return []
  }

  return channels.reduce<number[]>((invalidIndexes, channel, index) => {
    if (isValidOptionalPhoneCommunicationValue(channel)) {
      return invalidIndexes
    }

    return [...invalidIndexes, index]
  }, [])
}
