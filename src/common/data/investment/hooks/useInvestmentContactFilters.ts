// Investment Contact Filters hook
import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'

interface FilterOption {
  id: string
  label: string
}

export interface InvestmentContactFilters {
  owners: FilterOption[]
  departments: FilterOption[]
  jobPositions: FilterOption[]
  academicTitles: FilterOption[]
  salutations: FilterOption[]
  languages: FilterOption[]
  contactTypes: FilterOption[]
  accounts: FilterOption[]
  isLoading: boolean
}

export const useInvestmentContactFilters = (context: BusinessAppContextProps): InvestmentContactFilters => {
  const { accessToken } = context
  const { fetchInvestmentContacts } = useGetInvestmentContacts(context)
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context)

  const [owners, setOwners] = useState<FilterOption[]>([])
  const [departments, setDepartments] = useState<FilterOption[]>([])
  const [jobPositions, setJobPositions] = useState<FilterOption[]>([])
  const [academicTitles, setAcademicTitles] = useState<FilterOption[]>([])
  const [salutations, setSalutations] = useState<FilterOption[]>([])
  const [languages, setLanguages] = useState<FilterOption[]>([])
  const [contactTypes] = useState<FilterOption[]>([
    { id: 'PRIMARY', label: 'Primary' },
    { id: 'SECONDARY', label: 'Secondary' }
  ])
  const [accounts, setAccounts] = useState<FilterOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!accessToken) return

      try {
        setIsLoading(true)

        // Fetch contacts for unique owners and types
        const contactsData = await fetchInvestmentContacts({
          limit: 1000,
          offset: 0
        })

        // Extract unique owners
        const uniqueOwners = new Map<string, string>()
        contactsData.InvestmentContact?.forEach(contact => {
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

        // Extract unique departments (String field, not CatalogEntry)
        const uniqueDepartments = new Set<string>()
        contactsData.InvestmentContact?.forEach(contact => {
          if (contact.department) {
            uniqueDepartments.add(contact.department)
          }
        })
        setDepartments(
          Array.from(uniqueDepartments)
            .map(dept => ({ id: dept, label: dept }))
            .sort((a, b) => a.label.localeCompare(b.label))
        )

        // Extract unique job positions (String field, not CatalogEntry)
        const uniqueJobPositions = new Set<string>()
        contactsData.InvestmentContact?.forEach(contact => {
          if (contact.jobPosition) {
            uniqueJobPositions.add(contact.jobPosition)
          }
        })
        setJobPositions(
          Array.from(uniqueJobPositions)
            .map(job => ({ id: job, label: job }))
            .sort((a, b) => a.label.localeCompare(b.label))
        )

        // Extract unique academic titles
        const uniqueAcademicTitles = new Map<string, string>()
        contactsData.InvestmentContact?.forEach(contact => {
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
        contactsData.InvestmentContact?.forEach(contact => {
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

        // Extract unique languages
        const uniqueLanguages = new Map<string, string>()
        contactsData.InvestmentContact?.forEach(contact => {
          if (contact.language?.id) {
            const label = contact.language.value || contact.language.code || contact.language.id
            uniqueLanguages.set(contact.language.id, label)
          }
        })
        setLanguages(
          Array.from(uniqueLanguages.entries())
            .map(([id, label]) => ({ id, label }))
            .sort((a, b) => a.label.localeCompare(b.label))
        )

        // Fetch accounts
        const accountsData = await fetchInvestmentAccounts({
          limit: 1000,
          offset: 0
        })

        const uniqueAccounts = new Map<string, string>()
        accountsData.InvestmentAccount?.forEach(account => {
          if (account.id && account.name) {
            uniqueAccounts.set(account.id, account.name)
          }
        })

        setAccounts(
          Array.from(uniqueAccounts.entries())
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
  }, [accessToken, fetchInvestmentContacts, fetchInvestmentAccounts])

  return {
    owners,
    departments,
    jobPositions,
    academicTitles,
    salutations,
    languages,
    contactTypes,
    accounts,
    isLoading
  }
}
