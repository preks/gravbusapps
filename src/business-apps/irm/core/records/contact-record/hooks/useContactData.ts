import { useState, useEffect } from 'react'
import { useGetInvestmentContactById } from '@/common/data/investment/hooks/useInvestmentContacts'
import type { InvestmentContact } from '@/common/data/investment/types'

export interface ReferenceData {
  id: string
  code: string
  value: string
  alternativeCode?: string
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  department?: string
  linkedinUrl?: string
  xingUrl?: string
  bio?: string
  contactType?: string
  version: string
  birthDate?: string
  academicTitle?: {
    id: string
    value: string
  }
  professionalTitle?: {
    id: string
    value: string
  }
  language?: {
    id: string
    value: string
  }
  updatedAt?: string
  createdAt?: string
  accountId?: string
  account?: {
    name?: string
    id?: string
  }
  ownerEmployee?: {
    id: string
    firstName: string
    lastName: string
    displayName?: string
    fullName?: string
    employeePosition?: {
      company?: {
        name?: string
      }
    }
  }
}

export const useContactData = (contactId: string, accessToken: string) => {
  const [contact, setContact] = useState<Contact | null>(null)
  const [contactData, setContactData] = useState<InvestmentContact | null>(null)
  const [rawContactData, setRawContactData] = useState<InvestmentContact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchInvestmentContactById } = useGetInvestmentContactById({ accessToken })

  const fetchContactData = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await fetchInvestmentContactById(contactId)

      if (result && result.contact) {
        setRawContactData(result.contact)
        setContactData(result.contact)

        // Transform data for UI compatibility
        // Extract LinkedIn and XING URLs from communication channels
        const linkedinUrl =
          result.contact.communicationChannels?.find(
            (channel: any) => channel.communicationChannelRef === 'CommunicationChannel:v1:LinkedIn'
          )?.value || ''
        const xingUrl =
          result.contact.communicationChannels?.find(
            (channel: any) => channel.communicationChannelRef === 'CommunicationChannel:v1:Xing'
          )?.value || ''

        const transformedContact: Contact = {
          id: result.contact.id,
          firstName: result.contact.firstName || '',
          lastName: result.contact.lastName || '',
          email: result.contact.email || '',
          phone: result.contact.phone || '',
          jobTitle: (result.contact as any).jobPosition || '',
          department: (result.contact as any).department || undefined,
          linkedinUrl: linkedinUrl,
          xingUrl: xingUrl,
          bio: result.contact.bio || '',
          contactType: result.contact.type || '', // Use 'type' field from GraphQL
          version: result.contact.version?.toString() || '1',
          birthDate: result.contact.birthDate || undefined,
          academicTitle: result.contact.academicTitle
            ? {
                id: result.contact.academicTitle.id,
                value: result.contact.academicTitle.value
              }
            : undefined,
          language: result.contact.language
            ? {
                id: result.contact.language.id,
                value: result.contact.language.value
              }
            : undefined,
          updatedAt: result.contact.updatedAt,
          createdAt: result.contact.createdAt,
          accountId: result.contact.accountId,
          account: result.contact.account
            ? {
                name: result.contact.account.name,
                id: result.contact.account.id
              }
            : undefined,
          ownerEmployee: result.contact.ownerEmployee
            ? {
                id: result.contact.ownerEmployee.id,
                firstName: result.contact.ownerEmployee.firstName || '',
                lastName: result.contact.ownerEmployee.lastName || '',
                displayName: result.contact.ownerEmployee.displayName,
                fullName: result.contact.ownerEmployee.fullName,
                employeePosition: result.contact.ownerEmployee.employeePosition
                  ? {
                      company: result.contact.ownerEmployee.employeePosition.company
                        ? {
                            name: result.contact.ownerEmployee.employeePosition.company.name
                          }
                        : undefined
                    }
                  : undefined
              }
            : undefined
        }

        setContact(transformedContact)
      } else {
        setError('Investment Contact not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch investment contact data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (contactId && accessToken) {
      fetchContactData()
    }
  }, [contactId, accessToken])

  return {
    contact,
    contactData,
    rawContactData,
    loading,
    error,
    refetch: fetchContactData
  }
}
