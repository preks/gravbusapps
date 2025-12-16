import React, { useMemo, useState } from 'react'
import type { ConversationTurn, UserTurn, AgentTurn, OutputItem } from '../types/models'
import { OutputItemRenderer } from './OutputRenderers'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import EntityLink, { markdownUrlTransform } from './links/EntityLink'
import { AvatarWithInitials } from './shared/AvatarWithInitials'
import { UserInfoProps } from '@/common/BusinessAppContext'
import { Sparkle, Copy, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'

interface ConversationProps {
  turns: ConversationTurn[]
  accessToken: string
  sendMessage?: (message: string, files: File[]) => void
  userInfo?: UserInfoProps
}

// Build text with mentions converted to markdown links
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

// Premium User Message Bubble
const UserTurnRenderer: React.FC<{ turn: UserTurn; accessToken: string; userInfo?: UserInfoProps }> = ({
  turn,
  accessToken,
  userInfo
}) => {
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
    <div
      className="gba:flex gba:flex-col gba:items-end gba:gap-2 gba:animate-in gba:slide-in-from-right"
      data-testid="chat-user-turn"
    >
      {turn.files?.length && turn.files.length > 0 ? (
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
      ) : null}
      {turn.text && (
        <div className="gba:flex gba:items-end gba:gap-2 gba:justify-end">
          <div className="gba:relative gba:group">
            {/* Subtle glow effect */}
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
                  <CheckCircle className="gba:h-4 gba:w-4 gba:text-success" weight="bold" />
                ) : (
                  <Copy className="gba:h-4 gba:w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* User Avatar */}
          {userInfo?.employeeDetails && (
            <div className="gba:flex-shrink-0">
              <AvatarWithInitials
                firstName={userInfo.employeeDetails.firstName || ''}
                lastName={userInfo.employeeDetails.lastName || ''}
                pictureThumbnail={undefined}
                size={32}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Premium AI Agent Message
type OutputItemWithKey = OutputItem & { key: string }

function isFlowProposalOutput(output: OutputItem): output is Extract<OutputItem, { type: 'flow_proposal' }> {
  return output.type === 'flow_proposal' && 'uuid' in output
}

const Conversation: React.FC<ConversationProps> = ({ turns, accessToken, sendMessage, userInfo }) => {
  const turnsWithKeys = useMemo(() => {
    return turns.map((turn, idx) => {
      const baseTurn = {
        ...turn,
        key: `turn-${idx}-${turn.side}`
      }

      if (turn.side === 'agent' && 'outputs' in turn) {
        return {
          ...baseTurn,
          outputs: turn.outputs.map((output, j) => {
            let outputKey = `output-${idx}-${j}-${output.type}`
            if (isFlowProposalOutput(output)) {
              outputKey = `flow_proposal-${output.uuid}`
            } else if (output.type === 'answer' && 'displayData' in output) {
              outputKey += `-${output.displayData?.length || 0}`
            }
            return { ...output, key: outputKey } as OutputItemWithKey
          })
        }
      }

      return baseTurn
    })
  }, [turns])

  return (
    <div className="gba:flex gba:flex-col gba:gap-6">
      {turnsWithKeys.map(turn => {
        if (turn.side === 'user') {
          return (
            <UserTurnRenderer key={turn.key} turn={turn as UserTurn} accessToken={accessToken} userInfo={userInfo} />
          )
        }

        const agentTurn = turn as AgentTurn & { key: string; outputs: OutputItemWithKey[] }
        return (
          <div
            key={turn.key}
            className="gba:w-full gba:flex gba:items-start gba:gap-3 gba:animate-in gba:slide-in-from-left"
            data-testid="chat-agent-turn"
          >
            {/* Premium AI Avatar */}
            <div className="gba:relative gba:flex-shrink-0">
              <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-ai gba:to-ai-secondary gba:rounded-full gba:blur-md gba:opacity-40 gba:animate-pulse" />
              <div className="gba:h-10 gba:w-10 gba:bg-gradient-to-br gba:from-ai gba:to-ai-secondary gba:rounded-full gba:flex gba:items-center gba:justify-center gba:relative gba:shadow-lg">
                <Sparkle className="gba:h-5 gba:w-5 gba:text-ai-foreground" weight="fill" />
              </div>
            </div>

            {/* Message content */}
            <div className="gba:flex-1 gba:flex gba:flex-col gba:gap-4">
              {agentTurn.outputs?.map((output, idx) => {
                const outputKey = 'key' in output ? (output as any).key : `output-${idx}`
                return (
                  <OutputItemRenderer
                    key={outputKey}
                    item={output}
                    accessToken={accessToken}
                    sendMessage={sendMessage}
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

export default Conversation
