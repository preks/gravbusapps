import React, { useState } from 'react'
import type { ConversationTurn, UserTurn, AgentTurn } from '../types/models'
import { OutputItemRenderer } from './OutputRenderers'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import EntityLink, { markdownUrlTransform } from './links/EntityLink'
import { AvatarWithInitials } from './shared/AvatarWithInitials'
import { UserInfoProps } from '@/common/BusinessAppContext'
import { Sparkle, CopySimple, Check } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'

interface ConversationRendererProps {
  turns: ConversationTurn[]
  accessToken: string
  sendMessage?: (
    userInputText: string,
    files: File[],
    isThinking?: boolean,
    isSearching?: boolean,
    mentions?: any
  ) => Promise<void>
  userInfo?: UserInfoProps
  pictureThumbnail: string | null
  isVoiceMode?: boolean
}

// Build text with mentions
function buildTextWithMentions(text: string, mentions?: UserTurn['mentions']): string {
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
    if (m.type === 'employees') {
      result = `${before}[@${m.display}](employee://${m.id})${after}`
    } else {
      result = `${before}${m.display}${after}`
    }
  }
  return result
}

// User Message with Copy Button
const UserMessageWithCopy: React.FC<{
  turn: UserTurn
  accessToken: string
  userInfo?: UserInfoProps
  pictureThumbnail: string | null
}> = ({ turn, accessToken, userInfo, pictureThumbnail }) => {
  const [copied, setCopied] = useState(false)

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

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(displayText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
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
            <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-muted gba:to-muted/80 gba:rounded-[20px] gba:blur-md gba:opacity-0 gba:group-hover:opacity-30 gba:transition-opacity" />
            <div className="gba:max-w-md gba:rounded-[20px] gba:px-5 gba:py-3 gba:bg-gradient-to-br gba:from-muted gba:to-muted/80 gba:text-foreground gba:shadow-lg gba:relative">
              <div className="gba:prose gba:max-w-none gba:text-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children, ...props }) => {
                      if (href && href.startsWith('employee://')) {
                        return (
                          <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-muted-foreground/20 gba:text-muted-foreground gba:font-medium">
                            @{children}
                          </span>
                        )
                      }
                      return (
                        <EntityLink href={href} accessToken={accessToken} {...props}>
                          {children}
                        </EntityLink>
                      )
                    }
                  }}
                  urlTransform={markdownUrlTransform}
                >
                  {textWithMentions}
                </ReactMarkdown>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gba:absolute gba:top-2 gba:right-2 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:h-7 gba:w-7 gba:p-0 gba:z-10"
                onClick={handleCopy}
                data-testid="user-message-copy-button"
              >
                {copied ? (
                  <Check className="gba:h-4 gba:w-4 gba:text-success" weight="bold" />
                ) : (
                  <CopySimple className="gba:h-4 gba:w-4" />
                )}
              </Button>
            </div>
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

export const ConversationRenderer: React.FC<ConversationRendererProps> = ({
  turns,
  accessToken,
  sendMessage,
  userInfo,
  pictureThumbnail,
  isVoiceMode = false
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:gap-6">
      {turns.map((turn, idx) => {
        const turnKey = `turn-${idx}-${turn.side}`

        if (turn.side === 'user') {
          return (
            <UserMessageWithCopy
              key={turnKey}
              turn={turn}
              accessToken={accessToken}
              userInfo={userInfo}
              pictureThumbnail={pictureThumbnail}
            />
          )
        }

        // Agent turn
        const agentTurn = turn as AgentTurn
        return (
          <div key={turnKey} className="gba:w-full gba:flex gba:items-start gba:gap-3" data-testid="chat-agent-turn">
            <div className="gba:relative gba:flex-shrink-0">
              <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-ai gba:to-ai-secondary gba:rounded-full gba:blur-md gba:opacity-40 gba:animate-pulse" />
              <div className="gba:h-10 gba:w-10 gba:bg-gradient-to-br gba:from-ai gba:to-ai-secondary gba:rounded-full gba:flex gba:items-center gba:justify-center gba:relative gba:shadow-lg">
                <Sparkle className="gba:h-5 gba:w-5 gba:text-ai-foreground" weight="fill" />
              </div>
            </div>
            {/* Message content */}
            <div className="gba:flex-1 gba:flex gba:flex-col gba:gap-4">
              {agentTurn.outputs?.map((output, outputIdx) => {
                const outputKey = `output-${idx}-${outputIdx}-${output.type}`
                return (
                  <OutputItemRenderer
                    key={outputKey}
                    item={output}
                    accessToken={accessToken}
                    sendMessage={sendMessage}
                    conversation={turns}
                    isVoiceMode={isVoiceMode}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ConversationRenderer
