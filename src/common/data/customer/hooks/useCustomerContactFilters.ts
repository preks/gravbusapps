// Customer Contact Filters hook
import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'
import type { CustomerContact } from '@/common/data/customer/types'

interface FilterOption {
  id: string
  label: string
}

export interface CustomerContactFilters {
  owners: FilterOption[]
  departments: FilterOption[]
  jobPositions: FilterOption[]
  academicTitles: FilterOption[]
  salutations: FilterOption[]
  languages: FilterOption[]
  isLoading: boolean
}

export const useCustomerContactFilters = (context: BusinessAppContextProps): CustomerContactFilters => {
  const { accessToken } = context
  const { fetchCustomerContacts } = useCustomerContacts(context)

  const [owners, setOwners] = useState<FilterOption[]>([])
  const [departments] = useState<FilterOption[]>([])
  const [jobPositions] = useState<FilterOption[]>([])
  const [academicTitles, setAcademicTitles] = useState<FilterOption[]>([])
  const [salutations, setSalutations] = useState<FilterOption[]>([])
  const [languages] = useState<FilterOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!accessToken) return

      try {
        setIsLoading(true)

        // Fetch contacts for unique owners
        const contactsData = await fetchCustomerContacts({
          limit: 1000,
          offset: 0,
          search: undefined
        })

        // Extract unique owners
        const uniqueOwners = new Map<string, string>()
        contactsData.contacts?.forEach((contact: CustomerContact) => {
          if (contact.ownerEmployee?.id) {
            const name =
              contact.ownerEmployee.displayName ||
              `${contact.ownerEmployee.firstName || ''} ${contact.ownerEmployee.lastName || ''}`.trim()
            if (name) {
              uniqueOwners.set(contact.ownerEmployee.id, name)
            }
          }
        })

        setOwners(
          Array.from(uniqueOwners.entries())
            .map(([id, label]) => ({ id, label }))
            .sort((a, b) => a.label.localeCompare(b.label))
        )

        // Extract unique academic titles
        const uniqueAcademicTitles = new Map<string, string>()
        contactsData.contacts?.forEach((contact: CustomerContact) => {
          if (contact.academicTitle?.id) {
            const label = contact.academicTitle.value || contact.academicTitle.code || contact.academicTitle.id
            uniqueAcademicTitles.set(contact.academicTitle.id, label)
          }
        })

        setAcademicTitles(
          Array.from(uniqueAcademicTitles.entries())
            .map(([id, label]) => ({ id, label }))
            .sort((a, b) => a.label.localeCompare(b.label))
        )

        // Extract unique salutations
        const uniqueSalutations = new Map<string, string>()
        contactsData.contacts?.forEach((contact: CustomerContact) => {
          if (contact.salutation?.id) {
            const label = contact.salutation.value || contact.salutation.code || contact.salutation.id
            uniqueSalutations.set(contact.salutation.id, label)
          }
        })

        setSalutations(
          Array.from(uniqueSalutations.entries())
            .map(([id, label]) => ({ id, label }))
            .sort((a, b) => a.label.localeCompare(b.label))
        )
      } catch (error) {
        console.error('Error loading filter options:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFilterOptions()
  }, [accessToken, fetchCustomerContacts])

  return {
    owners,
    departments,
    jobPositions,
    academicTitles,
    salutations,
    languages,
    isLoading
  }
}
