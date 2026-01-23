import { useState, useCallback, useEffect, Dispatch, SetStateAction } from 'react'
import { UseFormReturn } from 'react-hook-form'
import type { AutocompleteOption } from '@newwork/nw-design-system'
import { CommunicationChannelCode, CommunicationChannelType } from '@/common/data/common/types/commonTypes'

/**
 * Props for useLeadAccountAutocomplete hook
 */
interface UseLeadAccountAutocompleteProps {
  /** React Hook Form instance */
  form: UseFormReturn<any>
  /** Function to fetch accounts - domain-agnostic (CRM or IRM) */
  fetchAccounts: (params: { search: string; limit: number }) => Promise<{ accounts: any[] }>
}

/**
 * Return type for useLeadAccountAutocomplete hook
 */
interface UseLeadAccountAutocompleteReturn {
  /** Autocomplete options for account search */
  accountSearchOptions: AutocompleteOption[]
  /** Loading state for account search */
  accountSearchLoading: boolean
  /** Set of field names that were auto-filled */
  autoFilledFields: Set<string>
  /** Whether company section should be expanded */
  expandCompanySection: boolean
  /** Handler for account search input */
  handleAccountSearch: (query: string) => Promise<void>
  /** Handler for account selection */
  handleAccountSelect: (accountId: string, accountData: any) => void
  /** Handler for field changes (removes auto-fill highlight) */
  handleFieldChange: (fieldName: string) => void
  /** Setter for auto-filled fields (for reset on submit) */
  setAutoFilledFields: Dispatch<SetStateAction<Set<string>>>
  /** Setter for company section expansion (for reset on submit) */
  setExpandCompanySection: Dispatch<SetStateAction<boolean>>
}

/**
 * Custom hook for lead form account autocomplete functionality
 *
 * Handles:
 * - Account search with loading state
 * - Auto-filling form fields from selected account
 * - Tracking which fields were auto-filled (for visual highlighting)
 * - Address line parsing (JSON/object/string formats)
 * - Communication channel extraction
 * - Region/country bidirectional auto-fill
 *
 * @example
 * ```typescript
 * const { fetchCustomerAccounts } = useCustomerAccounts(context)
 *
 * const {
 *   accountSearchOptions,
 *   accountSearchLoading,
 *   autoFilledFields,
 *   handleAccountSearch,
 *   handleAccountSelect,
 *   handleFieldChange
 * } = useLeadAccountAutocomplete({
 *   form,
 *   fetchAccounts: fetchCustomerAccounts
 * })
 * ```
 */
export function useLeadAccountAutocomplete({
  form,
  fetchAccounts
}: UseLeadAccountAutocompleteProps): UseLeadAccountAutocompleteReturn {
  // Account search state
  const [accountSearchOptions, setAccountSearchOptions] = useState<AutocompleteOption[]>([])
  const [accountSearchLoading, setAccountSearchLoading] = useState(false)

  // Track auto-filled fields
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set())

  // Track if company section should be expanded
  const [expandCompanySection, setExpandCompanySection] = useState(false)

  // Track when country is auto-selected by CatalogSelect (bidirectional from region)
  useEffect(() => {
    const subscription = form.watch((value: any, { name }: any) => {
      // When countryRef changes and regionRef is auto-filled, mark countryRef as auto-filled too
      if (name === 'countryRef' && value.countryRef && autoFilledFields.has('regionRef')) {
        setAutoFilledFields(prev => {
          if (!prev.has('countryRef')) {
            const next = new Set(prev)
            next.add('countryRef')
            return next
          }
          return prev
        })
      }
    })
    return () => subscription.unsubscribe()
  }, [form, autoFilledFields])

  // Account search handler
  const handleAccountSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setAccountSearchOptions([])
        return
      }

      setAccountSearchLoading(true)
      try {
        const result = await fetchAccounts({ search: query, limit: 20 })
        const options: AutocompleteOption[] = result.accounts.map(account => ({
          value: account.id || '',
          label: account.name || 'Unknown',
          data: account
        }))
        setAccountSearchOptions(options)
      } catch (err) {
        console.error('Error searching accounts:', err)
        setAccountSearchOptions([])
      } finally {
        setAccountSearchLoading(false)
      }
    },
    [fetchAccounts]
  )

  // Account selection handler - auto-fills form fields
  const handleAccountSelect = useCallback(
    (_accountId: string, accountData: any) => {
      if (!accountData) return

      // Auto-fill company fields from selected account
      const updates: Record<string, any> = {}
      const filledFields: string[] = []

      // Direct fields from account
      if (accountData.name) {
        updates.companyName = accountData.name
        filledFields.push('companyName')
      }
      if (accountData.legalFormRef) {
        updates.legalFormRef = accountData.legalFormRef
        filledFields.push('legalFormRef')
      }
      if (accountData.industryClassRef) {
        updates.industryClassRef = accountData.industryClassRef
        filledFields.push('industryClassRef')
      }
      if (accountData.website) {
        updates.companyWebsite = accountData.website
        filledFields.push('companyWebsite')
      }
      if (accountData.companySizeRef) {
        updates.companySizeRef = accountData.companySizeRef
        filledFields.push('companySizeRef')
      }
      if (accountData.accountAnnualRevenueBandRef) {
        updates.accountAnnualRevenueBandRef = accountData.accountAnnualRevenueBandRef
        filledFields.push('accountAnnualRevenueBandRef')
      }

      // Extract first address if available
      let addressLineData: { lines: string[] } | null = null
      if (accountData.addresses && accountData.addresses.length > 0) {
        const firstAddress = accountData.addresses[0]

        // Handle addressLine - it can be a string, an object with 'lines' array, or JSON string
        if (firstAddress.addressLine) {
          let addressLineValue = firstAddress.addressLine

          // If it's a string that looks like JSON, try to parse it
          if (typeof addressLineValue === 'string') {
            try {
              const parsed = JSON.parse(addressLineValue)
              if (parsed && typeof parsed === 'object' && parsed.lines) {
                addressLineValue = parsed
              }
            } catch {
              // Not JSON, keep as string
            }
          }

          // Now handle the different formats
          if (typeof addressLineValue === 'object' && addressLineValue.lines) {
            // Object with lines array
            addressLineData = addressLineValue
          } else if (typeof addressLineValue === 'string') {
            // Plain string - wrap in expected format
            addressLineData = { lines: [addressLineValue] }
          }

          if (addressLineData) {
            filledFields.push('addressLine.lines')
          }
        }

        if (firstAddress.postalCode) {
          updates.postalCode = firstAddress.postalCode
          filledFields.push('postalCode')
        }
        if (firstAddress.locality) {
          updates.locality = firstAddress.locality
          filledFields.push('locality')
        }

        // CRITICAL: Set region FIRST (if available), CatalogSelect will auto-select country
        // due to bidirectional relationship. Only set country if no region is available.
        if (firstAddress.regionRef) {
          updates.regionRef = firstAddress.regionRef
          filledFields.push('regionRef')
          // Country will be auto-selected by CatalogSelect bidirectional logic
          // Mark it as filled for visual highlighting
          filledFields.push('countryRef')
        } else if (firstAddress.countryRef) {
          // Only set country if no region is available
          updates.countryRef = firstAddress.countryRef
          filledFields.push('countryRef')
        }
      }

      // Extract communication channels (email and phone)
      if (accountData.communicationChannels && accountData.communicationChannels.length > 0) {
        const emailChannel = accountData.communicationChannels.find(
          (ch: any) =>
            ch.communicationChannel?.code === CommunicationChannelCode.EMAIL ||
            ch.communicationChannel?.type === CommunicationChannelType.EMAIL
        )
        const phoneChannel = accountData.communicationChannels.find(
          (ch: any) =>
            ch.communicationChannel?.code === CommunicationChannelCode.PHONE ||
            ch.communicationChannel?.type === CommunicationChannelType.TEL
        )

        if (emailChannel?.value) {
          updates.companyEmail = emailChannel.value
          filledFields.push('companyEmail')
        }
        if (phoneChannel?.value) {
          updates.companyPhone = phoneChannel.value
          filledFields.push('companyPhone')
        }
      }

      // Apply all updates to form
      Object.entries(updates).forEach(([key, value]) => {
        form.setValue(key, value)
      })

      // Handle addressLine separately for field array compatibility
      if (addressLineData?.lines) {
        form.setValue('addressLine.lines', addressLineData.lines)
      }

      // Mark fields as auto-filled
      setAutoFilledFields(new Set(filledFields))

      // Expand company section when account is selected
      setExpandCompanySection(true)

      // If region was set, wait a bit for CatalogSelect to auto-select country, then mark it as auto-filled
      if (filledFields.includes('regionRef')) {
        setTimeout(() => {
          const currentCountry = form.getValues('countryRef')
          if (currentCountry) {
            setAutoFilledFields(prev => {
              const next = new Set(prev)
              next.add('countryRef')
              return next
            })
          }
        }, 100)
      }
    },
    [form]
  )

  // Field change handler - removes auto-fill highlighting
  const handleFieldChange = useCallback((fieldName: string) => {
    setAutoFilledFields(prev => {
      const next = new Set(prev)
      next.delete(fieldName)
      return next
    })
  }, [])

  return {
    accountSearchOptions,
    accountSearchLoading,
    autoFilledFields,
    expandCompanySection,
    handleAccountSearch,
    handleAccountSelect,
    handleFieldChange,
    setAutoFilledFields,
    setExpandCompanySection
  }
}
