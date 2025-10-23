import React from 'react'
import { IconAvatar, Icon } from '@newwork/nw-design-system'
import { CaretLeftIcon } from '@phosphor-icons/react'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { AiSummaryButton } from './ai-summary-button/AiSummaryButton'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { AiSummaryConfig, AiSummaryHook } from './ai-summary-button/AiSummaryTypes'
import type { FlowContextName } from '@/common/types/FlowRegistryTypes'

export interface HeaderBadge {
  /** Badge content/text */
  content: React.ReactNode
  /** Badge styling */
  style?: React.CSSProperties
  /** Badge CSS classes */
  className?: string
  /** Test ID for the badge */
  testId?: string
}

export interface HeaderInfo {
  /** Info item icon */
  icon?: React.ComponentType<any>
  /** Info item label */
  label: string
  /** Info item value */
  value: string
}

export interface HeaderSectionProps extends BusinessAppContextProps {
  /** Entity ID for context data */
  entityId: string
  /** Entity display name */
  entityName: string
  /** Entity type label (e.g., "OPPORTUNITY", "LEAD", "ACCOUNT") */
  entityType: string
  /** Icon component for the entity */
  entityIcon: React.ComponentType<any>
  /** Icon variant (default: "default") */
  iconVariant?: 'default' | 'primary' | 'secondary'
  /** Icon size (default: "lg") */
  iconSize?: 'sm' | 'md' | 'lg' | 'xl'
  /** Optional back button handler */
  onBack?: () => void
  /** Back button test ID */
  backButtonTestId?: string
  /** Primary badge (usually value/amount) */
  primaryBadge?: HeaderBadge
  /** Additional badges */
  additionalBadges?: HeaderBadge[]
  /** Information items displayed below the title */
  infoItems?: HeaderInfo[]
  /** AI Summary configuration */
  aiSummaryConfig?: {
    config: AiSummaryConfig
    hook: AiSummaryHook
    dataTestId?: string
  }
  /** App Action Button configuration */
  actionButtonConfig?: {
    contextsArray: FlowContextName[]
    externalContextData: Record<string, any>
    prefixDataTestId: string
    buttonText?: string
    size?: 'sm' | 'md' | 'lg'
    emptyStateBehavior?: 'hide' | 'show' | 'enable'
    deferMainContextRequestsUntilClick?: boolean
    testId?: string
  }
  /** Container test ID */
  'data-testid'?: string
  /** Additional container styles */
  containerStyle?: React.CSSProperties
  /** Additional container classes */
  containerClassName?: string
}

export const HeaderSection: React.FC<HeaderSectionProps> = ({
  accessToken,
  entityId,
  entityName,
  entityType,
  entityIcon,
  iconVariant = 'default',
  iconSize = 'lg',
  onBack,
  backButtonTestId,
  primaryBadge,
  additionalBadges = [],
  infoItems = [],
  aiSummaryConfig,
  actionButtonConfig,
  'data-testid': dataTestId = 'header-section',
  containerStyle,
  containerClassName = ''
}) => {
  return (
    <div
      className={`gba:header-section ${containerClassName}`}
      style={{
        marginBottom: '24px',
        borderRadius: '8px',
        padding: '20px',
        ...containerStyle
      }}
      data-testid={dataTestId}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ flex: 1 }}>
          {/* Top row: Back Icon + Entity Icon + Type/Name + Primary Badge */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onBack && (
                <Icon
                  icon={CaretLeftIcon}
                  size="xl"
                  className="gba:cursor-pointer gba:text-blue-500 hover:gba:text-blue-600 gba:text-3xl"
                  onClick={onBack}
                  data-testid={backButtonTestId || `${dataTestId}-back-button`}
                />
              )}
              <IconAvatar icon={entityIcon} variant={iconVariant} size={iconSize} />
            </div>

            <div style={{ marginLeft: '16px' }}>
              <div
                className="gba:text-muted-foreground"
                style={{
                  fontSize: '16px',
                  fontWeight: 'normal',
                  letterSpacing: '0.5px'
                }}
              >
                {entityType.toUpperCase()}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{entityName}</div>
            </div>

            {/* Primary Badge */}
            {primaryBadge && (
              <div
                className={`gba:bg-success-secondary gba:text-success ${primaryBadge.className || ''}`}
                style={{
                  border: '1px solid var(--nw-color-success-500)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginLeft: '16px',
                  ...primaryBadge.style
                }}
                data-testid={primaryBadge.testId || `${dataTestId}-primary-badge`}
              >
                {primaryBadge.content}
              </div>
            )}

            {/* Additional Badges */}
            {additionalBadges.map((badge, index) => (
              <div
                key={index}
                style={{
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginLeft: '8px',
                  ...badge.style
                }}
                className={badge.className}
                data-testid={badge.testId || `${dataTestId}-badge-${index}`}
              >
                {badge.content}
              </div>
            ))}
          </div>

          {/* Bottom row: Information items in one line */}
          {infoItems.length > 0 && (
            <div
              className="gba:text-muted-foreground"
              style={{
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              {infoItems.map((item, index) => (
                <React.Fragment key={index}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {item.icon && <item.icon style={{ marginRight: '4px' }} />}
                    <span>
                      {item.label}: {item.value}
                    </span>
                  </div>
                  {index < infoItems.length - 1 && <span>•</span>}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Right side: AI Summary + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* AI Summary Button */}
          {accessToken && entityId && aiSummaryConfig && (
            <AiSummaryButton
              config={aiSummaryConfig.config}
              summaryHook={aiSummaryConfig.hook}
              dataTestId={aiSummaryConfig.dataTestId || `${dataTestId}-ai-summary-button`}
            />
          )}

          {/* Action Button */}
          {accessToken && actionButtonConfig && (
            <AppActionButton
              data-testid={actionButtonConfig.testId || `${dataTestId}-action-button`}
              size={actionButtonConfig.size || 'lg'}
              contextsArray={actionButtonConfig.contextsArray}
              externalContextData={actionButtonConfig.externalContextData}
              prefixDataTestId={actionButtonConfig.prefixDataTestId}
              accessToken={accessToken}
              emptyStateBehavior={actionButtonConfig.emptyStateBehavior || 'hide'}
              deferMainContextRequestsUntilClick={actionButtonConfig.deferMainContextRequestsUntilClick ?? false}
            >
              {actionButtonConfig.buttonText || 'Actions'}
            </AppActionButton>
          )}
        </div>
      </div>
    </div>
  )
}
