import React, { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { AiButton, Spinner, toast } from '@newwork/nw-design-system'
import { Sparkles } from 'lucide-react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import AiEnrichInfoTooltip from '../ai-enrich-info-tooltip/AiEnrichInfoTooltip'
import { useLeadAiEnrich, type LeadAiEnrichResponse } from './useLeadAiEnrich'

const PREFIX = 'LeadAiEnrich'

interface LeadAiEnrichButtonProps {
  accessToken: string | undefined
  /**
   * The entity kind string passed to the AI enrichment API. CRM mounts
   * this as 'lead', IRM as 'investment_lead'. Domain-agnostic component.
   */
  entityKind: 'lead' | 'investment_lead'
  /**
   * When true the button is hidden — typically passed when editing an
   * existing lead, where we don't want to overwrite saved data.
   */
  isEditMode?: boolean
}

/**
 * AI fill button shown above the Lead form. Reads the lead's first/last
 * name and/or email from the current form state, calls flowbot to research
 * the person (and, when possible, the linked employer) on the public web,
 * and applies the suggested fields without overwriting values the user has
 * already entered manually.
 *
 * The Lead form uses FLAT address paths (countryRef, regionRef,
 * addressLine, ...) — NOT the addresses[0].* nested array used by the
 * Account form. Country-scoped catalog fields (legalFormRef, regionRef)
 * are parented on countryRef, so we always set countryRef BEFORE its
 * dependent children.
 */
const LeadAiEnrichButton: React.FC<LeadAiEnrichButtonProps> = ({ accessToken, entityKind, isEditMode = false }) => {
  const form = useFormContext<any>()
  const { runEnrichment, isLoading } = useLeadAiEnrich(accessToken)

  const firstName = ((form.watch('firstName') as string | undefined) || '').trim()
  const lastName = ((form.watch('lastName') as string | undefined) || '').trim()
  const email = ((form.watch('email') as string | undefined) || '').trim()
  const hasFullName = firstName.length > 0 && lastName.length > 0
  const hasEmail = email.length > 0
  const canEnrich = hasFullName || hasEmail

  const subjectLabel = hasFullName ? `${firstName} ${lastName}` : email

  const applyResponse = useCallback(
    (response: LeadAiEnrichResponse): number => {
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

      // 1. Person scalar fields.
      setIfNotDirty('firstName', fields.firstName)
      setIfNotDirty('lastName', fields.lastName)
      setIfNotDirty('email', fields.email)
      setIfNotDirty('phoneNumber', fields.phoneNumber)
      setIfNotDirty('secondaryNumber', fields.secondaryNumber)
      setIfNotDirty('linkedinUrl', fields.linkedinUrl)
      setIfNotDirty('jobPosition', fields.jobPosition)
      setIfNotDirty('academicTitleRef', fields.academicTitleRef)
      setIfNotDirty('leadSourceRef', fields.leadSourceRef)
      setIfNotDirty('leadRatingRef', fields.leadRatingRef)
      setIfNotDirty('description', fields.description)

      // 2. Embedded company scalar fields.
      setIfNotDirty('companyName', fields.companyName)
      setIfNotDirty('companyWebsite', fields.companyWebsite)
      setIfNotDirty('companyEmail', fields.companyEmail)
      setIfNotDirty('companyPhone', fields.companyPhone)
      setIfNotDirty('companySizeRef', fields.companySizeRef)
      setIfNotDirty('accountAnnualRevenueBandRef', fields.accountAnnualRevenueBandRef)
      setIfNotDirty('industryClassRef', fields.industryClassRef)

      // 3. Flat address fields. The Lead schema uses individual top-level
      //    paths (NOT addresses[0].*), so we set each one directly. We
      //    avoid setting any country-scoped child until after countryRef.
      const currentAddressLine = form.getValues('addressLine') as
        | { lines?: Array<string | null> }
        | string
        | null
        | undefined
      const addressLineEmpty =
        currentAddressLine === undefined ||
        currentAddressLine === null ||
        (typeof currentAddressLine === 'string' && currentAddressLine.trim() === '') ||
        (typeof currentAddressLine === 'object' &&
          Array.isArray(currentAddressLine.lines) &&
          currentAddressLine.lines.every(line => !line || line.trim() === ''))
      if (addressLineEmpty && fields.addressLine && !dirtyFields['addressLine'] && !dirtyFields['addressLine.lines']) {
        form.setValue('addressLine', fields.addressLine, {
          shouldDirty: false,
          shouldValidate: false
        })
        appliedCount += 1
      }
      setIfNotDirty('locality', fields.locality)
      setIfNotDirty('postalCode', fields.postalCode)

      // 4. Country-scoped catalog refs LAST so the parent (countryRef) is
      //    in place before the catalog dependency engine evaluates the
      //    children.
      setIfNotDirty('countryRef', fields.countryRef)
      setIfNotDirty('regionRef', fields.regionRef)
      setIfNotDirty('legalFormRef', fields.legalFormRef)

      return appliedCount
    },
    [form]
  )

  const handleClick = useCallback(async () => {
    if (!canEnrich || isLoading) return

    const response = await runEnrichment({
      firstName: hasFullName ? firstName : undefined,
      lastName: hasFullName ? lastName : undefined,
      email: hasEmail ? email : undefined,
      entityKind
    })

    if (!response) {
      toast.error('AI enrichment failed. Please try again later.')
      return
    }

    const appliedCount = applyResponse(response)

    if (appliedCount === 0) {
      toast.info(response.notes || `No new fields could be filled for "${subjectLabel}". You can edit fields manually.`)
      return
    }

    toast.success(`Filled ${appliedCount} field${appliedCount === 1 ? '' : 's'} for "${subjectLabel}".`)
  }, [
    applyResponse,
    canEnrich,
    email,
    entityKind,
    firstName,
    hasEmail,
    hasFullName,
    isLoading,
    lastName,
    runEnrichment,
    subjectLabel
  ])

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
          {canEnrich
            ? `Research "${subjectLabel}" online and pre-fill empty fields (including the linked company).`
            : 'Enter the lead\u2019s name or email first, then click to enrich.'}
        </span>
      </div>
      <AiButton
        type="button"
        variant="default"
        size="sm"
        showIcon={false}
        onClick={handleClick}
        disabled={!canEnrich || isLoading}
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

export default LeadAiEnrichButton
