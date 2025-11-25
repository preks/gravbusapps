import React, { useState } from 'react'
import {
  AiButton,
  Popover,
  PopoverContent,
  PopoverAnchor,
  Spinner,
  Icon,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button
} from '@newwork/nw-design-system'
import { ChartBarIcon, LightbulbIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import { Bot } from 'lucide-react'
import { AiActionsProps, AiAction } from './AiActionsTypes'

/**
 * Centralized AI Actions component that provides consistent AI functionality
 * across all CRM entities (investments, leads, accounts, contacts, opportunities).
 *
 * This component eliminates code duplication by providing a reusable interface
 * for any entity that implements the AiAction pattern.
 */
export const AiActions: React.FC<AiActionsProps> = ({
  actions,
  dataTestId = 'ai-actions-button',
  buttonText = 'AI Actions',
  className = '',
  variant = 'default',
  size = 'default'
}) => {
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isProgrammaticallyOpening, setIsProgrammaticallyOpening] = useState(false)

  const handleActionClick = (action: AiAction) => {
    setActiveAction(action.key)
    setIsProgrammaticallyOpening(true)
    setIsPopoverOpen(true)

    if (!action.hook.state || !['loading', 'error', 'success'].includes(action.hook.state.type)) {
      action.hook.generateSummary()
    }
  }

  const closePopover = () => {
    setIsPopoverOpen(false)
    setActiveAction(null)
    setIsProgrammaticallyOpening(false)
  }

  const aiButtonActions = actions.map(action => ({
    key: action.key,
    label: action.label,
    icon: action.icon,
    onClick: () => handleActionClick(action),
    disabled: action.disabled || action.hook.state?.type === 'loading'
  }))

  // Render popover content for a specific action
  const renderActionPopover = (action: AiAction) => {
    if (action.hook.state?.type === 'loading') {
      return (
        <div className="gba:w-96 gba:p-5" data-testid="ai-action-loading">
          <div className="gba:text-center">
            <Spinner className="gba:w-8 gba:h-8 gba:mx-auto" />
            <div className="gba:mt-4 gba:text-sm gba:text-gray-800 gba:font-medium">
              {action.config.loadingMessage || `Generating ${action.label}...`}
            </div>
            <div className="gba:mt-1.5 gba:text-xs gba:text-gray-500">
              {action.config.loadingSubtitle || `Analyzing ${action.config.entityType} data and activities`}
            </div>
          </div>
        </div>
      )
    }

    if (action.hook.state?.type === 'error') {
      return (
        <div className="gba:w-80 gba:p-5" data-testid="ai-action-error">
          <div className="gba:text-center">
            <div className="gba:text-sm gba:text-destructive gba:mb-3">
              Unable to generate {action.label.toLowerCase()}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => action.hook.generateSummary()}
              className="gba:text-xs"
              data-testid="ai-action-retry-btn"
            >
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    if (action.hook.state?.type === 'success' && action.hook.state.content) {
      return (
        <div className="gba:w-[600px] gba:p-5" style={{ paddingRight: '35px' }}>
          {/* Main Summary */}
          <Card className="gba:mb-4 gba:!gap-1" data-testid="ai-action-success-card-summary">
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-1.5">
                <Icon icon={ChartBarIcon} size="sm" />
                {action.key === 'ai-summary' ? 'Executive Summary' : 'Generation Status'}
              </CardTitle>
            </CardHeader>
            <CardContent>{action.hook.state.content.summary}</CardContent>
          </Card>

          {/* Key Insights */}
          {action.hook.state.content.keyInsights && action.hook.state.content.keyInsights.length > 0 && (
            <Card className="gba:mb-4 gba:!gap-1" data-testid="ai-action-success-card-insights">
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-1.5">
                  <Icon icon={LightbulbIcon} size="sm" />
                  {action.key === 'ai-summary' ? 'Key Insights & Next Steps' : 'Generation Details'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="gba:list-disc gba:ml-6">
                  {action.hook.state.content.keyInsights.map((insight, index) => (
                    <li key={index} className="gba:mb-1">
                      {insight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Regenerate Action */}
          <div className="gba:text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => action.hook.generateSummary()}
              className="gba:flex gba:items-center"
              data-testid="ai-action-regenerate-btn"
            >
              <Icon icon={ArrowClockwiseIcon} size="sm" />
              Regenerate
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="gba:w-80 gba:p-5 gba:text-center" data-testid="ai-action-empty">
        <div className="gba:text-sm gba:text-gray-800 gba:mb-2 gba:flex gba:items-center gba:justify-center gba:gap-1.5">
          <Bot size={16} className="gba:text-gray-700" />
          {action.label}
        </div>
        <div className="gba:text-xs gba:text-gray-500 gba:leading-tight">
          {action.config.emptyStateMessage ||
            `Click to generate intelligent insights about this ${action.config.entityType}'s performance and next steps`}
        </div>
      </div>
    )
  }

  const activeActionData = activeAction ? actions.find(a => a.key === activeAction) : null

  return (
    <Popover
      open={isPopoverOpen}
      onOpenChange={open => {
        // Ignore the automatic close when we're programmatically opening
        if (!open && !isProgrammaticallyOpening) {
          closePopover()
        }

        // Reset the flag after the first onOpenChange call
        if (isProgrammaticallyOpening) {
          setIsProgrammaticallyOpening(false)
        }
      }}
    >
      {/* PopoverAnchor - the AiButton */}
      <PopoverAnchor asChild>
        <AiButton
          variant={variant}
          size={size}
          showIcon={true}
          icon={<Bot size={16} />}
          actions={aiButtonActions}
          autoExecuteSingleAction={true}
          emptyStateBehavior="hide"
          data-testid={dataTestId}
          className={className}
        >
          {buttonText}
        </AiButton>
      </PopoverAnchor>

      {/* PopoverContent - shows content for the active action */}
      <PopoverContent
        side="bottom"
        align="end"
        className="gba:w-auto gba:max-w-none gba:min-w-0 gba:p-0 gba:rounded-lg gba:overflow-visible gba:shadow-xl gba:border-0 gba:bg-gradient-to-bl gba:from-[var(--nw-color-white)] gba:to-[var(--nw-color-blue-200)] gba:min-w-[300px] gba:max-w-[600px]"
        sideOffset={8}
        avoidCollisions={true}
        collisionPadding={20}
      >
        {activeActionData ? renderActionPopover(activeActionData) : <div className="gba:p-4">No active action</div>}
      </PopoverContent>
    </Popover>
  )
}
