import { Mail, Phone, Link, MessageSquare } from 'lucide-react'
import { CommunicationChannelType } from '../types/commonTypes'

/**
 * Get icon component for communication channel type
 * @param type Communication channel type from catalog entry
 * @returns Lucide icon component
 */
export const getCommunicationChannelIcon = (type?: CommunicationChannelType | string) => {
  if (!type) return Mail // default fallback

  const normalizedType = type.toLowerCase()

  switch (normalizedType) {
    case CommunicationChannelType.EMAIL:
    case 'email':
      return Mail

    case CommunicationChannelType.TEL:
    case 'tel':
    case 'phone':
      return Phone

    case CommunicationChannelType.URL:
    case 'url':
    case 'link':
      return Link

    case CommunicationChannelType.TEXT:
    case 'text':
    case 'message':
      return MessageSquare

    default:
      return Mail // fallback
  }
}

/**
 * Format communication channel value for display
 * @param type Communication channel type
 * @param value Communication channel value
 * @returns Formatted display string
 */
export const formatCommunicationChannelValue = (type?: CommunicationChannelType | string, value?: string): string => {
  if (!value) return ''

  const normalizedType = type?.toLowerCase()

  switch (normalizedType) {
    case CommunicationChannelType.TEL:
    case 'tel':
    case 'phone':
      // Format phone numbers if needed
      return value

    case CommunicationChannelType.EMAIL:
    case 'email':
      return value.toLowerCase()

    case CommunicationChannelType.URL:
    case 'url':
      // Remove protocol for cleaner display
      return value.replace(/^(https?:\/\/)?(www\.)?/, '')

    default:
      return value
  }
}
