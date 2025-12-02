import React from 'react'
import {
  PiEnvelope,
  PiPhone,
  PiLinkedinLogo,
  PiShareNetwork,
  PiGlobe,
  PiFacebookLogo,
  PiInstagramLogo,
  PiYoutubeLogo,
  PiDeviceMobile,
  PiPrinter,
  PiSlackLogo,
  PiChatsCircle
} from 'react-icons/pi'

/**
 * Get icon component for a communication channel code
 */
const getChannelIcon = (code: string): React.ComponentType<{ className?: string; title?: string }> => {
  const codeUpper = code.toUpperCase()

  // Map channel codes to icons
  if (codeUpper.includes('EMAIL') || codeUpper.includes('E-MAIL')) return PiEnvelope
  if (codeUpper.includes('PHONE')) return PiPhone
  if (codeUpper.includes('MOBILE')) return PiDeviceMobile
  if (codeUpper.includes('LINKEDIN')) return PiLinkedinLogo
  if (codeUpper.includes('XING')) return PiShareNetwork
  if (codeUpper.includes('FACEBOOK')) return PiFacebookLogo
  if (codeUpper.includes('INSTAGRAM')) return PiInstagramLogo
  if (codeUpper.includes('YOUTUBE')) return PiYoutubeLogo
  if (codeUpper.includes('WEBSITE')) return PiGlobe
  if (codeUpper.includes('FAX')) return PiPrinter
  if (codeUpper.includes('SLACK')) return PiSlackLogo
  if (codeUpper.includes('MESSENGER')) return PiChatsCircle
  if (codeUpper.includes('PAGER')) return PiDeviceMobile
  if (codeUpper.includes('X')) return PiShareNetwork

  // Default icon for unknown types
  return PiEnvelope
}

/**
 * Get label for a communication channel code
 */
const getChannelLabel = (code: string): string => {
  const codeUpper = code.toUpperCase()

  if (codeUpper.includes('EMAIL') || codeUpper.includes('E-MAIL')) return 'Email'
  if (codeUpper.includes('PHONE')) return 'Phone'
  if (codeUpper.includes('MOBILE')) return 'Mobile'
  if (codeUpper.includes('LINKEDIN')) return 'LinkedIn'
  if (codeUpper.includes('XING')) return 'XING'
  if (codeUpper.includes('FACEBOOK')) return 'Facebook'
  if (codeUpper.includes('INSTAGRAM')) return 'Instagram'
  if (codeUpper.includes('YOUTUBE')) return 'YouTube'
  if (codeUpper.includes('WEBSITE')) return 'Website'
  if (codeUpper.includes('FAX')) return 'Fax'
  if (codeUpper.includes('SLACK')) return 'Slack'
  if (codeUpper.includes('MESSENGER')) return 'Messenger'
  if (codeUpper.includes('PAGER')) return 'Pager'
  if (codeUpper.includes('X')) return 'X'

  return code
}

/**
 * Render value based on channel type
 */
const renderChannelValue = (code: string, value: string, testIdPrefix?: string): React.ReactNode => {
  const codeUpper = code.toUpperCase()

  // Email - mailto link
  if (codeUpper.includes('EMAIL') || codeUpper.includes('E-MAIL')) {
    return (
      <a
        href={`mailto:${value}`}
        className="gba:text-sm gba:text-muted-foreground gba:no-underline gba:hover:underline"
        data-testid={testIdPrefix ? `${testIdPrefix}-email-link` : undefined}
      >
        {value}
      </a>
    )
  }

  // Phone/Mobile - tel link
  if (codeUpper.includes('PHONE') || codeUpper.includes('MOBILE')) {
    return (
      <a
        href={`tel:${value}`}
        className="gba:text-sm gba:text-muted-foreground gba:no-underline gba:hover:underline"
        data-testid={testIdPrefix ? `${testIdPrefix}-phone-link` : undefined}
      >
        {value}
      </a>
    )
  }

  // URLs - external links (LinkedIn, XING, Facebook, Instagram, YouTube, Website, etc.)
  if (
    codeUpper.includes('LINKEDIN') ||
    codeUpper.includes('XING') ||
    codeUpper.includes('FACEBOOK') ||
    codeUpper.includes('INSTAGRAM') ||
    codeUpper.includes('YOUTUBE') ||
    codeUpper.includes('WEBSITE') ||
    codeUpper.includes('X') ||
    value.startsWith('http')
  ) {
    const fullUrl = value.includes('://') ? value : `https://${value}`
    return (
      <a
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="gba:text-sm gba:text-muted-foreground gba:no-underline gba:hover:underline"
        data-testid={testIdPrefix ? `${testIdPrefix}-${codeUpper.toLowerCase()}-link` : undefined}
      >
        {value}
      </a>
    )
  }

  // Default - plain text (Fax, Pager, Slack, Messenger, etc.)
  return <span className="gba:text-sm gba:text-muted-foreground">{value}</span>
}

/**
 * Extract communication channel code from channel object
 */
const getChannelCode = (channel: any): string | null => {
  // Try to get code from communicationChannel object
  if (channel.communicationChannel?.code) {
    return channel.communicationChannel.code
  }

  // Try to extract from communicationChannelRef (format: CommunicationChannel:v1:CODE)
  if (channel.communicationChannelRef) {
    const parts = channel.communicationChannelRef.split(':')
    if (parts.length >= 3) {
      return parts[2]
    }
  }

  // Try to get type from communicationChannel
  if (channel.communicationChannel?.type) {
    return channel.communicationChannel.type
  }

  return null
}

/**
 * Render all communication channels from an array
 */
export const renderCommunicationChannels = (
  channels: any[] | undefined,
  testIdPrefix?: string
): Array<{
  icon: React.ComponentType<{ className?: string; title?: string }>
  title: string
  value: string
  render: (value: string) => React.ReactNode
}> => {
  if (!channels || channels.length === 0) return []

  return channels
    .filter(channel => channel.value) // Only include channels with values
    .map(channel => {
      const code = getChannelCode(channel)
      if (!code) return null

      const icon = getChannelIcon(code)
      const label = getChannelLabel(code)

      return {
        icon,
        title: label,
        value: channel.value,
        render: (value: string) => renderChannelValue(code, value, testIdPrefix)
      }
    })
    .filter(Boolean) as Array<{
    icon: React.ComponentType<{ className?: string; title?: string }>
    title: string
    value: string
    render: (value: string) => React.ReactNode
  }>
}
