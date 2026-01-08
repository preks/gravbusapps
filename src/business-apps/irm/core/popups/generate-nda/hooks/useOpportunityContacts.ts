import { useMemo, useState, useCallback } from 'react'
import type { OpportunityData } from './useOpportunityData'

export interface ContactOption {
  id: string
  name: string
  firstName?: string
  lastName?: string
  type: string
  subtitle?: string
  pictureThumbnail?: string
  jobPosition?: string
}

export const useOpportunityContacts = (opportunity: OpportunityData | null, preselectedContactId: string | null) => {
  const [searchTerm, setSearchTerm] = useState('')

  // Transform opportunity contacts to ContactOption format
  const allContacts = useMemo(() => {
    if (!opportunity) return []

    const contactMap = new Map<string, ContactOption>()

    opportunity.investmentOpportunityContact.forEach(oc => {
      const contactName =
        `${oc.contact.firstName || ''} ${oc.contact.lastName || ''}`.trim() || oc.contact.fullName || 'Contact'

      const contactOption: ContactOption = {
        id: oc.contact.id,
        name: contactName,
        firstName: oc.contact.firstName,
        lastName: oc.contact.lastName,
        type: 'contact',
        subtitle: oc.contact.email,
        pictureThumbnail: oc.contact.pictureThumbnail,
        jobPosition: oc.contact.jobPosition
      }
      contactMap.set(oc.contact.id, contactOption)
    })

    return Array.from(contactMap.values())
  }, [opportunity])

  // Filter contacts based on search term
  const contacts = useMemo(() => {
    if (!searchTerm.trim()) return allContacts

    const search = searchTerm.toLowerCase()
    return allContacts.filter(
      cont =>
        cont.name.toLowerCase().includes(search) ||
        cont.subtitle?.toLowerCase().includes(search) ||
        cont.jobPosition?.toLowerCase().includes(search)
    )
  }, [allContacts, searchTerm])

  // Prioritize preselected contact
  const sortedContacts = useMemo(() => {
    if (!preselectedContactId) return contacts

    const preselected = contacts.find(cont => cont.id === preselectedContactId)
    const others = contacts.filter(cont => cont.id !== preselectedContactId)

    return preselected ? [preselected, ...others] : contacts
  }, [contacts, preselectedContactId])

  const search = useCallback((q: string) => {
    setSearchTerm(q || '')
  }, [])

  return {
    contacts: sortedContacts,
    loading: false,
    hasMore: false,
    search,
    loadMore: () => Promise.resolve()
  }
}
