'use client'

import React from 'react'
import { ActionButton, type ActionButtonProps } from '@newwork/nw-design-system'
import {
  useAppActionData,
  extractAppActionProps,
  AppActionCommonProps,
  appActionPropsComparison
} from '@/common/hooks/useAppActionData'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

/**
 * @deprecated Use AppAction component instead with variant="header" or mode="action-button"
 * @see AppAction
 */
export type AppActionButtonProps = Omit<ActionButtonProps, 'actions'> &
  AppActionCommonProps & {
    /**
     * Controls how the button behaves when no flow items are available
     * @default 'disable'
     */
    emptyStateBehavior?: 'disable' | 'hide' | 'enable'
  }

const DATA_TEST_ID_PREFIX = 'AppActionButton'

/**
 * AppActionButton Component
 * Displays an action button with flow items from the flow registry
 *
 * @deprecated Use AppAction component instead with variant="header" or mode="action-button"
 * @example
 * // Instead of:
 * <AppActionButton
 *   contextsArray={[FlowContextName.leadEntity]}
 *   externalContextData={{ leadId }}
 *   accessToken={accessToken}
 * />
 *
 * // Use:
 * <AppAction
 *   variant="header"
 *   contextsArray={[FlowContextName.leadEntity]}
 *   externalContextData={{ leadId }}
 *   accessToken={accessToken}
 * />
 */
export const AppActionButton: React.FC<AppActionButtonProps> = React.memo(props => {
  // Extract App Action specific props and get clean props for ActionButton
  const { appActionConfig, cleanProps } = extractAppActionProps(props)

  // Use shared logic for data fetching and state management
  const { combinedData, handleDeferredFetch, shouldShowLoading } = useAppActionData(
    appActionConfig,
    DATA_TEST_ID_PREFIX
  )

  // Extract remaining props
  const { onDropdownOpen, onClick, 'data-testid': customDataTestId, ...actionButtonProps } = cleanProps

  // Generate test ID for button
  const buttonTestId =
    customDataTestId || formatDataTestId(appActionConfig.prefixDataTestId, DATA_TEST_ID_PREFIX, 'Button')

  // Handle dropdown open events for deferred loading
  const handleDropdownOpen = React.useCallback(() => {
    handleDeferredFetch()
    onDropdownOpen?.()
  }, [handleDeferredFetch, onDropdownOpen])

  return (
    <ActionButton
      {...actionButtonProps}
      data-testid={buttonTestId}
      emptyStateBehavior={appActionConfig.emptyStateBehavior}
      actionsLoading={shouldShowLoading}
      actions={combinedData}
      onDropdownOpen={handleDropdownOpen}
      onClick={e => {
        e.stopPropagation()
        e.preventDefault()
        onClick?.(e)
      }}
    />
  )
}, appActionPropsComparison)

AppActionButton.displayName = 'AppActionButton'

export default AppActionButton
