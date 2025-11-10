import { useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ContactFormValues } from '../types'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface UseContactDataProps {
  businessAppContext: BusinessAppContextProps
}

interface ContactQueryResult {
  id: string
  version: number
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  department?: string
  contactType?: string
  pictureUrl?: string
  bio?: string
  birthDate?: string
  ownerEmployeeId?: string
  salesCampaignId?: string

  communicationChannels?: Array<{
    id: string
    communicationChannelRef: string
    value: string
    communicationChannel?: {
      id: string
      code: string
      value: string
    }
  }>

  academicTitle?: {
    id: string
    value: string
    code: string
    objectValue?: any
  }

  ownerEmployee?: {
    id: string
    firstName: string
    lastName: string
    displayName?: string
    pictureThumbnail?: string
  }

  account?: {
    id: string
    name: string
  }

  // ✅ NEW: Account-Contact associations (matching IRM pattern)
  accountContacts?: Array<{
    id: string
    version: number
    contactType?: string
    account: {
      id: string
      name: string
    }
  }>

  salesCampaign?: {
    id: string
    name: string
  }

  createdAt?: string
  updatedAt?: string
}

interface ContactDataResponse {
  Contact: ContactQueryResult[]
}

export interface UseContactDataReturn {
  contactData: ContactQueryResult | null
  isLoading: boolean
  error: string | null
  mapContactToFormValues: (contact: ContactQueryResult) => Partial<ContactFormValues>
}

const GET_CONTACT_BY_ID = `
  query GetContactById($contactId: uuid!) {
    Contact(where: { id: { _eq: $contactId }, isDeleted: { _eq: false } }) {
      id
      version
      firstName
      lastName
      email
      phone
      fax
      jobTitle
      department
      contactType
      workExperienceYears
      pictureUrl
      bio
      birthDate
      ownerEmployeeId
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
      }
      academicTitle {
        id
        value
        code
        objectValue
      }
      communicationChannels(where: { isDeleted: { _eq: false } }) {
        id
        communicationChannelRef
        value
        communicationChannel {
          id
          code
          value
        }
      }
      academicTitleRef
      language {
        id
        value
        code
        objectValue
      }
      languageRef
      account {
        id
        name
      }
      accountContacts(where: { isDeleted: { _eq: false } }) {
        id
        version
        contactType
        account {
          id
          name
        }
      }
      salesCampaign {
        id
        name
      }
      salesCampaignId
      notesSummary
      createdAt
      updatedAt
    }
  }
`

export const useContactData = ({ businessAppContext }: UseContactDataProps): UseContactDataReturn => {
  const [contactData, setContactData] = useState<ContactQueryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(businessAppContext.accessToken)

  // Function to map contact data to form values
  const mapContactToFormValues = useMemo(
    () =>
      (contact: ContactQueryResult): Partial<ContactFormValues> => {
        // Extract LinkedIn and Xing URLs from communication channels
        const linkedinChannel = contact.communicationChannels?.find(
          ch =>
            ch.communicationChannelRef === 'CommunicationChannel:v1:LinkedIn' ||
            ch.communicationChannel?.code === 'LinkedIn'
        )
        const xingChannel = contact.communicationChannels?.find(
          ch =>
            ch.communicationChannelRef === 'CommunicationChannel:v1:Xing' || ch.communicationChannel?.code === 'Xing'
        )

        console.log('🔍 Contact Data Mapping Debug:', {
          contactId: contact.id,
          contactName: `${contact.firstName} ${contact.lastName}`,
          ownerEmployee: contact.ownerEmployee,
          mappedOwner: contact.ownerEmployeeId || '',
          accountFromQuery: contact.account,
          salesCampaign: contact.salesCampaign,
          salesCampaignId: contact.salesCampaignId,
          originalContactType: contact.contactType,
          mappedContactType: contact?.contactType || '',
          communicationChannels: contact.communicationChannels,
          linkedinUrl: linkedinChannel?.value || '',
          xingUrl: xingChannel?.value || '',
          fullContact: contact
        })

        const mappedValues: Partial<ContactFormValues> = {
          // System fields
          id: contact.id,
          version: contact.version,

          // Personal Information
          firstName: contact?.firstName || '',
          lastName: contact?.lastName || '',
          email: contact?.email || '',
          phone: contact?.phone || '',
          fax: contact?.fax || '',
          birthDate: contact.birthDate ? new Date(contact.birthDate).toISOString().split('T')[0] : '', // Convert to YYYY-MM-DD format for HTML date input
          bio: contact.bio || '',
          pictureUrl: contact.pictureUrl || '',

          // Professional Information
          jobTitle: contact?.jobTitle || '',
          department: contact?.department || '',
          contactType: contact?.contactType || '', // Use actual database value
          workExperienceYears: contact?.workExperienceYears ? String(contact?.workExperienceYears) : '',

          // Owner Information
          owner: contact?.ownerEmployeeId || '',
          ownerEmployeeId: contact?.ownerEmployeeId || '',

          // Account Information (AccountSelect expects {id, name} object for proper prefilling)
          account: contact?.account?.id || '',
          accountId:
            contact?.account?.id && contact?.account?.name
              ? { id: contact.account.id, name: contact.account.name }
              : contact?.account?.id || '',
          companyName: contact?.account?.name || '',
          // ✅ NEW: Account associations with metadata (matching IRM pattern)
          accountIds:
            contact?.accountContacts?.map(rel => ({
              id: rel.account.id,
              name: rel.account.name,
              associationId: rel.id, // ✅ Capture association ID
              associationVersion: rel.version // ✅ Capture association version
            })) || [], // ✅ Store full account objects with id, name, and association metadata

          // Academic Title
          academicTitle: contact?.academicTitle?.id || '',
          academicTitleRef: contact?.academicTitleRef || contact?.academicTitle?.id || '',

          // Language
          language: contact?.language?.id || '',
          languageRef: contact?.languageRef || contact?.language?.id || '',

          // Social Media (extracted from communication channels)
          linkedinUrl: linkedinChannel?.value || '',
          xingUrl: xingChannel?.value || '',

          // Campaign Information
          salesCampaignId: contact?.salesCampaignId || contact?.salesCampaign?.id || '',

          // Notes
          notesSummary: contact?.notesSummary || '',

          // Audit fields
          createdAt: contact?.createdAt || '',
          updatedAt: contact?.updatedAt || ''
        }

        console.log('✅ Contact Data Mapping: Final mapped values', {
          contactId: mappedValues.id,
          accountId: mappedValues.accountId,
          companyName: mappedValues.companyName,
          contactType: mappedValues.contactType,
          salesCampaignId: mappedValues.salesCampaignId,
          linkedinUrl: mappedValues.linkedinUrl,
          xingUrl: mappedValues.xingUrl,
          owner: mappedValues.owner
        })

        return mappedValues
      },
    []
  )

  // Load contact data when contactId is provided in additionalData (MATCHES LEAD FORM EXACTLY)
  useEffect(() => {
    const loadContactData = async () => {
      // Handle contactId the same way as Lead Form - EXACT COPY
      const contactId =
        businessAppContext.additionalData?.contactId ||
        businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.contactId

      if (!contactId || !businessAppContext.accessToken) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await graphqlClient.request<ContactDataResponse>(GET_CONTACT_BY_ID, { contactId })

        if (result.Contact?.[0]) {
          console.log('✅ Contact Data Hook: Contact data loaded successfully:', result.Contact[0])
          setContactData(result.Contact[0])
        } else {
          setError('Contact not found')
          console.log('❌ Contact Data Hook: Contact not found')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load contact data'
        console.error('❌ Contact Data Hook: Error loading contact data:', err)
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadContactData()
  }, [
    businessAppContext.additionalData?.contactId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.contactId,
    businessAppContext.accessToken
    // Note: graphqlClient removed to prevent infinite loops (matches lead form pattern)
  ])

  return {
    contactData,
    isLoading,
    error,
    mapContactToFormValues
  }
}
