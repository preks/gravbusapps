'use client'

import React, { useCallback } from 'react'
import { Button, ActionButton, ActionMenu, Icon } from '@newwork/nw-design-system'
import { DotsThreeVerticalIcon, PlusIcon, PencilIcon, TrashIcon } from '@phosphor-icons/react'
import {
  useAppActionData,
  appActionPropsComparison,
  type UseAppActionDataConfig
} from '@/common/hooks/useAppActionData'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { ActionOption } from '@newwork/nw-design-system'

/**
 * AppAction Component Props
 * Unified component for all action-related use cases
 */
export interface AppActionProps {
  // === Core Context & Data ===
  /**
   * Array of context configurations with their data
   * Each entry contains context name and an array of data objects
   * If provided, this takes precedence over contextsArray + externalContextData
   *
   * @example
   * contexts={[
   *   {
   *     context: FlowContextName.taskEntity,
   *     contextData: [{ taskId: '123' }, { taskId: '456' }]
   *   },
   *   {
   *     context: FlowContextName.projectEntity,
   *     contextData: [{ projectId: '789' }]
   *   }
   * ]}
   */
  contexts?: Array<{
    context: FlowContextName | string
    contextData: Record<string, string>[]
  }>

  /**
   * Legacy: Array of context names
   * Used as fallback if 'contexts' is not provided
   */
  contextsArray?: FlowContextName[]

  /**
   * Legacy: External context data as flat record
   * Used as fallback if 'contexts' is not provided
   */
  externalContextData?: Record<string, any>

  staticFlowData?: ActionOption[]
  accessToken?: string

  // === Variant Selection ===
  /**
   * Pre-configured variant for common use cases
   * @default 'custom'
   */
  variant?: 'custom' | keyof typeof actionVariants

  // === Mode (only for variant="custom") ===
  /**
   * Rendering mode (only used when variant="custom")
   * - 'trigger': Wraps a child element to execute first action on click
   * - 'button': Renders Button component
   * - 'action-button': Renders ActionButton component with dropdown menu
   */
  mode?: 'trigger' | 'button' | 'action-button'

  // === Behavior (can override variant defaults) ===
  /**
   * Controls how the component behaves when no actions are available
   * NOTE: When lazyLoad is true, this is automatically forced to 'enable'
   * @default variant-specific or 'disable'
   */
  emptyState?: 'disable' | 'hide' | 'enable'

  /**
   * Defers loading of context data until user interaction
   * When true, emptyState is automatically set to 'enable'
   * @default variant-specific or false
   */
  lazyLoad?: boolean

  /**
   * Automatically executes when only one action is available
   * When multiple actions exist, shows menu/dropdown instead
   * @default variant-specific or false
   */
  autoExecute?: boolean

  // === Button & ActionButton Props (can override variant defaults) ===
  /**
   * Button size
   */
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon'

  /**
   * Button visual variant
   */
  buttonVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'

  /**
   * Disabled state
   */
  disabled?: boolean

  /**
   * Button content/label or wrapped element
   */
  children?: React.ReactNode

  /**
   * Additional CSS classes
   */
  className?: string

  // === ActionButton Specific ===
  /**
   * Callback when dropdown opens (for action-button mode)
   */
  onDropdownOpen?: () => void

  // === Shared Event Handlers ===
  onClick?: (e: React.MouseEvent) => void

  // === Testing & Customization ===
  'data-testid'?: string
  prefixDataTestId?: string

  // === Deprecated (backwards compatibility) ===
  /** @deprecated Use lazyLoad instead */
  deferMainContextRequestsUntilClick?: boolean
  /** @deprecated Use emptyState instead */
  emptyStateBehavior?: 'disable' | 'hide' | 'enable'
  /** @deprecated Use autoExecute instead */
  autoExecuteSingleAction?: boolean
}

// ============================================================================
// Shared Utilities
// ============================================================================

/**
 * Shared event handler that stops propagation and prevents default
 */
const createStopPropagationHandler = (handler?: (e: React.MouseEvent) => void) => {
  return (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    handler?.(e)
  }
}

/**
 * AppAction variant configurations
 * Each variant has pre-configured settings for common use cases
 */
const actionVariants = {
  'table-row': {
    mode: 'button' as const,
    buttonSize: 'icon' as const,
    buttonVariant: 'ghost' as const,
    lazyLoad: true,
    emptyState: 'enable' as const,
    autoExecute: false,
    defaultChildren: <Icon icon={DotsThreeVerticalIcon} size="md" />
  },

  'list-item': {
    mode: 'button' as const,
    buttonSize: 'icon' as const,
    buttonVariant: 'ghost' as const,
    lazyLoad: true,
    emptyState: 'enable' as const,
    autoExecute: false,
    defaultChildren: <Icon icon={DotsThreeVerticalIcon} size="sm" />
  },

  header: {
    mode: 'action-button' as const,
    buttonSize: 'icon' as const,
    lazyLoad: false,
    emptyState: 'hide' as const,
    autoExecute: false
  },

  'create-primary': {
    mode: 'button' as const,
    buttonSize: 'default' as const,
    buttonVariant: 'default' as const,
    lazyLoad: false,
    emptyState: 'hide' as const,
    autoExecute: true,
    defaultChildren: (
      <>
        <Icon icon={PlusIcon} size="sm" />
        Create
      </>
    )
  },

  'create-secondary': {
    mode: 'button' as const,
    buttonSize: 'icon' as const,
    buttonVariant: 'secondary' as const,
    lazyLoad: false,
    emptyState: 'hide' as const,
    autoExecute: true,
    defaultChildren: (
      <Button variant="secondary" size="icon">
        <Icon icon={PlusIcon} size="sm" />
      </Button>
    )
  },

  'update-primary': {
    mode: 'button' as const,
    buttonSize: 'default' as const,
    buttonVariant: 'default' as const,
    lazyLoad: false,
    emptyState: 'hide' as const,
    autoExecute: true,
    defaultChildren: (
      <>
        <Icon icon={PencilIcon} size="sm" />
        Update
      </>
    )
  },

  'update-secondary': {
    mode: 'button' as const,
    buttonSize: 'icon' as const,
    buttonVariant: 'secondary' as const,
    lazyLoad: false,
    emptyState: 'hide' as const,
    autoExecute: true,
    defaultChildren: (
      <Button variant="secondary" size="icon">
        <Icon icon={PencilIcon} size="sm" />
      </Button>
    )
  },

  'delete-primary': {
    mode: 'button' as const,
    buttonSize: 'default' as const,
    buttonVariant: 'destructive' as const,
    lazyLoad: false,
    emptyState: 'hide' as const,
    autoExecute: true,
    defaultChildren: (
      <>
        <Icon icon={TrashIcon} size="sm" />
        Delete
      </>
    )
  },

  'delete-secondary': {
    mode: 'button' as const,
    buttonSize: 'icon' as const,
    buttonVariant: 'destructive' as const,
    lazyLoad: false,
    emptyState: 'hide' as const,
    autoExecute: true,
    defaultChildren: (
      <Button variant="destructive" size="icon">
        <Icon icon={TrashIcon} size="sm" />
      </Button>
    )
  }
} as const

// ============================================================================
// Internal Components
// ============================================================================

/**
 * Unified internal rendering component
 * Handles all modes (trigger, button, action-button) with shared logic
 */
const AppActionRenderer: React.FC<{
  mode: 'trigger' | 'button' | 'action-button'
  config: UseAppActionDataConfig
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon'
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
  const dataTestIdPrefix =
    mode === 'trigger' ? 'AppActionTrigger' : mode === 'action-button' ? 'AppActionButton' : 'AppActionExecuteButton'
  const { combinedData, handleDeferredFetch, shouldShowLoading } = useAppActionData(forcedConfig, dataTestIdPrefix)

  // Shared: Execute first action helper
  const executeFirstAction = useCallback(() => {
    if (combinedData[0]) {
      combinedData[0].onClick?.()
    }
  }, [combinedData])

  // Shared: Standard click handler with stopPropagation
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

  // IMPORTANT: All hooks must be called unconditionally
  // Note: autoExecute does NOT mean "execute on mount"
  // It means "when clicked, execute immediately if single action, otherwise show menu"
  // No useEffect needed - logic is handled in the button onClick and shouldShowMenu

  // Shared: Empty state handling (must be after all hooks)
  if (config.emptyStateBehavior === 'hide' && combinedData.length === 0) {
    return null
  }

  // Mode-specific rendering
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

    return <div data-testid={containerTestId}>{clonedChild}</div>
  }

  if (mode === 'action-button') {
    const buttonTestId = customDataTestId || formatDataTestId(config.prefixDataTestId, 'AppActionButton', 'Button')

    const handleDropdownOpenInternal = () => {
      handleDeferredFetch()
      props.onDropdownOpen?.()
    }

    return (
      <ActionButton
        size={props.buttonSize}
        disabled={disabled}
        className={props.className}
        data-testid={buttonTestId}
        actions={combinedData}
        actionsLoading={shouldShowLoading}
        emptyStateBehavior={config.emptyStateBehavior}
        onDropdownOpen={handleDropdownOpenInternal}
        onClick={createStopPropagationHandler(onClick)}
      >
        {children}
      </ActionButton>
    )
  }

  if (mode === 'button') {
    const buttonTestId =
      customDataTestId || formatDataTestId(config.prefixDataTestId, 'AppActionExecuteButton', 'Button')

    // Determine if we should show a menu:
    // 1. Multiple actions available (always show menu)
    // 2. Lazy loading (show menu with loading state on first click)
    // 3. autoExecute is false AND at least one action (always show menu)
    const shouldShowMenu =
      combinedData.length > 1 || // Multiple actions → always show menu
      (config.deferMainContextRequestsUntilClick && combinedData.length === 0) || // Lazy loading
      (!autoExecute && combinedData.length > 0) // autoExecute false + actions → show menu

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
            onClick={createStopPropagationHandler(onClick)}
          >
            {children}
          </Button>
        </ActionMenu>
      )
    }

    // Single action with autoExecute: render button that executes it directly on click
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
 *
 * @example
 * // Table row 3-dot menu
 * <AppAction
 *   variant="table-row"
 *   contextsArray={[FlowContextName.leadEntity]}
 *   externalContextData={{ leadId: record.id }}
 *   accessToken={accessToken}
 * />
 *
 * @example
 * // Record header ActionButton
 * <AppAction
 *   variant="header"
 *   contextsArray={[FlowContextName.leadEntity]}
 *   externalContextData={{ leadId }}
 *   accessToken={accessToken}
 * />
 *
 * @example
 * // Primary create button
 * <AppAction
 *   variant="create-primary"
 *   contextsArray={[FlowContextName.taskCreate]}
 *   accessToken={accessToken}
 * >
 *   <Button><Plus /> Add Task</Button>
 * </AppAction>
 *
 * @example
 * // Secondary create button (icon only)
 * <AppAction
 *   variant="create-secondary"
 *   contextsArray={[FlowContextName.taskCreate]}
 *   accessToken={accessToken}
 * />
 */
export const AppAction: React.FC<AppActionProps> = React.memo(props => {
  const {
    variant = 'custom',
    mode: propMode,
    // Handle deprecated props with fallbacks
    lazyLoad: propLazyLoad = props.deferMainContextRequestsUntilClick,
    autoExecute: propAutoExecute = props.autoExecuteSingleAction,
    emptyState: propEmptyState = props.emptyStateBehavior,
    buttonSize: propButtonSize,
    buttonVariant: propButtonVariant,
    disabled,
    className,
    children: propChildren,
    onClick,
    onDropdownOpen,
    'data-testid': customDataTestId,
    prefixDataTestId,
    contexts,
    contextsArray: legacyContextsArray,
    externalContextData: legacyExternalContextData,
    staticFlowData,
    accessToken
  } = props

  // Transform new 'contexts' format to legacy format for backward compatibility
  const { contextsArray, externalContextData } = React.useMemo(() => {
    // If new 'contexts' prop is provided, use it
    if (contexts && contexts.length > 0) {
      const expandedContexts: (FlowContextName | string)[] = []
      const mergedData: Record<string, any> = {}

      // Expand contexts: for each context with multiple contextData entries,
      // add the context multiple times and merge all contextData
      contexts.forEach(({ context, contextData }) => {
        // Add context once for each contextData entry
        contextData.forEach(() => {
          expandedContexts.push(context)
        })

        // Merge all contextData objects into one
        contextData.forEach(data => {
          Object.assign(mergedData, data)
        })
      })

      return {
        contextsArray: expandedContexts,
        externalContextData: mergedData
      }
    }

    // Otherwise fall back to legacy props
    return {
      contextsArray: legacyContextsArray,
      externalContextData: legacyExternalContextData
    }
  }, [contexts, legacyContextsArray, legacyExternalContextData])

  // Get variant configuration
  const variantConfig = variant !== 'custom' ? actionVariants[variant as keyof typeof actionVariants] : null

  // Resolve final values (props override variant defaults)
  const mode = propMode ?? variantConfig?.mode ?? 'action-button'
  const lazyLoad = propLazyLoad ?? variantConfig?.lazyLoad ?? false
  const autoExecute = propAutoExecute ?? variantConfig?.autoExecute ?? false
  const buttonSize = propButtonSize ?? variantConfig?.buttonSize
  const buttonVariant =
    propButtonVariant ?? (variantConfig && 'buttonVariant' in variantConfig ? variantConfig.buttonVariant : undefined)

  // Smart children resolution with automatic icon prepending for primary variants
  let children: React.ReactNode
  if (propChildren) {
    // User provided children - check if we should prepend icon for primary variants
    const isPrimaryVariant =
      variant === 'create-primary' || variant === 'update-primary' || variant === 'delete-primary'
    const isTextChildren =
      typeof propChildren === 'string' || (React.isValidElement(propChildren) && typeof propChildren.type === 'string')

    if (isPrimaryVariant && isTextChildren) {
      // Prepend icon for text children in primary variants (Button handles spacing automatically)
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
    // No children provided - use default from variant
    children = variantConfig && 'defaultChildren' in variantConfig ? variantConfig.defaultChildren : undefined
  }

  // IMPORTANT: When lazyLoad is true, emptyState MUST be 'enable'
  const emptyState = lazyLoad ? 'enable' : (propEmptyState ?? variantConfig?.emptyState ?? 'disable')

  // Development warnings for deprecated props
  if (process.env.NODE_ENV === 'development') {
    if (props.deferMainContextRequestsUntilClick !== undefined) {
      console.warn('AppAction: "deferMainContextRequestsUntilClick" is deprecated. Use "lazyLoad" instead.')
    }
    if (props.emptyStateBehavior !== undefined) {
      console.warn('AppAction: "emptyStateBehavior" is deprecated. Use "emptyState" instead.')
    }
    if (props.autoExecuteSingleAction !== undefined) {
      console.warn('AppAction: "autoExecuteSingleAction" is deprecated. Use "autoExecute" instead.')
    }
    // Warn if user explicitly sets emptyState when lazyLoad is enabled
    if (lazyLoad && propEmptyState && propEmptyState !== 'enable') {
      console.warn(
        `AppAction: When "lazyLoad" is true, "emptyState" is forced to "enable". ` +
          `Your setting of "${propEmptyState}" is ignored.`
      )
    }
  }

  // Build configuration for useAppActionData
  const config: UseAppActionDataConfig = {
    contextsArray: contextsArray as FlowContextName[],
    externalContextData,
    staticFlowData,
    accessToken,
    prefixDataTestId,
    emptyStateBehavior: emptyState,
    deferMainContextRequestsUntilClick: lazyLoad
  }

  // Special handling for table-row and list-item variants (auto stopPropagation)
  const enhancedOnClick =
    variant === 'table-row' || variant === 'list-item' ? createStopPropagationHandler(onClick) : onClick

  // Unified rendering via AppActionRenderer
  return (
    <AppActionRenderer
      mode={mode}
      config={config}
      buttonSize={buttonSize}
      buttonVariant={buttonVariant}
      disabled={disabled}
      className={className}
      onClick={enhancedOnClick}
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
