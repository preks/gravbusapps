import React from 'react'
import type { OutputItem, ConversationTurn } from '../types/models'
import { OutputItemRenderer } from './OutputRenderers'
import { SparkleIcon } from '@phosphor-icons/react'

interface UnifiedAIMessageRendererProps {
  outputs: OutputItem[]
  accessToken: string
  sendMessage?: (message: string, files: File[]) => void
  conversation?: ConversationTurn[]
  isVoiceMode?: boolean
  sessionId?: string
  onCancelGeneration?: () => void
  isAgentGenerating?: boolean
  wrapInBubble?: boolean
  className?: string
  headerContent?: React.ReactNode
  footerContent?: React.ReactNode
  'data-testid'?: string
}

/**
 * Unified AI Message Renderer
 *
 * Renders AI messages consistently for both Every AI and Team Chat.
 * The only difference is whether content is wrapped in a bubble (Team Chat) or not (Every AI).
 */
export const UnifiedAIMessageRenderer: React.FC<UnifiedAIMessageRendererProps> = ({
  outputs,
  accessToken,
  sendMessage,
  conversation,
  isVoiceMode = false,
  sessionId,
  onCancelGeneration,
  isAgentGenerating,
  wrapInBubble = false,
  className = '',
  headerContent,
  footerContent,
  'data-testid': testId
}) => {
  const filteredOutputs = outputs.filter(Boolean)
  const isThinkingOnly = filteredOutputs.every(output => {
    const outputType = output?.type ?? 'unknown'
    return outputType === 'tool' || outputType === 'loading'
  })

  if (filteredOutputs.length === 0) {
    return null
  }

  const content = (
    <div className={`gba:flex-1 gba:flex gba:flex-col ${isThinkingOnly ? 'gba:gap-1' : 'gba:gap-4'}`}>
      {filteredOutputs.map((output: any, outputIdx: number) => {
        const outputType = output?.type ?? 'unknown'
        const outputKey = `output-${outputIdx}-${outputType}`
        return (
          <OutputItemRenderer
            key={outputKey}
            item={output}
            accessToken={accessToken}
            sendMessage={sendMessage}
            conversation={conversation}
            isVoiceMode={isVoiceMode}
            sessionId={sessionId}
            onCancelGeneration={onCancelGeneration}
            isAgentGenerating={isAgentGenerating}
          />
        )
      })}
    </div>
  )

  const wrappedContent = wrapInBubble ? (
    <div className="gba:max-w-[80%] gba:px-3 gba:py-2 gba:shadow-sm gba:bg-gradient-to-br gba:from-muted gba:to-accent/10 gba:text-foreground gba:rounded-2xl gba:rounded-bl-md gba:border gba:border-primary/20">
      {headerContent && <div className="gba:mb-2">{headerContent}</div>}
      {content}
      {footerContent && <div className="gba:mt-2">{footerContent}</div>}
    </div>
  ) : (
    content
  )

  return (
    <div
      className={`gba:w-full gba:flex gba:items-start gba:gap-3 ${className}`}
      data-testid={testId || 'unified-ai-message-renderer'}
    >
      <div className="gba:flex-shrink-0 gba:w-10 gba:h-10 gba:bg-gradient-to-br gba:from-ai gba:to-ai-secondary gba:rounded-full gba:flex gba:items-center gba:justify-center gba:shadow-lg">
        <SparkleIcon className="gba:h-5 gba:w-5 gba:text-ai-foreground" weight="fill" />
      </div>
      {wrappedContent}
    </div>
  )
}

export default UnifiedAIMessageRenderer
