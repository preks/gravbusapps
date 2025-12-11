import { useState, useCallback, useMemo, createElement } from 'react'
import { ActionOption } from '@newwork/nw-design-system'
import { useMainContextsData } from './useMainContextsData'
import { useFlowItems, ExternalContextData } from './useFlowItems'
import { FlowContextName } from '../types/FlowRegistryTypes'
import { formatDataTestId } from '../utils/formatDataTestId'
import { Share2 } from 'lucide-react'
import { useBlinkOptional } from '@/common/providers/BlinkProvider'

/**
 * Shared comparison function for AppAction components to prevent unnecessary re-renders
 * This ensures consistent behavior across AppAction, AppActionButton, and AppActionMenu
 */
export const appActionPropsComparison = (prevProps: any, nextProps: any): boolean => {
  // Deep comparison for contextsArray (arrays with same values should be equal)
  const prevContexts = prevProps.contextsArray || []
  const nextContexts = nextProps.contextsArray || []
  if (prevContexts.length !== nextContexts.length) {
    return false
  }

  for (let i = 0; i < prevContexts.length; i++) {
    if (prevContexts[i] !== nextContexts[i]) {
      return false
    }
  }

  // Compare other props
  const propsToCompare = [
    'externalContextData',
    'accessToken',
    'prefixDataTestId',
    'emptyStateBehavior',
    'deferMainContextRequestsUntilClick',
    'blinkContext'
  ] as const

  for (const key of propsToCompare) {
    const prevValue = prevProps[key]
    const nextValue = nextProps[key]

    // Deep comparison for objects
    if (typeof prevValue === 'object' && typeof nextValue === 'object' && prevValue !== null && nextValue !== null) {
      const prevStr = JSON.stringify(prevValue)
      const nextStr = JSON.stringify(nextValue)
      if (prevStr !== nextStr) {
        return false
      }
    } else if (prevValue !== nextValue) {
      return false
    }
  }

  return true
}

// Create stable empty array and object to prevent re-renders
export const EMPTY_CONTEXTS_ARRAY: FlowContextName[] = []
export const EMPTY_EXTERNAL_CONTEXT_DATA: ExternalContextData = {}

/**
 * Blink context configuration for share functionality
 */
export interface ShareContext {
  entityType: string
  entityId: string
  entityName: string
  entityUrl: string
}

/**
 * Common props interface for App Action components
 */
export interface AppActionCommonProps {
  contextsArray?: FlowContextName[]
  externalContextData?: ExternalContextData
  staticFlowData?: ActionOption[]
  prefixDataTestId?: string
  accessToken?: string
  deferMainContextRequestsUntilClick?: boolean
  emptyStateBehavior?: 'disable' | 'hide' | 'enable'
  'data-testid'?: string
  loadingText?: string
  noActionsText?: string
  shareContext?: ShareContext
}

/**
 * Configuration for the useAppActionData hook
 */
export interface UseAppActionDataConfig {
  contextsArray?: FlowContextName[]
  externalContextData?: ExternalContextData
  staticFlowData?: ActionOption[]
  prefixDataTestId?: string
  accessToken?: string
  deferMainContextRequestsUntilClick?: boolean
  emptyStateBehavior?: 'disable' | 'hide' | 'enable'
  loadingText?: string
  noActionsText?: string
  shareContext?: ShareContext
}

/**
 * Return type for the useAppActionData hook
 */
export interface UseAppActionDataReturn {
  // Data
  combinedData: ActionOption[]
  isLoading: boolean

  // Handlers
  handleDeferredFetch: () => void

  // Test ID utilities
  formatTestId: (suffix: string) => string

  // Translations
  translations: {
    loading: string
    noActions: string
  }

  // Loading state calculation
  shouldShowLoading: boolean

  // Internal state for debugging
  hasDeferredFetchAttempted: boolean
}

/**
 * Shared hook for App Action components (Button and Menu)
 * Handles flow data fetching, loading states, and deferred loading logic
 */
export const useAppActionData = (config: UseAppActionDataConfig, dataTestIdPrefix: string): UseAppActionDataReturn => {
  // Track whether a deferred fetch has been attempted
  const [hasDeferredFetchAttempted, setHasDeferredFetchAttempted] = useState(false)

  // Use optional blink hook - returns null if not in provider context
  const blinkContext = useBlinkOptional()
  const openShareDialog = blinkContext?.openShareDialog ?? null

  // Memoize the contexts array to prevent unnecessary re-renders
  const contextsArray = useMemo(() => config.contextsArray ?? EMPTY_CONTEXTS_ARRAY, [config.contextsArray])

  // Use manual mode when deferring requests until click/open
  const {
    mainContextsData,
    fetchMainContextsData,
    isLoading: isLoadingContexts
  } = useMainContextsData(contextsArray, config.accessToken ?? '', !!config.deferMainContextRequestsUntilClick)

  // Memoize external context data to prevent unnecessary re-renders
  const externalContextData = useMemo(
    () => config.externalContextData ?? EMPTY_EXTERNAL_CONTEXT_DATA,
    [config.externalContextData]
  )

  const {
    flowData,
    fetchFlowItems,
    isLoading: isLoadingFlows
  } = useFlowItems({
    mainContextsData,
    externalContextData,
    isFlowButtonOrigin: true,
    accessToken: config.accessToken ?? '',
    manualFetch: !!config.deferMainContextRequestsUntilClick
  })

  // Track overall loading state - true if either contexts or flows are loading
  const isLoading = isLoadingContexts || isLoadingFlows

  // Generate share action if shareContext is provided and BlinkProvider is available
  const shareAction: ActionOption | null = useMemo(() => {
    if (!config.shareContext || !openShareDialog) {
      return null
    }

    return {
      key: `share-${config.shareContext.entityType}-${config.shareContext.entityId}`,
      label: 'Share via Blink',
      icon: createElement(Share2, { className: 'gba:w-4 gba:h-4' }),
      onClick: () => {
        if (openShareDialog && config.shareContext) {
          openShareDialog(config.shareContext)
        }
      },
      category: 'Sharing'
    }
  }, [config.shareContext, openShareDialog])

  // Combined data from static, share, and flow sources
  const combinedData = useMemo(() => {
    const actions: ActionOption[] = [
      ...(config.staticFlowData ?? []),
      ...(shareAction ? [shareAction] : []),
      ...flowData
    ]
    return actions
  }, [config.staticFlowData, shareAction, flowData])

  // Calculate whether to show loading state
  // If staticFlowData OR shareAction is provided, we never show the loading overlay
  const hasStaticData = (config.staticFlowData?.length ?? 0) > 0
  const hasShareAction = shareAction !== null
  const shouldShowLoading =
    !hasStaticData &&
    !hasShareAction &&
    (isLoading ||
      (!!config.deferMainContextRequestsUntilClick && combinedData.length === 0 && !hasDeferredFetchAttempted))

  // Translations
  const translations = {
    // Project has no i18n concept active here; use literal fallbacks
    loading: config.loadingText || 'Loading actions…',
    noActions: config.noActionsText || 'No actions available'
  }

  // Test ID formatter
  const formatTestId = useCallback(
    (suffix: string) => {
      return formatDataTestId(config.prefixDataTestId, dataTestIdPrefix, suffix)
    },
    [config.prefixDataTestId, dataTestIdPrefix]
  )

  // Handler for deferred fetching (used by both Button and Menu)
  const handleDeferredFetch = useCallback(() => {
    // If configured to defer requests until interaction, trigger the requests
    if (config.deferMainContextRequestsUntilClick && !hasDeferredFetchAttempted) {
      // Mark that a fetch has been attempted
      setHasDeferredFetchAttempted(true)

      // First fetch main contexts data, then pass that data directly to fetchFlowItems
      if (fetchMainContextsData) {
        fetchMainContextsData()
          .then(contextData => {
            // Only fetch flow items if we have context data
            if (contextData && fetchFlowItems) {
              fetchFlowItems(contextData)
            }
          })
          .catch(error => {
            console.error('Error fetching context data:', error)
          })
      }
    }
  }, [config.deferMainContextRequestsUntilClick, hasDeferredFetchAttempted, fetchMainContextsData, fetchFlowItems])

  return {
    combinedData,
    isLoading,
    handleDeferredFetch,
    formatTestId,
    translations,
    shouldShowLoading,
    hasDeferredFetchAttempted
  }
}

/**
 * Utility function to extract common props from component props
 * Removes App Action specific props and returns clean props for the underlying component
 */
export const extractAppActionProps = <T extends AppActionCommonProps>(
  props: T
): {
  appActionConfig: UseAppActionDataConfig
  cleanProps: Omit<T, keyof AppActionCommonProps> & { 'data-testid'?: string }
} => {
  const {
    contextsArray,
    externalContextData,
    staticFlowData,
    prefixDataTestId,
    accessToken,
    deferMainContextRequestsUntilClick,
    emptyStateBehavior = 'disable',
    'data-testid': customDataTestId,
    loadingText,
    noActionsText,
    shareContext,
    ...cleanProps
  } = props

  const appActionConfig: UseAppActionDataConfig = {
    contextsArray,
    externalContextData,
    staticFlowData,
    prefixDataTestId,
    accessToken,
    deferMainContextRequestsUntilClick,
    emptyStateBehavior,
    loadingText,
    noActionsText,
    shareContext
  }

  return {
    appActionConfig,
    cleanProps: { ...cleanProps, 'data-testid': customDataTestId } as Omit<T, keyof AppActionCommonProps> & {
      'data-testid'?: string
    }
  }
}
