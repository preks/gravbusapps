import React, { useState } from 'react'
import type { UserTurn, ConversationTurn, AgentTurn, AnswerOutput } from '../types/models'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown'
import { AvatarWithInitials } from './shared/AvatarWithInitials'
import { UserInfoProps } from '@/common/BusinessAppContext'
import { CheckCircleIcon, CopyIcon, PencilSimple } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface UnifiedUserMessageProps {
  turn: UserTurn
  accessToken: string
  userInfo?: UserInfoProps
  pictureThumbnail: string | null
  isEditing: boolean
  editText: string
  onEditStart: (text: string) => void
  onEditCancel: () => void
  onEditSave: (newText: string) => void
  onEditTextChange: (text: string) => void
  turns: ConversationTurn[]
  turnIndex: number
}

// Build text with mentions
function buildTextWithMentions(text: string, mentions?: UserTurn['mentions']): string {
  const hasMarkdownEntityLinks = /\[[^\]]+\]\([a-zA-Z0-9_]+:\/\/[^)]+\)/.test(text)
  if (hasMarkdownEntityLinks) {
    return text
  }
  if (!mentions || mentions.length === 0) return text
  const withOffsets = mentions.filter(
    m => m.offsets && typeof m.offsets.start === 'number' && typeof m.offsets.end === 'number'
  )
  withOffsets.sort((a, b) => b.offsets!.start - a.offsets!.start)
  let result = text
  for (const m of withOffsets) {
    const start = m.offsets!.start
    const end = m.offsets!.end
    const before = result.slice(0, start)
    const after = result.slice(end)
    const protocol = (m.type || '').toLowerCase() === 'employees' ? 'employee' : m.type
    result = `${before}[${m.display}](${protocol}://${m.id})${after}`
  }
  return result
}

function hasEntityCardsAfterTurn(turns: ConversationTurn[], turnIndex: number): boolean {
  // Check all turns after the current user turn
  for (let i = turnIndex + 1; i < turns.length; i++) {
    const turn = turns[i]

    // Only check agent turns
    if (turn.side === 'agent') {
      const agentTurn = turn as AgentTurn

      // Check if any output contains entity cards
      const hasEntityCards = agentTurn.outputs?.some(output => {
        if (output.type === 'answer') {
          const answerOutput = output as AnswerOutput
          return answerOutput.displayData?.some(data => data.type === 'entity')
        }
        return false
      })

      if (hasEntityCards) {
        return true
      }
    }
  }

  return false
}

/**
 * Unified User Message Component
 *
 * Renders user messages consistently for both Every AI and Team Chat.
 * Handles edit functionality, file attachments, mentions, and copy/edit buttons.
 */
export const UnifiedUserMessage: React.FC<UnifiedUserMessageProps> = ({
  turn,
  accessToken,
  userInfo,
  pictureThumbnail,
  isEditing,
  editText,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditTextChange,
  turns,
  turnIndex
}) => {
  const [copied, setCopied] = useState(false)

  // Check if editing is allowed (disabled if entity cards exist in history after this turn)
  const canEdit = !hasEntityCardsAfterTurn(turns, turnIndex)

  // Parse JSON messages to show user-friendly text
  let displayText = turn.text || ''
  try {
    const parsed = JSON.parse(turn.text || '')
    if (parsed?.userMessage) {
      displayText = parsed.userMessage
    }
  } catch {
    // Not JSON, use original text
  }
  const textWithMentions = buildTextWithMentions(displayText, turn.mentions)
  const hasTextToCopy = displayText.trim().length > 0

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hasTextToCopy) return
    try {
      await navigator.clipboard.writeText(displayText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEditStart(displayText)
  }

  const handleSaveEdit = () => {
    onEditSave(editText)
  }

  const handleCancelEdit = () => {
    onEditCancel()
  }

  return (
    <div className="gba:flex gba:flex-col gba:items-end gba:gap-2" data-testid="chat-user-turn">
      {turn.files && turn.files.length > 0 && (
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          {turn.files.map(f => (
            <div
              key={f.id}
              className="gba:flex gba:items-center gba:gap-2 gba:bg-muted gba:rounded-lg gba:px-3 gba:py-1.5 gba:text-xs gba:border gba:border-border"
            >
              <svg
                className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <span className="gba:truncate gba:max-w-[140px]" title={f.name}>
                {f.name}
              </span>
            </div>
          ))}
        </div>
      )}
      {turn.text && (
        <div className="gba:flex gba:items-end gba:gap-3 gba:justify-end">
          <div className="gba:relative gba:group">
            {isEditing ? (
              <div className="gba:max-w-md gba:rounded-[20px] gba:px-5 gba:py-3 gba:bg-gradient-to-br gba:from-muted gba:to-muted/80 gba:shadow-lg">
                <textarea
                  className="gba:w-full gba:min-h-[80px] gba:bg-background gba:text-foreground gba:text-sm gba:border gba:border-border gba:rounded-lg gba:p-2 gba:resize-none focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary"
                  value={editText}
                  onChange={e => onEditTextChange(e.target.value)}
                  autoFocus
                  data-testid="user-message-edit-textarea"
                />
                <div className="gba:flex gba:gap-2 gba:mt-2 gba:justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    data-testid="user-message-edit-cancel-button"
                  >
                    {getTranslationFromI18nKeyAndLabel('everyAI.message.edit.cancel', 'Cancel')}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editText.trim()}
                    data-testid="user-message-edit-save-button"
                  >
                    {getTranslationFromI18nKeyAndLabel('everyAI.message.edit.save', 'Save')}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-muted gba:to-muted/80 gba:rounded-[20px] gba:blur-md gba:opacity-0 gba:group-hover:opacity-30 gba:transition-opacity" />
                <div className="gba:max-w-md gba:rounded-[20px] gba:px-5 gba:py-3 gba:bg-gradient-to-br gba:from-muted gba:to-muted/80 gba:text-foreground gba:shadow-lg gba:relative">
                  <MarkdownWithChipsRenderer
                    content={textWithMentions}
                    accessToken={accessToken}
                    variant="chat"
                    renderHttpLinksAsChips={false}
                    className="gba:text-sm [&>*:last-child]:gba:mb-0"
                  />
                  <div
                    className="
                      gba:absolute
                      gba:top-full
                      gba:right-2
                      gba:mt-1
                      gba:flex
                      gba:items-center
                      gba:gap-1
                      gba:opacity-0
                      gba:group-hover:opacity-100
                      gba:transition-opacity
                      gba:z-10
                    "
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:h-7 gba:w-7 gba:p-0"
                      onClick={handleCopy}
                      data-testid="user-message-copy-button"
                      disabled={!hasTextToCopy}
                      aria-label={
                        copied
                          ? getTranslationFromI18nKeyAndLabel('everyAI.message.copy.copied', 'Message copied')
                          : getTranslationFromI18nKeyAndLabel('everyAI.message.copy.label', 'Copy message')
                      }
                    >
                      {copied ? (
                        <CheckCircleIcon className="gba:h-4 gba:w-4 gba:text-success" weight="bold" />
                      ) : (
                        <CopyIcon className="gba:h-4 gba:w-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:h-7 gba:w-7 gba:p-0"
                      onClick={handleEdit}
                      data-testid="user-message-edit-button"
                      disabled={!canEdit}
                      aria-label={
                        canEdit
                          ? getTranslationFromI18nKeyAndLabel('everyAI.message.edit.label', 'Edit message')
                          : getTranslationFromI18nKeyAndLabel(
                              'everyAI.message.edit.disabled',
                              'Cannot edit - entity cards in history'
                            )
                      }
                    >
                      <PencilSimple className="gba:h-4 gba:w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          {userInfo?.employeeDetails && (
            <div className="gba:flex-shrink-0">
              <AvatarWithInitials
                firstName={userInfo.employeeDetails.firstName || ''}
                lastName={userInfo.employeeDetails.lastName || ''}
                pictureThumbnail={pictureThumbnail}
                size={36}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UnifiedUserMessage
