export const ACQUISITION_FROM_PREFIX = 'acquisitionFrom:'
export const ACQUISITION_TO_PREFIX = 'acquisitionTo:'
export const DISPOSAL_FROM_PREFIX = 'disposalFrom:'
export const DISPOSAL_TO_PREFIX = 'disposalTo:'

/** Single pill when both acquisition from/to are set */
export const ACQUISITION_RANGE_PILL_ID = '__pill_range_acquisition__'
/** Single pill when both disposal from/to are set */
export const DISPOSAL_RANGE_PILL_ID = '__pill_range_disposal__'

export function isAssetDateFilterPillId(id: string): boolean {
  return (
    id === ACQUISITION_RANGE_PILL_ID ||
    id === DISPOSAL_RANGE_PILL_ID ||
    id.startsWith(ACQUISITION_FROM_PREFIX) ||
    id.startsWith(ACQUISITION_TO_PREFIX) ||
    id.startsWith(DISPOSAL_FROM_PREFIX) ||
    id.startsWith(DISPOSAL_TO_PREFIX)
  )
}

export function pickDateFilter(ids: string[], prefix: string): string {
  const id = ids.find(i => i.startsWith(prefix))
  return id ? id.slice(prefix.length) : ''
}

export function replaceDateFilter(ids: string[], prefix: string, value: string): string[] {
  const next = ids.filter(i => !i.startsWith(prefix))
  const v = value.trim()
  if (v) next.push(`${prefix}${v}`)
  return next
}

/** Replace inclusive date range (from / to) stored as two filter ids. */
export function replaceDateRangeFilters(
  ids: string[],
  fromPrefix: string,
  toPrefix: string,
  fromValue: string,
  toValue: string
): string[] {
  let next = ids.filter(i => !i.startsWith(fromPrefix) && !i.startsWith(toPrefix))
  const f = fromValue.trim()
  const t = toValue.trim()
  if (f) next = [...next, `${fromPrefix}${f}`]
  if (t) next = [...next, `${toPrefix}${t}`]
  return next
}
