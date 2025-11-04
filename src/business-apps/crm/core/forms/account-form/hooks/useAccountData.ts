import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AccountFormValues, Address } from '../types'
import { useGetAccountData, AccountDataResponse } from '../queries/AccountQueries'

// Map account data from API to form values
export const mapAccountToFormValues = (accountData: AccountDataResponse): Partial<AccountFormValues> => {
  if (!accountData?.Account?.[0]) {
    return {}
  }

  const account = accountData.Account[0]

  // Handle addresses - prioritize structured addresses, fallback to legacy
  let addresses: Address[] = []
  if (account.addresses && account.addresses.length > 0) {
    addresses = account.addresses.map((addr): Address => {
      return {
        id: addr.id || 'default-address', // ✅ Use actual UUID from backend
        version: addr.version,
        addressType: addr.addressType || 'UNKNOWN_ADDRESS',
        // ✅ CRM: addressLine is a String, convert to array for form
        addressLines: (addr.addressLine ? [addr.addressLine] : ['']) as string[],
        postalCode: addr.postalCode || '',
        city: addr.city || '',
        region: addr.regionRef || addr.region?.id || '', // ✅ Prefer regionRef (string), fallback to region.id
        country: addr.countryRef || addr.country?.id || '' // ✅ Prefer countryRef (string), fallback to country.id
      }
    })
  } else {
    // Create default address from legacy fields
    addresses = [
      {
        id: 'default-address',
        addressType: 'UNKNOWN_ADDRESS',
        addressLines: [''],
        postalCode: '',
        city: '',
        region: '',
        country: ''
      }
    ]
  }

  // ✅ CRITICAL: Populate legacy fields from first address for backward compatibility with UI
  const firstAddress = addresses[0]
  const legacyAddressLines = firstAddress?.addressLines || []

  const formValues: Partial<AccountFormValues> = {
    // System fields
    id: account.id,
    version: account.version !== null && account.version !== undefined ? Number(account.version) : undefined,

    // Account Information
    owner: account.ownerEmployee?.id || '',

    // Company Information
    accountName: account.name || '',
    legalForm: account.legalForm?.id || '',
    industry: account.industry?.id || '',
    website: account.website || '',

    // Campaign Information
    salesCampaignId: account.salesCampaignId || account.salesCampaign?.id || '',

    // Contact Information
    phone: account.phone || '',
    email: account.email || '',

    // Dynamic Addresses (for backend payload)
    addresses: addresses,

    // ✅ Legacy Address Fields (for UI display - populated from addresses[0])
    country: firstAddress?.country || '',
    region: firstAddress?.region || '',
    addressLine1: legacyAddressLines[0] || '',
    addressLine2: legacyAddressLines[1] || '',
    addressLine3: legacyAddressLines[2] || '',
    addressLine4: legacyAddressLines[3] || '',
    postalCode: firstAddress?.postalCode || '',
    city: firstAddress?.city || '',

    // Financial Information
    annualRevenue: account.annualRevenue?.id || '',
    numberOfEmployees: account.numberOfEmployees?.id || '', // ✅ FIXED: Use .id for catalog reference (not .value)

    // Additional Information
    // ✅ FIXED: Extract date part from ISO 8601 format for HTML date input
    foundationDate: account.foundationDate ? account.foundationDate.split('T')[0] : '',

    // ✅ Contact Information - Include association metadata (similar to IRM)
    contactIds:
      account.accountContacts?.map(rel => ({
        id: rel.contact.id,
        // ✅ CRM: Contact doesn't have fullName, construct it from firstName + lastName
        name: `${rel.contact.firstName || ''} ${rel.contact.lastName || ''}`.trim(),
        associationId: rel.id, // ✅ Capture association ID
        associationVersion: rel.version // ✅ Capture association version
      })) || [] // ✅ Store full contact objects with id, name, and association metadata
  }

  return formValues
}

export const useAccountData = (businessAppContext: BusinessAppContextProps) => {
  const [accountData, setAccountData] = useState<AccountDataResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { fetchAccountData } = useGetAccountData(businessAppContext)

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

        const result = await fetchAccountData({ accountId })

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
    } else {
      console.log('🔍 Account Data Hook: No accountId found in additionalData')
    }
  }, [accountId, businessAppContext.accessToken]) // Removed fetchAccountData to prevent infinite loops

  const refetch = useCallback(async () => {
    if (!accountId || !businessAppContext.accessToken) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await fetchAccountData({ accountId })
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
    refetch
  }
}
