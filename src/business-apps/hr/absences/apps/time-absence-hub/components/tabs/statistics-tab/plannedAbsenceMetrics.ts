type AbsenceLike = {
  type?: {
    id?: string | null
    value?: string | null
    parentEntryId?: string | null
    parentEntry?: {
      id?: string | null
      value?: string | null
      translations?: Array<{ value?: string | null }> | null
    } | null
    translations?: Array<{ value?: string | null }> | null
  } | null
  typeRef?: string | null
  typeName?: string | null
  groupName?: string | null
  title?: string | null
}

export interface PlannedAbsenceMetrics {
  plannedCount: number
  unplannedCount: number
  totalRelevantCount: number
  plannedPct: number
  unplannedPct: number
}

const PLANNED_MARKERS = ['absencegroup:v1:recr', 'absencetype:v1:a001', 'a001', 'vacation', 'annual leave', 'urlaub']
const UNPLANNED_MARKERS = [
  'absencegroup:v1:health',
  'absencetype:v1:a002',
  'a002',
  'sick',
  'illness',
  'krank',
  'medical',
  'health',
  'unplanned'
]

const collectStrings = (absence: AbsenceLike): string[] => {
  const type = absence.type
  const values = [
    absence.typeRef,
    absence.typeName,
    absence.groupName,
    absence.title,
    type?.id,
    type?.value,
    type?.parentEntryId,
    type?.parentEntry?.id,
    type?.parentEntry?.value,
    ...(type?.translations?.map(translation => translation.value) ?? []),
    ...(type?.parentEntry?.translations?.map(translation => translation.value) ?? [])
  ]

  return values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map(value => value.toLowerCase())
}

const includesMarker = (values: string[], markers: string[]): boolean =>
  values.some(value => markers.some(marker => value.includes(marker)))

export const isPlannedAbsence = (absence: AbsenceLike): boolean => {
  const values = collectStrings(absence)
  if (includesMarker(values, UNPLANNED_MARKERS)) {
    return false
  }

  return includesMarker(values, PLANNED_MARKERS)
}

export const isUnplannedAbsence = (absence: AbsenceLike): boolean => {
  const values = collectStrings(absence)
  return includesMarker(values, UNPLANNED_MARKERS)
}

export const calculatePlannedAbsenceMetrics = (absences: AbsenceLike[]): PlannedAbsenceMetrics => {
  const plannedCount = absences.filter(isPlannedAbsence).length
  const unplannedCount = absences.filter(isUnplannedAbsence).length
  const totalRelevantCount = plannedCount + unplannedCount
  const plannedPct = totalRelevantCount > 0 ? Math.round((plannedCount / totalRelevantCount) * 100) : 0
  const unplannedPct = totalRelevantCount > 0 ? 100 - plannedPct : 0

  return {
    plannedCount,
    unplannedCount,
    totalRelevantCount,
    plannedPct,
    unplannedPct
  }
}
