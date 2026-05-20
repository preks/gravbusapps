export type AbsenceCancellationTitleVariant = 'vacation' | 'sickLeave' | 'specialLeave' | 'requestForType'

export interface AbsenceCancellationTitleInfo {
  variant: AbsenceCancellationTitleVariant
  absenceTypeName?: string
}

const TYPE_REF_MARKERS = {
  vacation: ['A001'],
  sickLeave: ['A002'],
  specialLeave: ['A050'],
  businessTrip: ['A101'],
  remote: ['A170']
} as const

const NAME_MARKERS = {
  vacation: ['vacation', 'annual leave', 'holiday', 'urlaub'],
  sickLeave: ['sick', 'illness', 'krank'],
  specialLeave: ['special leave', 'child illness', 'child-illness', 'sonderurlaub'],
  remote: ['remote', 'work leave', 'workleave']
} as const

const includesAny = (value: string, markers: readonly string[]): boolean => {
  return markers.some(marker => value.includes(marker.toLowerCase()))
}

const normalizeText = (value?: string | null): string => {
  return (value || '').trim()
}

const resolveFallbackTypeNameFromTypeRef = (typeRef: string): string | null => {
  if (includesAny(typeRef, TYPE_REF_MARKERS.businessTrip)) {
    return 'Business Trip'
  }
  if (includesAny(typeRef, TYPE_REF_MARKERS.remote)) {
    return 'Remote'
  }
  return null
}

export const resolveAbsenceCancellationTitleInfo = (
  typeRef?: string | null,
  absenceTypeName?: string | null
): AbsenceCancellationTitleInfo | null => {
  const normalizedTypeRef = normalizeText(typeRef).toUpperCase()
  const normalizedTypeName = normalizeText(absenceTypeName)
  const normalizedTypeNameLower = normalizedTypeName.toLowerCase()

  const isVacation =
    includesAny(normalizedTypeRef, TYPE_REF_MARKERS.vacation) ||
    includesAny(normalizedTypeNameLower, NAME_MARKERS.vacation)
  if (isVacation) {
    return { variant: 'vacation' }
  }

  const isSickLeave =
    includesAny(normalizedTypeRef, TYPE_REF_MARKERS.sickLeave) ||
    includesAny(normalizedTypeNameLower, NAME_MARKERS.sickLeave)
  if (isSickLeave) {
    return { variant: 'sickLeave' }
  }

  const isSpecialLeave =
    includesAny(normalizedTypeRef, TYPE_REF_MARKERS.specialLeave) ||
    includesAny(normalizedTypeNameLower, NAME_MARKERS.specialLeave)
  if (isSpecialLeave) {
    return { variant: 'specialLeave' }
  }

  if (normalizedTypeName) {
    return { variant: 'requestForType', absenceTypeName: normalizedTypeName }
  }

  const fallbackTypeName = resolveFallbackTypeNameFromTypeRef(normalizedTypeRef)
  if (fallbackTypeName) {
    return { variant: 'requestForType', absenceTypeName: fallbackTypeName }
  }

  if (includesAny(normalizedTypeNameLower, NAME_MARKERS.remote)) {
    return { variant: 'requestForType', absenceTypeName: 'Remote' }
  }

  return null
}
