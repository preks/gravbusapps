/**
 * Unified CREATE chat container: Header + scrollable content (children) + optional file summary + Input.
 * Used by Flow Creator and Function Manager. AI Builder and Orchestrator do not use it in Phase 1.
 */

import React from 'react'
import { CreateChatHeader } from './CreateChatHeader'
import { CreateChatInput } from './CreateChatInput'
import { CreateChatFileSummary, type CreateChatFileSummaryShape } from './CreateChatFileSummary'

export interface CreateChatPanelProps {
  /** Header */
  title: string
  subtitle?: string
  onAvatarClick?: () => void
  avatarTooltip?: string
  avatarPanelOpen?: boolean
  headerRightSlot?: React.ReactNode
  /** When set, header shows a close (X) button on the right. */
  onClose?: () => void
  /** Scrollable content (messages list or custom UI e.g. use cases + messages). */
  children: React.ReactNode
  /** Optional "Files changed" above input. Omit for Flow Creator / Function Manager. */
  fileSummary?: CreateChatFileSummaryShape | null
  /** Input: value, onChange, onSend required; rest optional. */
  inputValue: string
  inputOnChange: (value: string) => void
  inputOnSend: () => void
  inputDisabled?: boolean
  inputIsProcessing?: boolean
  inputOnStopMessage?: () => void
  inputPlaceholder?: string
  inputTipText?: string
  inputSecondaryActions?: React.ReactNode
  inputSendIcon?: 'send' | 'sparkles'
  /** File summary label when fileSummary is used. */
  fileSummaryLabel?: string
  className?: string
  'data-testid'?: string
}

export const CreateChatPanel: React.FC<CreateChatPanelProps> = ({
  title,
  subtitle,
  onAvatarClick,
  avatarTooltip,
  avatarPanelOpen,
  headerRightSlot,
  onClose,
  children,
  fileSummary,
  inputValue,
  inputOnChange,
  inputOnSend,
  inputDisabled = false,
  inputIsProcessing = false,
  inputOnStopMessage,
  inputPlaceholder = 'Type a message...',
  inputTipText,
  inputSecondaryActions,
  inputSendIcon = 'sparkles',
  fileSummaryLabel,
  className = '',
  'data-testid': testId = 'create-chat-panel'
}) => {
  return (
    <div
      className={`gba:flex gba:flex-col gba:h-full gba:min-h-0 gba:rounded-none gba:bg-background gba:overflow-hidden ${className}`.trim()}
      data-testid={testId}
    >
      <CreateChatHeader
        title={title}
        subtitle={subtitle}
        onAvatarClick={onAvatarClick}
        avatarTooltip={avatarTooltip}
        avatarPanelOpen={avatarPanelOpen}
        rightSlot={headerRightSlot}
        onClose={onClose}
      />
      <div className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col">
        <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:px-6 gba:py-4 gba:space-y-4">{children}</div>
        {fileSummary && fileSummary.totalUniqueFiles > 0 ? (
          <CreateChatFileSummary summary={fileSummary} label={fileSummaryLabel} />
        ) : null}
        <CreateChatInput
          value={inputValue}
          onChange={inputOnChange}
          onSend={inputOnSend}
          disabled={inputDisabled}
          isProcessing={inputIsProcessing}
          onStopMessage={inputOnStopMessage}
          placeholder={inputPlaceholder}
          tipText={inputTipText}
          secondaryActions={inputSecondaryActions}
          sendIcon={inputSendIcon}
          data-testid={`${testId}-input`}
        />
      </div>
    </div>
  )
}
