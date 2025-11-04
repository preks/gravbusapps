import React, { useEffect, useRef, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFlowBot } from './hooks/useFlowBot'
import { ChatInput } from './components/ChatInput'
import { FormSubmissionProvider } from './components/FormSubmissionContext'
import { OutputItemRenderer } from './components/OutputRenderers'
import { AvatarWithInitials } from './components/shared/AvatarWithInitials'
import { useCurrentUserPicture } from './hooks/useCurrentUserPicture'
import type { UserTurn, AgentTurn, OutputItem } from './types/models'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import EntityLink, { markdownUrlTransform } from './components/links/EntityLink'

export interface EveryAIProps extends BusinessAppContextProps {
  className?: string
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

function isFlowProposalOutput(output: OutputItem): output is Extract<OutputItem, { type: 'flow_proposal' }> {
  return output.type === 'flow_proposal' && 'uuid' in output
}

/**
 * EveryAI - Premium AI Assistant
 * The most advanced AI-powered assistant for NEWWORK ERP
 */
export const EveryAI: React.FC<EveryAIProps> = props => {
  const { accessToken, className, userInfo } = props
  const scrollRef = useRef<HTMLDivElement>(null)

  const { conversation, isLoading, sendMessage, clearConversation, nextStepProposals, isPrechatLoading } =
    useFlowBot(accessToken)

  // Fetch current user's picture
  const { pictureThumbnail } = useCurrentUserPicture(userInfo?.employeeDetails?.employeeId, accessToken)

  const extendedConversation = useMemo(() => {
    // Don't add loading if conversation already has it
    const lastTurn = conversation[conversation.length - 1]
    const hasLoadingOutput = lastTurn?.side === 'agent' && lastTurn.outputs?.some(o => o.type === 'loading')

    if (isLoading && !hasLoadingOutput) {
      return [...conversation, { side: 'agent' as const, outputs: [{ type: 'loading' as const }] }]
    }
    return conversation
  }, [conversation, isLoading])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [extendedConversation.length])

  const handleSend = (
    text: string,
    files: File[],
    isThinking: boolean,
    isSearching: boolean,
    mentions?: Array<{ id: string; typeKey: string; display: string; raw?: any; start?: number; end?: number }>
  ) => {
    sendMessage(text, files, isThinking, isSearching, mentions)
  }

  return (
    <FormSubmissionProvider>
      <div
        className={`gba:h-full gba:flex gba:flex-col gba:bg-background gba:relative gba:overflow-hidden ${className || ''}`}
        data-testid="every-ai-app"
      >
        {/* Animated background gradient */}
        <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:opacity-30">
          <div
            className="gba:absolute gba:top-0 gba:left-0 gba:w-full gba:h-96 gba:bg-gradient-to-br gba:from-primary gba:via-info gba:to-success gba:opacity-20 gba:blur-3xl gba:animate-pulse"
            style={{ animationDuration: '8s' }}
          />
        </div>

        {/* Premium Professional Header */}
        <div className="gba:flex-shrink-0 gba:border-b gba:border-border gba:bg-card gba:backdrop-blur-sm gba:relative gba:z-10">
          {/* Subtle gradient accent line */}
          <div className="gba:h-1 gba:w-full gba:bg-gradient-to-r gba:from-primary gba:via-info gba:to-success" />

          <div className="gba:px-6 gba:py-5">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-4">
                {/* Sophisticated AI Icon */}
                <div className="gba:relative">
                  <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-primary/20 gba:to-info/20 gba:rounded-2xl gba:blur-xl gba:opacity-50" />
                  <div className="gba:h-14 gba:w-14 gba:bg-gradient-to-br gba:from-primary gba:to-info gba:rounded-2xl gba:flex gba:items-center gba:justify-center gba:relative gba:shadow-xl gba:border gba:border-primary/20">
                    <svg
                      className="gba:h-7 gba:w-7 gba:text-primary-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                </div>

                <div>
                  <h1 className="gba:text-2xl gba:font-bold gba:bg-gradient-to-r gba:from-primary gba:via-info gba:to-success gba:bg-clip-text gba:text-transparent gba:tracking-tight">
                    EveryAI
                  </h1>
                  <p className="gba:text-sm gba:text-muted-foreground gba:font-medium gba:mt-0.5">
                    Intelligent Assistant for Enterprise Operations
                  </p>
                </div>
              </div>

              {/* Professional AI Status Badge */}
              <div className="gba:inline-flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:rounded-xl gba:bg-gradient-to-r gba:from-primary/10 gba:to-info/10 gba:border gba:border-primary/20 gba:backdrop-blur-sm">
                <div className="gba:relative gba:h-2 gba:w-2">
                  <div className="gba:absolute gba:inset-0 gba:bg-success gba:rounded-full gba:animate-pulse" />
                  <div className="gba:absolute gba:inset-0 gba:bg-success gba:rounded-full gba:blur-sm" />
                </div>
                <span className="gba:text-xs gba:font-semibold gba:bg-gradient-to-r gba:from-primary gba:to-info gba:bg-clip-text gba:text-transparent">
                  AI Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Conversation Area with subtle gradient */}
        <div
          ref={scrollRef}
          className="gba:flex-1 gba:overflow-y-auto gba:p-6 gba:relative gba:z-10"
          data-testid="conversation-area"
        >
          {conversation.length === 0 && !isLoading ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center">
              {/* Premium welcome screen */}
              <div className="gba:relative gba:mb-6">
                <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-primary gba:to-info gba:rounded-full gba:blur-2xl gba:opacity-40 gba:animate-pulse" />
                <div className="gba:h-24 gba:w-24 gba:bg-gradient-to-br gba:from-primary gba:to-info gba:rounded-full gba:flex gba:items-center gba:justify-center gba:relative gba:shadow-2xl">
                  <svg
                    className="gba:h-12 gba:w-12 gba:text-primary-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>

              <h2 className="gba:text-3xl gba:font-bold gba:bg-gradient-to-r gba:from-primary gba:via-info gba:to-success gba:bg-clip-text gba:text-transparent gba:mb-3">
                Welcome to EveryAI
              </h2>
              <p className="gba:text-muted-foreground gba:max-w-md gba:text-lg gba:mb-8">
                Your intelligent companion for managing tasks, analyzing data, and automating workflows across the
                entire platform.
              </p>

              {/* Feature highlights with icons */}
              <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:max-w-2xl gba:mb-8">
                {[
                  {
                    icon: (
                      <svg className="gba:h-6 gba:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    ),
                    label: 'Instant Answers'
                  },
                  {
                    icon: (
                      <svg className="gba:h-6 gba:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    ),
                    label: 'Data Insights'
                  },
                  {
                    icon: (
                      <svg className="gba:h-6 gba:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    ),
                    label: 'Automation'
                  }
                ].map((feature, idx) => (
                  <div
                    key={idx}
                    className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:p-5 gba:rounded-xl gba:bg-card gba:border gba:border-border hover:gba:border-primary gba:transition-all gba:shadow-sm hover:gba:shadow-md gba:group"
                  >
                    <div className="gba:h-12 gba:w-12 gba:rounded-xl gba:bg-gradient-to-br gba:from-primary/10 gba:to-info/10 gba:flex gba:items-center gba:justify-center gba:text-primary group-hover:gba:scale-110 gba:transition-transform">
                      {feature.icon}
                    </div>
                    <span className="gba:text-sm gba:font-semibold gba:text-foreground">{feature.label}</span>
                  </div>
                ))}
              </div>

              <p className="gba:text-xs gba:text-muted-foreground gba:opacity-75">
                Type a question below or click a suggestion to get started
              </p>
            </div>
          ) : (
            <div className="gba:flex gba:flex-col gba:gap-6">
              {extendedConversation.map((turn, idx) => {
                const turnKey = `turn-${idx}-${turn.side}`

                if (turn.side === 'user') {
                  const textWithMentions = buildTextWithMentions(turn.text || '', turn.mentions)

                  return (
                    <div
                      key={turnKey}
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
                        <div className="gba:flex gba:items-end gba:gap-3 gba:justify-end">
                          <div className="gba:relative gba:group">
                            <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-primary gba:to-info gba:rounded-[20px] gba:blur-md gba:opacity-0 group-hover:gba:opacity-30 gba:transition-opacity" />
                            <div className="gba:max-w-md gba:rounded-[20px] gba:px-5 gba:py-3 gba:bg-gradient-to-br gba:from-primary gba:to-info gba:text-primary-foreground gba:shadow-lg gba:relative">
                              <div className="gba:prose gba:prose-invert gba:max-w-none gba:text-sm">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    a: ({ href, children, ...props }) => {
                                      if (href && href.startsWith('employee://')) {
                                        return (
                                          <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-primary-foreground/20 gba:text-primary-foreground gba:font-medium">
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

                const agentTurn = turn as AgentTurn
                return (
                  <div
                    key={turnKey}
                    className="gba:self-start gba:w-full gba:flex gba:items-start gba:gap-3 gba:animate-in gba:slide-in-from-left"
                    data-testid="chat-agent-turn"
                  >
                    <div className="gba:relative gba:flex-shrink-0">
                      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-primary gba:to-info gba:rounded-full gba:blur-md gba:opacity-40 gba:animate-pulse" />
                      <div className="gba:h-10 gba:w-10 gba:bg-gradient-to-br gba:from-primary gba:to-info gba:rounded-full gba:flex gba:items-center gba:justify-center gba:relative gba:shadow-lg">
                        <svg
                          className="gba:h-5 gba:w-5 gba:text-primary-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="gba:flex-1 gba:flex gba:flex-col gba:gap-4">
                      {agentTurn.outputs?.map((output, outputIdx) => {
                        const outputKey = isFlowProposalOutput(output)
                          ? `flow_proposal-${output.uuid}`
                          : `output-${idx}-${outputIdx}-${output.type}`
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
          )}
        </div>

        {/* Input Area with premium styling */}
        <div className="gba:flex-shrink-0 gba:border-t gba:border-border gba:bg-card/50 gba:backdrop-blur-md gba:p-6 gba:relative gba:z-10">
          <ChatInput
            onSend={handleSend}
            onClear={clearConversation}
            disabled={isLoading}
            suggestions={nextStepProposals}
            isPrechatLoading={isPrechatLoading}
            placeholder="Ask EveryAI anything..."
          />
        </div>
      </div>
    </FormSubmissionProvider>
  )
}

export default EveryAI
