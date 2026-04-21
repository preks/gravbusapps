/**
 * Shared helpers for sanitizing and resolving values from a
 * `communicationChannels` array. Used by both CRM and IRM contact/account
 * payload builders.
 */

export function sanitizeCommunicationChannels(
  channels: unknown
): Array<{ communicationChannelRef: string; value: string; valueExtension?: string }> | undefined {
  if (!Array.isArray(channels)) return undefined

  const normalizeCommunicationChannelRef = (ref: string): string => {
    if (/^CommunicationChannel:v\d+:/i.test(ref)) return ref
    if (ref.startsWith('CommunicationChannel:'))
      return ref.replace(/^CommunicationChannel:/, 'CommunicationChannel:v1:')
    return ref
  }

  const valid = channels
    .filter(channel => channel && typeof channel === 'object')
    .map(channel => {
      const raw = channel as Record<string, unknown>
      const communicationChannelRef =
        typeof raw.communicationChannelRef === 'string'
          ? normalizeCommunicationChannelRef(raw.communicationChannelRef)
          : ''
      const value = typeof raw.value === 'string' ? raw.value.trim() : ''
      const valueExtension = typeof raw.valueExtension === 'string' ? raw.valueExtension : undefined
      return { communicationChannelRef, value, valueExtension }
    })
    .filter(channel => channel.value.length > 0 && channel.communicationChannelRef.startsWith('CommunicationChannel:'))

  return valid.length > 0 ? valid : undefined
}

export function resolveContactValueByChannelCode(
  channels: Array<{ communicationChannelRef: string; value: string }>,
  channelCode: string
): string | undefined {
  const match = channels.find(channel => channel.communicationChannelRef === channelCode)
  return match?.value
}
