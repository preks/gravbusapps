import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  Combobox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { IDEAL_CUSTOMER_PROFILES_CATALOG } from '@/common/data/customer/constants/customerCatalogs'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import leadScoringI18n from '../_i18n'
import { useBulkLeadScore } from '../hooks/useBulkLeadScore'
import { type LeadScoringCandidateQuery, useLeadScoringCandidates } from '../hooks/useLeadScoringCandidates'
import {
  buildLeadScoringCandidateQuery,
  buildLeadScoringSelectionSummary,
  getLatestPresetSelectValue,
  getTimeRangePresetSelectValue,
  LATEST_COUNT_OPTIONS,
  parseLatestCountPresetValue,
  type LatestCountValue,
  type LeadScoringPresetScope,
  type LeadScoringTimeRange
} from '../utils/leadScoringSelectionUtils'
import { LeadScoringCandidateRow } from './LeadScoringCandidateRow'

interface LeadScoringSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  onScored: () => void
}

const TIME_RANGES: LeadScoringTimeRange[] = ['today', 'last-week', 'last-month', 'last-quarter', 'last-year']
const ALL_LEADS_PRESET = 'all'
type SelectionValidationIssue = 'icp' | 'leads'

const TIME_RANGE_I18N_KEYS: Record<LeadScoringTimeRange, string> = {
  today: 'lead-scoring-selection-today',
  'last-week': 'lead-scoring-selection-last-week',
  'last-month': 'lead-scoring-selection-last-month',
  'last-quarter': 'lead-scoring-selection-last-quarter',
  'last-year': 'lead-scoring-selection-last-year'
}

export const LeadScoringSelectionDialog: React.FC<LeadScoringSelectionDialogProps> = ({
  open,
  onOpenChange,
  accessToken,
  onScored
}) => {
  const { t } = useTranslation(leadScoringI18n)
  const { fetchCatalogEntries } = useCatalogEntries({ accessToken })
  const candidates = useLeadScoringCandidates(accessToken)
  const { loading: scoring, error: scoringError, runBulkScore, reset } = useBulkLeadScore(accessToken)

  const [presetScope, setPresetScope] = useState<LeadScoringPresetScope | null>(null)
  const [latestCount, setLatestCount] = useState<LatestCountValue | null>(null)
  const [timeRange, setTimeRange] = useState<LeadScoringTimeRange | null>(null)
  const [unscoredOnly, setUnscoredOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [icpId, setIcpId] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [profileOptions, setProfileOptions] = useState<Array<{ id: string; label: string }>>([])
  const [validationIssue, setValidationIssue] = useState<SelectionValidationIssue | null>(null)

  const hasPresetSelection = presetScope !== null

  const candidateQuery = useMemo<LeadScoringCandidateQuery>(
    () =>
      buildLeadScoringCandidateQuery({
        scope: 'all',
        unscoredOnly,
        search
      }),
    [search, unscoredOnly]
  )

  const icpOptions = useMemo(
    () => profileOptions.map(option => ({ value: option.id, label: option.label })),
    [profileOptions]
  )

  const selectionSummary = useMemo(
    () =>
      buildLeadScoringSelectionSummary(
        {
          scope: presetScope,
          latestCount,
          timeRange,
          unscoredOnly,
          manualCount: selectedIds.size
        },
        {
          allLeads: t('lead-scoring-selection-all'),
          allUnscored: t('lead-scoring-selection-all-unscored'),
          lastCount: count => t('lead-scoring-selection-last-count', { count }),
          timeRange: range => t(TIME_RANGE_I18N_KEYS[range]),
          selectedCount: count => t('lead-scoring-selection-selected-count', { count }),
          unscoredSuffix: t('lead-scoring-selection-unscored-suffix')
        }
      ),
    [latestCount, presetScope, selectedIds.size, t, timeRange, unscoredOnly]
  )

  const clearPresetSelection = useCallback(() => {
    setPresetScope(null)
    setLatestCount(null)
    setTimeRange(null)
  }, [])

  useEffect(() => {
    if (!open) return
    candidates.loadFirstPage(candidateQuery).catch(() => {})
  }, [candidateQuery, candidates.loadFirstPage, open])

  useEffect(() => {
    if (!open || !accessToken.trim()) return

    const loadProfiles = async () => {
      const response = await fetchCatalogEntries({
        catalogIdentifier: IDEAL_CUSTOMER_PROFILES_CATALOG,
        version: 'v1',
        limit: 200,
        offset: 0
      })
      setProfileOptions(
        response.entries.map(entry => ({
          id: entry.id,
          label: (entry.value && String(entry.value).trim()) || entry.displayValue || entry.code || entry.id
        }))
      )
    }

    loadProfiles().catch(() => {})
  }, [accessToken, fetchCatalogEntries, open])

  const toggleCandidate = (id: string, checked: boolean) => {
    clearPresetSelection()
    setSelectedIds(previous => {
      const next = new Set(previous)
      if (checked) next.add(id)
      if (!checked) next.delete(id)
      return next
    })
  }

  const resolveLeadIds = async (): Promise<string[]> => {
    if (!presetScope) {
      return Array.from(selectedIds)
    }

    const windowQuery = buildLeadScoringCandidateQuery({
      scope: presetScope,
      latestCount: latestCount ?? undefined,
      timeRange: timeRange ?? undefined,
      unscoredOnly: false,
      search
    })

    if (presetScope === 'all') {
      return candidates.fetchAllLeadIds(
        buildLeadScoringCandidateQuery({
          scope: presetScope,
          unscoredOnly,
          search
        })
      )
    }

    if (presetScope === 'latest' && latestCount) {
      if (unscoredOnly) {
        return candidates.fetchUnscoredLeadIdsWithinWindow(windowQuery, latestCount)
      }
      return candidates.fetchLeadIds(windowQuery, latestCount)
    }

    if (presetScope === 'time' && timeRange) {
      if (unscoredOnly) {
        return candidates.fetchUnscoredLeadIdsWithinWindow(windowQuery, 1000)
      }
      return candidates.fetchLeadIds(windowQuery, 1000)
    }

    return []
  }

  const applyAllUnscoredShortcut = () => {
    setPresetScope('all')
    setLatestCount(null)
    setTimeRange(null)
    setUnscoredOnly(true)
    setSelectedIds(new Set())
  }

  const handleScore = async () => {
    if (!icpId.trim()) {
      setValidationIssue('icp')
      return
    }

    const leadIds = await resolveLeadIds()
    if (leadIds.length === 0) {
      setValidationIssue('leads')
      return
    }

    setValidationIssue(null)
    const result = await runBulkScore({
      entity_type: 'lead',
      icp_id: icpId,
      entity_ids: leadIds
    })

    if (result) {
      onScored()
      onOpenChange(false)
      setSelectedIds(new Set())
      reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-4xl gba:max-h-screen gba:overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('lead-scoring-title')}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          <div className="gba:space-y-2">
            <Label>{t('lead-scoring-icp-select')}</Label>
            <Combobox
              value={icpId}
              onValueChange={value => {
                setIcpId(value || '')
                if (validationIssue === 'icp') {
                  setValidationIssue(null)
                }
              }}
              options={icpOptions}
              placeholder={t('lead-scoring-icp-select-placeholder')}
              searchPlaceholder={t('lead-scoring-icp-select-placeholder')}
              emptyText={t('lead-scoring-no-profiles-title')}
              data-testid="lead-scoring-selection-icp-combobox"
            />
            {validationIssue === 'icp' ? (
              <Alert variant="destructive" data-testid="lead-scoring-selection-icp-validation">
                <AlertDescription>{t('lead-scoring-selection-icp-required')}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <div className="gba:space-y-3">
            <div className="gba:flex gba:flex-col gba:gap-3 gba:md:flex-row gba:md:items-end gba:md:justify-between">
              {!hasPresetSelection && (
                <Input
                  value={search}
                  onChange={event => {
                    setSearch(event.target.value)
                    clearPresetSelection()
                  }}
                  placeholder={t('lead-scoring-selection-search-placeholder')}
                  className="gba:md:max-w-sm"
                />
              )}
              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                <Select
                  value={getLatestPresetSelectValue(presetScope, latestCount, ALL_LEADS_PRESET)}
                  onValueChange={value => {
                    if (value === ALL_LEADS_PRESET) {
                      setPresetScope('all')
                      setLatestCount(null)
                    } else {
                      const parsedCount = parseLatestCountPresetValue(value)
                      if (!parsedCount) {
                        return
                      }
                      setPresetScope('latest')
                      setLatestCount(parsedCount)
                    }
                    setTimeRange(null)
                    setSelectedIds(new Set())
                  }}
                >
                  <SelectTrigger className="gba:w-40" data-testid="lead-scoring-selection-latest-trigger">
                    <SelectValue placeholder={t('lead-scoring-selection-latest')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_LEADS_PRESET}>{t('lead-scoring-selection-all')}</SelectItem>
                    {LATEST_COUNT_OPTIONS.map(count => (
                      <SelectItem key={count} value={String(count)}>
                        {t('lead-scoring-selection-last-count', { count })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={getTimeRangePresetSelectValue(presetScope, timeRange, ALL_LEADS_PRESET)}
                  onValueChange={value => {
                    if (value === ALL_LEADS_PRESET) {
                      setPresetScope('all')
                      setTimeRange(null)
                    } else {
                      setPresetScope('time')
                      setTimeRange(value as LeadScoringTimeRange)
                    }
                    setLatestCount(null)
                    setSelectedIds(new Set())
                  }}
                >
                  <SelectTrigger className="gba:w-40" data-testid="lead-scoring-selection-time-trigger">
                    <SelectValue placeholder={t('lead-scoring-selection-time')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_LEADS_PRESET}>{t('lead-scoring-selection-all')}</SelectItem>
                    {TIME_RANGES.map(range => (
                      <SelectItem key={range} value={range}>
                        {t(TIME_RANGE_I18N_KEYS[range])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Checkbox
                    id="lead-scoring-unscored-only"
                    checked={unscoredOnly}
                    onCheckedChange={checked => setUnscoredOnly(checked === true)}
                    data-testid="lead-scoring-selection-unscored-only"
                  />
                  <Label htmlFor="lead-scoring-unscored-only" className="gba:cursor-pointer gba:font-normal">
                    {t('lead-scoring-selection-unscored-only')}
                  </Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="lead-scoring-selection-all-unscored-button"
                  onClick={applyAllUnscoredShortcut}
                >
                  {t('lead-scoring-selection-all-unscored')}
                </Button>
              </div>
            </div>

            {hasPresetSelection ? (
              <div
                className="gba:flex gba:items-center gba:justify-between gba:rounded-md gba:border gba:p-3 gba:text-sm"
                data-testid="lead-scoring-preset-selection-message"
              >
                <span>{t('lead-scoring-selection-preset-selected', { selection: selectionSummary })}</span>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="lead-scoring-selection-manual-button"
                  onClick={clearPresetSelection}
                >
                  {t('lead-scoring-selection-back-to-manual')}
                </Button>
              </div>
            ) : (
              <>
                <div
                  className="gba:max-h-96 gba:overflow-y-auto gba:rounded-md gba:border gba:divide-y"
                  onScroll={event => {
                    const element = event.currentTarget
                    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 48) {
                      candidates.loadMore(candidateQuery)
                    }
                  }}
                >
                  {candidates.items.map(candidate => (
                    <LeadScoringCandidateRow
                      key={candidate.id}
                      candidate={candidate}
                      checked={selectedIds.has(candidate.id)}
                      onToggle={toggleCandidate}
                    />
                  ))}
                  {candidates.loading && (
                    <div className="gba:flex gba:justify-center gba:p-4">
                      <Spinner size="sm" />
                    </div>
                  )}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground" data-testid="lead-scoring-selection-summary">
                  {selectionSummary}
                </div>
              </>
            )}
          </div>

          {validationIssue === 'leads' ? (
            <Alert variant="destructive" data-testid="lead-scoring-selection-leads-validation">
              <AlertDescription>{t('lead-scoring-selection-leads-required')}</AlertDescription>
            </Alert>
          ) : null}
          {scoringError ? (
            <Alert variant="destructive" data-testid="lead-scoring-selection-scoring-error">
              <AlertDescription>{scoringError}</AlertDescription>
            </Alert>
          ) : null}
          {candidates.error ? (
            <Alert variant="destructive" data-testid="lead-scoring-selection-candidates-error">
              <AlertDescription>{candidates.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="gba:flex gba:justify-end gba:gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('lead-scoring-cancel')}
            </Button>
            <Button
              onClick={() => {
                handleScore().catch(() => {})
              }}
              disabled={scoring}
            >
              {scoring ? t('lead-scoring-loading') : t('lead-scoring-run-bulk')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
