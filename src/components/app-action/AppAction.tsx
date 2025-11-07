'use client'

import React from 'react'
import {
  useAppActionData,
  extractAppActionProps,
  type AppActionCommonProps,
  appActionPropsComparison
} from '@/common/hooks/useAppActionData'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export interface AppActionProps extends AppActionCommonProps {
  /**
   * A single child element to attach the action execution to.
   * The child will receive an onClick handler that executes the first available action.
   */
  children: React.ReactElement

  /**
   * When true, adds aria-disabled and prevents click execution.
   */
  disabled?: boolean

  /**
   * Optional className to apply to the wrapper div
   */
  className?: string

  /**
   * Optional inline styles to apply to the wrapper div
   */
  style?: React.CSSProperties
}

const DATA_TEST_ID_PREFIX = 'AppAction'

/**
 * AppAction Component
 * Wrap any element to execute the first available app action on click.
 * If multiple actions are available, the first one returned will be executed.
 */
export const AppAction = React.memo(
  React.forwardRef<HTMLDivElement, AppActionProps>((props, ref) => {
    const { appActionConfig, cleanProps } = extractAppActionProps(props)
    // Force no deferring for AppAction
    const forcedConfig = {
      ...appActionConfig,
      deferMainContextRequestsUntilClick: false as const
    }

    const { combinedData } = useAppActionData(forcedConfig, DATA_TEST_ID_PREFIX)

    const {
      children,
      disabled,
      className,
      style,
      'data-testid': customDataTestId
    } = cleanProps as {
      children: React.ReactElement
      disabled?: boolean
      className?: string
      style?: React.CSSProperties
      'data-testid'?: string
    }

    const { emptyStateBehavior = 'disable' } = forcedConfig

    // Generate test IDs
    const containerTestId =
      customDataTestId || formatDataTestId(appActionConfig.prefixDataTestId, DATA_TEST_ID_PREFIX, 'container')
    const triggerTestId = formatDataTestId(appActionConfig.prefixDataTestId, DATA_TEST_ID_PREFIX, 'Trigger')

    // If we should hide when no data and not deferring, do not render
    if (emptyStateBehavior === 'hide' && combinedData.length === 0) {
      return null
    }

    const executeFirstAvailable = () => {
      const first = combinedData[0]
      if (!first) {
        return
      }

      // Execute the action
      first.onClick?.()
    }

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()

      if (disabled) return

      if (combinedData.length > 0) {
        executeFirstAvailable()
      }
    }

    // Clone child to inject onClick behavior and test id
    const clonedChild = React.cloneElement(children, {
      onClick: handleClick,
      'data-testid': children.props?.['data-testid'] || triggerTestId,
      'aria-disabled': disabled || (emptyStateBehavior === 'disable' && combinedData.length === 0) || undefined
    })

    return (
      <div ref={ref} data-testid={containerTestId} className={className} style={style}>
        {clonedChild}
      </div>
    )
  }),
  appActionPropsComparison
)

AppAction.displayName = 'AppAction'

export default AppAction
