import React from 'react'
import {
  ShellHeader,
  type HeaderActionConfig,
  type BreadcrumbItemConfig,
  type ModuleSelectorProps,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useContextPanel
} from '@newwork/nw-design-system'
import {
  MagnifyingGlassIcon,
  GearIcon,
  SlidersHorizontalIcon,
  ChartBarIcon,
  CheckCircleIcon,
  WarningIcon,
  XCircleIcon,
  ClockIcon,
  CloudArrowUpIcon
} from '@phosphor-icons/react'
import { EveryIcon } from '@newwork/icons'
import { PreferencesPopover } from './components'
import type { SupportedLocale, DensityOption, TokenStatus } from './components'

export interface IDEHeaderProps {
  packageVersion: string
  onBack: () => void
  locale: SupportedLocale
  onLocaleChange: (locale: SupportedLocale) => void
  density: DensityOption
  onDensityChange: (density: DensityOption) => void
  tokenStatus: TokenStatus | null
  onTokenBadgeClick: () => void
  lastPublishedDate?: string
  userInfo: string
  onUserInfoChange: (value: string) => void
  userInfoError?: string
  accessToken: string
  onAccessTokenChange: (value: string) => void
  additionalData: string
  onAdditionalDataChange: (value: string) => void
  additionalDataError?: string
  enableStructureIdAutofill: boolean
  onEnableStructureIdAutofillChange: (value: boolean) => void
  onSettingsSave: () => void
  onLogout: () => void
  breadcrumbItems: BreadcrumbItemConfig[]
  moduleSelector?: ModuleSelectorProps
  performanceWindowOpen: boolean
  onPerformanceOpen: () => void
  onSearchOpen: () => void
  onSettingsOpen: () => void
  onLogoClick?: () => void
  enableChat: boolean
  onEnableChatChange: (enabled: boolean) => void
  /** When set, shows the Publish Screen header action (user is in an app) */
  selectedAppName?: string | null
  onPublishClick: () => void
  /** Open state for command/dialog actions so the header can show active state */
  searchCommandOpen?: boolean
  settingsModalVisible?: boolean
  publishConfirmDialogVisible?: boolean
}

export const IDEHeader: React.FC<IDEHeaderProps> = ({
  packageVersion,
  onBack,
  locale,
  onLocaleChange,
  density,
  onDensityChange,
  tokenStatus,
  onTokenBadgeClick,
  lastPublishedDate,
  accessToken,
  breadcrumbItems,
  moduleSelector,
  performanceWindowOpen,
  onPerformanceOpen,
  onSearchOpen,
  onSettingsOpen,
  enableChat,
  onEnableChatChange,
  selectedAppName,
  onPublishClick,
  searchCommandOpen = false,
  settingsModalVisible = false,
  publishConfirmDialogVisible = false
}) => {
  const contextPanel = useContextPanel()

  React.useLayoutEffect(() => {
    if (!enableChat) {
      if (contextPanel.isVisible) {
        contextPanel.setMode('hidden')
      }
      return
    }

    if (contextPanel.isVisible) {
      return
    }

    const animationFrameId = globalThis.window.requestAnimationFrame(() => {
      contextPanel.setMode('hidden')
    })

    return () => {
      globalThis.window.cancelAnimationFrame(animationFrameId)
    }
  }, [contextPanel.isVisible, contextPanel.setMode, enableChat])

  const handleEnableChatChange = React.useCallback(
    (nextEnabled: boolean) => {
      if (!nextEnabled) {
        contextPanel.setMode('hidden')
        onEnableChatChange(false)
        return
      }

      contextPanel.setMode('hidden')
      onEnableChatChange(true)
    },
    [contextPanel.setMode, onEnableChatChange]
  )

  const tokenStatusIcon = (size: number) =>
    tokenStatus?.isExpired ? (
      <XCircleIcon size={size} weight="fill" />
    ) : tokenStatus?.variant === 'warning' ? (
      <WarningIcon size={size} weight="fill" />
    ) : (
      <CheckCircleIcon size={size} weight="fill" />
    )

  const actionButtons: HeaderActionConfig[] = [
    ...(selectedAppName
      ? [
          {
            id: 'publish',
            icon: <CloudArrowUpIcon size={18} />,
            label: 'Publish Screen',
            onClick: onPublishClick,
            active: publishConfirmDialogVisible
          } as HeaderActionConfig
        ]
      : []),
    {
      id: 'search',
      icon: <MagnifyingGlassIcon size={18} />,
      label: 'Search',
      hotkey: { key: 'k', mod: true },
      onClick: onSearchOpen,
      active: searchCommandOpen
    },
    {
      id: 'settings',
      icon: <GearIcon size={18} />,
      label: 'Settings',
      onClick: onSettingsOpen,
      active: settingsModalVisible
    },
    {
      id: 'preferences',
      icon: <SlidersHorizontalIcon size={18} />,
      label: 'Preferences',
      popoverContent: (
        <PreferencesPopover
          locale={locale}
          onLocaleChange={onLocaleChange}
          density={density}
          onDensityChange={onDensityChange}
          enableChat={enableChat}
          onEnableChatChange={handleEnableChatChange}
        />
      )
    },
    {
      id: 'performance',
      icon: <ChartBarIcon size={18} />,
      label: 'Performance',
      onClick: onPerformanceOpen,
      active: performanceWindowOpen
    },
    ...(enableChat
      ? [
          {
            id: 'chat',
            icon: <EveryIcon className="nw:size-5" gradient={!contextPanel.isVisible ? 'nw:bg-ai' : undefined} />,
            label: 'Chat',
            variant: 'ai' as const,
            hotkey: { key: '/', mod: true },
            active: contextPanel.isVisible,
            onClick: () => contextPanel.toggle()
          }
        ]
      : [])
  ]

  return (
    <ShellHeader
      onBack={onBack}
      moduleSelector={moduleSelector}
      actionButtons={actionButtons}
      breadcrumb={breadcrumbItems.length > 0 ? { items: breadcrumbItems } : undefined}
    >
      <div className="gba:flex gba:items-center gba:gap-4">
        <span className="gba:text-xs gba:text-muted-foreground">v{packageVersion}</span>

        {tokenStatus && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={tokenStatus.variant}
                  className="gba:cursor-pointer gba:gap-1.5 gba:px-2.5 gba:py-1"
                  onClick={onTokenBadgeClick}
                  data-testid="TokenStatusBadge"
                >
                  {tokenStatusIcon(14)}
                  <span className="gba:text-xs gba:font-medium">{tokenStatus.remainingTime}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="gba:space-y-1">
                  <div className="gba:font-semibold">
                    {tokenStatus.isExpired ? 'Token Expired' : 'Access Token Status'}
                  </div>
                  {tokenStatus.expiresAt && (
                    <div className="gba:text-xs">Expires: {tokenStatus.expiresAt.toLocaleString()}</div>
                  )}
                  <div className="gba:text-xs gba:text-muted-foreground">Click to update token</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {!tokenStatus && accessToken && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="gba:cursor-pointer gba:gap-1.5 gba:px-2.5 gba:py-1"
                  onClick={onTokenBadgeClick}
                  data-testid="TokenStatusBadge-Invalid"
                >
                  <ClockIcon size={14} />
                  <span className="gba:text-xs gba:font-medium">Invalid Token</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="gba:space-y-1">
                  <div className="gba:font-semibold">Invalid Token Format</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Click to update token</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {lastPublishedDate && (
          <span className="gba:text-xs gba:text-muted-foreground" data-testid="LastPublishedDate">
            Last Published: {lastPublishedDate}
          </span>
        )}
      </div>
    </ShellHeader>
  )
}
