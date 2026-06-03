import React, { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { AiButton, Spinner, toast } from '@newwork/nw-design-system'
import { Sparkles } from 'lucide-react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { toISOFormat } from '@/common/utils/dateFormatter'
import { useContactAiEnrich, type ContactAiEnrichResponse } from './useContactAiEnrich'

const PREFIX = 'ContactAiEnrich'

interface ContactAiEnrichButtonProps {
  accessToken: string | undefined
  /**
   * The entity kind string passed to the AI enrichment API. CRM mounts
   * this as 'contact', IRM as 'investment_contact'.
   */
  entityKind: 'contact' | 'investment_contact'
  /**
   * When true the button is hidden — typically passed when editing an
   * existing contact, where we don't want to overwrite saved data.
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

/**
 * Merge LLM-suggested communication channels into the form's existing list.
 *
 * Rules (mirror the Account/Lead behaviour):
 * - For each suggestion, look for an existing row with the same channel
 *   ref. If it exists and its value is empty, fill it in. If it has a
 *   value, leave it as-is (don't overwrite user input).
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
 * AI fill button shown above the Contact form. Reads first/last name and/or
 * email from the current form state and applies suggested person fields
 * without overwriting user-edited values. Unlike the Lead button, this
 * does NOT fill any company information — Contact has no embedded company
 * fields.
 */
const ContactAiEnrichButton: React.FC<ContactAiEnrichButtonProps> = ({
  accessToken,
  entityKind,
  isEditMode = false
}) => {
  const form = useFormContext<any>()
  const { runEnrichment, isLoading } = useContactAiEnrich(accessToken)

  const firstName = ((form.watch('firstName') as string | undefined) || '').trim()
  const lastName = ((form.watch('lastName') as string | undefined) || '').trim()
  // Contact's email lives inside the communicationChannels array; for the
  // trigger we accept it from a synthetic top-level "email" field if some
  // wrapper provides it, otherwise look it up in the array.
  const channels = (form.watch('communicationChannels') as CommunicationChannelRow[] | undefined) || []
  const emailFromChannels = channels.find(ch => ch.communicationChannelRef === 'CommunicationChannel:v1:e-mail')?.value
  const email = ((emailFromChannels as string | undefined) || '').trim()

  const hasFullName = firstName.length > 0 && lastName.length > 0
  const hasEmail = email.length > 0
  const canEnrich = hasFullName || hasEmail

  const subjectLabel = hasFullName ? `${firstName} ${lastName}` : email

  const applyResponse = useCallback(
    (response: ContactAiEnrichResponse): number => {
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
      setIfNotDirty('salutationRef', fields.salutationRef)
      setIfNotDirty('academicTitleRef', fields.academicTitleRef)
      setIfNotDirty('languageRef', fields.languageRef)
      setIfNotDirty('jobPosition', fields.jobPosition)
      setIfNotDirty('department', fields.department)
      // birthDate must be a full ISO string (the manual DateInput uses
      // outputFormat="iso"); normalising here keeps the submit payload in
      // the shape the backend marshaller expects.
      setIfNotDirty('birthDate', toISOFormat(fields.birthDate as string | undefined | null))
      setIfNotDirty('description', fields.description)
      setIfNotDirty('notesSummary', fields.notesSummary)
      setIfNotDirty('code', fields.code)

      // 2. Communication channels — merge into existing rows (skip rows
      //    whose value is already filled; append refs that don't exist).
      if (Array.isArray(fields.communicationChannels)) {
        const existing = form.getValues('communicationChannels') as CommunicationChannelRow[] | undefined
        const { merged, appliedCount: channelCount } = mergeCommunicationChannels(
          existing,
          fields.communicationChannels as CommunicationChannelRow[]
        )
        if (channelCount > 0) {
          form.setValue('communicationChannels', merged, {
            shouldDirty: false,
            shouldValidate: false
          })
          appliedCount += channelCount
        }
      }

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
        <span className="gba:text-sm gba:font-semibold">AI fill from web</span>
        <span className="gba:text-xs gba:text-muted-foreground">
          {canEnrich
            ? `Research "${subjectLabel}" online and pre-fill empty fields.`
            : 'Enter the contact\u2019s name or email first, then click to enrich.'}
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

export default ContactAiEnrichButton
