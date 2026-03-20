import React, { useEffect, useState, useRef } from 'react'
import { Spinner } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'

const prefixDataTestId = 'investment-form-group-select-segment'

/**
 * Detects investment group from input string by matching against catalog data.
 * This is fully dynamic and works with any groups defined in the catalog.
 *
 * @param input - String to match (could be ID, tabId, code, or display name)
 * @param investmentGroups - Array of investment groups from catalog
 * @returns Full investment group ID if match found, null otherwise
 */
const detectGroupFromCatalog = (
  input: string | null | undefined,
  investmentGroups: InvestmentType[]
): string | null => {
  if (!input || investmentGroups.length === 0) return null

  // 1. If input is already a full investment group ID, validate it exists and return
  if (input.startsWith('InvestmentGroup:v1:')) {
    return investmentGroups.some(g => g.id === input) ? input : null
  }

  const normalizedInput = input.toLowerCase().trim()

  // 2. Try exact match against tabId (highest confidence)
  // tabId format: code.toLowerCase().replace(/_/g, '-')
  // This handles cases like "private-equity", "equity", "test", etc.
  const tabIdMatch = investmentGroups.find(group => {
    const tabId = group.code.toLowerCase().replace(/_/g, '-')
    return tabId === normalizedInput
  })
  if (tabIdMatch) return tabIdMatch.id

  // 3. Try exact match against code (case-insensitive)
  const codeMatch = investmentGroups.find(group => group.code.toLowerCase() === normalizedInput)
  if (codeMatch) return codeMatch.id

  // 4. Try exact match against displayValue/value (case-insensitive)
  const displayMatch = investmentGroups.find(group => {
    const display = (group.displayValue || group.value || '').toLowerCase()
    return display === normalizedInput
  })
  if (displayMatch) return displayMatch.id

  // 5. Only as last resort: check if input contains the tabId as a complete word
  // Use word boundary matching to avoid "private-equity" matching "equity"
  const partialMatch = investmentGroups.find(group => {
    const tabId = group.code.toLowerCase().replace(/_/g, '-')
    // Match whole word only (e.g., /\bequity\b/ matches "equity" but not "private-equity")
    const regex = new RegExp(`\\b${tabId}\\b`, 'i')
    return regex.test(input)
  })
  if (partialMatch) return partialMatch.id

  return null
}

/**
 * Consolidated detection function that attempts to auto-detect investment group
 * from various context sources (additionalData, URL params, referrer, etc.)
 *
 * @param businessAppContext - Business app context containing additionalData
 * @param investmentGroups - Array of investment groups from catalog
 * @param onGroupSelect - Callback to invoke when group is detected
 * @param setIsDetectingContext - State setter for detection loading state
 * @param setContextDetectionComplete - State setter for detection completion
 * @returns true if group was detected and selected, false otherwise
 */
const detectInvestmentGroup = (
  businessAppContext: any,
  investmentGroups: InvestmentType[],
  onGroupSelect: (group: string) => void,
  setIsDetectingContext: (value: boolean) => void,
  setContextDetectionComplete: (value: boolean) => void
): boolean => {
  try {
    // Ordered source evaluation (priority from highest to lowest)
    const sources = [
      // 1. Business app context data (primary) - direct from button click
      businessAppContext?.additionalData?.investmentGroup, // Direct group ID (highest priority)
      businessAppContext?.additionalData?.fromSubView, // Tab ID from button
      businessAppContext?.additionalData?.subView,
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

    // Find first valid investment group from catalog
    for (const source of sources) {
      const detectedGroup = detectGroupFromCatalog(source, investmentGroups)
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

    // Don't auto-detect if groups haven't loaded yet - wait for useEffect
    if (investmentGroups.length === 0) {
      return false
    }

    try {
      // Use simplified detection to determine if auto-detection is possible
      const sources = [
        businessAppContext?.additionalData?.investmentGroup,
        businessAppContext?.additionalData?.fromSubView,
        businessAppContext?.additionalData?.subView,
        new URLSearchParams(globalThis.location.search).get('fromSubView'),
        new URLSearchParams(globalThis.location.search).get('subView')
      ]

      for (const source of sources) {
        if (detectGroupFromCatalog(source, investmentGroups)) {
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
  const hasDetected = useRef(false)

  // Auto-detect investment group from URL context
  useEffect(() => {
    // Guard: Only run detection if not already detecting and not already completed
    if (isDetectingLocal.current || hasDetected.current) {
      return
    }

    // Wait for investmentGroups to be loaded before attempting detection
    if (investmentGroups.length === 0) {
      return
    }

    // Skip detection if explicitly disabled
    if (skipAutoDetection) {
      setIsDetectingContext(false)
      setContextDetectionComplete(true)
      hasDetected.current = true
      return
    }

    // Set guard before detection
    isDetectingLocal.current = true
    setIsDetectingContext(true)

    // Use consolidated detection function with catalog data
    detectInvestmentGroup(
      businessAppContext,
      investmentGroups,
      onGroupSelect,
      setIsDetectingContext,
      setContextDetectionComplete
    )

    // Update guards after detection
    hasDetected.current = true
    isDetectingLocal.current = false
  }, [onGroupSelect, businessAppContext, investmentGroups, skipAutoDetection])

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
