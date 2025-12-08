import React, { useEffect, useState, useRef } from 'react'
import { Spinner } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'

const prefixDataTestId = 'investment-form-group-select-segment'

// Normalized map for investment group detection
const INVESTMENT_GROUP_MAP: Record<string, string> = {
  // Liquid Fund variations
  'liquid-fund': 'InvestmentGroup:v1:LIQUID_FUND',
  liquid_fund: 'InvestmentGroup:v1:LIQUID_FUND',
  'liquid-funds': 'InvestmentGroup:v1:LIQUID_FUND',
  liquid_funds: 'InvestmentGroup:v1:LIQUID_FUND',
  LIQUID_FUND: 'InvestmentGroup:v1:LIQUID_FUND',
  'LIQUID-FUND': 'InvestmentGroup:v1:LIQUID_FUND',
  LIQUID_FUNDS: 'InvestmentGroup:v1:LIQUID_FUND',
  'LIQUID-FUNDS': 'InvestmentGroup:v1:LIQUID_FUND',

  // Real Estate variations
  'real-estate': 'InvestmentGroup:v1:REAL_ESTATE',
  real_estate: 'InvestmentGroup:v1:REAL_ESTATE',
  REAL_ESTATE: 'InvestmentGroup:v1:REAL_ESTATE',
  'REAL-ESTATE': 'InvestmentGroup:v1:REAL_ESTATE',
  realestate: 'InvestmentGroup:v1:REAL_ESTATE',
  REALESTATE: 'InvestmentGroup:v1:REAL_ESTATE',

  // Equity variations
  equity: 'InvestmentGroup:v1:EQUITY',
  EQUITY: 'InvestmentGroup:v1:EQUITY',
  equities: 'InvestmentGroup:v1:EQUITY',
  EQUITIES: 'InvestmentGroup:v1:EQUITY'
}

// Single function to detect investment group from any string input
const detectGroupFromString = (input: string | null | undefined): string | null => {
  if (!input) return null

  // Direct lookup first
  if (INVESTMENT_GROUP_MAP[input]) {
    return INVESTMENT_GROUP_MAP[input]
  }

  // Partial match for URLs and complex strings
  for (const [key, value] of Object.entries(INVESTMENT_GROUP_MAP)) {
    if (input.includes(key)) {
      return value
    }
  }

  return null
}

// Consolidated detection function with single responsibility
const detectInvestmentGroup = (
  businessAppContext: any,
  onGroupSelect: (group: string) => void,
  setIsDetectingContext: (value: boolean) => void,
  setContextDetectionComplete: (value: boolean) => void
): boolean => {
  try {
    // Ordered source evaluation
    const sources = [
      // 1. Business app context data (primary)
      businessAppContext?.additionalData?.fromSubView,
      businessAppContext?.additionalData?.subView,
      businessAppContext?.additionalData?.investmentGroup,
      businessAppContext?.additionalData?.fromView,
      businessAppContext?.additionalData?.view,

      // 2. URL parameters (secondary)
      new URLSearchParams(globalThis.location.search).get('fromSubView'),
      new URLSearchParams(globalThis.location.search).get('subView'),
      new URLSearchParams(globalThis.location.search).get('view'),

      // 3. Document referrer (tertiary)
      document.referrer,

      // 4. Current URL (fallback)
      globalThis.location.href
    ]

    // Find first valid investment group
    for (const source of sources) {
      const detectedGroup = detectGroupFromString(source)
      if (detectedGroup) {
        // Special case: Skip auto-detection for overview/all contexts
        if (source) {
          const normalized = source.trim().toLowerCase()
          if (['overview', 'all'].includes(normalized)) {
            continue
          }
        }

        // Valid group found - complete selection
        setIsDetectingContext(false)
        setContextDetectionComplete(true)
        onGroupSelect(detectedGroup)
        return true
      }
    }

    // No group detected - show manual selection
    setIsDetectingContext(false)
    setContextDetectionComplete(true)
    return false
  } catch (error) {
    console.error('Error detecting investment context:', error)
    setIsDetectingContext(false)
    setContextDetectionComplete(true)
    return false
  }
}

export interface GroupSelectSegmentProps extends BusinessAppContextProps {
  onGroupSelect: (group: string) => void
  skipAutoDetection?: boolean
  getTypesByLevel: (level: number) => InvestmentType[]
  loading?: boolean
  error?: string | null
}

const GroupSelectSegment: React.FC<GroupSelectSegmentProps> = ({
  onGroupSelect,
  skipAutoDetection = false,
  getTypesByLevel,
  loading = false,
  error = null,
  ...businessAppContext
}) => {
  // Get level 0 types (InvestmentGroups)
  const investmentGroups = getTypesByLevel(0)

  // Transform to display format
  const groupsForDisplay = investmentGroups.map(group => {
    const displayTitle = group.displayValue || group.value || group.code || group.id

    return {
      id: group.id,
      code: group.code,
      title: displayTitle,
      value: group.id // Use the full ID from InvestmentType
    }
  })

  // Immediately check if we should auto-detect (before first render)
  const shouldAutoDetect = (() => {
    // Skip auto-detection if explicitly requested (e.g., user clicked Back button)
    if (skipAutoDetection) {
      return false
    }

    try {
      // Use simplified detection to determine if auto-detection is possible
      const sources = [
        businessAppContext?.additionalData?.fromSubView,
        businessAppContext?.additionalData?.subView,
        businessAppContext?.additionalData?.investmentGroup,
        new URLSearchParams(globalThis.location.search).get('fromSubView'),
        new URLSearchParams(globalThis.location.search).get('subView')
      ]

      for (const source of sources) {
        if (detectGroupFromString(source)) {
          // Skip auto-detection for overview/all contexts
          if (source) {
            const normalized = source.trim().toLowerCase()
            if (['overview', 'all'].includes(normalized)) {
              return false
            }
          }
          return true
        }
      }

      return false
    } catch {
      return false
    }
  })()

  // Track context detection state
  const [isDetectingContext, setIsDetectingContext] = useState(shouldAutoDetect)
  const [contextDetectionComplete, setContextDetectionComplete] = useState(!shouldAutoDetect)

  // Guard to prevent duplicate detection calls
  const isDetectingLocal = useRef(false)
  const hasDetected = useRef(!shouldAutoDetect)

  // Auto-detect investment group from URL context
  useEffect(() => {
    // Guard: Only run detection if not already detecting and not already completed
    if (isDetectingLocal.current || hasDetected.current) {
      return
    }

    // Set guard before detection
    isDetectingLocal.current = true

    // Use consolidated detection function
    detectInvestmentGroup(businessAppContext, onGroupSelect, setIsDetectingContext, setContextDetectionComplete)

    // Update guards after detection
    hasDetected.current = true
    isDetectingLocal.current = false
  }, [onGroupSelect, businessAppContext])

  return (
    <div data-testid={formatDataTestId(prefixDataTestId, 'container')} className="gba:p-6">
      {/* Only show title when we're not detecting context or when showing manual selection */}
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

      {/* Context Detection Loading State */}
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

      {/* Catalog Loading State */}
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

      {/* Error State */}
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
              <div
                key={group.id}
                role="button"
                tabIndex={0}
                onClick={() => onGroupSelect(group.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onGroupSelect(group.value)
                  }
                }}
                data-testid={formatDataTestId(prefixDataTestId, `investment-group-button-${group.id}`)}
                className="gba:min-h-16 gba:h-16 gba:flex gba:items-center gba:justify-center gba:text-center gba:whitespace-normal gba:px-8 gba:py-6 gba:bg-secondary gba:text-secondary-foreground gba:border gba:border-solid gba:rounded-md gba:text-base gba:font-medium gba:cursor-pointer gba:transition-all gba:duration-200 gba:ease-in-out gba:select-none gba:hover:opacity-80 gba:border-ring"
              >
                {group.title}
              </div>
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
