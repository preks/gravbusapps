import React, { useEffect, useState, useRef } from 'react'
import { Spinner } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'
import type { ResolvedInvestmentGroupLaunch } from './investmentGroupLaunchContext'

const prefixDataTestId = 'investment-form-group-select-segment'

const getGroupTabId = (code: string | undefined): string | null => {
  if (!code) return null
  return code.toLowerCase().replace(/_/g, '-')
}

const resolveCatalogGroupId = (
  investmentGroupId: string | undefined,
  investmentGroups: InvestmentType[]
): string | null => {
  if (!investmentGroupId || investmentGroups.length === 0) return null

  if (investmentGroupId.startsWith('InvestmentGroup:v1:')) {
    return investmentGroups.some(group => group.id === investmentGroupId) ? investmentGroupId : null
  }

  const normalizedInput = investmentGroupId.toLowerCase().trim()

  const tabIdMatch = investmentGroups.find(group => {
    const tabId = getGroupTabId(group.code)
    return tabId !== null && tabId === normalizedInput
  })
  if (tabIdMatch) return tabIdMatch.id

  const codeMatch = investmentGroups.find(
    group => group.code !== undefined && group.code.toLowerCase() === normalizedInput
  )
  if (codeMatch) return codeMatch.id

  return null
}

export interface GroupSelectSegmentProps {
  groupLaunch: ResolvedInvestmentGroupLaunch
  onGroupSelect: (group: string) => void
  skipAutoDetection?: boolean
  getTypesByLevel: (level: number) => InvestmentType[]
  loading?: boolean
  error?: string | null
}

const GroupSelectSegment: React.FC<GroupSelectSegmentProps> = ({
  groupLaunch,
  onGroupSelect,
  skipAutoDetection = false,
  getTypesByLevel,
  loading = false,
  error = null
}) => {
  const investmentGroups = getTypesByLevel(0)

  const groupsForDisplay = investmentGroups.map(group => {
    const displayTitle = group.displayValue || group.value || group.code || group.id

    return {
      id: group.id,
      code: group.code,
      title: displayTitle,
      value: group.id
    }
  })

  const shouldAutoSelect =
    !skipAutoDetection &&
    groupLaunch.selectionMode === 'auto' &&
    Boolean(groupLaunch.investmentGroupId) &&
    investmentGroups.length > 0

  const [isDetectingContext, setIsDetectingContext] = useState(shouldAutoSelect)
  const [contextDetectionComplete, setContextDetectionComplete] = useState(!shouldAutoSelect)

  const hasAppliedLaunch = useRef(false)

  useEffect(() => {
    if (hasAppliedLaunch.current) {
      return
    }

    if (investmentGroups.length === 0) {
      return
    }

    hasAppliedLaunch.current = true

    if (skipAutoDetection) {
      setIsDetectingContext(false)
      setContextDetectionComplete(true)
      return
    }

    if (groupLaunch.selectionMode === 'manual') {
      setIsDetectingContext(false)
      setContextDetectionComplete(true)
      return
    }

    const catalogGroupId = resolveCatalogGroupId(groupLaunch.investmentGroupId, investmentGroups)
    if (!catalogGroupId) {
      setIsDetectingContext(false)
      setContextDetectionComplete(true)
      return
    }

    setIsDetectingContext(false)
    setContextDetectionComplete(true)
    onGroupSelect(catalogGroupId)
  }, [groupLaunch, investmentGroups, onGroupSelect, skipAutoDetection])

  return (
    <div data-testid={formatDataTestId(prefixDataTestId, 'container')} className="gba:p-6">
      {!isDetectingContext && contextDetectionComplete && (
        <div className="gba:text-center gba:mb-8">
          <h2 className="gba:m-0 gba:mb-2 gba:text-xl gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('investment.form.selectGroup', 'Select Investment Group')}
          </h2>
          <p className="gba:m-0 gba:text-base gba:text-secondary-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'investment.form.chooseGroup',
              'Choose the investment group you want to create'
            )}
          </p>
        </div>
      )}

      {isDetectingContext && (
        <div
          data-testid={formatDataTestId(prefixDataTestId, 'context-detection-container')}
          className="gba:text-center gba:p-8 gba:flex gba:flex-col gba:items-center gba:gap-4"
        >
          <Spinner size="lg" data-testid={formatDataTestId(prefixDataTestId, 'context-detection-spinner')} />
          <p
            data-testid={formatDataTestId(prefixDataTestId, 'context-detection-message')}
            className="gba:m-0 gba:text-secondary-foreground"
          >
            {getTranslationFromI18nKeyAndLabel('investment.form.detectingContext', 'Detecting investment context...')}
          </p>
        </div>
      )}

      {!isDetectingContext && loading && (
        <div
          data-testid={formatDataTestId(prefixDataTestId, 'catalog-loading-container')}
          className="gba:text-center gba:p-8 gba:flex gba:flex-col gba:items-center gba:gap-4"
        >
          <Spinner size="lg" data-testid={formatDataTestId(prefixDataTestId, 'catalog-loading-spinner')} />
          <p
            data-testid={formatDataTestId(prefixDataTestId, 'catalog-loading-message')}
            className="gba:m-0 gba:text-secondary-foreground"
          >
            {getTranslationFromI18nKeyAndLabel('investment.form.loadingGroups', 'Loading investment groups...')}
          </p>
        </div>
      )}

      {!isDetectingContext && error && (
        <div
          data-testid={formatDataTestId(prefixDataTestId, 'error-container')}
          className="gba:text-center gba:p-8 gba:text-destructive"
        >
          <p data-testid={formatDataTestId(prefixDataTestId, 'error-message')} className="gba:m-0 gba:mb-2">
            {getTranslationFromI18nKeyAndLabel('investment.form.loadFailed', 'Failed to load investment groups')}
          </p>
          <p data-testid={formatDataTestId(prefixDataTestId, 'error-details')} className="gba:m-0 gba:text-sm">
            {error}
          </p>
        </div>
      )}

      {!isDetectingContext && !loading && !error && contextDetectionComplete && (
        <div className="gba:space-y-8">
          <div
            className="gba:flex gba:flex-col gba:gap-8 gba:items-stretch"
            data-testid={formatDataTestId(prefixDataTestId, 'investment-groups-grid')}
          >
            {groupsForDisplay.map(group => (
              <button
                key={group.id}
                type="button"
                onClick={() => onGroupSelect(group.value)}
                data-testid={formatDataTestId(prefixDataTestId, `investment-group-button-${group.id}`)}
                className="gba:min-h-16 gba:h-16 gba:flex gba:items-center gba:justify-center gba:text-center gba:whitespace-normal gba:px-8 gba:py-6 gba:bg-secondary gba:text-secondary-foreground gba:border gba:border-solid gba:rounded-md gba:text-base gba:font-medium gba:cursor-pointer gba:transition-all gba:duration-200 gba:ease-in-out gba:select-none gba:hover:opacity-80 gba:border-ring"
              >
                {group.title}
              </button>
            ))}
          </div>
          {groupsForDisplay.length === 0 && (
            <div
              data-testid={formatDataTestId(prefixDataTestId, 'empty-state-container')}
              className="gba:text-center gba:p-8 gba:text-secondary-foreground"
            >
              <p data-testid={formatDataTestId(prefixDataTestId, 'empty-state-message')} className="gba:m-0">
                {getTranslationFromI18nKeyAndLabel(
                  'investment.form.noGroupsAvailable',
                  'No investment groups available'
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default GroupSelectSegment
