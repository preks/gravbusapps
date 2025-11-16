import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentContactData, InvestmentContactDataResponse } from '../queries/ContactQueries'
import { ContactFormValues } from '../types'
import {
  getEmailChannel,
  getPhoneChannel,
  getLinkedInChannel,
  getXingChannel
} from '@/common/data/common/utils/communicationChannelHelpers'

// Helper function to map InvestmentContact data to form values
export const mapInvestmentContactToFormValues = (
  contactData: InvestmentContactDataResponse
): Partial<ContactFormValues> => {
  if (!contactData?.InvestmentContact?.[0]) {
    return {}
  }

  const contact = contactData.InvestmentContact[0]

  const formValues: Partial<ContactFormValues> = {
    // System fields
    id: contact.id,
    version: contact.version,

    // Personal Information
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    fullName: contact.fullName || '',
    type: contact.type || 'UNKNOWN_CONTACT',
    birthDate: contact.birthDate ? contact.birthDate.split('T')[0] : '',

    // Professional Information
    jobPosition: contact.jobPosition || '',
    department: contact.department || '',

    // Social Media Information - Extract from communication channels
    linkedinUrl: getLinkedInChannel(contact.communicationChannels)?.value || '',
    xingUrl: getXingChannel(contact.communicationChannels)?.value || '',

    // Contact Information - Extract from communication channels
    email: getEmailChannel(contact.communicationChannels)?.value || contact.email || '', // Fallback to deprecated field for backward compatibility
    phone: getPhoneChannel(contact.communicationChannels)?.value || contact.phone || '', // Fallback to deprecated field for backward compatibility

    // picture: contact.picture || "", // ❌ NOT in schema
    // pictureThumbnail: contact.pictureThumbnail || "", // ❌ NOT in schema

    // Owner Information
    ownerEmployeeId: contact.ownerEmployeeId || '',
    owner: contact.ownerEmployeeId || '', // Map to owner field for form

    // Account Information - ✅ UPDATED: Include association metadata and contactType
    accountIds: Array.from(
      new Set(
        (contact.investmentAccountContact ?? [])
          .map(rel => {
            if (!rel.account?.id) return null
            return {
              id: rel.account.id,
              name: rel.account.name || 'Unnamed Account',
              contactType: rel.contactType || null, // ✅ NEW: Capture contactType from association
              associationId: rel.id, // ✅ NEW: Capture association ID
              associationVersion: rel.version // ✅ NEW: Capture association version
            }
          })
          .filter(account => Boolean(account))
      )
    ) as any,

    // Additional Information
    notesSummary: contact.notesSummary || '',
    businessKey: contact.businessKey || '',

    // Catalog fields
    academicTitleRef: contact.academicTitle?.id || '',
    languageRef: contact.languageRef || '',

    // ✅ REMOVED: Fields NOT in InvestmentContact database
    // salutationRef: contact.salutationRef || "", // ❌ NOT in schema

    // Audit fields
    createdAt: contact.createdAt || '',
    createdBy: contact.createdBy || '',

    // System fields
    additionalProperties: contact.additionalProperties

    // ✅ REMOVED: Fields NOT in expected payload structure
    // activeFrom: contact.activeFrom || "", // Not in expected payload
    // activeTo: contact.activeTo || "", // Not in expected payload
    // acl: contact.acl, // Not in expected payload
    // updatedAt: contact.updatedAt || "", // ❌ NOT in InvestmentContact schema
    // updatedBy: contact.updatedBy || "", // ❌ NOT in InvestmentContact schema
    // sourceApp: "IRM", // ❌ NOT a database field (used in payload only)
  }

  return formValues
}

export const useInvestmentContactData = (businessAppContext: BusinessAppContextProps) => {
  const [contactData, setContactData] = useState<InvestmentContactDataResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { fetchInvestmentContactData } = useGetInvestmentContactData(businessAppContext)

  // Extract contactId from businessAppContext
  const contactId =
    businessAppContext.additionalData?.contactId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.contactId

  useEffect(() => {
    const loadContactData = async () => {
      if (!contactId || !businessAppContext.accessToken) {
        return
      }

      try {
        setLoading(true)
        setError(null)

        const result = await fetchInvestmentContactData({ contactId })

        setContactData(result)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error loading contact data'
        console.error('❌ Contact Data Hook: Error loading contact data:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (contactId) {
      loadContactData()
    } else {
    }
  }, [contactId, businessAppContext.accessToken])

  return {
    contactData,
    loading,
    error,
    contactId
  }
}
