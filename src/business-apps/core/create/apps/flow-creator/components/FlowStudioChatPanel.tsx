/**
 * Flow Studio chat panel: CreateChatPanel + flow AI client. Session-only; no persistence.
 * On set_flow_draft tool result (full template), applies template to canvas via templateToStudioGraph (with validation and try/catch).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CreateChatPanel, CreateChatMessageUser, CreateChatMessageAssistant } from '@/common/components/ai-builder'
import { MarkdownRenderer } from '@/business-apps/core/create/apps/ai-builder/pages/session-detail-page/components/MarkdownRenderer'
import type { FlowStudioChatMessage } from '../types/studioTypes'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import { useEmployeeAvatar } from '@/business-apps/core/every/apps/every-box/hooks/useEmployeeAvatar'
import { Sparkles } from 'lucide-react'
import { useFlowStudioStore } from '../hooks/useFlowStudioStore'
import { templateToStudioGraph } from '../utils/templateConverter'
import { studioGraphToTemplate } from '../utils/templateConverter'
import { validateAiTemplateContract, templateRequiresAdvancedMode } from '../utils/aiTemplateValidator'
import { type FlowQueryMessage, useCustomFlowEngineClient } from '@/common/network/custom-flow-engine'

function isValidTemplateShape(
  template: unknown
): template is { name?: string; steps: unknown[]; [key: string]: unknown } {
  if (template === null || typeof template !== 'object' || Array.isArray(template)) return false
  const t = template as Record<string, unknown>
  if (!Array.isArray(t.steps)) return false
  return true
}

function base64ToDataUrl(base64: string | undefined): string | undefined {
  if (!base64) return undefined
  const trimmed = base64.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('{')) return undefined
  const isPng = trimmed.startsWith('iVBORw0')
  const mime = isPng ? 'image/png' : 'image/jpeg'
  return `data:${mime};base64,${trimmed}`
}

interface FlowStudioChatPanelProps {
  accessToken: string
  userInfo?: UserInfoProps
  initialPrompt?: string
  /** Called after the initial prompt was auto-sent once, so the parent can clear it and avoid re-sending when chat is reopened. */
  onInitialPromptConsumed?: () => void
  /** When set, header shows Close button; typically collapses the chat panel. */
  onClose?: () => void
  'data-testid'?: string
}

interface ToolCallRecord {
  tool: string
  args?: string
  result?: string
  status: 'running' | 'complete'
  id: string
  order?: number
  displayTitle?: string
  displayDetail?: string
  displayStep?: 'call' | 'progress' | 'result'
}

export const FlowStudioChatPanel: React.FC<FlowStudioChatPanelProps> = ({
  accessToken,
  userInfo,
  initialPrompt = '',
  onInitialPromptConsumed,
  onClose,
  'data-testid': testId = 'flow-studio-chat-panel'
}) => {
  const messages = useFlowStudioStore(s => s.chatMessages)
  const setChatMessages = useFlowStudioStore(s => s.setChatMessages)
  const [input, setInput] = useState(initialPrompt.trim())
  const [loading, setLoading] = useState(false)
  const activeMessageIdRef = useRef<string | null>(null)
  const toolCallOrderRef = useRef(0)
  const hasAutoSentInitialRef = useRef(false)

  const avatarLookupId = userInfo?.employeeDetails?.employeeId || userInfo?.id
  const { employeeData } = useEmployeeAvatar(accessToken || '', avatarLookupId ?? '')
  const userAvatarSrc = useMemo(() => base64ToDataUrl(employeeData?.pictureThumbnail), [employeeData?.pictureThumbnail])
  const customFlowEngineClient = useCustomFlowEngineClient(accessToken)
  const userDisplayName = useMemo(() => {
    const first = userInfo?.employeeDetails?.firstName ?? userInfo?.givenName ?? ''
    const last = userInfo?.employeeDetails?.lastName ?? userInfo?.familyName ?? ''
    return [first, last].filter(Boolean).join(' ') || userInfo?.userName || 'You'
  }, [userInfo])

  const loadTemplate = useFlowStudioStore(s => s.loadTemplate)
  const setMode = useFlowStudioStore(s => s.setMode)
  const nodes = useFlowStudioStore(s => s.nodes)
  const edges = useFlowStudioStore(s => s.edges)
  const templateId = useFlowStudioStore(s => s.templateId)
  const templateName = useFlowStudioStore(s => s.templateName)
  const templateDescription = useFlowStudioStore(s => s.templateDescription)
  const templateTags = useFlowStudioStore(s => s.templateTags)
  const templateVersion = useFlowStudioStore(s => s.templateVersion)

  const applyTemplateToCanvas = useCallback(
    (template: { name?: string; description?: string; version?: number; tags?: unknown; steps: unknown[] }) => {
      try {
        const { nodes: newNodes, edges: newEdges } = templateToStudioGraph(template as any)
        const resolvedTemplateId =
          templateId?.trim() ||
          (typeof (template as { id?: string }).id === 'string' && (template as { id?: string }).id?.trim()
            ? (template as { id?: string }).id?.trim()
            : undefined)
        loadTemplate(resolvedTemplateId, newNodes, newEdges, {
          name: template.name ?? templateName ?? 'Untitled Flow',
          description: template.description ?? templateDescription ?? '',
          version:
            typeof template.version === 'number' && Number.isInteger(template.version) && template.version >= 1
              ? template.version
              : (templateVersion ?? 1),
          tags:
            template.tags && typeof template.tags === 'object' && !Array.isArray(template.tags)
              ? (template.tags as any)
              : templateTags
        })
      } catch (err) {
        console.error('Failed to apply template to canvas:', err)
        throw err
      }
    },
    [loadTemplate, templateDescription, templateId, templateName, templateTags, templateVersion]
  )

  const onStageEvent = useCallback(
    (event: { stage?: string; stageData?: unknown }) => {
      if (event.stage !== 'applied') return
      const stageData =
        event.stageData && typeof event.stageData === 'object' && !Array.isArray(event.stageData)
          ? (event.stageData as Record<string, unknown>)
          : null
      const template = stageData?.template
      if (!isValidTemplateShape(template)) {
        console.warn('Flow AI: invalid applied template shape, skipping canvas update')
        return
      }
      const validation = validateAiTemplateContract(template)
      if (!validation.valid) {
        console.warn('Flow AI: applied template contract validation failed:', validation.errors)
        return
      }
      try {
        applyTemplateToCanvas(template as any)
        if (templateRequiresAdvancedMode(template)) setMode('advanced')
      } catch {
        // Keep previous canvas state; error already logged
      }
    },
    [applyTemplateToCanvas, setMode]
  )

  const performSend = useCallback(
    (text: string, previousMessages: FlowStudioChatMessage[]) => {
      const userMessage: FlowStudioChatMessage = { role: 'user', content: text }
      const messageId = `assistant-${Date.now()}`
      activeMessageIdRef.current = messageId
      toolCallOrderRef.current = 0
      setChatMessages(prev => [
        ...prev,
        userMessage,
        {
          role: 'assistant',
          content: 'Building flow...',
          blocks: [{ type: 'response' as const, content: 'Building flow...', order: 0 }],
          messageId
        }
      ])
      setInput('')
      setLoading(true)

      const conversationHistory: FlowQueryMessage[] = [
        ...previousMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: text }
      ]

      let query = text
      const hasFlowSteps = nodes.length > 2
      if (hasFlowSteps) {
        const template = studioGraphToTemplate(
          nodes,
          edges,
          templateName,
          templateDescription,
          templateTags,
          templateVersion
        )
        query = `${text}\n\n[Current flow definition for refinement:\n${JSON.stringify(template)}]`
      }

      customFlowEngineClient.flows.agentic
        .sendFlowQuery({ query, conversationHistory })
        .then(stream => {
          if (!stream) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'No response.' }])
            setLoading(false)
            return
          }

          const reader = stream.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          let thinkingContent = ''
          let responseContent = ''
          const toolCalls: ToolCallRecord[] = []
          const runningStageRecordIdByStage = new Map<string, string>()
          const messageId = activeMessageIdRef.current

          const flushAssistantMessage = (final = false) => {
            const content = responseContent.trim() || (final ? 'Done.' : '')
            const thinkingBlock = thinkingContent
              ? [{ type: 'thinking' as const, content: thinkingContent, order: 0 }]
              : []
            const responseBlock = content ? [{ type: 'response' as const, content, order: 1 }] : []
            setChatMessages(prev => {
              const rest = prev.filter(m => m.messageId !== messageId)
              const existing = prev.find(m => m.messageId === messageId)
              const updated: FlowStudioChatMessage = {
                role: 'assistant',
                content,
                blocks: [...thinkingBlock, ...responseBlock],
                thinkingLog: thinkingContent || undefined,
                toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
                messageId
              }
              if (existing) return [...rest, updated]
              return [...prev, updated]
            })
          }

          const processLine = (line: string) => {
            const event = customFlowEngineClient.flows.agentic.parseFlowStreamDataLine(line)
            if (!event) return

            switch (event.type) {
              case 'thinking':
                if (event.content) thinkingContent += event.content
                break
              case 'response':
                if (event.content) responseContent += event.content
                break
              case 'tool_call': {
                const toolName = event.toolName ?? 'tool'
                const argsStr =
                  typeof event.toolArgs === 'string' ? event.toolArgs : JSON.stringify(event.toolArgs ?? {})
                const order = toolCallOrderRef.current++
                toolCalls.push({
                  id: `tc-${order}`,
                  tool: toolName,
                  args: argsStr,
                  status: 'running',
                  order,
                  displayTitle: getToolDisplayTitle(toolName),
                  displayDetail: getToolDisplayDetail(toolName, event.toolArgs)
                })
                flushAssistantMessage()
                break
              }
              case 'tool_result':
                if (event.toolName != null && event.toolResult !== undefined) {
                  const match = toolCalls.find(tc => tc.tool === event.toolName && tc.status === 'running')
                  if (match) {
                    match.status = 'complete'
                    match.result =
                      typeof event.toolResult === 'string' ? event.toolResult : JSON.stringify(event.toolResult)
                    match.displayDetail = getToolResultSummary(event.toolResult)
                  }
                  flushAssistantMessage()
                }
                break
              case 'stage': {
                if (!event.stage) break
                const stageKey = `stage:${event.stage}`
                const runningStageRecordId = runningStageRecordIdByStage.get(event.stage)
                const runningStageRecord =
                  runningStageRecordId == null ? undefined : toolCalls.find(tc => tc.id === runningStageRecordId)

                if (event.stageStatus === 'running') {
                  const order = toolCallOrderRef.current++
                  const recordId = `stage-${order}`
                  toolCalls.push({
                    id: recordId,
                    tool: stageKey,
                    status: 'running',
                    order,
                    displayTitle: getStageDisplayTitle(event.stage),
                    displayDetail: event.content ?? getStageDisplayDetail(event.stage, event.stageData)
                  })
                  runningStageRecordIdByStage.set(event.stage, recordId)
                } else if (runningStageRecord) {
                  runningStageRecord.status = 'complete'
                  runningStageRecord.displayDetail =
                    event.content ?? getStageDisplayDetail(event.stage, event.stageData)
                  runningStageRecordIdByStage.delete(event.stage)
                } else {
                  const order = toolCallOrderRef.current++
                  toolCalls.push({
                    id: `stage-${order}`,
                    tool: stageKey,
                    status: 'complete',
                    order,
                    displayTitle: getStageDisplayTitle(event.stage),
                    displayDetail: event.content ?? getStageDisplayDetail(event.stage, event.stageData)
                  })
                }

                onStageEvent({ stage: event.stage, stageData: event.stageData })
                flushAssistantMessage()
                break
              }
              case 'error':
                if (event.content) responseContent += `Error: ${event.content}\n`
                flushAssistantMessage()
                break
              case 'done':
                flushAssistantMessage(true)
                setLoading(false)
                break
              default:
                break
            }
          }

          const read = () => {
            reader.read().then(
              ({ done, value }) => {
                if (done) {
                  flushAssistantMessage(true)
                  setLoading(false)
                  return
                }
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split(/\r?\n/)
                buffer = lines.pop() ?? ''
                for (const line of lines) processLine(line)
                flushAssistantMessage()
                read()
              },
              err => {
                setChatMessages(prev => [
                  ...prev,
                  { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : String(err)}` }
                ])
                setLoading(false)
              }
            )
          }
          read()
        })
        .catch(err => {
          setChatMessages(prev => [
            ...prev,
            { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : String(err)}` }
          ])
          setLoading(false)
        })
    },
    [
      customFlowEngineClient,
      nodes,
      edges,
      onStageEvent,
      setChatMessages,
      templateDescription,
      templateName,
      templateTags,
      templateVersion
    ]
  )

  const onSendMessage = useCallback(() => {
    const text = input.trim()
    if (!text || loading) return
    performSend(text, messages)
  }, [input, loading, messages, performSend])

  useEffect(() => {
    const prompt = initialPrompt.trim()
    if (!prompt || hasAutoSentInitialRef.current) return
    hasAutoSentInitialRef.current = true
    performSend(prompt, [])
    onInitialPromptConsumed?.()
  }, [initialPrompt, performSend, onInitialPromptConsumed])

  const chatContent =
    messages.length === 0 ? (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center gba:py-12">
        <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-gradient-to-br gba:from-purple-500 gba:to-blue-500 gba:flex gba:items-center gba:justify-center gba:mb-4">
          <Sparkles className="gba:w-8 gba:h-8 gba:text-white" />
        </div>
        <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Flow AI</h3>
        <p className="gba:text-sm gba:text-muted-foreground gba:max-w-md">
          Describe the flow you want to create, or ask to refine the current flow.
        </p>
      </div>
    ) : (
      <div className="gba:space-y-4">
        {messages.map((m, idx) => {
          const key = m.messageId ?? `${m.role}-${idx}-${m.content.length}`
          if (m.role === 'user') {
            return (
              <CreateChatMessageUser key={key} userAvatar={userAvatarSrc} userName={userDisplayName}>
                {m.content}
              </CreateChatMessageUser>
            )
          }
          const blocks = Array.isArray(m.blocks) ? m.blocks : []
          const toolCallsList = m.toolCalls ?? []
          const hasBlocks = blocks.length > 0
          const hasToolCalls = toolCallsList.length > 0
          const blocksSection = hasBlocks ? (
            <div className="gba:space-y-2">
              {blocks
                .filter((b: { type: string }) => b.type === 'thinking' || b.type === 'response')
                .map((block: { type: string; content?: string }, i: number) =>
                  block.type === 'thinking' ? (
                    <div key={`t-${i}`} className="gba:text-xs gba:text-muted-foreground gba:italic">
                      {block.content?.trim() ? `Thinking: ${block.content}` : null}
                    </div>
                  ) : (
                    <MarkdownRenderer key={`r-${i}`} content={block.content ?? ''} />
                  )
                )}
            </div>
          ) : (
            <MarkdownRenderer content={m.content || ''} />
          )
          const toolCallsSection = hasToolCalls ? (
            <div className="gba:space-y-2 gba:mt-2">
              {toolCallsList.map((tc, i) => (
                <div
                  key={tc.id ?? `${tc.tool}-${i}`}
                  className="gba:rounded-lg gba:border gba:border-muted-foreground/20 gba:px-3 gba:py-2 gba:bg-muted/30 gba:text-xs"
                >
                  <span className="gba:font-medium">{tc.displayTitle ?? tc.tool}</span>
                  {tc.displayDetail ? (
                    <span className="gba:text-muted-foreground gba:ml-2">{tc.displayDetail}</span>
                  ) : null}
                  {tc.status === 'running' ? <span className="gba:ml-2 gba:text-primary">...</span> : null}
                </div>
              ))}
            </div>
          ) : null
          return (
            <CreateChatMessageAssistant key={key}>
              <div className="gba:space-y-0">
                {blocksSection}
                {toolCallsSection}
              </div>
            </CreateChatMessageAssistant>
          )
        })}
      </div>
    )

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0" data-testid={testId}>
      <CreateChatPanel
        title="Flow AI"
        subtitle={loading ? 'Thinking...' : 'Ready to help'}
        onClose={onClose}
        inputValue={input}
        inputOnChange={setInput}
        inputOnSend={onSendMessage}
        inputIsProcessing={loading}
        inputPlaceholder="Describe your flow or ask to refine it..."
        inputSendIcon="sparkles"
        data-testid={`${testId}-chat`}
      >
        {chatContent}
      </CreateChatPanel>
    </div>
  )
}

function getToolDisplayTitle(toolName: string): string {
  switch (toolName) {
    case 'set_flow_draft':
      return 'Apply flow'
    case 'validate_flow_draft':
      return 'Validate flow'
    case 'list_flow_templates':
      return 'List templates'
    case 'list_claim_capabilities':
      return 'List claim capabilities'
    default:
      return toolName
  }
}

function getToolDisplayDetail(
  toolName: string,
  toolArgs: Record<string, unknown> | string | undefined
): string | undefined {
  if (toolArgs == null) return undefined
  const args =
    typeof toolArgs === 'string'
      ? (() => {
          try {
            return JSON.parse(toolArgs) as Record<string, unknown>
          } catch {
            return {}
          }
        })()
      : toolArgs
  const template = args.template as { name?: string; steps?: unknown[] } | undefined
  if (template && typeof template.name === 'string') return template.name
  if (template && Array.isArray(template.steps)) return `${template.steps.length} steps`
  if (toolName === 'validate_flow_draft' && template) return 'Checking template'
  return undefined
}

function getToolResultSummary(toolResult: unknown): string {
  if (toolResult === null || typeof toolResult !== 'object') return ''
  const r = toolResult as {
    success?: boolean
    error?: string
    valid?: boolean
    errors?: string[]
    warnings?: string[]
    template?: { steps?: unknown[] }
  }
  if (r.success === false) {
    if (Array.isArray(r.errors) && r.errors.length > 0) {
      return `Validation failed: ${r.errors.slice(0, 2).join('; ')}${r.errors.length > 2 ? '...' : ''}`
    }
    if (typeof r.error === 'string') return `Failed: ${r.error}`
  }
  if (r.valid === false && Array.isArray(r.errors) && r.errors.length > 0) {
    return `Invalid: ${r.errors.slice(0, 2).join('; ')}${r.errors.length > 2 ? '...' : ''}`
  }
  if (r.valid === true && !r.success) return 'Valid'
  if (r.success === true && r.template && Array.isArray(r.template.steps)) {
    return `Updated draft (${r.template.steps.length} steps)`
  }
  return ''
}

function getStageDisplayTitle(stage: string): string {
  switch (stage) {
    case 'planning':
      return 'Plan flow'
    case 'clarification_needed':
      return 'Need clarification'
    case 'draft_created':
      return 'Draft created'
    case 'preflight_failed':
      return 'Validation failed'
    case 'repairing':
      return 'Repair draft'
    case 'validated':
      return 'Validated'
    case 'compiled':
      return 'Compiled'
    case 'applied':
      return 'Apply canonical draft'
    default:
      return stage
  }
}

function getStageDisplayDetail(stage: string, stageData: unknown): string | undefined {
  if (stageData == null || typeof stageData !== 'object' || Array.isArray(stageData)) return undefined
  const data = stageData as Record<string, unknown>

  if (Array.isArray(data.operations) && stage === 'planning') {
    return data.operations.map(operation => String(operation)).join('; ')
  }
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors
      .slice(0, 2)
      .map(error => String(error))
      .join('; ')
  }
  if (data.template && typeof data.template === 'object') {
    const steps = (data.template as { steps?: unknown[] }).steps
    if (Array.isArray(steps)) return `${steps.length} steps`
  }
  return undefined
}
