import dayjs from 'dayjs'
import { PerformanceEvaluationAnalysisDetailResponse } from '../types/performanceEvaluation.types'
import {
  CarouselEntry,
  DetailViewComputedData,
  PerformanceEvaluationCurrentEmployee,
  RadarDataPoint,
  ReviewerKey,
  REVIEWER_COLORS,
  REVIEWER_KEYS
} from '../components/detail-view/types'

export const shouldHideFieldByKey = (key: string): boolean => {
  // Hide all identifier/reference fields from UI (id, Id, _id, ref, Ref)
  return /id|ref|ratingnumericequivalent/i.test(key)
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const toLabel = (value: string) => {
  const normalizedKey = value
    .split(/[_\s-]+/)
    .join('')
    .toLowerCase()
  if (normalizedKey.includes('ratingscalevaluelabel')) {
    return 'Rating'
  }
  const withSeparatedCaps = Array.from(value)
    .map(char => (/^[A-Z]$/.test(char) ? ` ${char}` : char))
    .join('')
  const withoutUnderscoreDash = withSeparatedCaps.split(/[_-]+/).join(' ')
  const compacted = withoutUnderscoreDash.split(/\s+/).filter(Boolean).join(' ').trim()
  return compacted ? `${compacted.charAt(0).toUpperCase()}${compacted.slice(1)}` : ''
}

export const formatLeafValue = (value: unknown): string => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') {
    const parsedDate = dayjs(value)
    if (parsedDate.isValid() && value.includes('T')) {
      return parsedDate.format('MMM D, YYYY HH:mm')
    }
    return value
  }
  return JSON.stringify(value)
}

const getFieldValue = (data: Record<string, unknown>, candidates: string[]): unknown => {
  for (const key of candidates) {
    const direct = data[key]
    if (direct !== undefined && direct !== null) return direct
    const alt = data[`${key.charAt(0).toUpperCase()}${key.slice(1)}`]
    if (alt !== undefined && alt !== null) return alt
  }
  return null
}

const toPositiveFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return value
}

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const formatNumericDisplay = (value: number | null): string =>
  value === null ? '--' : Number(value.toFixed(2)).toString()

export const toAvatarSrc = (thumb?: string | null): string | undefined => {
  if (!thumb) return undefined
  const trimmed = thumb.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  if (trimmed.startsWith('data:image')) return trimmed
  const sig = trimmed.slice(0, 12)
  let mime = 'image/jpeg'
  if (sig.startsWith('iVBORw0KGgo')) mime = 'image/png'
  else if (sig.startsWith('R0lGOD')) mime = 'image/gif'
  else if (sig.startsWith('Qk')) mime = 'image/bmp'
  return `data:${mime};base64,${trimmed}`
}

export const getInitials = (name?: string | null, fallback = '?'): string => {
  if (!name) return fallback
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return fallback
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

export const getDisplayNameFromRecord = (value: Record<string, unknown> | null): string | null => {
  if (!value) return null
  const displayName = getFieldValue(value, ['displayName', 'name'])
  if (typeof displayName === 'string' && displayName.trim()) return displayName.trim()
  const firstName = getFieldValue(value, ['firstName'])
  const lastName = getFieldValue(value, ['lastName'])
  const combinedName = [firstName, lastName]
    .filter(namePart => typeof namePart === 'string' && namePart.trim())
    .join(' ')
    .trim()
  return combinedName || null
}

export const getPictureFromRecord = (value: Record<string, unknown> | null): string | null => {
  if (!value) return null
  const picture = getFieldValue(value, ['pictureThumbnail', 'avatar', 'image'])
  return typeof picture === 'string' && picture.trim() ? picture : null
}

export const getReviewerIdentityFromEntry = (
  entry: Record<string, unknown>
): { name: string | null; pictureThumbnail: string | null } => {
  const directName = getDisplayNameFromRecord(entry)
  const directPicture = getPictureFromRecord(entry)
  if (directName || directPicture) {
    return { name: directName, pictureThumbnail: directPicture }
  }

  const nestedCandidates = ['reviewerEmployee', 'reviewer', 'employee', 'participant']
  for (const candidateKey of nestedCandidates) {
    const candidate = entry[candidateKey]
    if (!isObjectRecord(candidate)) continue
    const candidateName = getDisplayNameFromRecord(candidate)
    const candidatePicture = getPictureFromRecord(candidate)
    if (candidateName || candidatePicture) {
      return { name: candidateName, pictureThumbnail: candidatePicture }
    }
  }

  return { name: null, pictureThumbnail: null }
}

const formatChangeDelta = (value: number | null): { text: string; className: string } | null => {
  if (value === null || value === 0) return null
  const sign = value > 0 ? '+' : ''
  const colorClass = value > 0 ? 'gba:text-success' : 'gba:text-destructive'
  return {
    text: `${sign}${Number(value.toFixed(2)).toString()}`,
    className: colorClass
  }
}

const getChangeValue = (
  data: Record<string, unknown>,
  changes: Record<string, unknown> | null,
  field: string,
  fallbackCandidates: string[] = []
): number | null => {
  const fromChanges = changes ? toFiniteNumber(getFieldValue(changes, [field])) : null
  if (fromChanges !== null) return fromChanges
  return toFiniteNumber(getFieldValue(data, fallbackCandidates))
}

const DEFAULT_RATING_SCALE_LIMIT = 10

const getRatingScaleLimit = (data: Record<string, unknown>, overall: Record<string, unknown> | null): number => {
  const ratingScaleLimitCandidates = ['ratingScaleLimit', 'ratingScaleMax', 'ratingScaleUpperLimit', 'maxRatingScale']
  const limitFromOverall = overall ? toPositiveFiniteNumber(getFieldValue(overall, ratingScaleLimitCandidates)) : null
  const limitFromRoot = toPositiveFiniteNumber(getFieldValue(data, ratingScaleLimitCandidates))
  return limitFromOverall ?? limitFromRoot ?? DEFAULT_RATING_SCALE_LIMIT
}

export const getItemTitle = (item: Record<string, unknown>): string => {
  const candidateKeys = ['companyValueName', 'skillName', 'name', 'title', 'label', 'value']
  for (const key of candidateKeys) {
    const val = item[key]
    if (typeof val === 'string' && val.trim()) return val
  }
  return '-'
}

const toObjectList = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.filter(isObjectRecord)
  if (isObjectRecord(value)) return [value]
  return []
}

export const getPerspectiveEntries = (
  item: Record<string, unknown>,
  matcher: (key: string) => boolean
): Record<string, unknown>[] =>
  Object.entries(item)
    .filter(([key]) => matcher(key))
    .flatMap(([, value]) => toObjectList(value))

const PREFERRED_REVIEW_COLUMNS = ['Rating', 'Comments', 'Evaluated Date']

export const formatRatingForDisplay = (value: string): string => {
  const trimmedValue = value.trim()
  if (!trimmedValue || trimmedValue === '-') return '-'
  const starLabelMatch = /^(\d+)\s+stars?$/i.exec(trimmedValue)
  if (starLabelMatch) {
    const starsCount = Math.max(0, Math.min(Number.parseInt(starLabelMatch[1], 10), 10))
    return '★'.repeat(starsCount)
  }

  const numericMatch = /^(\d+)$/.exec(trimmedValue)
  if (numericMatch) {
    const starsCount = Math.max(0, Math.min(Number.parseInt(numericMatch[1], 10), 10))
    return '★'.repeat(starsCount)
  }
  return value
}

interface DetailCollections {
  companyValueItems: Record<string, unknown>[]
  skillItems: Record<string, unknown>[]
  safeData: Record<string, unknown>
  overall: Record<string, unknown> | null
  averages: Record<string, unknown> | null
  changesSinceLastReview: Record<string, unknown> | null
  evaluatorManager: Record<string, unknown> | null
}

const getDetailCollections = (data: PerformanceEvaluationAnalysisDetailResponse): DetailCollections => {
  const topLevelEntries = Object.entries(data).filter(([key]) => !shouldHideFieldByKey(key))
  const companyValuesEntry = topLevelEntries.find(([key]) => key.toLowerCase() === 'companyvalues')
  const skillsEntry = topLevelEntries.find(([key]) => key.toLowerCase() === 'skills')
  const safeData = data as Record<string, unknown>
  const overallRaw = getFieldValue(safeData, ['overall'])
  const averagesRaw = getFieldValue(safeData, ['averages'])
  const changesSinceLastReviewRaw = getFieldValue(safeData, ['changesSinceLastReview'])
  const evaluatorManagerRaw = getFieldValue(safeData, ['evaluatorManager'])

  return {
    companyValueItems: companyValuesEntry ? toObjectList(companyValuesEntry[1]) : [],
    skillItems: skillsEntry ? toObjectList(skillsEntry[1]) : [],
    safeData,
    overall: isObjectRecord(overallRaw) ? overallRaw : null,
    averages: isObjectRecord(averagesRaw) ? averagesRaw : null,
    changesSinceLastReview: isObjectRecord(changesSinceLastReviewRaw) ? changesSinceLastReviewRaw : null,
    evaluatorManager: isObjectRecord(evaluatorManagerRaw) ? evaluatorManagerRaw : null
  }
}

const getOverallNumericValue = (
  overall: Record<string, unknown> | null,
  averages: Record<string, unknown> | null
): number | null => {
  const fallbackOverallAverage =
    overall &&
    isObjectRecord(overall) &&
    typeof overall.averageNumeric === 'number' &&
    Number.isFinite(overall.averageNumeric)
      ? overall.averageNumeric
      : null
  return (averages ? toFiniteNumber(getFieldValue(averages, ['overall'])) : null) ?? fallbackOverallAverage
}

const buildCombinedCarouselEntries = (
  companyValueItems: Record<string, unknown>[],
  skillItems: Record<string, unknown>[],
  t: (key: string, args?: Record<string, unknown>) => string
): CarouselEntry[] => [
  ...companyValueItems.map((item, index) => ({
    item,
    subtitle: t('performance-evaluation-company-value-singular'),
    testId: `employee-performance-evaluation-company-value-${index}`
  })),
  ...skillItems.map((item, index) => ({
    item,
    subtitle: t('performance-evaluation-skill-singular'),
    testId: `employee-performance-evaluation-skill-${index}`
  }))
]

const buildReviewerFallbacks = (
  currentEmployee: PerformanceEvaluationCurrentEmployee | undefined,
  evaluatorManager: Record<string, unknown> | null
): Pick<DetailViewComputedData, 'selfReviewerFallback' | 'managerReviewerFallback'> => ({
  selfReviewerFallback: currentEmployee
    ? {
        displayName: currentEmployee.displayName,
        firstName: currentEmployee.firstName,
        lastName: currentEmployee.lastName,
        pictureThumbnail: currentEmployee.pictureThumbnail
      }
    : undefined,
  managerReviewerFallback: evaluatorManager
    ? {
        displayName: getDisplayNameFromRecord(evaluatorManager),
        pictureThumbnail: getPictureFromRecord(evaluatorManager)
      }
    : undefined
})

const getFirstNumericScoreByKeys = (entry: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    const score = toFiniteNumber(entry[key])
    if (score !== null) return score
  }
  return null
}

const getFirstVisibleNumericScore = (entry: Record<string, unknown>): number | null => {
  for (const [key, value] of Object.entries(entry)) {
    if (shouldHideFieldByKey(key)) continue
    const score = toFiniteNumber(value)
    if (score !== null) return score
  }
  return null
}

const getNumericScoreFromEntry = (entry: Record<string, unknown>): number | null => {
  const preferredKeys = [
    'ratingNumericEquivalent',
    'mappedRatingScaleNumericEquivalent',
    'averageNumeric',
    'score',
    'level'
  ]
  return getFirstNumericScoreByKeys(entry, preferredKeys) ?? getFirstVisibleNumericScore(entry)
}

const getPerspectiveAverageScore = (item: Record<string, unknown>, matcher: (key: string) => boolean): number => {
  const perspectiveEntries = getPerspectiveEntries(item, matcher)
  const scores = perspectiveEntries.map(getNumericScoreFromEntry).filter((score): score is number => score !== null)
  if (!scores.length) return 0
  const total = scores.reduce((acc, score) => acc + score, 0)
  return Number((total / scores.length).toFixed(2))
}

const hasAnyPerspectiveEntries = (items: Record<string, unknown>[], matcher: (key: string) => boolean): boolean =>
  items.some(item => getPerspectiveEntries(item, matcher).length > 0)

export const getActiveReviewerKeys = (
  companyValueItems: Record<string, unknown>[],
  skillItems: Record<string, unknown>[]
): ReviewerKey[] => {
  const allItems = [...companyValueItems, ...skillItems]
  return REVIEWER_KEYS.filter(reviewer => {
    const matcher = (key: string) => key.toLowerCase().includes(reviewer === 'peer' ? 'peer' : reviewer)
    return hasAnyPerspectiveEntries(allItems, matcher)
  })
}

const buildRadarData = (items: Record<string, unknown>[]): RadarDataPoint[] =>
  items.map(item => ({
    label: getItemTitle(item),
    self: getPerspectiveAverageScore(item, key => key.toLowerCase().includes('self')),
    peer: getPerspectiveAverageScore(item, key => key.toLowerCase().includes('peer')),
    manager: getPerspectiveAverageScore(item, key => key.toLowerCase().includes('manager'))
  }))

const computeSectionAverageScore = (items: Record<string, unknown>[]): string => {
  const scores: number[] = []
  items.forEach(item => {
    const perspectiveEntries = [
      ...getPerspectiveEntries(item, key => key.toLowerCase().includes('self')),
      ...getPerspectiveEntries(item, key => key.toLowerCase().includes('peer')),
      ...getPerspectiveEntries(item, key => key.toLowerCase().includes('manager'))
    ]

    perspectiveEntries.forEach(entry => {
      const score = getNumericScoreFromEntry(entry)
      if (score !== null) scores.push(score)
    })
  })
  if (!scores.length) return '--'
  const avg = scores.reduce((acc, score) => acc + score, 0) / scores.length
  return Number(avg.toFixed(2)).toString()
}

const toScoreNumber = (value: string): number | null => {
  if (value === '--') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const buildPerspectiveRowData = (entries: Record<string, unknown>[]): Record<string, string> => {
  const rowData: Record<string, string> = {}
  entries.forEach(entry => {
    Object.entries(entry)
      .filter(([key]) => !shouldHideFieldByKey(key))
      .forEach(([key, value]) => {
        const label = toLabel(key)
        const formattedValue = formatLeafValue(value)
        if (!(label in rowData) || rowData[label] === '-' || rowData[label] === '') {
          rowData[label] = formattedValue
        }
      })
  })
  return rowData
}

export const getReviewColumns = (rows: Array<Record<string, string>>): string[] => {
  const labels = Array.from(new Set(rows.flatMap(row => Object.keys(row))))
  const ordered = PREFERRED_REVIEW_COLUMNS.filter(label => labels.includes(label))
  const remaining = labels.filter(label => !PREFERRED_REVIEW_COLUMNS.includes(label)).sort((a, b) => a.localeCompare(b))
  return [...ordered, ...remaining]
}

export const computeRadarAverageScore = (data: RadarDataPoint[], selectedReviewers: ReviewerKey[]): string => {
  if (!data.length || !selectedReviewers.length) return '--'
  const scores = data.flatMap(point =>
    selectedReviewers.map(reviewer => point[reviewer]).filter(score => Number.isFinite(score))
  )
  if (!scores.length) return '--'
  const average = scores.reduce((acc, score) => acc + score, 0) / scores.length
  return Number(average.toFixed(2)).toString()
}

export const getNextSelectedReviewers = (previous: ReviewerKey[], reviewer: ReviewerKey): ReviewerKey[] => {
  if (previous.includes(reviewer)) {
    if (previous.length === 1) return previous
    return previous.filter(entry => entry !== reviewer)
  }
  const next = new Set<ReviewerKey>([...previous, reviewer])
  return REVIEWER_KEYS.filter(entry => next.has(entry))
}

export const getActiveRadarSeries = (
  selectedReviewers: ReviewerKey[],
  labels: { selfLabel: string; peerLabel: string; managerLabel: string }
): Array<{ reviewer: ReviewerKey; name: string; dataKey: ReviewerKey; color: string }> => {
  const series = [
    {
      reviewer: 'self' as ReviewerKey,
      name: labels.selfLabel,
      dataKey: 'self' as ReviewerKey,
      color: REVIEWER_COLORS.self
    },
    {
      reviewer: 'peer' as ReviewerKey,
      name: labels.peerLabel,
      dataKey: 'peer' as ReviewerKey,
      color: REVIEWER_COLORS.peer
    },
    {
      reviewer: 'manager' as ReviewerKey,
      name: labels.managerLabel,
      dataKey: 'manager' as ReviewerKey,
      color: REVIEWER_COLORS.manager
    }
  ]
  return series.filter(item => selectedReviewers.includes(item.reviewer))
}

export const computeDetailViewData = (
  data: PerformanceEvaluationAnalysisDetailResponse,
  currentEmployee: PerformanceEvaluationCurrentEmployee | undefined,
  t: (key: string, args?: Record<string, unknown>) => string
): DetailViewComputedData => {
  const { companyValueItems, skillItems, safeData, overall, averages, changesSinceLastReview, evaluatorManager } =
    getDetailCollections(data)
  const overallNumericValue = getOverallNumericValue(overall, averages)
  const overallNumericDisplay = formatNumericDisplay(overallNumericValue)
  const ratingScaleLimit = getRatingScaleLimit(safeData, overall && isObjectRecord(overall) ? overall : null)
  const overallProgressPercent =
    overallNumericValue === null ? 0 : Math.min(100, Math.max(0, (overallNumericValue / ratingScaleLimit) * 100))

  const companyValuesRadarData = buildRadarData(companyValueItems)
  const skillsRadarData = buildRadarData(skillItems)
  const activeReviewerKeys = getActiveReviewerKeys(companyValueItems, skillItems)
  const companyValuesAverageScoreFallback = computeSectionAverageScore(companyValueItems)
  const skillsAverageScoreFallback = computeSectionAverageScore(skillItems)
  const companyValuesAverageNumeric =
    (averages ? toFiniteNumber(getFieldValue(averages, ['companyValues'])) : null) ??
    toScoreNumber(companyValuesAverageScoreFallback)
  const skillsAverageNumeric =
    (averages ? toFiniteNumber(getFieldValue(averages, ['skills'])) : null) ?? toScoreNumber(skillsAverageScoreFallback)
  const companyValuesAverageScore = formatNumericDisplay(companyValuesAverageNumeric)
  const skillsAverageScore = formatNumericDisplay(skillsAverageNumeric)

  const overallChangeSinceLastReview = getChangeValue(safeData, changesSinceLastReview, 'overall', [
    'overallRatingNumericChangeSinceLastReview',
    'overallNumericChangeSinceLastReview',
    'changeSinceLastReviewOverallNumeric'
  ])
  const companyValuesChangeSinceLastReview = getChangeValue(safeData, changesSinceLastReview, 'companyValues')
  const skillsChangeSinceLastReview = getChangeValue(safeData, changesSinceLastReview, 'skills')
  const overallChangeBadge = formatChangeDelta(overallChangeSinceLastReview)
  const companyValuesChangeBadge = formatChangeDelta(companyValuesChangeSinceLastReview)
  const skillsChangeBadge = formatChangeDelta(skillsChangeSinceLastReview)
  const overallNumericChangeSinceLastReview = formatNumericDisplay(overallChangeSinceLastReview)

  const companyValuesProgressPercent =
    companyValuesAverageNumeric === null
      ? 0
      : Math.min(100, Math.max(0, (companyValuesAverageNumeric / ratingScaleLimit) * 100))
  const skillsProgressPercent =
    skillsAverageNumeric === null ? 0 : Math.min(100, Math.max(0, (skillsAverageNumeric / ratingScaleLimit) * 100))

  const points = [...companyValuesRadarData, ...skillsRadarData]
  const maxValue = points.reduce((acc, point) => Math.max(acc, point.self, point.peer, point.manager), 0)
  const radarMaxDomain = maxValue <= 5 ? 5 : Math.ceil(maxValue / 2) * 2
  const combinedCarouselEntries = buildCombinedCarouselEntries(companyValueItems, skillItems, t)
  const { selfReviewerFallback, managerReviewerFallback } = buildReviewerFallbacks(currentEmployee, evaluatorManager)

  return {
    companyValueItems,
    skillItems,
    overallNumericDisplay,
    ratingScaleLimit,
    overallProgressPercent,
    companyValuesAverageScore,
    skillsAverageScore,
    overallNumericChangeSinceLastReview,
    companyValuesProgressPercent,
    skillsProgressPercent,
    radarMaxDomain,
    overallChangeBadge,
    companyValuesChangeBadge,
    skillsChangeBadge,
    companyValuesRadarData,
    skillsRadarData,
    activeReviewerKeys,
    combinedCarouselEntries,
    selfReviewerFallback,
    managerReviewerFallback
  }
}
