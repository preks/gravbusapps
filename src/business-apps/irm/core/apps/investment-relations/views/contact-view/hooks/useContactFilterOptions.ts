import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'

interface FilterOptions {
  owners: Array<{ id: string; label: string }>
  contactTypes: Array<{ id: string; label: string }>
  accounts: Array<{ id: string; label: string }>
  isLoading: boolean
}

export const useContactFilterOptions = (context: BusinessAppContextProps): FilterOptions => {
  const { accessToken } = context
  const { fetchInvestmentContacts } = useGetInvestmentContacts(context)
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context)

  const [owners, setOwners] = useState<Array<{ id: string; label: string }>>([])
  const [contactTypes] = useState<Array<{ id: string; label: string }>>([
    { id: 'PRIMARY', label: 'Primary' },
    { id: 'SECONDARY', label: 'Secondary' }
  ])
  const [accounts, setAccounts] = useState<Array<{ id: string; label: string }>>([])
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
    contactTypes,
    accounts,
    isLoading
  }
}
