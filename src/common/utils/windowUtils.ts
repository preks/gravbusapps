import dayjs from 'dayjs'
export function getCurrentActiveStructureId(): string | null {
  // Try primary source: activeStructureId
  if (window?.lowcoder?.activeStructureId) {
    return window.lowcoder.activeStructureId
  }

  // Try fallback: platformContext.structureId
  if (window?.lowcoder?.platformContext?.structureId) {
    return window.lowcoder.platformContext.structureId
  }

  // No valid structure ID available - return null instead of a hardcoded value
  // This forces proper handling by the caller
  console.warn(
    '[getCurrentActiveStructureId] No active structure ID available. Check that window.lowcoder.activeStructureId or window.lowcoder.platformContext.structureId is set by the platform.'
  )
  return null
}

/**
 * Returns the context object cotaining several
 * IDs of the logged-in user like: employeeId,
 * structureId, organizationalUnitId, managerId.
 *
 * @returns {Object} context - The context object.
 * @returns {uuid} context.employeeId - The logged-in employeeId.
 * @returns {uuid} context.structureId - The structureId of the employee.
 * @returns {uuid} context.organizationalUnitId - The organizationalUnitId of the employee.
 * @returns {uuid} context.managerId - The employeeId of the manager.
 * @returns {uuid} context.locationId - The locationId of the manager.
 */
export function getPlatformContext() {
  // Start from the platform-provided context when available
  const base: any = window.lowcoder?.platformContext
    ? { ...(window.lowcoder as any).platformContext }
    : { structureId: getCurrentActiveStructureId() ?? '' }

  // Try to ensure employeeDetails.userId exists for flows referencing it
  // Derive from multiple potential sources available on the host platform
  const derivedUserId =
    (window as any)?.lowcoder?.userInfo?.id ||
    (window as any)?.lowcoder?.platformContext?.userId ||
    (window as any)?.lowcoder?.currentUser?.id ||
    (window as any)?.lowcoder?.user?.id ||
    base?.employeeDetails?.userId

  // Always provide an employeeDetails object so expressions like #{employeeDetails.userId} resolve
  base.employeeDetails = {
    ...(base.employeeDetails || {}),
    userId:
      base.employeeDetails?.userId ||
      derivedUserId ||
      (window as any)?.lowcoder?.user?.id ||
      (window as any)?.lowcoder?.currentUser?.id ||
      ''
  }

  // Fallback: if userId is still empty but we have employeeId, reuse it
  if (!base.employeeDetails.userId && base.employeeId) {
    base.employeeDetails.userId = base.employeeId
  }

  // Normalize: if userId is present but not a UUID and employeeId is a UUID, use employeeId
  const isUuid = (v: any) =>
    typeof v === 'string' &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v)
  if (!isUuid(base.employeeDetails.userId) && isUuid(base.employeeId)) {
    base.employeeDetails.userId = base.employeeId
  }

  // Also expose a top-level userId for flows that expect it
  base.userId = base.userId || base.employeeDetails.userId || (window as any)?.lowcoder?.platformContext?.userId || ''

  return base
}

export function getCurrentActiveUserLocale(): string {
  if (window?.lowcoder?.i18n && window?.lowcoder?.i18n?.selectedLocale) {
    return window?.lowcoder?.i18n?.selectedLocale
  }
  return 'en-US'
}

export function getCatalogValue(catalogEntry: any): string {
  // Handle null, undefined, or empty catalogEntry
  if (!catalogEntry) {
    return ''
  }

  try {
    const currentLocale = (window?.lowcoder?.i18n?.selectedLocale || 'en-US').toLowerCase()
    if (Array.isArray(catalogEntry.translations)) {
      const translation = catalogEntry.translations.find((t: any) => t?.localeCode?.toLowerCase() === currentLocale)
      if (translation && translation.value) return translation.value
    }
    return catalogEntry.value || ''
  } catch {
    return catalogEntry?.value || ''
  }
}

export function getDateFormat(format: string): string {
  if (window?.lowcoder?.getDateFormat) return window.lowcoder.getDateFormat(format)
  return 'DD.MM.YYYY'
}

export function getTranslationFromI18nKeyAndLabel(
  key: string,
  defaultValue: string,
  translationVariables?: Record<string, unknown>
) {
  if (globalThis.window === undefined) {
    return defaultValue
  }
  if (typeof globalThis.window?.lowcoder?.i18n?.t !== 'function') {
    return defaultValue
  }
  const translation = globalThis.window?.lowcoder?.i18n?.t(key, {
    defaultValue,
    ...(translationVariables || {})
  })
  if (key?.split('lowcoder:')?.[1] === translation) {
    return defaultValue
  }
  return translation || defaultValue
}

export const formatDate = (
  dateValue: Date | string | undefined,
  format: string = 'date.short',
  customSpecificFormat: string | null = null
): string | undefined => {
  if (!dateValue) return dateValue

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return undefined

  // Prefer platform formatter when available; fall back if it returns nothing useful
  if (typeof window?.lowcoder?.i18n?.formatDate === 'function') {
    const out = window.lowcoder.i18n.formatDate(date, format, customSpecificFormat)
    if (out != null && out !== '' && out !== '-') return out
  }

  // Fallback: format locally for dev/local or when platform returned invalid
  try {
    // If a specific format is provided, use dayjs to respect it
    if (customSpecificFormat) {
      return dayjs(date).format(customSpecificFormat)
    }

    const locale = getCurrentActiveUserLocale() || 'en-US'

    // Map common keys to Intl options
    const toLocale = (opts: Intl.DateTimeFormatOptions) => date.toLocaleDateString(locale, opts)

    switch (format) {
      case 'date.short':
        return toLocale({ year: '2-digit', month: '2-digit', day: '2-digit' })
      case 'date.monthDay':
        return toLocale({ month: 'short', day: 'numeric' })
      case 'date.medium':
        return toLocale({ year: 'numeric', month: 'short', day: '2-digit' })
      case 'date.long':
        return toLocale({ year: 'numeric', month: 'long', day: '2-digit' })
      case 'fullDateTime.ISO':
        return date.toISOString()
      default:
        // Attempt a dayjs parse of an arbitrary token format, else default short
        if (/[YMD]/.test(format)) return dayjs(date).format(format)
        return toLocale({ year: '2-digit', month: '2-digit', day: '2-digit' })
    }
  } catch {
    // Safe final fallback
    return dayjs(date).format('YYYY-MM-DD')
  }
}

export const formatNumberFunction = (number: number | string, format: string = '0.00[,]00'): string => {
  if (!window.lowcoder?.i18n?.formatNumber || typeof window.lowcoder.i18n?.formatNumber !== 'function') {
    return String(number)
  }

  const numericValue = typeof number === 'string' ? parseFloat(number) : number

  return window.lowcoder.i18n.formatNumber(numericValue, format)
}

export const formatDateToISO = (dateValue: Date): Date | string | undefined => {
  if (!dateValue) return ''
  try {
    if (!window?.lowcoder?.i18n?.l10nResources?.dateTime['fullDateTime.ISO']) {
      return dateValue
    }
    if (window.lowcoder.formatDate) return window.lowcoder.formatDate(dateValue, 'fullDateTime.ISO')
    return dateValue.toISOString()
  } catch {
    return dateValue
  }
}
