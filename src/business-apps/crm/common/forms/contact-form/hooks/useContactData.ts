import { useState, useEffect, useCallback, useMemo } from 'react'
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
  linkedinUrl?: string
  xingUrl?: string
  bio?: string
  birthDate?: string
  ownerEmployeeId?: string
  salesCampaignId?: string

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
      linkedinUrl
      xingUrl
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
        console.log('🔍 Contact Data Mapping Debug:', {
          contactId: contact.id,
          contactName: `${contact.firstName} ${contact.lastName}`,
          ownerEmployee: contact.ownerEmployee,
          mappedOwner: contact.ownerEmployeeId || '',
          salesCampaign: contact.salesCampaign,
          salesCampaignId: contact.salesCampaignId,
          originalContactType: contact.contactType,
          mappedContactType: contact?.contactType || '',
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

          // Account Information
          account: contact?.account?.id || '',
          accountId: contact?.account?.id || '',
          companyName: contact?.account?.name || '',

          // Academic Title
          academicTitle: contact?.academicTitle?.id || '',
          academicTitleRef: contact?.academicTitleRef || contact?.academicTitle?.id || '',

          // Language
          language: contact?.language?.id || '',
          languageRef: contact?.languageRef || contact?.language?.id || '',

          // Social Media
          linkedinUrl: contact?.linkedinUrl || '',
          xingUrl: contact?.xingUrl || '',

          // Campaign Information
          salesCampaignId: contact?.salesCampaignId || contact?.salesCampaign?.id || '',

          // Notes
          notesSummary: contact?.notesSummary || '',

          // Audit fields
          createdAt: contact?.createdAt || '',
          updatedAt: contact?.updatedAt || ''
        }

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
