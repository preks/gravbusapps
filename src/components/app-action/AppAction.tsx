'use client'

import React, { useCallback } from 'react'
import { Button, ActionMenu, Icon } from '@newwork/nw-design-system'
import { DotsThreeVerticalIcon, PlusIcon, PencilIcon, TrashIcon } from '@phosphor-icons/react'
import {
  useAppActionData,
  appActionPropsComparison,
  type UseAppActionDataConfig,
  type ShareContext
} from '@/common/hooks/useAppActionData'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { ActionOption } from '@newwork/nw-design-system'

/**
 * AppAction variant configurations
 * Each variant has pre-configured settings for common use cases
 */
const actionVariants = {
  'table-row': {
    mode: 'button',
    buttonSize: 'icon',
    buttonVariant: 'ghost',
    lazyLoad: true,
    emptyState: 'enable',
    autoExecute: false,
    defaultChildren: <Icon icon={DotsThreeVerticalIcon} />
  },

  'list-item': {
    mode: 'button',
    buttonSize: 'iconSm',
    buttonVariant: 'ghost',
    lazyLoad: true,
    emptyState: 'enable',
    autoExecute: false,
    defaultChildren: <Icon icon={DotsThreeVerticalIcon} />
  },

  header: {
    mode: 'button',
    buttonSize: 'icon',
    buttonVariant: 'outline',
    lazyLoad: false,
    emptyState: 'hide',
    autoExecute: false,
    defaultChildren: <Icon icon={DotsThreeVerticalIcon} />
  },

  'create-primary': {
    mode: 'button',
    buttonSize: 'default',
    buttonVariant: 'default',
    lazyLoad: false,
    emptyState: 'hide',
    autoExecute: true,
    defaultChildren: (
      <>
        <Icon icon={PlusIcon} />
        Create
      </>
    )
  },

  'create-secondary': {
    mode: 'button',
    buttonSize: 'icon',
    buttonVariant: 'secondary',
    lazyLoad: false,
    emptyState: 'hide',
    autoExecute: true,
    defaultChildren: <Icon icon={PlusIcon} />
  },

  'update-primary': {
    mode: 'button',
    buttonSize: 'default',
    buttonVariant: 'default',
    lazyLoad: false,
    emptyState: 'hide',
    autoExecute: true,
    defaultChildren: (
      <>
        <Icon icon={PencilIcon} />
        Update
      </>
    )
  },

  'update-secondary': {
    mode: 'button',
    buttonSize: 'icon',
    buttonVariant: 'secondary',
    lazyLoad: false,
    emptyState: 'hide',
    autoExecute: true,
    defaultChildren: <Icon icon={PencilIcon} />
  },

  'delete-primary': {
    mode: 'button',
    buttonSize: 'default',
    buttonVariant: 'destructive',
    lazyLoad: false,
    emptyState: 'hide',
    autoExecute: true,
    defaultChildren: (
      <>
        <Icon icon={TrashIcon} />
        Delete
      </>
    )
  },

  'delete-secondary': {
    mode: 'button',
    buttonSize: 'icon',
    buttonVariant: 'destructive',
    lazyLoad: false,
    emptyState: 'hide',
    autoExecute: true,
    defaultChildren: <Icon icon={TrashIcon} />
  }
} as const

/**
 * AppAction Component Props
 * Unified component for all action-related use cases
 */
export interface AppActionProps {
  // Primary API
  contexts?: Array<{
    context: FlowContextName | string
    contextData: Record<string, any>
  }>
  customActions?: ActionOption[]
  accessToken?: string
  shareContext?: ShareContext
  variant?: 'custom' | keyof typeof actionVariants
  mode?: 'trigger' | 'button'
  emptyState?: 'disable' | 'hide' | 'enable'
  lazyLoad?: boolean
  autoExecute?: boolean
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon' | 'iconSm' | 'iconLg'
  buttonVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
  disabled?: boolean
  children?: React.ReactNode
  className?: string
  onDropdownOpen?: () => void
  onClick?: (e: React.MouseEvent) => void
  'data-testid'?: string
  prefixDataTestId?: string

  // Deprecated API
  /** @deprecated Use contexts with contextData Array<{ context: FlowContextName | string, contextData: Record<string, any> }> instead */
  contextsArray?: FlowContextName[]
  /** @deprecated Use contexts with contextData Array<{ context: FlowContextName | string, contextData: Record<string, any> }> instead */
  externalContextData?: Record<string, any>
  /** @deprecated Use customActions instead */
  staticFlowData?: ActionOption[]
  /** @deprecated Use lazyLoad instead */
  deferMainContextRequestsUntilClick?: boolean
  /** @deprecated Use emptyState instead */
  emptyStateBehavior?: 'disable' | 'hide' | 'enable'
  /** @deprecated Use autoExecute instead */
  autoExecuteSingleAction?: boolean
}

// ============================================================================
// Internal Components
// ============================================================================

/**
 * Unified internal rendering component
 * Handles all modes (trigger, button) with shared logic
 */
const AppActionRenderer: React.FC<{
  mode: 'trigger' | 'button'
  config: UseAppActionDataConfig
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon' | 'iconSm' | 'iconLg'
  buttonVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
  disabled?: boolean
  className?: string
  children?: React.ReactNode
  onClick?: (e: React.MouseEvent) => void
  onDropdownOpen?: () => void
  autoExecute?: boolean
  'data-testid'?: string
}> = props => {
  const { mode, config, autoExecute, children, disabled, onClick, 'data-testid': customDataTestId } = props

  // Force immediate loading for trigger mode (no deferred loading)
  const forcedConfig = mode === 'trigger' ? { ...config, deferMainContextRequestsUntilClick: false } : config

  // Unified data fetching
  const dataTestIdPrefix = mode === 'trigger' ? 'AppActionTrigger' : 'AppActionExecuteButton'
  const { combinedData, handleDeferredFetch, shouldShowLoading } = useAppActionData(forcedConfig, dataTestIdPrefix)
  const executeFirstAction = useCallback(() => {
    if (combinedData[0]) {
      combinedData[0].onClick?.()
    }
  }, [combinedData])

  const handleStandardClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      if (disabled) return
      handleDeferredFetch()
      executeFirstAction()
      onClick?.(e)
    },
    [disabled, handleDeferredFetch, executeFirstAction, onClick]
  )
  if (config.emptyStateBehavior === 'hide' && combinedData.length === 0) {
    return null
  }

  if (mode === 'trigger') {
    if (!children || !React.isValidElement(children)) {
      console.error('AppAction: mode="trigger" requires a valid React element as children')
      return null
    }

    const containerTestId =
      customDataTestId || formatDataTestId(config.prefixDataTestId, 'AppActionTrigger', 'container')
    const triggerTestId = formatDataTestId(config.prefixDataTestId, 'AppActionTrigger', 'Trigger')

    const clonedChild = React.cloneElement(children, {
      onClick: handleStandardClick,
      'data-testid': children.props?.['data-testid'] || triggerTestId,
      'aria-disabled': disabled || (config.emptyStateBehavior === 'disable' && combinedData.length === 0) || undefined
    })

    return (
      <div data-testid={containerTestId} className={props.className}>
        {clonedChild}
      </div>
    )
  }

  if (mode === 'button') {
    const buttonTestId =
      customDataTestId || formatDataTestId(config.prefixDataTestId, 'AppActionExecuteButton', 'Button')

    const shouldShowMenu =
      combinedData.length > 1 ||
      (config.deferMainContextRequestsUntilClick && combinedData.length === 0) ||
      (!autoExecute && combinedData.length > 0)

    if (shouldShowMenu) {
      return (
        <ActionMenu
          actions={combinedData}
          actionsLoading={shouldShowLoading}
          onOpenChange={open => {
            if (open) {
              handleDeferredFetch()
              props.onDropdownOpen?.()
            }
          }}
        >
          <Button
            size={props.buttonSize}
            variant={props.buttonVariant}
            disabled={disabled}
            className={props.className}
            data-testid={buttonTestId}
            onClick={e => {
              e.stopPropagation()
              e.preventDefault()
              onClick?.(e)
            }}
          >
            {children}
          </Button>
        </ActionMenu>
      )
    }

    const isDisabled = disabled || (config.emptyStateBehavior === 'disable' && combinedData.length === 0)

    return (
      <Button
        size={props.buttonSize}
        variant={props.buttonVariant}
        disabled={isDisabled}
        onClick={handleStandardClick}
        className={props.className}
        data-testid={buttonTestId}
      >
        {children}
      </Button>
    )
  }

  return null
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AppAction Component
 * Unified component for all action-related use cases
 */
export const AppAction: React.FC<AppActionProps> = React.memo(props => {
  const {
    variant = 'custom',
    mode: propMode,
    lazyLoad: propLazyLoad,
    autoExecute: propAutoExecute,
    emptyState: propEmptyState,
    buttonSize: propButtonSize,
    buttonVariant: propButtonVariant,
    disabled,
    className,
    children: propChildren,
    onClick,
    onDropdownOpen,
    'data-testid': customDataTestId,
    prefixDataTestId,
    // Primary API
    contexts,
    customActions,
    accessToken,
    shareContext,
    // Deprecated API (fallbacks)
    contextsArray: legacyContextsArray,
    externalContextData: legacyExternalContextData,
    staticFlowData: legacyStaticFlowData,
    deferMainContextRequestsUntilClick,
    autoExecuteSingleAction,
    emptyStateBehavior
  } = props

  // Transform contexts to contextsArray and externalContextData
  const { contextsArray, externalContextData } = React.useMemo(() => {
    if (contexts && contexts.length > 0) {
      const expandedContexts: (FlowContextName | string)[] = []
      const mergedData: Record<string, any> = {}

      contexts.forEach(({ context, contextData }) => {
        expandedContexts.push(context)
        Object.assign(mergedData, contextData)
      })

      return {
        contextsArray: expandedContexts,
        externalContextData: mergedData
      }
    }

    // Fallback to legacy API
    return {
      contextsArray: legacyContextsArray,
      externalContextData: legacyExternalContextData
    }
  }, [contexts, legacyContextsArray, legacyExternalContextData])

  // Resolve customActions (primary) vs staticFlowData (legacy)
  const staticFlowData = customActions ?? legacyStaticFlowData

  const variantConfig = variant !== 'custom' ? actionVariants[variant as keyof typeof actionVariants] : null

  const mode = propMode ?? variantConfig?.mode ?? 'trigger'
  const lazyLoad = propLazyLoad ?? deferMainContextRequestsUntilClick ?? variantConfig?.lazyLoad ?? false
  const autoExecute = propAutoExecute ?? autoExecuteSingleAction ?? variantConfig?.autoExecute ?? false
  const buttonSize = propButtonSize ?? variantConfig?.buttonSize
  const buttonVariant =
    propButtonVariant ?? (variantConfig && 'buttonVariant' in variantConfig ? variantConfig.buttonVariant : undefined)

  let children: React.ReactNode
  if (propChildren) {
    const isPrimaryVariant =
      variant === 'create-primary' || variant === 'update-primary' || variant === 'delete-primary'
    const isTextChildren =
      typeof propChildren === 'string' || (React.isValidElement(propChildren) && typeof propChildren.type === 'string')

    if (isPrimaryVariant && isTextChildren) {
      const IconComponent =
        variant === 'create-primary' ? PlusIcon : variant === 'update-primary' ? PencilIcon : TrashIcon
      children = (
        <>
          <Icon icon={IconComponent} size="sm" />
          {propChildren}
        </>
      )
    } else {
      children = propChildren
    }
  } else {
    children = variantConfig && 'defaultChildren' in variantConfig ? variantConfig.defaultChildren : undefined
  }

  const finalEmptyState = lazyLoad
    ? 'enable'
    : (propEmptyState ?? emptyStateBehavior ?? variantConfig?.emptyState ?? 'disable')

  // Development warnings for deprecated props
  if (process.env.NODE_ENV === 'development') {
    if (legacyContextsArray !== undefined) {
      console.warn('AppAction: "contextsArray" is deprecated. Use "contexts" instead.')
    }
    if (legacyExternalContextData !== undefined) {
      console.warn('AppAction: "externalContextData" is deprecated. Use "contexts" instead.')
    }
    if (legacyStaticFlowData !== undefined) {
      console.warn('AppAction: "staticFlowData" is deprecated. Use "customActions" instead.')
    }
    if (deferMainContextRequestsUntilClick !== undefined) {
      console.warn('AppAction: "deferMainContextRequestsUntilClick" is deprecated. Use "lazyLoad" instead.')
    }
    if (emptyStateBehavior !== undefined) {
      console.warn('AppAction: "emptyStateBehavior" is deprecated. Use "emptyState" instead.')
    }
    if (autoExecuteSingleAction !== undefined) {
      console.warn('AppAction: "autoExecuteSingleAction" is deprecated. Use "autoExecute" instead.')
    }
  }

  const config: UseAppActionDataConfig = {
    contextsArray: contextsArray as FlowContextName[],
    externalContextData,
    staticFlowData,
    accessToken,
    prefixDataTestId,
    emptyStateBehavior: finalEmptyState,
    deferMainContextRequestsUntilClick: lazyLoad,
    shareContext
  }

  return (
    <AppActionRenderer
      mode={mode}
      config={config}
      buttonSize={buttonSize}
      buttonVariant={buttonVariant}
      disabled={disabled}
      className={className}
      onClick={onClick}
      onDropdownOpen={onDropdownOpen}
      autoExecute={autoExecute}
      data-testid={customDataTestId}
    >
      {children}
    </AppActionRenderer>
  )
}, appActionPropsComparison)

AppAction.displayName = 'AppAction'

export default AppAction
