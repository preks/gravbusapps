import React, { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { AiButton, Spinner, toast } from '@newwork/nw-design-system'
import { Sparkles } from 'lucide-react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { toISOFormat } from '@/common/utils/dateFormatter'
import AiEnrichInfoTooltip from '../ai-enrich-info-tooltip/AiEnrichInfoTooltip'
import { useAccountAiEnrich, type AccountAiEnrichResponse } from './useAccountAiEnrich'

const PREFIX = 'AccountAiEnrich'

interface AccountAiEnrichButtonProps {
  accessToken: string | undefined
  /**
   * The entity kind string passed to the AI enrichment API (e.g. 'account', 'investment_account').
   * Each domain supplies its own value; the component stays domain-agnostic.
   */
  entityKind: string
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

const ADDRESS_SCALAR_KEYS = ['locality', 'postalCode', 'countryRef', 'regionRef'] as const
type AddressScalarKey = (typeof ADDRESS_SCALAR_KEYS)[number]

/**
 * AI fill button shown above the Account form. Reads the company name from
 * the current form state, calls flowbot to research the company on the public
 * web, and applies the suggested fields to the form without overwriting
 * values the user has already entered manually.
 */
const AccountAiEnrichButton: React.FC<AccountAiEnrichButtonProps> = ({
  accessToken,
  entityKind,
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

      // 1. Country-independent scalar fields.
      setIfNotDirty('name', fields.name)
      setIfNotDirty('website', fields.website)
      setIfNotDirty('description', fields.description)
      // foundationDate must be a full ISO string (the manual DateInput uses
      // outputFormat="iso"); normalising here keeps the submit payload in
      // the shape the backend marshaller expects.
      setIfNotDirty('foundationDate', toISOFormat(fields.foundationDate))
      setIfNotDirty('companySizeRef', fields.companySizeRef)
      setIfNotDirty('industryClassRef', fields.industryClassRef)
      setIfNotDirty('accountAnnualRevenueBandRef', fields.accountAnnualRevenueBandRef)

      // 2. Communication channels (independent of country).
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

      // 3. Addresses. Apply each sub-path individually with a nested
      //    setValue path. Do NOT call form.setValue('addresses', ...) on the
      //    whole array — CatalogSelectProvider's form.watch() subscription
      //    tracks each nested key exactly (e.g. 'addresses.0.countryRef')
      //    and ignores changes whose `info.name` isn't one of the tracked
      //    keys. Setting the root array path emits info.name='addresses',
      //    which bypasses the provider and leaves the country / region
      //    CatalogSelect components showing empty even though RHF state
      //    holds the value.
      //
      //    Addresses MUST also be applied before any country-scoped catalog
      //    fields (legalFormRef): that select uses
      //    parentField='addresses.0.countryRef' + requireSourceForEnable,
      //    so we need the country in place before we set the child.
      if (Array.isArray(fields.addresses) && fields.addresses.length > 0) {
        const suggested = (fields.addresses as AddressRow[])[0] || {}
        const existing = (form.getValues('addresses') as AddressRow[] | undefined) || []
        // AddressSegment auto-appends an empty row on mount so existing[0]
        // is normally there; guard anyway for forms that opt out.
        if (existing.length === 0) {
          form.setValue(
            'addresses',
            [
              {
                addressLine: { lines: [''] },
                postalCode: '',
                locality: '',
                countryRef: '',
                regionRef: ''
              }
            ],
            { shouldDirty: false, shouldValidate: false }
          )
        }

        const firstCurrent = (form.getValues('addresses.0') as AddressRow | undefined) || {}

        if (isAddressLineEmpty(firstCurrent.addressLine) && !isAddressLineEmpty(suggested.addressLine)) {
          form.setValue('addresses.0.addressLine', suggested.addressLine, {
            shouldDirty: false,
            shouldValidate: false
          })
          appliedCount += 1
        }

        for (const key of ADDRESS_SCALAR_KEYS) {
          const current = firstCurrent[key as AddressScalarKey]
          const incoming = suggested[key as AddressScalarKey]
          const isCurrentEmpty =
            current === undefined || current === null || (typeof current === 'string' && current.trim() === '')
          if (!isCurrentEmpty) continue
          if (incoming === undefined || incoming === null || incoming === '') continue
          form.setValue(`addresses.0.${key}`, incoming, { shouldDirty: false, shouldValidate: false })
          appliedCount += 1
        }
      }

      // 4. Country-scoped catalog refs LAST, so the parent (countryRef) is
      //    already in place and the catalog dependency engine accepts the
      //    child value instead of clearing it.
      setIfNotDirty('legalFormRef', fields.legalFormRef)

      return appliedCount
    },
    [form]
  )

  const handleClick = useCallback(async () => {
    if (!hasCompanyName || isLoading) return

    const response = await runEnrichment({
      companyName,
      entityKind
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
  }, [entityKind, applyResponse, companyName, hasCompanyName, isLoading, runEnrichment])

  if (isEditMode) return null

  return (
    <div
      className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-lg gba:border gba:border-dashed gba:border-primary/40 gba:bg-primary/5 gba:p-3 gba:mb-4"
      data-testid={formatDataTestId(PREFIX, 'Container')}
    >
      <div className="gba:flex gba:flex-col gba:min-w-0">
        <div className="gba:flex gba:items-center gba:gap-1.5">
          <span className="gba:text-sm gba:font-semibold">AI fill from web</span>
          <AiEnrichInfoTooltip testIdPrefix={PREFIX} />
        </div>
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
