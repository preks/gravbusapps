import { useMemo, useState, useCallback } from 'react'
import type { OpportunityData } from './useOpportunityData'

export interface AccountOption {
  id: string
  name: string
  type: string
  subtitle?: string
  address?: {
    addressLine?: string
    postalCode?: string
    locality?: string
    region?: string
    country?: string
  }
}

export const useOpportunityAccounts = (opportunity: OpportunityData | null, preselectedAccountId: string | null) => {
  const [searchTerm, setSearchTerm] = useState('')

  // Transform opportunity accounts to AccountOption format
  const allAccounts = useMemo(() => {
    if (!opportunity) return []

    const accountMap = new Map<string, AccountOption>()

    opportunity.opportunityAccounts.forEach(oa => {
      const primaryAddress = oa.account.addresses?.[0]

      // Extract address line - handle both object format {lines: []} and string format
      let addressLineValue = ''
      if (primaryAddress?.addressLine) {
        const addrLine = primaryAddress.addressLine
        if (typeof addrLine === 'object' && addrLine.lines && Array.isArray(addrLine.lines)) {
          addressLineValue = addrLine.lines[0] || ''
        } else if (typeof addrLine === 'string') {
          addressLineValue = addrLine
        }
      }

      const accountOption: AccountOption = {
        id: oa.account.id,
        name: oa.account.name,
        type: 'account',
        subtitle: ' ', // Empty subtitle for consistent height
        address: primaryAddress
          ? {
              addressLine: addressLineValue,
              postalCode: primaryAddress.postalCode,
              locality: primaryAddress.locality,
              region: primaryAddress.region?.value,
              country: primaryAddress.country?.value
            }
          : undefined
      }
      accountMap.set(oa.account.id, accountOption)
    })

    return Array.from(accountMap.values())
  }, [opportunity])

  // Filter accounts based on search term
  const accounts = useMemo(() => {
    if (!searchTerm.trim()) return allAccounts

    const search = searchTerm.toLowerCase()
    return allAccounts.filter(acc => acc.name.toLowerCase().includes(search))
  }, [allAccounts, searchTerm])

  // Prioritize preselected account
  const sortedAccounts = useMemo(() => {
    if (!preselectedAccountId) return accounts

    const preselected = accounts.find(acc => acc.id === preselectedAccountId)
    const others = accounts.filter(acc => acc.id !== preselectedAccountId)

    return preselected ? [preselected, ...others] : accounts
  }, [accounts, preselectedAccountId])

  const search = useCallback((q: string) => {
    setSearchTerm(q || '')
  }, [])

  return {
    accounts: sortedAccounts,
    loading: false,
    hasMore: false,
    search,
    loadMore: () => Promise.resolve()
  }
}
