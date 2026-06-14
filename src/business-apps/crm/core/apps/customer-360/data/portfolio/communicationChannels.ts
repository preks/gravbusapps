/**
 * Helpers to extract a primary email / phone from a customer's communication
 * channels. Mirrors the channel-code detection used by the shared
 * `communicationChannelRenderer` so the portfolio list and the agent's
 * email-resolution stay consistent.
 */

import type { CustomerCommunicationChannel } from '@/common/data/customer/types/customerCommunicationChannelTypes'

function channelCode(channel: CustomerCommunicationChannel): string {
  const catalog = channel.communicationChannel as { code?: string; type?: string } | undefined
  if (catalog?.code) return catalog.code
  if (channel.communicationChannelRef) {
    const parts = channel.communicationChannelRef.split(':')
    if (parts.length >= 3) return parts[2]
  }
  return catalog?.type ?? ''
}

function findByKeyword(channels: CustomerCommunicationChannel[] | undefined, keyword: string): string | undefined {
  if (!channels?.length) return undefined
  const match = channels.find(channel => channel.value && channelCode(channel).toUpperCase().includes(keyword))
  return match?.value || undefined
}

export function getPrimaryEmail(channels: CustomerCommunicationChannel[] | undefined): string | undefined {
  return findByKeyword(channels, 'EMAIL')
}

export function getPrimaryPhone(channels: CustomerCommunicationChannel[] | undefined): string | undefined {
  return findByKeyword(channels, 'PHONE') ?? findByKeyword(channels, 'MOBILE')
}
