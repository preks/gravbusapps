import React from 'react'
import type { ConversationTurn, OutputItem, ReasoningStepOutput } from '../types/models'
import { AgentPlanPanel } from './AgentPlanPanel'
import { selectLatestPlanFromOutputs } from './agentPlanUtils'
import { OutputItemRenderer, ReasoningStepsGroup } from './OutputRenderers'
import { isTurnComplete, selectInlineReasoningStepIds } from './reasoningStepUtils'
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
  /**
   * When `true`, the renderer skips the per-turn AgentPlanPanel because
   * the host surface (e.g. EveryAI) renders a single, conversation-wide
   * plan panel on the right side of the chat. Defaults to `false` so
   * embedded surfaces (Team Chat) keep showing the inline plan.
   */
  hideInlinePlan?: boolean
  className?: string
  headerContent?: React.ReactNode
  footerContent?: React.ReactNode
  userInfo?: any
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
  hideInlinePlan = false,
  className = '',
  headerContent,
  footerContent,
  userInfo,
  'data-testid': testId
}) => {
  const filteredOutputs = outputs.filter(Boolean)
  // A turn is "thinking-only" when the only items we've got so far are
  // intermediate: the legacy ephemeral tool chip, the generic loading
  // placeholder, or the new Cursor-style reasoning-step rows. This keeps
  // spacing tight until a real answer / flow-proposal / entity arrives.
  const isThinkingOnly = filteredOutputs.every(output => {
    const outputType = output?.type ?? 'unknown'
    return (
      outputType === 'tool' ||
      outputType === 'loading' ||
      outputType === 'reasoning_step' ||
      outputType === 'reasoning_step_update' ||
      outputType === 'agent_plan' ||
      outputType === 'agent_plan_update'
    )
  })

  const latestPlan = hideInlinePlan ? null : selectLatestPlanFromOutputs(filteredOutputs)

  // Once the turn has produced a *finalized* deliverable (a non-streaming
  // answer, a flow proposal, an entity card, …) the reasoning trail should
  // collapse behind a single "Show reasoning" button so the chat stays
  // tidy. While we're still streaming each step renders inline so the user
  // can watch the agent think live.
  const turnIsComplete = isTurnComplete(filteredOutputs)
  const reasoningSteps: ReasoningStepOutput[] = filteredOutputs.filter(
    (o): o is ReasoningStepOutput => (o as OutputItem)?.type === 'reasoning_step'
  )
  const shouldGroupReasoning = turnIsComplete && reasoningSteps.length > 0
  const inlineStepIds = selectInlineReasoningStepIds(filteredOutputs, turnIsComplete)
  // While streaming, legacy ephemeral `tool` chips duplicate the description
  // we now render on the reasoning-step row itself (via `extractStepReason`).
  // They accumulate per tool call and only get pruned when the final answer
  // arrives, which makes the chat look like the descriptions are being
  // "spammed". Suppress them entirely when reasoning steps are present —
  // the modern path always emits both, so the step row carries the same
  // narration without the visual stacking.
  const hideLegacyToolChips = !turnIsComplete && reasoningSteps.length > 0

  if (filteredOutputs.length === 0) {
    return null
  }

  // When grouping kicks in we render the group at the position of the FIRST
  // reasoning step and skip the rest, so the relative ordering (reasoning
  // before the final answer) is preserved.
  let firstReasoningRendered = false

  const content = (
    <div className={`gba:flex-1 gba:flex gba:flex-col ${isThinkingOnly ? 'gba:gap-1' : 'gba:gap-4'}`}>
      {latestPlan ? (
        <AgentPlanPanel planId={latestPlan.planId} items={latestPlan.items} defaultExpanded={!turnIsComplete} />
      ) : null}
      {filteredOutputs.map((output: any, outputIdx: number) => {
        const outputType = output?.type ?? 'unknown'
        const outputKey = `output-${outputIdx}-${outputType}`

        if (shouldGroupReasoning && outputType === 'reasoning_step') {
          if (firstReasoningRendered) return null
          firstReasoningRendered = true
          return <ReasoningStepsGroup key="reasoning-group" steps={reasoningSteps} />
        }

        if (!turnIsComplete && outputType === 'reasoning_step') {
          const stepId = (output as ReasoningStepOutput).id
          if (!inlineStepIds.has(stepId)) return null
        }

        if (hideLegacyToolChips && outputType === 'tool') {
          return null
        }

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
            userInfo={userInfo}
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
