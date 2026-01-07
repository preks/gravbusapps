import type { Lead } from '@/common/data/relations/types/leadTypes'

/**
 * Map communication from Lead data to flat communication fields
 * Leads store communication as flat fields (email, phoneNumber), not as arrays
 * Returns an object with email and phoneNumber fields
 *
 * @param leadData - Lead data
 * @param emailField - Field name for email (e.g., 'email' or 'companyEmail')
 * @param phoneField - Field name for phone (e.g., 'phoneNumber' or 'companyPhone')
 */
export function mapLeadCommunicationChannels(
  leadData: Lead | Record<string, unknown>,
  emailField: string = 'email',
  phoneField: string = 'phoneNumber'
): {
  email?: string
  phoneNumber?: string
} {
  return {
    email: leadData[emailField] || undefined,
    phoneNumber: leadData[phoneField] || undefined
  }
}
