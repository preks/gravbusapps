import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AccountFormValues } from '../types'
import { useGetInvestmentAccountData, InvestmentAccountDataResponse } from '../queries/AccountQueries'

// Map investment account data from API to form values
export const mapInvestmentAccountToFormValues = (
  accountData: InvestmentAccountDataResponse
): Partial<AccountFormValues> => {
  if (!accountData?.InvestmentAccount?.[0]) {
    return {}
  }

  const account = accountData.InvestmentAccount[0]

  // ✅ FIXED: Extract addresses from investmentAddress relationship
  // Map addresses first, then check if we got any results
  const addressData = account.investmentAddress?.map(addr => ({
    id: addr.id,
    version: addr.version,
    addressType: addr.addressType || 'PRIMARY_ADDRESS',
    addressLines: addr.addressLine?.lines || [''],
    postalCode: addr.postalCode || '',
    locality: addr.locality || '',
    regionRef: addr.regionRef || '',
    countryRef: addr.countryRef || ''
  }))

  // ✅ FIXED: Check for empty array (not just undefined/null) and provide default address
  // This ensures accounts without addresses still show the address section
  const addresses =
    addressData && addressData.length > 0
      ? addressData
      : [
          {
            id: 'default-address',
            addressType: 'PRIMARY_ADDRESS',
            addressLines: [''],
            postalCode: '',
            locality: '',
            regionRef: '',
            countryRef: ''
          }
        ]

  const formValues: Partial<AccountFormValues> = {
    // System fields
    id: account.id,
    version: account.version,

    // Account Information
    owner: account.ownerEmployee?.id || '',

    // Company Information (✅ UPDATED to match InvestmentAccount schema)
    accountName: account.name || '',
    parentAccount: '', // Not available in InvestmentAccount schema
    legalForm: account.legalForm?.id || '',
    industry: account.industryClass?.id || '', // ✅ FIXED: industry -> industryClass
    website: account.website || '',
    description: account.mission || '', // ✅ UPDATED: Use mission as description

    // ✅ REMOVED: Campaign Information - not relevant for InvestmentAccount
    // salesCampaignId: "", // Removed from form

    // Contact Information
    phone: account.phone || '',
    email: account.email || '',
    // ✅ REMOVED: fax: "", // Not available in InvestmentAccount schema

    // Geographic Presence (simplified for InvestmentAccount)
    geographicPresence: account.geographicPresence || '',

    // ✅ UPDATED: Address Information - Extract from investmentAddress relationship
    addresses: addresses,

    // Legacy fields kept for form compatibility but not populated from database
    country: '',
    region: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    addressLine4: '',
    postalCode: '',
    city: '',

    // Financial Information (✅ UPDATED to match InvestmentAccount schema)
    annualRevenue: account.accountAnnualRevenueBand?.id || '', // ✅ FIXED: annualRevenue -> accountAnnualRevenueBand
    numberOfEmployees: account.companySize?.id || '', // ✅ FIXED: numberOfEmployees -> companySize (use id, not value)
    // ✅ REMOVED: currency: "", // Not available in InvestmentAccount schema

    // Additional Information (✅ UPDATED for InvestmentAccount)
    foundationDate: account.foundationDate ? new Date(account.foundationDate).toISOString().split('T')[0] : '',
    tickerSymbol: account.code || '', // ✅ UPDATED: Use code as ticker symbol
    // ✅ REMOVED: sicCode mapping - sicCode field removed from form

    // Contact Information - ✅ UPDATED: Include association metadata
    contactIds:
      account.investmentAccountContact?.map(rel => ({
        id: rel.contact.id,
        name: rel.contact.fullName || `${rel.contact.firstName || ''} ${rel.contact.lastName || ''}`.trim(),
        associationId: rel.id, // ✅ NEW: Capture association ID
        associationVersion: rel.version // ✅ NEW: Capture association version
      })) || [], // ✅ UPDATED: Store full contact objects with id, name, and association metadata

    // Legacy fields
    address: '',
    state: ''
  }

  return formValues
}

export const useInvestmentAccountData = (businessAppContext: BusinessAppContextProps) => {
  const [accountData, setAccountData] = useState<InvestmentAccountDataResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { fetchInvestmentAccountData } = useGetInvestmentAccountData(businessAppContext)

  // Function to map investment account data to form values (consistent with lead/contact pattern)
  const mapAccountToFormValues = useCallback(
    (accountData: InvestmentAccountDataResponse): Partial<AccountFormValues> => {
      return mapInvestmentAccountToFormValues(accountData)
    },
    []
  )

  // Extract accountId from businessAppContext
  const accountId =
    businessAppContext.additionalData?.accountId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.accountId

  useEffect(() => {
    const loadAccountData = async () => {
      if (!accountId || !businessAppContext.accessToken) {
        return
      }

      try {
        setLoading(true)
        setError(null)

        const result = await fetchInvestmentAccountData({ accountId })
        setAccountData(result)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error loading account data'
        console.error('❌ Account Data Hook: Error loading account data:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (accountId) {
      loadAccountData()
    }
  }, [accountId, businessAppContext.accessToken]) // Removed fetchAccountData to prevent infinite loops

  const refetch = useCallback(async () => {
    if (!accountId || !businessAppContext.accessToken) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await fetchInvestmentAccountData({ accountId })
      setAccountData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading account data'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [accountId, businessAppContext.accessToken]) // Removed fetchAccountData to prevent infinite loops

  return {
    accountData,
    loading,
    error,
    refetch,
    mapAccountToFormValues
  }
}

// ✅ BACKWARD COMPATIBILITY: Export old names for existing code
export const mapAccountToFormValues = mapInvestmentAccountToFormValues
export const useAccountData = useInvestmentAccountData
