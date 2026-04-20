import React, { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { AiButton, Spinner, toast } from '@newwork/nw-design-system'
import { Sparkles } from 'lucide-react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useAccountAiEnrich, type AccountAiEnrichResponse } from './useAccountAiEnrich'

const PREFIX = 'AccountAiEnrich'

interface AccountAiEnrichButtonProps {
  accessToken: string | undefined
  /** Whether this is a CRM Account or an IRM InvestmentAccount form. */
  accountContext: 'crm' | 'irm'
  /**
   * When true the button is hidden — typically passed when editing an
   * existing account, where we don't want to overwrite saved data.
   */
  isEditMode?: boolean
}

interface CommunicationChannelRow {
  id?: string
  version?: number
  communicationChannelRef: string
  value?: string
  valueExtension?: string | null
}

interface AddressLineObject {
  lines: Array<string | null>
}

interface AddressRow {
  id?: string
  version?: number
  addressType?: string | null
  addressLine?: string | null | AddressLineObject
  countryRef?: string | null
  regionRef?: string | null
  postalCode?: string | null
  locality?: string | null
}

const isAddressLineEmpty = (value: AddressRow['addressLine']): boolean => {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (typeof value === 'object' && Array.isArray(value.lines)) {
    return value.lines.every(line => !line || line.trim() === '')
  }
  return true
}

/**
 * Merge LLM-suggested communication channels into the form's existing list.
 *
 * Rules:
 * - For each suggestion, look for an existing row with the same channel ref.
 *   If it exists and its value is empty, fill it in. If it has a value, leave
 *   it as-is (don't overwrite user input).
 * - If no row exists for that channel ref, append a new row.
 */
function mergeCommunicationChannels(
  existing: CommunicationChannelRow[] | undefined,
  suggested: CommunicationChannelRow[]
): { merged: CommunicationChannelRow[]; appliedCount: number } {
  const result: CommunicationChannelRow[] = (existing || []).map(row => ({ ...row }))
  let appliedCount = 0

  for (const suggestion of suggested) {
    if (!suggestion.value?.trim()) continue
    const idx = result.findIndex(row => row.communicationChannelRef === suggestion.communicationChannelRef)
    if (idx >= 0) {
      if (!result[idx].value?.trim()) {
        result[idx] = { ...result[idx], value: suggestion.value }
        appliedCount += 1
      }
    } else {
      result.push({
        communicationChannelRef: suggestion.communicationChannelRef,
        value: suggestion.value
      })
      appliedCount += 1
    }
  }

  return { merged: result, appliedCount }
}

/**
 * Merge a single suggested address into the form's existing addresses list.
 *
 * Rules:
 * - If there is no existing address, add the suggestion.
 * - If the first existing address has any non-empty user-entered field, leave
 *   it alone.
 * - Otherwise, fill empty subfields of the first address from the suggestion.
 */
function mergeFirstAddress(
  existing: AddressRow[] | undefined,
  suggested: AddressRow
): { merged: AddressRow[]; appliedCount: number } {
  if (!existing || existing.length === 0) {
    return { merged: [suggested], appliedCount: Object.keys(suggested).length }
  }

  const first: AddressRow = { ...existing[0] }
  let appliedCount = 0

  const fillScalarIfEmpty = (key: 'locality' | 'postalCode' | 'countryRef' | 'regionRef') => {
    const current = first[key]
    const incoming = suggested[key]
    const isEmpty = current === undefined || current === null || (typeof current === 'string' && current.trim() === '')
    if (isEmpty && incoming !== undefined && incoming !== null && incoming !== '') {
      first[key] = incoming as any
      appliedCount += 1
    }
  }

  if (isAddressLineEmpty(first.addressLine) && !isAddressLineEmpty(suggested.addressLine)) {
    first.addressLine = suggested.addressLine
    appliedCount += 1
  }

  fillScalarIfEmpty('locality')
  fillScalarIfEmpty('postalCode')
  fillScalarIfEmpty('countryRef')
  fillScalarIfEmpty('regionRef')

  return { merged: [first, ...existing.slice(1)], appliedCount }
}

/**
 * AI fill button shown above the Account form. Reads the company name from
 * the current form state, calls flowbot to research the company on the public
 * web, and applies the suggested fields to the form without overwriting
 * values the user has already entered manually.
 */
const AccountAiEnrichButton: React.FC<AccountAiEnrichButtonProps> = ({
  accessToken,
  accountContext,
  isEditMode = false
}) => {
  const form = useFormContext<any>()
  const { runEnrichment, isLoading } = useAccountAiEnrich(accessToken)

  const companyName = (form.watch('name') as string | undefined) || ''
  const hasCompanyName = companyName.trim().length > 0

  const applyResponse = useCallback(
    (response: AccountAiEnrichResponse): number => {
      const fields = response.fields || {}
      const dirtyFields = (form.formState.dirtyFields || {}) as Record<string, unknown>
      let appliedCount = 0

      const setIfNotDirty = (path: string, value: unknown) => {
        if (value === undefined || value === null) return
        if (typeof value === 'string' && value.trim() === '') return
        if (dirtyFields[path]) return
        const current = form.getValues(path)
        if (typeof current === 'string' && current.trim() !== '') return
        form.setValue(path, value, { shouldDirty: false, shouldValidate: false })
        appliedCount += 1
      }

      setIfNotDirty('name', fields.name)
      setIfNotDirty('website', fields.website)
      setIfNotDirty('description', fields.description)
      setIfNotDirty('foundationDate', fields.foundationDate)
      setIfNotDirty('companySizeRef', fields.companySizeRef)
      setIfNotDirty('legalFormRef', fields.legalFormRef)
      setIfNotDirty('industryClassRef', fields.industryClassRef)
      setIfNotDirty('accountAnnualRevenueBandRef', fields.accountAnnualRevenueBandRef)

      if (Array.isArray(fields.communicationChannels)) {
        const existing = form.getValues('communicationChannels') as CommunicationChannelRow[] | undefined
        const { merged, appliedCount: channelCount } = mergeCommunicationChannels(
          existing,
          fields.communicationChannels as CommunicationChannelRow[]
        )
        if (channelCount > 0) {
          form.setValue('communicationChannels', merged, { shouldDirty: false, shouldValidate: false })
          appliedCount += channelCount
        }
      }

      if (Array.isArray(fields.addresses) && fields.addresses.length > 0) {
        const existing = form.getValues('addresses') as AddressRow[] | undefined
        const { merged, appliedCount: addrCount } = mergeFirstAddress(existing, (fields.addresses as AddressRow[])[0])
        if (addrCount > 0) {
          form.setValue('addresses', merged, { shouldDirty: false, shouldValidate: false })
          appliedCount += addrCount
        }
      }

      return appliedCount
    },
    [form]
  )

  const handleClick = useCallback(async () => {
    if (!hasCompanyName || isLoading) return

    const response = await runEnrichment({
      companyName,
      entityKind: accountContext === 'irm' ? 'investment_account' : 'account'
    })

    if (!response) {
      toast.error('AI enrichment failed. Please try again later.')
      return
    }

    const appliedCount = applyResponse(response)

    if (appliedCount === 0) {
      toast.info(response.notes || `No new fields could be filled for "${companyName}". You can edit fields manually.`)
      return
    }

    toast.success(`Filled ${appliedCount} field${appliedCount === 1 ? '' : 's'} for "${companyName}".`)
  }, [accountContext, applyResponse, companyName, hasCompanyName, isLoading, runEnrichment])

  if (isEditMode) return null

  return (
    <div
      className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-lg gba:border gba:border-dashed gba:border-primary/40 gba:bg-primary/5 gba:p-3 gba:mb-4"
      data-testid={formatDataTestId(PREFIX, 'Container')}
    >
      <div className="gba:flex gba:flex-col gba:min-w-0">
        <span className="gba:text-sm gba:font-semibold">AI fill from web</span>
        <span className="gba:text-xs gba:text-muted-foreground">
          {hasCompanyName
            ? `Research "${companyName}" online and pre-fill empty fields.`
            : 'Enter the company name first, then click to enrich.'}
        </span>
      </div>
      <AiButton
        type="button"
        variant="default"
        size="sm"
        showIcon={false}
        onClick={handleClick}
        disabled={!hasCompanyName || isLoading}
        data-testid={formatDataTestId(PREFIX, 'Button')}
      >
        {isLoading ? (
          <span className="gba:flex gba:items-center gba:gap-2">
            <Spinner className="gba:h-4 gba:w-4" />
            Researching…
          </span>
        ) : (
          <span className="gba:flex gba:items-center gba:gap-2">
            <Sparkles className="gba:h-4 gba:w-4" />
            AI fill
          </span>
        )}
      </AiButton>
    </div>
  )
}

export default AccountAiEnrichButton
