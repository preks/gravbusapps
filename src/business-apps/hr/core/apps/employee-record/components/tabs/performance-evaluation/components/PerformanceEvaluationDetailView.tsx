import React, { useState } from 'react'
import dayjs from 'dayjs'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Progress,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts'
import translations from '../../../../_i18n'
import { PerformanceEvaluationAnalysisDetailResponse } from '../types/performanceEvaluation.types'

interface PerformanceEvaluationDetailViewProps {
  evaluationId: string
  loading: boolean
  error: string | null
  data: PerformanceEvaluationAnalysisDetailResponse | null
}

const shouldHideFieldByKey = (key: string): boolean => {
  // Hide all identifier/reference fields from UI (id, Id, _id, ref, Ref)
  return /id|ref|ratingnumericequivalent/i.test(key)
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toLabel = (value: string) => {
  const normalizedKey = value.replace(/[_\s-]/g, '').toLowerCase()
  if (normalizedKey.includes('ratingscalevaluelabel')) {
    return 'Rating'
  }

  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, char => char.toUpperCase())
}

const formatLeafValue = (value: unknown): string => {
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

const getChangeDisplayValue = (data: Record<string, unknown>, candidates: string[]): string => {
  const value = getFieldValue(data, candidates)
  if (value === null || value === undefined || value === '') return '--'
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string') return value
  return '--'
}

const toPositiveFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return value
}

const DEFAULT_RATING_SCALE_LIMIT = 10

const getRatingScaleLimit = (data: Record<string, unknown>, overall: Record<string, unknown> | null): number => {
  const ratingScaleLimitCandidates = ['ratingScaleLimit', 'ratingScaleMax', 'ratingScaleUpperLimit', 'maxRatingScale']
  const limitFromOverall = overall ? toPositiveFiniteNumber(getFieldValue(overall, ratingScaleLimitCandidates)) : null
  const limitFromRoot = toPositiveFiniteNumber(getFieldValue(data, ratingScaleLimitCandidates))
  return limitFromOverall ?? limitFromRoot ?? DEFAULT_RATING_SCALE_LIMIT
}

const getItemTitle = (item: Record<string, unknown>): string => {
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

const getPerspectiveEntries = (
  item: Record<string, unknown>,
  matcher: (key: string) => boolean
): Record<string, unknown>[] => {
  return Object.entries(item)
    .filter(([key]) => matcher(key))
    .flatMap(([, value]) => toObjectList(value))
}

const PREFERRED_REVIEW_COLUMNS = ['Rating', 'Comments', 'Evaluated Date']

const buildPerspectiveRowData = (entries: Record<string, unknown>[]): Record<string, string> => {
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

const getReviewColumns = (rows: Array<Record<string, string>>): string[] => {
  const labels = Array.from(new Set(rows.flatMap(row => Object.keys(row))))
  const ordered = PREFERRED_REVIEW_COLUMNS.filter(label => labels.includes(label))
  const remaining = labels.filter(label => !PREFERRED_REVIEW_COLUMNS.includes(label)).sort((a, b) => a.localeCompare(b))
  return [...ordered, ...remaining]
}

const JsonValueBlock: React.FC<{ label: string; value: unknown; depth?: number }> = ({ label, value, depth = 0 }) => {
  if (depth > 4) {
    return (
      <div className="gba:text-sm">
        <p className="gba:text-muted-foreground">{toLabel(label)}</p>
        <p>{formatLeafValue(value)}</p>
      </div>
    )
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return (
        <div className="gba:text-sm">
          <p className="gba:text-muted-foreground">{toLabel(label)}</p>
          <p>-</p>
        </div>
      )
    }

    return (
      <div className="gba:space-y-2">
        <p className="gba:text-sm gba:font-medium">{toLabel(label)}</p>
        <div className="gba:space-y-2">
          {value.map((entry, index) => (
            <Card key={`${label}-${index}`}>
              <CardContent className="gba:p-3">
                {typeof entry === 'object' && entry !== null ? (
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-3">
                    {Object.entries(entry as Record<string, unknown>)
                      .filter(([childKey]) => !shouldHideFieldByKey(childKey))
                      .map(([childKey, childValue]) => (
                        <JsonValueBlock
                          key={`${label}-${index}-${childKey}`}
                          label={childKey}
                          value={childValue}
                          depth={depth + 1}
                        />
                      ))}
                  </div>
                ) : (
                  <p className="gba:text-sm">{formatLeafValue(entry)}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([childKey]) => !shouldHideFieldByKey(childKey)
    )
    if (!entries.length) {
      return (
        <div className="gba:text-sm">
          <p className="gba:text-muted-foreground">{toLabel(label)}</p>
          <p>-</p>
        </div>
      )
    }

    return (
      <div className="gba:space-y-2">
        <p className="gba:text-sm gba:font-medium">{toLabel(label)}</p>
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-3">
          {entries.map(([childKey, childValue]) => (
            <JsonValueBlock key={`${label}-${childKey}`} label={childKey} value={childValue} depth={depth + 1} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="gba:text-sm">
      <p className="gba:text-muted-foreground">{toLabel(label)}</p>
      <p>{formatLeafValue(value)}</p>
    </div>
  )
}

const DetailItemCard: React.FC<{
  item: Record<string, unknown>
  testId: string
  subtitle: string
  selfLabel: string
  peerLabel: string
  managerLabel: string
  reviewerColumnLabel: string
  headerControls?: React.ReactNode
}> = ({ item, testId, subtitle, selfLabel, peerLabel, managerLabel, reviewerColumnLabel, headerControls }) => {
  const selfEntries = getPerspectiveEntries(item, key => key.toLowerCase().includes('self'))
  const peerEntries = getPerspectiveEntries(item, key => key.toLowerCase().includes('peer'))
  const managerEntries = getPerspectiveEntries(item, key => key.toLowerCase().includes('manager'))
  const hasPerspectiveData = selfEntries.length > 0 || peerEntries.length > 0 || managerEntries.length > 0
  const selfRowData = buildPerspectiveRowData(selfEntries)
  const peerRowData = buildPerspectiveRowData(peerEntries)
  const managerRowData = buildPerspectiveRowData(managerEntries)
  const perspectiveRows = [
    { label: selfLabel, data: selfRowData },
    ...(peerEntries.length > 0 ? [{ label: peerLabel, data: peerRowData }] : []),
    { label: managerLabel, data: managerRowData }
  ]
  const reviewColumns = getReviewColumns(perspectiveRows.map(row => row.data))

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
          <div className="gba:space-y-1">
            <CardTitle>{getItemTitle(item)}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          {headerControls ? <div className="gba:flex-shrink-0">{headerControls}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {hasPerspectiveData ? (
          <div className="gba:overflow-x-auto" data-testid={`${testId}-review-table`}>
            <table className="gba:w-full gba:text-sm">
              <thead>
                <tr className="gba:border-b gba:border-border">
                  <th className="gba:text-left gba:py-2 gba:pr-3 gba:font-semibold">{reviewerColumnLabel}</th>
                  {reviewColumns.map(column => (
                    <th key={`${testId}-head-${column}`} className="gba:text-left gba:py-2 gba:px-3 gba:font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perspectiveRows.map(row => (
                  <tr key={`${testId}-row-${row.label}`} className="gba:border-b gba:border-border last:gba:border-b-0">
                    <td className="gba:py-2 gba:pr-3 gba:font-medium">{row.label}</td>
                    {reviewColumns.map(column => (
                      <td key={`${testId}-cell-${row.label}-${column}`} className="gba:py-2 gba:px-3">
                        {row.data[column] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-3">
            {Object.entries(item)
              .filter(([key]) => !shouldHideFieldByKey(key))
              .map(([key, value]) => (
                <JsonValueBlock key={`${testId}-${key}`} label={key} value={value} />
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface CarouselEntry {
  item: Record<string, unknown>
  subtitle: string
  testId: string
}

interface RadarDataPoint {
  label: string
  self: number
  peer: number
  manager: number
}

type ReviewerKey = 'self' | 'peer' | 'manager'

const REVIEWER_KEYS: ReviewerKey[] = ['self', 'peer', 'manager']

const REVIEWER_COLORS = {
  self: 'var(--nw-chart-1)',
  peer: 'var(--nw-chart-2)',
  manager: 'var(--nw-chart-3)'
}

const EntryCarouselSection: React.FC<{
  title?: string
  entries: CarouselEntry[]
  testIdPrefix: string
  selfLabel: string
  peerLabel: string
  managerLabel: string
  previousLabel: string
  nextLabel: string
  reviewerColumnLabel: string
}> = ({
  title,
  entries,
  testIdPrefix,
  selfLabel,
  peerLabel,
  managerLabel,
  previousLabel,
  nextLabel,
  reviewerColumnLabel
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!entries.length) return null

  const safeIndex = Math.min(currentIndex, entries.length - 1)
  const isFirst = safeIndex === 0
  const isLast = safeIndex === entries.length - 1
  const currentEntry = entries[safeIndex]

  return (
    <section className="gba:space-y-3" data-testid={`${testIdPrefix}-section`}>
      {title ? <p className="gba:text-base gba:font-semibold">{title}</p> : null}

      <DetailItemCard
        item={currentEntry.item}
        testId={currentEntry.testId}
        subtitle={currentEntry.subtitle}
        selfLabel={selfLabel}
        peerLabel={peerLabel}
        managerLabel={managerLabel}
        reviewerColumnLabel={reviewerColumnLabel}
        headerControls={
          <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${testIdPrefix}-controls`}>
            <span className="gba:text-xs gba:text-muted-foreground" data-testid={`${testIdPrefix}-position`}>
              {safeIndex + 1} / {entries.length}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={isFirst}
              data-testid={`${testIdPrefix}-previous`}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            >
              {previousLabel}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={isLast}
              data-testid={`${testIdPrefix}-next`}
              onClick={() => setCurrentIndex(prev => Math.min(entries.length - 1, prev + 1))}
            >
              {nextLabel}
            </Button>
          </div>
        }
      />
    </section>
  )
}

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

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

const buildRadarData = (items: Record<string, unknown>[]): RadarDataPoint[] => {
  return items.map(item => ({
    label: getItemTitle(item),
    self: getPerspectiveAverageScore(item, key => key.toLowerCase().includes('self')),
    peer: getPerspectiveAverageScore(item, key => key.toLowerCase().includes('peer')),
    manager: getPerspectiveAverageScore(item, key => key.toLowerCase().includes('manager'))
  }))
}

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

const computeRadarAverageScore = (data: RadarDataPoint[], selectedReviewers: ReviewerKey[]): string => {
  if (!data.length || !selectedReviewers.length) return '--'

  const scores = data.flatMap(point =>
    selectedReviewers.map(reviewer => point[reviewer]).filter(score => Number.isFinite(score))
  )
  if (!scores.length) return '--'

  const average = scores.reduce((acc, score) => acc + score, 0) / scores.length
  return Number(average.toFixed(2)).toString()
}

const RadarLegend: React.FC<{
  selfLabel: string
  peerLabel: string
  managerLabel: string
  selectedReviewers: ReviewerKey[]
  onToggleReviewer: (reviewer: ReviewerKey) => void
}> = ({ selfLabel, peerLabel, managerLabel, selectedReviewers, onToggleReviewer }) => {
  const entries = [
    { key: 'self' as ReviewerKey, label: selfLabel, color: REVIEWER_COLORS.self },
    { key: 'peer' as ReviewerKey, label: peerLabel, color: REVIEWER_COLORS.peer },
    { key: 'manager' as ReviewerKey, label: managerLabel, color: REVIEWER_COLORS.manager }
  ]

  return (
    <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="employee-performance-evaluation-radar-legend">
      {entries.map(entry => {
        const isActive = selectedReviewers.includes(entry.key)
        return (
          <button
            key={entry.key}
            type="button"
            className="gba:rounded-full gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring gba:focus-visible:ring-offset-2"
            data-testid={`employee-performance-evaluation-radar-legend-${entry.key}`}
            aria-pressed={isActive}
            onClick={() => onToggleReviewer(entry.key)}
          >
            <Badge
              variant="secondary"
              className={`gba:flex gba:items-center gba:gap-2 ${isActive ? '' : 'gba:opacity-50'}`}
            >
              <span
                className="gba:inline-block gba:w-2 gba:h-2 gba:rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.label}</span>
            </Badge>
          </button>
        )
      })}
    </div>
  )
}

const RadarComparisonCard: React.FC<{
  testId: string
  title: string
  description: string
  averageScore: string
  averageScoreLabel: string
  data: RadarDataPoint[]
  noDataLabel: string
  selfLabel: string
  peerLabel: string
  managerLabel: string
  radarMaxDomain: number
}> = ({
  testId,
  title,
  description,
  averageScore,
  averageScoreLabel,
  data,
  noDataLabel,
  selfLabel,
  peerLabel,
  managerLabel,
  radarMaxDomain
}) => {
  const [selectedReviewers, setSelectedReviewers] = useState<ReviewerKey[]>(REVIEWER_KEYS)

  const toggleReviewer = (reviewer: ReviewerKey) => {
    setSelectedReviewers(previous => {
      if (previous.includes(reviewer)) {
        if (previous.length === 1) return previous
        return previous.filter(entry => entry !== reviewer)
      }

      const next = new Set<ReviewerKey>([...previous, reviewer])
      return REVIEWER_KEYS.filter(entry => next.has(entry))
    })
  }

  const displayedAverageScore =
    selectedReviewers.length === REVIEWER_KEYS.length ? averageScore : computeRadarAverageScore(data, selectedReviewers)

  return (
    <Card data-testid={testId}>
      <CardHeader className="gba:pb-2">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
          <CardTitle>{title}</CardTitle>
          <div className="gba:text-right">
            <p className="gba:text-xs gba:text-muted-foreground">{averageScoreLabel}</p>
            <p className="gba:text-sm gba:font-semibold">{displayedAverageScore}</p>
          </div>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        <RadarLegend
          selfLabel={selfLabel}
          peerLabel={peerLabel}
          managerLabel={managerLabel}
          selectedReviewers={selectedReviewers}
          onToggleReviewer={toggleReviewer}
        />
        {data.length > 0 ? (
          <div className="gba:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} margin={{ top: 16, right: 28, bottom: 8, left: 28 }}>
                <PolarGrid />
                <PolarAngleAxis dataKey="label" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, radarMaxDomain]} />
                <RechartsTooltip />
                {selectedReviewers.includes('self') ? (
                  <Radar
                    name={selfLabel}
                    dataKey="self"
                    stroke={REVIEWER_COLORS.self}
                    fill={REVIEWER_COLORS.self}
                    fillOpacity={0.14}
                    strokeWidth={2}
                  />
                ) : null}
                {selectedReviewers.includes('peer') ? (
                  <Radar
                    name={peerLabel}
                    dataKey="peer"
                    stroke={REVIEWER_COLORS.peer}
                    fill={REVIEWER_COLORS.peer}
                    fillOpacity={0.14}
                    strokeWidth={2}
                  />
                ) : null}
                {selectedReviewers.includes('manager') ? (
                  <Radar
                    name={managerLabel}
                    dataKey="manager"
                    stroke={REVIEWER_COLORS.manager}
                    fill={REVIEWER_COLORS.manager}
                    fillOpacity={0.14}
                    strokeWidth={2}
                  />
                ) : null}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="gba:text-sm gba:text-muted-foreground">{noDataLabel}</p>
        )}
      </CardContent>
    </Card>
  )
}

const PerformanceEvaluationDetailView: React.FC<PerformanceEvaluationDetailViewProps> = ({ loading, error, data }) => {
  const { t } = useTranslation(translations)

  if (loading) {
    return (
      <Card data-testid="employee-performance-evaluation-detail-loading">
        <CardContent className="gba:py-8 gba:flex gba:justify-center">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid="employee-performance-evaluation-detail-error">
        <CardContent className="gba:py-6">
          <p className="gba:text-sm gba:text-destructive">{t('performance-evaluation-detail-load-error', { error })}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data || !Object.keys(data).length) {
    return (
      <Card data-testid="employee-performance-evaluation-detail-empty">
        <CardContent className="gba:py-8">
          <EmptyState
            title={t('performance-evaluation-detail-empty-title')}
            description={t('performance-evaluation-detail-empty')}
          />
        </CardContent>
      </Card>
    )
  }

  const topLevelEntries = Object.entries(data).filter(([key]) => !shouldHideFieldByKey(key))
  const companyValuesEntry = topLevelEntries.find(([key]) => key.toLowerCase() === 'companyvalues')
  const skillsEntry = topLevelEntries.find(([key]) => key.toLowerCase() === 'skills')
  const companyValueItems = companyValuesEntry ? toObjectList(companyValuesEntry[1]) : []
  const skillItems = skillsEntry ? toObjectList(skillsEntry[1]) : []
  const safeData = data as Record<string, unknown>
  const overall = isObjectRecord(getFieldValue(safeData, ['overall'])) ? getFieldValue(safeData, ['overall']) : null
  const overallNumericValue =
    overall &&
    isObjectRecord(overall) &&
    typeof overall.averageNumeric === 'number' &&
    Number.isFinite(overall.averageNumeric)
      ? overall.averageNumeric
      : null
  const overallNumericDisplay = overallNumericValue !== null ? Number(overallNumericValue.toFixed(2)).toString() : '--'
  const ratingScaleLimit = getRatingScaleLimit(safeData, overall && isObjectRecord(overall) ? overall : null)
  const overallProgressPercent =
    overallNumericValue === null ? 0 : Math.min(100, Math.max(0, (overallNumericValue / ratingScaleLimit) * 100))
  const overallNumericChangeSinceLastReview = getChangeDisplayValue(safeData, [
    'overallRatingNumericChangeSinceLastReview',
    'overallNumericChangeSinceLastReview',
    'changeSinceLastReviewOverallNumeric'
  ])
  const companyValuesRadarData = buildRadarData(companyValueItems)
  const skillsRadarData = buildRadarData(skillItems)
  const companyValuesAverageScore = computeSectionAverageScore(companyValueItems)
  const skillsAverageScore = computeSectionAverageScore(skillItems)
  const companyValuesAverageNumeric = toScoreNumber(companyValuesAverageScore)
  const skillsAverageNumeric = toScoreNumber(skillsAverageScore)
  const companyValuesProgressPercent =
    companyValuesAverageNumeric === null
      ? 0
      : Math.min(100, Math.max(0, (companyValuesAverageNumeric / ratingScaleLimit) * 100))
  const skillsProgressPercent =
    skillsAverageNumeric === null ? 0 : Math.min(100, Math.max(0, (skillsAverageNumeric / ratingScaleLimit) * 100))
  const points = [...companyValuesRadarData, ...skillsRadarData]
  const maxValue = points.reduce((acc, point) => Math.max(acc, point.self, point.peer, point.manager), 0)
  const radarMaxDomain = maxValue <= 5 ? 5 : Math.ceil(maxValue)
  const combinedCarouselEntries: CarouselEntry[] = [
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

  return (
    <div className="gba:space-y-6" data-testid="employee-performance-evaluation-detail">
      <div className="gba:space-y-1">
        <h3 className="gba:text-2xl gba:font-bold">{t('performance-evaluation-detail-title')}</h3>
        <p className="gba:text-muted-foreground">{t('performance-evaluation-detail-subtitle')}</p>
      </div>

      <div
        className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-4 gba:gap-4"
        data-testid="employee-performance-evaluation-summary-cards"
      >
        <Card>
          <CardHeader className="gba:pb-2">
            <CardTitle>{t('performance-evaluation-summary-overall-progress')}</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-3">
            <div className="gba:flex gba:items-end gba:gap-2">
              <span className="gba:text-3xl gba:font-bold">{overallNumericDisplay}</span>
              <span className="gba:text-sm gba:text-muted-foreground">/{ratingScaleLimit}</span>
            </div>
            <Progress
              value={overallProgressPercent}
              data-testid="employee-performance-evaluation-overall-progress-bar"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gba:pb-2">
            <CardTitle>{t('performance-evaluation-summary-company-values-average')}</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-3">
            <div className="gba:flex gba:items-end gba:gap-2">
              <span className="gba:text-3xl gba:font-bold">{companyValuesAverageScore}</span>
              <span className="gba:text-sm gba:text-muted-foreground">/{ratingScaleLimit}</span>
            </div>
            <Progress
              value={companyValuesProgressPercent}
              data-testid="employee-performance-evaluation-company-values-progress-bar"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gba:pb-2">
            <CardTitle>{t('performance-evaluation-summary-skills-average')}</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-3">
            <div className="gba:flex gba:items-end gba:gap-2">
              <span className="gba:text-3xl gba:font-bold">{skillsAverageScore}</span>
              <span className="gba:text-sm gba:text-muted-foreground">/{ratingScaleLimit}</span>
            </div>
            <Progress value={skillsProgressPercent} data-testid="employee-performance-evaluation-skills-progress-bar" />
          </CardContent>
        </Card>

        <Card data-testid="employee-performance-evaluation-summary-review-card">
          <CardHeader className="gba:pb-2">
            <CardTitle>{t('performance-evaluation-summary-sidebar-title')}</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-2">
            <div className="gba:flex gba:justify-between gba:text-sm">
              <span className="gba:text-muted-foreground">{t('performance-evaluation-summary-overall-numeric')}</span>
              <span>{overallNumericChangeSinceLastReview}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="gba:space-y-4">
        <div
          className="gba:grid gba:grid-cols-1 gba:xl:grid-cols-2 gba:gap-4"
          data-testid="employee-performance-evaluation-radar-section"
        >
          <RadarComparisonCard
            testId="employee-performance-evaluation-company-values-radar-card"
            title={t('performance-evaluation-radar-company-values-title')}
            description={t('performance-evaluation-radar-company-values-description')}
            averageScore={companyValuesAverageScore}
            averageScoreLabel={t('performance-evaluation-radar-average-score')}
            data={companyValuesRadarData}
            noDataLabel={t('performance-evaluation-radar-no-data')}
            selfLabel={t('performance-evaluation-self')}
            peerLabel={t('performance-evaluation-peer')}
            managerLabel={t('performance-evaluation-manager')}
            radarMaxDomain={radarMaxDomain}
          />

          <RadarComparisonCard
            testId="employee-performance-evaluation-skills-radar-card"
            title={t('performance-evaluation-radar-skills-title')}
            description={t('performance-evaluation-radar-skills-description')}
            averageScore={skillsAverageScore}
            averageScoreLabel={t('performance-evaluation-radar-average-score')}
            data={skillsRadarData}
            noDataLabel={t('performance-evaluation-radar-no-data')}
            selfLabel={t('performance-evaluation-self')}
            peerLabel={t('performance-evaluation-peer')}
            managerLabel={t('performance-evaluation-manager')}
            radarMaxDomain={radarMaxDomain}
          />
        </div>

        <EntryCarouselSection
          entries={combinedCarouselEntries}
          testIdPrefix="employee-performance-evaluation-main-carousel"
          selfLabel={t('performance-evaluation-self')}
          peerLabel={t('performance-evaluation-peer')}
          managerLabel={t('performance-evaluation-manager')}
          previousLabel={t('performance-evaluation-carousel-previous')}
          nextLabel={t('performance-evaluation-carousel-next')}
          reviewerColumnLabel={t('performance-evaluation-reviewer-column')}
        />
      </div>
    </div>
  )
}

export default PerformanceEvaluationDetailView
