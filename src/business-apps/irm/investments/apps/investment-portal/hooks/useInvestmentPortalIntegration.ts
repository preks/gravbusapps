import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestments } from '@/common/data/investment/hooks/useInvestments'
import { useGetInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import type { Investment } from '@/common/data/investment/types/investmentTypes'
import type { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import type { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'

export const useInvestmentPortalIntegration = (context: BusinessAppContextProps) => {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([])
  const [contacts, setContacts] = useState<InvestmentContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize hooks
  const { fetchInvestments } = useGetInvestments(context)
  const { fetchInvestmentContacts } = useGetInvestmentContacts(context)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Get userId from userInfo
      const userId = context.userInfo?.id

      if (!userId) {
        setError('No user ID found')
        return
      }

      // Step 2: Find contact by userId
      const contactsResult = await fetchInvestmentContacts({ userIds: [userId] })
      const contactsData = contactsResult.InvestmentContact || []

      if (contactsData.length === 0) {
        setError('No contact found for this user')
        return
      }

      const userContact = contactsData[0]

      // Step 3: Extract account IDs
      const accountIds: string[] = []
      if (userContact.investmentAccountContact && Array.isArray(userContact.investmentAccountContact)) {
        for (const iac of userContact.investmentAccountContact) {
          if (iac.account?.id) {
            accountIds.push(iac.account.id)
          }
        }
      }

      if (accountIds.length === 0) {
        setContacts(contactsData)
        setInvestments([])
        setAccounts([])
        return
      }

      // Step 4: Load investments filtered by account IDs
      const investmentsResult = await fetchInvestments({ accountIds })
      const investmentsData = investmentsResult?.Investment || []

      // Set state
      setContacts(contactsData)
      setInvestments(investmentsData)
      setAccounts([])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading investment portal data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchInvestments, fetchInvestmentContacts, context.userInfo])

  // Load data on mount and when context changes
  useEffect(() => {
    if (context.accessToken) {
      loadData()
    }
  }, [context.accessToken, loadData])

  // Get investments associated with current user context via account/contact
  // Note: Investments are already filtered server-side in loadData()
  const getUserAssociatedInvestments = useCallback(() => {
    // Simply return the already filtered investments
    return investments
  }, [investments])

  return {
    // Data
    investments,
    accounts,
    contacts,

    // State
    isLoading,
    error,

    // Actions
    refetch: loadData,

    // Utility functions
    getUserAssociatedInvestments
  }
}
