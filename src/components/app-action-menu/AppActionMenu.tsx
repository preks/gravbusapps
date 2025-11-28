'use client'

import React, { useEffect, useRef } from 'react'
import { ActionMenu, type ActionMenuProps } from '@newwork/nw-design-system'
import {
  useAppActionData,
  extractAppActionProps,
  AppActionCommonProps,
  appActionPropsComparison
} from '@/common/hooks/useAppActionData'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

/**
 * @deprecated Use AppAction component instead with variant or mode="button" and custom children
 * @see AppAction
 */
export type AppActionMenuProps = Omit<ActionMenuProps, 'actions'> &
  AppActionCommonProps & {
    /**
     * Controls how the menu behaves when no flow items are available
     * @default 'disable'
     */
    emptyStateBehavior?: 'disable' | 'hide' | 'enable'
    /**
     * CSS style object for the container
     */
    style?: React.CSSProperties
    /**
     * Custom hover handlers for the container
     */
    onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void
    onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void
  }

const DATA_TEST_ID_PREFIX = 'AppActionMenu'

/**
 * AppActionMenu Component
 * Displays an action menu with flow items from the flow registry
 * Based on the ActionMenu from nw-design-system
 *
 * @deprecated Use AppAction component instead with variant or mode="button"
 * @example
 * // Instead of:
 * <AppActionMenu
 *   contextsArray={[FlowContextName.leadEntity]}
 *   externalContextData={{ leadId }}
 *   accessToken={accessToken}
 * >
 *   <Button>Actions</Button>
 * </AppActionMenu>
 *
 * // Use:
 * <AppAction
 *   mode="button"
 *   contextsArray={[FlowContextName.leadEntity]}
 *   externalContextData={{ leadId }}
 *   accessToken={accessToken}
 * >
 *   <Button>Actions</Button>
 * </AppAction>
 */
export const AppActionMenu: React.FC<AppActionMenuProps> = React.memo(props => {
  // Extract App Action specific props and get clean props for ActionMenu
  const { appActionConfig, cleanProps } = extractAppActionProps(props)

  // Use shared logic for data fetching and state management
  const { combinedData, handleDeferredFetch, translations, shouldShowLoading, hasDeferredFetchAttempted } =
    useAppActionData(appActionConfig, DATA_TEST_ID_PREFIX)

  // Extract remaining props first
  const {
    children,
    onMenuOpen,
    onMenuClose,
    onOpenChange,
    onMouseEnter,
    onMouseLeave,
    style,
    'data-testid': customDataTestId,
    ...actionMenuProps
  } = cleanProps

  // Track whether we should auto-execute after data loads
  const shouldAutoExecuteRef = useRef(false)

  // Handle auto-execution or menu opening after deferred fetch completes
  useEffect(() => {
    if (shouldAutoExecuteRef.current && hasDeferredFetchAttempted && !shouldShowLoading && combinedData.length > 0) {
      shouldAutoExecuteRef.current = false

      if (actionMenuProps.autoExecuteSingleAction && combinedData.length === 1) {
        // Auto-execute single action without opening menu
        combinedData[0]?.onClick?.()
      } else {
        // Multiple actions available - open menu now
        onMenuOpen?.()
      }
    }
  }, [actionMenuProps.autoExecuteSingleAction, hasDeferredFetchAttempted, combinedData, shouldShowLoading, onMenuOpen])

  // Generate test IDs
  const containerTestId =
    customDataTestId || formatDataTestId(appActionConfig.prefixDataTestId, DATA_TEST_ID_PREFIX, 'container')
  const menuTestId = formatDataTestId(appActionConfig.prefixDataTestId, DATA_TEST_ID_PREFIX, 'Menu')

  // Handle menu opening - fetch data and handle auto-execution
  const handleMenuOpen = React.useCallback(() => {
    // If data is already available and autoExecuteSingleAction is enabled
    if (actionMenuProps.autoExecuteSingleAction && combinedData.length === 1) {
      combinedData[0]?.onClick?.()
      return
    }

    // If deferred fetching is enabled and we need to fetch data
    if (appActionConfig.deferMainContextRequestsUntilClick) {
      // Set flag to auto-execute after data loads (if autoExecuteSingleAction is enabled)
      if (actionMenuProps.autoExecuteSingleAction) {
        shouldAutoExecuteRef.current = true
        // Don't open menu yet - wait for data to see if we should auto-execute
        handleDeferredFetch()
        return
      }
      // If autoExecuteSingleAction is disabled, fetch and open menu normally
      handleDeferredFetch()
    }

    // Call original onMenuOpen (only if not waiting for auto-execute check)
    onMenuOpen?.()
  }, [
    handleDeferredFetch,
    appActionConfig.deferMainContextRequestsUntilClick,
    actionMenuProps.autoExecuteSingleAction,
    combinedData,
    onMenuOpen
  ])

  // Handle open/close state changes (for keyboard navigation, etc.)
  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (open) {
        // handleMenuOpen will be called by ActionMenu's onMenuOpen
      } else {
        onMenuClose?.()
      }
      onOpenChange?.(open)
    },
    [onMenuClose, onOpenChange]
  )

  // Handle click events to prevent propagation
  const handleContainerClick = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
  }, [])

  return (
    <div
      data-testid={containerTestId}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handleContainerClick}
    >
      <ActionMenu
        {...actionMenuProps}
        actions={combinedData}
        emptyStateBehavior={
          appActionConfig.emptyStateBehavior === 'enable' ? 'disable' : appActionConfig.emptyStateBehavior
        }
        actionsLoading={shouldShowLoading}
        loadingText={translations.loading}
        noActionsText={translations.noActions}
        onMenuOpen={handleMenuOpen}
        onMenuClose={onMenuClose}
        onOpenChange={handleOpenChange}
        data-testid={menuTestId}
      >
        {children}
      </ActionMenu>
    </div>
  )
}, appActionPropsComparison)

AppActionMenu.displayName = 'AppActionMenu'

export default AppActionMenu
