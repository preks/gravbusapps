import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import icpScoringI18n from '@/common/components/icp-scoring/_i18n'
import {
  IcpScoringOpportunityWeighingSection,
  useBulkIcpScore,
  useOpportunityIcpScoringWeighing,
  applyOpportunityModePayloadToBulkRequest,
  type BulkIcpScoreRequest,
  type IcpScoringEntityConfig,
  type IcpScoringEntityType
} from '@/common/components/icp-scoring'
import { IDEAL_CUSTOMER_PROFILES_CATALOG } from '@/common/data/customer/constants/customerCatalogs'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import { getIcpScoringEntityConfig } from '../getIcpScoringEntityConfig'
import { createLeadIcpScoringSelectionLabels } from '../adapters/createLeadIcpScoringSelectionLabels'
import { createOpportunityIcpScoringSelectionLabels } from '../adapters/createOpportunityIcpScoringSelectionLabels'
import { useIcpScoringLeadCandidates } from '../hooks/useIcpScoringLeadCandidates'
import { useIcpScoringOpportunityCandidates } from '../hooks/useIcpScoringOpportunityCandidates'
import type { IcpScoringCandidateQuery, IcpScoringCandidatesApi } from '../types/icpScoringCandidateTypes'
import {
  buildIcpScoringCandidateQuery,
  buildIcpScoringSelectionSummary,
  getLatestPresetSelectValue,
  getTimeRangePresetSelectValue,
  LATEST_COUNT_OPTIONS,
  parseLatestCountPresetValue,
  type IcpScoringPresetScope,
  type IcpScoringTimeRange,
  type LatestCountValue
} from '../utils/icpScoringSelectionUtils'
import { IcpScoringCandidateRow } from './IcpScoringCandidateRow'

export interface IcpScoringSelectionLabels {
  allEntities: string
  allUnscored: string
  latestPresetPlaceholder: string
  lastCount: (count: number) => string
  timeRange: (range: IcpScoringTimeRange) => string
  selectedCount: (count: number) => string
  unscoredSuffix: string
  searchPlaceholder: string
  entitiesRequired: string
}

export interface IcpScoringSelectionDialogProps {
  entityType: IcpScoringEntityType
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  onScored: () => void
}

const TIME_RANGES: IcpScoringTimeRange[] = ['today', 'last-week', 'last-month', 'last-quarter', 'last-year']
const ALL_ENTITIES_PRESET = 'all'
type SelectionValidationIssue = 'icp' | 'entities'

export const IcpScoringSelectionDialog: React.FC<IcpScoringSelectionDialogProps> = ({
  entityType,
  open,
  onOpenChange,
  accessToken,
  onScored
}) => {
  const { t } = useTranslation(icpScoringI18n)
  const entityConfig = useMemo(() => getIcpScoringEntityConfig(entityType, t), [entityType, t])
  const selectionLabels = useMemo(
    () =>
      entityType === 'opportunity'
        ? createOpportunityIcpScoringSelectionLabels(t)
        : createLeadIcpScoringSelectionLabels(t),
    [entityType, t]
  )

  if (!entityConfig) {
    return null
  }

  if (entityType === 'opportunity') {
    return (
      <IcpScoringSelectionDialogForOpportunity
        open={open}
        onOpenChange={onOpenChange}
        accessToken={accessToken}
        entityConfig={entityConfig}
        selectionLabels={selectionLabels}
        onScored={onScored}
      />
    )
  }

  return (
    <IcpScoringSelectionDialogForLead
      open={open}
      onOpenChange={onOpenChange}
      accessToken={accessToken}
      entityConfig={entityConfig}
      selectionLabels={selectionLabels}
      onScored={onScored}
    />
  )
}

interface IcpScoringSelectionDialogWithCandidatesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  entityConfig: IcpScoringEntityConfig
  selectionLabels: IcpScoringSelectionLabels
  onScored: () => void
}

const IcpScoringSelectionDialogForLead: React.FC<IcpScoringSelectionDialogWithCandidatesProps> = props => {
  const candidates = useIcpScoringLeadCandidates(props.accessToken)
  return <IcpScoringSelectionDialogContent {...props} candidates={candidates} />
}

const IcpScoringSelectionDialogForOpportunity: React.FC<IcpScoringSelectionDialogWithCandidatesProps> = props => {
  const candidates = useIcpScoringOpportunityCandidates(props.accessToken)
  return <IcpScoringSelectionDialogContent {...props} candidates={candidates} />
}

interface IcpScoringSelectionDialogContentProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  entityConfig: IcpScoringEntityConfig
  selectionLabels: IcpScoringSelectionLabels
  candidates: IcpScoringCandidatesApi
  onScored: () => void
}

const IcpScoringSelectionDialogContent: React.FC<IcpScoringSelectionDialogContentProps> = ({
  open,
  onOpenChange,
  accessToken,
  entityConfig,
  selectionLabels,
  candidates,
  onScored
}) => {
  const { labels, entityType } = entityConfig
  const isOpportunityScoring = entityType === 'opportunity'
  const { t } = useTranslation(icpScoringI18n)
  const opportunityWeighing = useOpportunityIcpScoringWeighing({ allowOptionalWeights: true })
  const resetOpportunityWeighing = opportunityWeighing.reset
  const { loadFirstPage, loadMore, items, loading: candidatesLoading, error: candidatesError } = candidates
  const { fetchCatalogEntries } = useCatalogEntries({ accessToken })
  const {
    loading: scoring,
    error: scoringError,
    runBulkScore,
    reset
  } = useBulkIcpScore(accessToken, labels.bulkScoreErrorFallback, labels.authError)
  const wasOpenRef = useRef(open)

  const [presetScope, setPresetScope] = useState<IcpScoringPresetScope | null>(null)
  const [latestCount, setLatestCount] = useState<LatestCountValue | null>(null)
  const [timeRange, setTimeRange] = useState<IcpScoringTimeRange | null>(null)
  const [unscoredOnly, setUnscoredOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [icpId, setIcpId] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [profileOptions, setProfileOptions] = useState<Array<{ id: string; label: string }>>([])
  const [validationIssue, setValidationIssue] = useState<SelectionValidationIssue | null>(null)

  const selectionTestIdPrefix = `${entityConfig.dataTestIdPrefix}-selection`
  const hasPresetSelection = presetScope !== null

  const candidateQuery = useMemo<IcpScoringCandidateQuery>(
    () =>
      buildIcpScoringCandidateQuery({
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
      buildIcpScoringSelectionSummary(
        {
          scope: presetScope,
          latestCount,
          timeRange,
          unscoredOnly,
          manualCount: selectedIds.size
        },
        selectionLabels
      ),
    [latestCount, presetScope, selectedIds.size, selectionLabels, timeRange, unscoredOnly]
  )

  const clearPresetSelection = useCallback(() => {
    setPresetScope(null)
    setLatestCount(null)
    setTimeRange(null)
  }, [])

  useEffect(() => {
    if (wasOpenRef.current && !open && isOpportunityScoring) {
      resetOpportunityWeighing()
    }
    wasOpenRef.current = open
  }, [open, isOpportunityScoring, resetOpportunityWeighing])

  useEffect(() => {
    if (!open) {
      return
    }

    loadFirstPage(candidateQuery)
  }, [candidateQuery, loadFirstPage, open])

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

  const resolveEntityIds = async (): Promise<string[]> => {
    if (!presetScope) {
      return Array.from(selectedIds)
    }

    const windowQuery = buildIcpScoringCandidateQuery({
      scope: presetScope,
      latestCount: latestCount ?? undefined,
      timeRange: timeRange ?? undefined,
      unscoredOnly: false,
      search
    })

    if (presetScope === 'all') {
      return candidates.fetchAllEntityIds(
        buildIcpScoringCandidateQuery({
          scope: presetScope,
          unscoredOnly,
          search
        })
      )
    }

    if (presetScope === 'latest' && latestCount) {
      if (unscoredOnly) {
        return candidates.fetchUnscoredEntityIdsWithinWindow(windowQuery, latestCount)
      }
      return candidates.fetchEntityIds(windowQuery, latestCount)
    }

    if (presetScope === 'time' && timeRange) {
      if (unscoredOnly) {
        return candidates.fetchUnscoredEntityIdsWithinWindow(windowQuery, 1000)
      }
      return candidates.fetchEntityIds(windowQuery, 1000)
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

    const entityIds = await resolveEntityIds()
    if (entityIds.length === 0) {
      setValidationIssue('entities')
      return
    }

    setValidationIssue(null)

    let request: BulkIcpScoreRequest
    if (isOpportunityScoring) {
      const modePayload = opportunityWeighing.buildModePayload()
      if (!modePayload) {
        return
      }

      request = applyOpportunityModePayloadToBulkRequest(
        {
          entity_type: 'opportunity',
          icp_id: icpId.trim(),
          entity_ids: entityIds
        },
        modePayload
      )
    } else {
      request = {
        entity_type: 'lead',
        icp_id: icpId.trim(),
        entity_ids: entityIds
      }
    }

    const result = await runBulkScore(request)

    if (result) {
      onScored()
      onOpenChange(false)
      setSelectedIds(new Set())
      reset()
      opportunityWeighing.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-4xl gba:max-h-screen gba:overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          <div className="gba:space-y-2">
            <Label>{labels.icpSelect}</Label>
            <Combobox
              value={icpId}
              onValueChange={value => {
                setIcpId(value || '')
                if (validationIssue === 'icp') {
                  setValidationIssue(null)
                }
              }}
              options={icpOptions}
              placeholder={labels.icpPlaceholder}
              searchPlaceholder={labels.icpPlaceholder}
              emptyText={labels.noProfilesTitle}
              data-testid={`${selectionTestIdPrefix}-icp-combobox`}
            />
            {validationIssue === 'icp' ? (
              <Alert variant="destructive" data-testid={`${selectionTestIdPrefix}-icp-validation`}>
                <AlertDescription>{t('icp-scoring-selection-icp-required')}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          {isOpportunityScoring ? (
            <IcpScoringOpportunityWeighingSection
              testIdPrefix={selectionTestIdPrefix}
              weightInputs={opportunityWeighing.weightInputs}
              onWeightInputChange={opportunityWeighing.setWeightInput}
              weightsValidationErrorKey={opportunityWeighing.weightsValidationErrorKey}
            />
          ) : null}

          <div className="gba:space-y-3">
            <div className="gba:flex gba:flex-col gba:gap-3 gba:md:flex-row gba:md:items-end gba:md:justify-between">
              {!hasPresetSelection && (
                <Input
                  value={search}
                  onChange={event => {
                    setSearch(event.target.value)
                    clearPresetSelection()
                  }}
                  placeholder={selectionLabels.searchPlaceholder}
                  className="gba:md:max-w-sm"
                />
              )}
              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                <Select
                  value={getLatestPresetSelectValue(presetScope, latestCount, ALL_ENTITIES_PRESET)}
                  onValueChange={value => {
                    if (value === ALL_ENTITIES_PRESET) {
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
                  <SelectTrigger className="gba:w-40" data-testid={`${selectionTestIdPrefix}-latest-trigger`}>
                    <SelectValue placeholder={selectionLabels.latestPresetPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ENTITIES_PRESET}>{selectionLabels.allEntities}</SelectItem>
                    {LATEST_COUNT_OPTIONS.map(count => (
                      <SelectItem key={count} value={String(count)}>
                        {selectionLabels.lastCount(count)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={getTimeRangePresetSelectValue(presetScope, timeRange, ALL_ENTITIES_PRESET)}
                  onValueChange={value => {
                    if (value === ALL_ENTITIES_PRESET) {
                      setPresetScope('all')
                      setTimeRange(null)
                    } else {
                      setPresetScope('time')
                      setTimeRange(value as IcpScoringTimeRange)
                    }
                    setLatestCount(null)
                    setSelectedIds(new Set())
                  }}
                >
                  <SelectTrigger className="gba:w-40" data-testid={`${selectionTestIdPrefix}-time-trigger`}>
                    <SelectValue placeholder={t('icp-scoring-selection-time')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ENTITIES_PRESET}>{selectionLabels.allEntities}</SelectItem>
                    {TIME_RANGES.map(range => (
                      <SelectItem key={range} value={range}>
                        {selectionLabels.timeRange(range)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Checkbox
                    id={`${selectionTestIdPrefix}-unscored-only`}
                    checked={unscoredOnly}
                    onCheckedChange={checked => setUnscoredOnly(checked === true)}
                    data-testid={`${selectionTestIdPrefix}-unscored-only`}
                  />
                  <Label
                    htmlFor={`${selectionTestIdPrefix}-unscored-only`}
                    className="gba:cursor-pointer gba:font-normal"
                  >
                    {t('icp-scoring-selection-unscored-only')}
                  </Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid={`${selectionTestIdPrefix}-all-unscored-button`}
                  onClick={applyAllUnscoredShortcut}
                >
                  {selectionLabels.allUnscored}
                </Button>
              </div>
            </div>

            {hasPresetSelection ? (
              <div
                className="gba:flex gba:items-center gba:justify-between gba:rounded-md gba:border gba:p-3 gba:text-sm"
                data-testid={`${selectionTestIdPrefix}-preset-selection-message`}
              >
                <span>{t('icp-scoring-selection-preset-selected', { selection: selectionSummary })}</span>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid={`${selectionTestIdPrefix}-manual-button`}
                  onClick={clearPresetSelection}
                >
                  {t('icp-scoring-selection-back-to-manual')}
                </Button>
              </div>
            ) : (
              <>
                <div
                  className="gba:max-h-96 gba:overflow-y-auto gba:rounded-md gba:border gba:divide-y"
                  onScroll={event => {
                    const element = event.currentTarget
                    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 48) {
                      loadMore(candidateQuery)
                    }
                  }}
                >
                  {items.map(candidate => (
                    <IcpScoringCandidateRow
                      key={candidate.id}
                      candidate={candidate}
                      checked={selectedIds.has(candidate.id)}
                      onToggle={toggleCandidate}
                      dataTestIdPrefix={selectionTestIdPrefix}
                    />
                  ))}
                  {candidatesLoading ? (
                    <div className="gba:flex gba:justify-center gba:p-4">
                      <Spinner size="sm" />
                    </div>
                  ) : null}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${selectionTestIdPrefix}-summary`}>
                  {selectionSummary}
                </div>
              </>
            )}
          </div>

          {validationIssue === 'entities' ? (
            <Alert variant="destructive" data-testid={`${selectionTestIdPrefix}-entities-validation`}>
              <AlertDescription>{selectionLabels.entitiesRequired}</AlertDescription>
            </Alert>
          ) : null}
          {scoringError ? (
            <Alert variant="destructive" data-testid={`${selectionTestIdPrefix}-scoring-error`}>
              <AlertDescription>{scoringError}</AlertDescription>
            </Alert>
          ) : null}
          {candidatesError ? (
            <Alert variant="destructive" data-testid={`${selectionTestIdPrefix}-candidates-error`}>
              <AlertDescription>{candidatesError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="gba:flex gba:justify-end gba:gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('icp-scoring-cancel')}
            </Button>
            <Button
              onClick={() => {
                handleScore().catch(() => {})
              }}
              disabled={scoring}
              data-testid={`${selectionTestIdPrefix}-submit`}
            >
              {scoring ? labels.loading : labels.runBulk}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
