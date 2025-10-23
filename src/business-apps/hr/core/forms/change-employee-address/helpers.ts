import { ensureFourLines, buildDeletePayload } from './utils'

export interface PopulateOptions {
  setIsSwitchingSelection?: (value: boolean) => void
  setAddressLineCount: (updater: number | ((c: number) => number)) => void
  setAddressLinesError: (msg: string | null) => void
  setIsDeleteMode?: (value: boolean) => void
  setSelectedAddressId?: boolean
  selectionVersionRef?: { current: number }
  expectedSelectedId?: string
}

// Safely populate react-hook-form values from an address record with correct sequencing
// to avoid transient validation flashes (country → region dependency).
export const populateFormFromRecord = (form: any, record: any, options: PopulateOptions) => {
  if (!record) return
  const {
    setIsSwitchingSelection,
    setAddressLineCount,
    setAddressLinesError,
    setIsDeleteMode,
    setSelectedAddressId = true
  } = options

  setIsSwitchingSelection?.(true)

  try {
    if (form.clearErrors) {
      form.clearErrors(['regionId'])
    }
  } catch {
    // Ignore clearErrors errors
  }
  try {
    if (form.resetField) {
      form.resetField('regionId', { keepError: false, keepDirty: false, keepTouched: false, defaultValue: null })
    }
  } catch {
    // Ignore resetField errors
  }

  if (setSelectedAddressId) {
    form.setValue('selectedAddressId', String(record.id), { shouldDirty: false, shouldValidate: false } as any)
  }

  form.setValue('regionId', null, { shouldDirty: false, shouldValidate: false, shouldTouch: false } as any)
  form.setValue('countryId', record?.country?.id || null, { shouldDirty: false, shouldValidate: false } as any)

  const normalizedLines = ensureFourLines(record?.addressLine || [])
  form.setValue('addressLines', normalizedLines, { shouldDirty: false } as any)
  form.setValue('postalCode', record?.postalCode || '', { shouldDirty: false } as any)
  form.setValue('city', record?.locality || '', { shouldDirty: false } as any)

  let lastNonEmpty = -1
  for (let i = 0; i < 4; i++) {
    if ((normalizedLines[i] || '').trim() !== '') lastNonEmpty = i
  }
  setAddressLineCount(Math.max(1, lastNonEmpty + 1))
  setAddressLinesError(null)
  setIsDeleteMode?.(false)

  const applyVersion = options.selectionVersionRef?.current ?? 0
  setTimeout(() => {
    const stillCurrent = options.selectionVersionRef ? options.selectionVersionRef.current === applyVersion : true
    const selectedMatches = options.expectedSelectedId
      ? String(form.getValues('selectedAddressId')) === String(options.expectedSelectedId)
      : true
    if (stillCurrent && selectedMatches) {
      form.setValue('regionId', record?.region?.id || null, {
        shouldDirty: false,
        shouldValidate: false,
        shouldTouch: false
      } as any)
      try {
        if (form.trigger) {
          form.trigger(['countryId', 'regionId'])
        }
      } catch {
        // Ignore trigger errors
      }
    }
    setIsSwitchingSelection?.(false)
  }, 0)
}

// Build a delete payload strictly from server-fetched record (no FE-modified values).
export const buildDeletePayloadFromRecord = (employeeId: string, record: any) => {
  return buildDeletePayload({
    employeeId,
    employeeDocumentId: record?.employeeDocumentId || null,
    lines: ensureFourLines(record?.addressLine || []),
    postalCode: record?.postalCode || '',
    city: record?.locality || '',
    regionId: record?.region?.id || null,
    countryId: record?.country?.id || null,
    comment: record?.comment || '',
    selected: record
  })
}

export const restoreSelectionFromId = (
  form: any,
  addresses: any[],
  selectedId: string | null,
  options: PopulateOptions
) => {
  if (!selectedId) return
  const record = addresses.find((a: any) => String(a.id) === String(selectedId))
  if (!record) return
  populateFormFromRecord(form, record, options)
}
