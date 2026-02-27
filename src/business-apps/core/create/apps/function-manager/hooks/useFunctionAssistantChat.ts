import { useCallback, useMemo, useRef, useState } from 'react'
import {
  FunctionsServiceClient,
  type FunctionAssistantDraftResponse,
  type FunctionAssistantDocSource,
  type FunctionAssistantExistingSnapshot,
  type FunctionAssistantMode,
  type FunctionAssistantQuestionOption
} from '@/common/network/functions/FunctionsServiceClient'

export type AssistantChatMessage =
  | { id: string; role: 'assistant' | 'system'; kind: 'text'; content: string }
  | { id: string; role: 'user'; kind: 'text'; content: string }
  | { id: string; role: 'assistant'; kind: 'typing' }
  | {
      id: string
      role: 'assistant'
      kind: 'thinking'
      content: string
      phase?: string
      phases?: string[]
      toolEvents?: AssistantToolEvent[]
    }
  | {
      id: string
      role: 'assistant'
      kind: 'draft'
      draft: FunctionAssistantDraftResponse
      hint?: string
      applied?: boolean
      implementationSummary?: string[]
      changedTabs?: Array<'source' | 'inputSchema' | 'outputSchema' | 'settings'>
      durationMs?: number
    }
  | {
      id: string
      role: 'assistant'
      kind: 'clarify'
      content: string
      questions: ClarifyWizardQuestion[]
      submittedAnswers?: Record<
        string,
        {
          selectedOptionLabel?: string
          selectedOptionValue?: string
          freeTextPreview?: string
          hasFreeText?: boolean
        }
      >
    }
  | { id: string; role: 'assistant'; kind: 'error'; content: string }

export type FunctionAssistantAnswers = Record<
  string,
  {
    // Legacy label-based selection (deprecated)
    selectedOption?: string
    // Preferred stable selection
    selectedOptionValue?: string
    selectedOptionId?: string
    freeText?: string
  }
>

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`
}

function summarizeAssistantError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err || 'Failed to generate.')
  // Attempt to extract structured backend error JSON from messages like:
  // "Function assistant failed: 400 - {\"message\":\"...\",\"error\":\"Bad Request\",\"statusCode\":400}"
  const idx = msg.indexOf(' - ')
  if (idx >= 0) {
    const tail = msg.slice(idx + 3).trim()
    if (tail.startsWith('{') && tail.endsWith('}')) {
      try {
        const parsed = JSON.parse(tail) as any
        if (typeof parsed?.message === 'string' && parsed.message.trim()) {
          return parsed.message.trim()
        }
      } catch {
        // ignore
      }
    }
  }
  return msg
}

function shouldApplyToEditor(draft: FunctionAssistantDraftResponse | undefined): boolean {
  return (draft as any)?.applyToEditor !== false
}

export interface UseFunctionAssistantChatArgs {
  accessToken?: string
  mode: FunctionAssistantMode
  existing?: FunctionAssistantExistingSnapshot
  onApply: (draft: FunctionAssistantDraftResponse) => void
}

export interface AssistantFixTestArgs {
  instruction?: string
  source: string
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  configKeys?: string[]
  config?: Record<string, string>
  payload?: Record<string, unknown>
  lastError?: string | null
  lastResult?: string | null
}

export type ClarifyWizardAnswer = {
  // Legacy (deprecated)
  selectedOption?: string
  // Preferred
  selectedOptionValue?: string
  selectedOptionId?: string
  freeText?: string
}

export type ClarifyWizardQuestion = {
  id: string
  question: string
  options?: string[]
  optionsV2?: FunctionAssistantQuestionOption[]
  freeText?: {
    required?: boolean
    placeholder?: string
    requiredWhenOptionIn?: string[]
    placeholderByOption?: Record<string, string>
  }
}

export type ClarifyWizardState = {
  messageId: string
  questions: ClarifyWizardQuestion[]
  index: number
  answers: Record<string, ClarifyWizardAnswer>
}

export type AssistantToolEvent = {
  id: string
  toolUseId?: string
  name: string
  status: 'start' | 'success' | 'error'
  summary?: string
  input?: Record<string, unknown>
}

const MAX_ACTIVITY_LINES = 200

export function useFunctionAssistantChat({ accessToken, mode, existing, onApply }: UseFunctionAssistantChatArgs) {
  const client = useMemo(() => (accessToken ? new FunctionsServiceClient(accessToken) : null), [accessToken])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const [sessionId, setSessionId] = useState(() => uid('session'))
  const [messages, setMessages] = useState<AssistantChatMessage[]>(() => [])
  const [clarifyWizard, setClarifyWizard] = useState<ClarifyWizardState | null>(null)
  const [activityLines, setActivityLines] = useState<string[]>([])

  const appendActivityLine = useCallback((line: string) => {
    const nextLine = String(line || '').trim()
    if (!nextLine) return
    setActivityLines(prev => {
      const last = prev.length ? prev[prev.length - 1] : ''
      const next = last === nextLine ? prev : [...prev, nextLine]
      return next.slice(-MAX_ACTIVITY_LINES)
    })
  }, [])

  const clearActivity = useCallback(() => {
    setActivityLines([])
  }, [])

  const formatProgressLine = useCallback(
    (evt: { phase?: string; message?: string; data?: Record<string, unknown> }) => {
      const phase = String(evt.phase || '')
        .trim()
        .toLowerCase()

      // Prefer consistent, user-facing wording over internal phase/tool labels.
      if (phase === 'start' || phase === 'clarify') return 'Analyzing requirements…'
      if (phase === 'plan') return 'Planning next steps…'
      if (phase === 'draft' || phase === 'llm') return 'Thinking…'
      if (phase === 'json' || phase === 'repair' || phase === 'recover') return 'Validating output…'
      if (phase === 'finalize') return 'Generating final response…'
      if (phase === 'done') return 'Done.'

      if (phase === 'tool') {
        const data = evt.data || {}
        const tool = typeof (data as any).tool === 'string' ? String((data as any).tool) : ''
        const status = typeof (data as any).status === 'string' ? String((data as any).status) : ''
        const summary = typeof (data as any).summary === 'string' ? String((data as any).summary) : ''

        const normalizeSummary = (raw: string) => {
          const s = String(raw || '').trim()
          if (!s) return ''
          const m = s.match(/fetchedChars=(\d+)\s+truncated=(true|false)/i)
          if (!m) return s
          const chars = Number(m[1] || 0)
          const kb = Math.max(1, Math.round(chars / 1024))
          const truncated = String(m[2]).toLowerCase() === 'true'
          return `~${kb} KB${truncated ? ' (truncated)' : ''}`
        }

        const toolTitle = (() => {
          if (tool === 'resolve_openapi_directory') return 'Looking up API docs'
          if (tool) return 'Fetching documentation'
          return 'Working with tools'
        })()
        const extra = normalizeSummary(summary)

        if (status === 'start') return `${toolTitle}…`
        if (status === 'success') return `${toolTitle} done${extra ? ` (${extra})` : ''}`
        if (status === 'error') return `${toolTitle} failed`
        return `${toolTitle}…`
      }

      // Fallback: show the backend message, but strip common prefixes.
      const raw = String(evt.message || '').trim()
      return raw
        ? raw
            .replace(/^tool\s*:\s*/i, '')
            .replace(/^draft\s*:\s*/i, '')
            .replace(/^start\s*:\s*/i, '')
        : 'Working…'
    },
    []
  )

  const buildImplementationSummary = useCallback((draft: FunctionAssistantDraftResponse): string[] => {
    const fromModel = Array.isArray((draft as any)?.implementationSummary)
      ? ((draft as any).implementationSummary as unknown[])
          .map(s => String(s || '').trim())
          .filter(Boolean)
          .slice(0, 12)
      : []
    if (fromModel.length) return fromModel

    const out: string[] = []
    const desc = String(draft?.description || '').trim()
    if (desc) out.push(desc)

    const keys = Array.isArray(draft?.configKeys) ? draft.configKeys : []
    const preview = keys
      .map(k =>
        String(k || '')
          .trim()
          .toUpperCase()
      )
      .filter(Boolean)
      .slice(0, 6)
    if (preview.length) {
      out.push(`Uses configuration: ${preview.join(', ')}${keys.length > preview.length ? '…' : ''}`)
    }

    return out.length ? out : ['Applied to editor']
  }, [])

  const canSend = useMemo(() => {
    if (!client) return false
    if (clarifyWizard) return false
    if (!input.trim()) return false
    return true
  }, [client, clarifyWizard, input])

  const reset = useCallback(() => {
    setInput('')
    setIsGenerating(false)
    setMessages([])
    setClarifyWizard(null)
    setSessionId(uid('session'))
    clearActivity()
  }, [clearActivity])

  type UseCaseTemplate =
    | 'integration'
    | 'rules'
    | 'compute'
    | 'transform'
    | 'tokenExchange'
    | 'webhook'
    | 'connector'
    | 'documentConnector'

  const getUseCaseKickoffPrompt = useCallback((useCase: UseCaseTemplate) => {
    if (useCase === 'integration') {
      return 'Build an integration function.'
    }
    if (useCase === 'rules') {
      return 'Build a rule evaluator function.'
    }
    if (useCase === 'compute') {
      return 'Build a computation function.'
    }
    if (useCase === 'transform') {
      return 'Build a data transformer function (map input to output; no external API calls).'
    }
    if (useCase === 'tokenExchange') {
      return 'Build a token exchange function.'
    }
    if (useCase === 'connector') {
      return 'Build a board data connector function.'
    }
    if (useCase === 'documentConnector') {
      return 'Build a document connector function.'
    }
    return 'Build a webhook handler function.'
  }, [])

  const getUseCaseContext = useCallback((useCase: UseCaseTemplate) => {
    if (useCase === 'integration') {
      return [
        'Use case: Integration function',
        'Goal: Call an external API and return a minimal, stable response for workflows.',
        'IMPORTANT ORDERING:',
        '- First, ask which system category to integrate with (e.g., ERP, CRM, ITSM, HR, Finance, Data/BI, Other).',
        '- Then, ask which system/vendor (e.g., SAP, Salesforce, ServiceNow, Workday, Oracle, Microsoft Dynamics).',
        '- Only after category + system are known, ask the remaining integration questions (docs/auth/base URL, endpoint, inputs, minimal output).',
        'If the chosen system is a common vendor, prefer using OpenAPI Directory (docSource.type=openapiDirectory) by name.',
        'Note: retries are NOT part of the default integration function unless explicitly requested.'
      ].join('\n')
    }
    if (useCase === 'webhook') {
      return [
        'Use case: Webhook handler',
        'Goal: Validate webhook signature (secret from context.config), parse payload, and trigger an action (call API / start workflow).',
        'Ask only required questions (provider docs, signature scheme, required headers, payload fields, expected response).'
      ].join('\n')
    }
    if (useCase === 'tokenExchange') {
      return [
        'Use case: Token exchange',
        'Goal: Exchange the current user access token for a provider-specific token (or session) and return a stable token payload.',
        'Important:',
        '- If a user token is available it will be provided as context.user.accessToken (ONLY when context.user.email is present).',
        '- Use ONLY the user token from context.user.accessToken for user-bound exchanges (never from context.config).',
        '- Do not log tokens.',
        'Ask only required questions (provider/system, token endpoint / docs, exchange flow, required config keys).'
      ].join('\n')
    }
    if (useCase === 'transform') {
      return [
        'Use case: Data transformer',
        'Goal: Map the incoming event payload into the output schema (pure mapping by default).',
        'Ask only required questions (input schema/example, output schema/example, mapping rules, edge cases).',
        'Do NOT ask integration questions (docs/auth/preset) unless an external API call is explicitly required.'
      ].join('\n')
    }
    if (useCase === 'connector') {
      return [
        'Use case: Board data connector',
        'Goal: Build a paginated data connector that imports external data into Board Apps.',
        'CRITICAL CONTRACT — The function receives event.action ("preview" or "page"):',
        '',
        '  action="preview" → Return { fields: [{ name, type }], sample: [...up to 5 rows...], totalEstimate }',
        '  action="page"    → Return { rows: [...data...], nextCursor: string | null, totalEstimate }',
        '',
        'Pagination: event.pageSize (default 100), event.cursor (string offset, starts null/0).',
        'When nextCursor is null, the import is complete.',
        'Use context.config for API keys, URLs, and credentials (never hardcode secrets).',
        'Ask which data source (Oracle, SAP, Salesforce, REST API, database, CSV/file, etc.),',
        'then ask for connection details (API URL, auth method, entity/table, optional query/filter).',
        'The output MUST set connectorEnabled: true in the draft response.',
        'Keep the function stateless — all state is managed by the caller via cursor.'
      ].join('\n')
    }
    if (useCase === 'documentConnector') {
      return [
        'Use case: Document connector (unstructured data)',
        'Goal: Build a paginated connector that imports external documents into the Document Service.',
        'CRITICAL CONTRACT — The function receives event.action ("preview", "page", or "transfer"):',
        '',
        '  action="preview" → Return { items: [{ externalId, kind, title, mimeType?, snippet?, externalUrl?, sizeBytes? }], estimatedTotal? }',
        '  action="page"    → Return { items: [...same shape...], nextCursor: string | null, estimatedTotal? }',
        '  action="transfer" → Return { externalId, textContent?: string, htmlContent?: string, binary?: Buffer }',
        '',
        'Item kinds: "page" (text/HTML content like Confluence/wiki) or "file" (binary files like PDF, DOCX).',
        'Pagination: event.pageSize (default 50), event.cursor (string, starts null).',
        'When nextCursor is null, the import is complete.',
        'Use context.config for API keys, URLs, and credentials (never hardcode secrets).',
        'Ask which data source (Confluence, SharePoint, Google Drive, S3, Notion, etc.),',
        'then ask for connection details (API URL, auth method, space/folder, optional query/filter).',
        'The output MUST set connectorEnabled: true AND connectorKind: "unstructured" in the draft response.',
        'Keep the function stateless — all state is managed by the caller via cursor.'
      ].join('\n')
    }
    if (useCase === 'rules') {
      return [
        'Use case: Rule evaluator',
        'Goal: Evaluate a set of rules against the incoming event payload and return a stable result.',
        'Ask only required questions (rule set, required inputs, result contract, missing-input policy).',
        'Do NOT ask integration questions (docs/auth/preset) unless an external API call is explicitly required.'
      ].join('\n')
    }
    return [
      'Use case: Computation',
      'Goal: Compute derived values from the incoming event payload and return a stable result.',
      'Ask only required questions (required inputs, computation/formula, output schema).',
      'Do NOT ask integration questions (docs/auth/preset) unless an external API call is explicitly required.'
    ].join('\n')
  }, [])

  const insertUseCase = useCallback((useCase: UseCaseTemplate) => {
    setInput(getUseCaseKickoffPrompt(useCase))
  }, [])

  const insertExample = useCallback((type: 'url' | 'name' | 'paste') => {
    if (type === 'url') {
      setInput(
        [
          'Goal: Create a function that calls the API.',
          'API spec URL: https://example.com/openapi.json',
          'Return: a minimal success object.'
        ].join('\n')
      )
      return
    }
    if (type === 'name') {
      setInput(
        [
          'Goal: Create a function that calls the API.',
          'API name: <provider>',
          'Return: a minimal result object.'
        ].join('\n')
      )
      return
    }
    setInput(
      [
        'Goal: Create a function that calls the API.',
        'API spec:',
        '```yaml',
        'openapi: 3.0.0',
        'info:',
        '  title: Example API',
        '  version: 1.0.0',
        'paths: {}',
        '```'
      ].join('\n')
    )
  }, [])

  const applyDraft = useCallback(
    (draft: FunctionAssistantDraftResponse) => {
      onApply(draft)
      setMessages(prev => [
        ...prev,
        {
          id: uid('assistant'),
          role: 'assistant',
          kind: 'text',
          content: 'Applied. Next: fill required keys in Settings, then run your Test Function or Test Suite.'
        }
      ])
    },
    [onApply]
  )

  const lastRequestRef = useRef<{
    request: {
      prompt: string
      mode: FunctionAssistantMode
      clarifyCount?: number
      clarifyLimit?: number
      docSource?: FunctionAssistantDocSource
      existing?: FunctionAssistantExistingSnapshot
      answers?: FunctionAssistantAnswers
      sessionId?: string
    }
  } | null>(null)

  const sendPrompt = useCallback(
    async (
      userText: string,
      docSource?: FunctionAssistantDocSource,
      displayText?: string,
      answers?: FunctionAssistantAnswers
    ) => {
      if (!client) {
        setMessages(prev => [
          ...prev,
          { id: uid('assistant'), role: 'assistant', kind: 'error', content: 'Access token missing.' }
        ])
        return
      }
      if (!String(userText || '').trim()) return
      if (isGenerating) return

      const text = String(userText || '').trim()
      const shown = String(displayText || text).trim()
      const thinkingId = uid('thinking')
      const startedAt = Date.now()

      setIsGenerating(true)
      clearActivity()
      setMessages(prev => [
        ...prev,
        { id: uid('user'), role: 'user', kind: 'text', content: shown },
        {
          id: thinkingId,
          role: 'assistant',
          kind: 'thinking',
          content: 'Analyzing requirements and preparing questions',
          phase: 'start',
          phases: ['start']
        }
      ])

      try {
        const clarifyCount = messages.filter(m => m.kind === 'clarify').length
        const clarifyLimit = 2
        const previousUserMessages = messages.filter(m => m.role === 'user' && m.kind === 'text').map(m => m.content)
        const combinedPrompt = [...previousUserMessages, text].filter(Boolean).join('\n\n---\n\n')

        const request = {
          prompt: combinedPrompt,
          mode,
          clarifyCount,
          clarifyLimit,
          docSource,
          existing,
          answers,
          sessionId
        }
        // store for retry (also used by retryLast)
        lastRequestRef.current = { request }

        const res = await client.functionAssistantDraftStream(request as any, evt => {
          if (evt.type !== 'progress') return
          appendActivityLine(formatProgressLine({ phase: evt.phase, message: evt.message, data: evt.data as any }))
          const msg = evt.message || 'Working…'
          setMessages(prev =>
            prev.map(m => {
              if (m.id !== thinkingId || m.kind !== 'thinking') return m
              const phase = evt.phase || 'working'
              const prevPhases = Array.isArray(m.phases) ? m.phases : []
              const phases = prevPhases.includes(phase) ? prevPhases : [...prevPhases, phase]
              const data = evt.data as any
              const toolName = typeof data?.tool === 'string' ? data.tool : undefined
              const toolStatus = typeof data?.status === 'string' ? data.status : undefined
              const toolInput =
                data?.input && typeof data.input === 'object' ? (data.input as Record<string, unknown>) : undefined
              const toolSummary = typeof data?.summary === 'string' ? data.summary : undefined
              const toolUseId = typeof data?.toolUseId === 'string' ? data.toolUseId : undefined
              const toolEvt: AssistantToolEvent | null =
                phase === 'tool' &&
                toolName &&
                (toolStatus === 'start' || toolStatus === 'success' || toolStatus === 'error')
                  ? {
                      id: toolUseId ? `tool-${toolUseId}` : uid('tool'),
                      toolUseId,
                      name: toolName,
                      status: toolStatus,
                      input: toolInput,
                      summary: toolSummary
                    }
                  : null
              const prevTools = Array.isArray((m as any).toolEvents)
                ? ((m as any).toolEvents as AssistantToolEvent[])
                : []
              const toolEvents = (() => {
                if (!toolEvt) return prevTools
                if (toolEvt.toolUseId) {
                  const idx = prevTools.findIndex(t => t.toolUseId === toolEvt.toolUseId)
                  if (idx >= 0) {
                    const updated = [...prevTools]
                    updated[idx] = { ...updated[idx], ...toolEvt }
                    return updated.slice(-12)
                  }
                }
                return [...prevTools, toolEvt].slice(-12)
              })()
              return { ...m, content: msg, phase, phases, toolEvents }
            })
          )
        })

        if (res?.kind === 'clarify' && Array.isArray(res.questions) && res.questions.length > 0) {
          const msgId = uid('assistant')
          const docsQuestion = res.questions.find(q => q && q.id === 'docs') as any
          const docsOptionsV2 = Array.isArray(docsQuestion?.optionsV2) ? (docsQuestion.optionsV2 as any[]) : []
          const presetOpt = docsOptionsV2.find(o => String(o?.value || '').trim() === 'preset')
          const legacyOptions = Array.isArray(docsQuestion?.options) ? (docsQuestion.options as any[]) : []
          const legacyPresetLabel =
            legacyOptions.find(o => String(o || '').trim() === 'Standard integration preset (no spec)') ||
            legacyOptions.find(o => String(o || '').trim() === 'Use a standard integration preset (no spec)')
          setClarifyWizard({
            messageId: msgId,
            questions: res.questions,
            index: 0,
            answers: presetOpt
              ? { docs: { selectedOptionValue: 'preset', selectedOptionId: String(presetOpt.id || '').trim() } }
              : legacyPresetLabel
                ? { docs: { selectedOption: String(legacyPresetLabel).trim() } }
                : {}
          })
          setMessages(prev => {
            const withoutTyping = prev.filter(m => m.id !== thinkingId)
            return [
              ...withoutTyping,
              {
                id: msgId,
                role: 'assistant',
                kind: 'clarify',
                content: res.notes || 'I need a bit more info before generating the function.',
                questions: res.questions as any
              }
            ]
          })
        } else {
          setClarifyWizard(null)
          if (!shouldApplyToEditor(res)) {
            const answer = String(res?.notes || '').trim()
            setMessages(prev => {
              const withoutTyping = prev.filter(m => m.id !== thinkingId)
              return [
                ...withoutTyping,
                {
                  id: uid('assistant'),
                  role: 'assistant',
                  kind: 'text',
                  content: answer ? answer : 'No changes were applied.'
                }
              ]
            })
            return
          }

          // Auto-apply drafts to the editor; user can undo in the editor UI.
          onApply(res)
          const implementationSummary = buildImplementationSummary(res)
          setMessages(prev => {
            const withoutTyping = prev.filter(m => m.id !== thinkingId)
            return [
              ...withoutTyping,
              {
                id: uid('assistant'),
                role: 'assistant',
                kind: 'draft',
                draft: res,
                applied: true,
                implementationSummary,
                hint: res?.testInstructions
                  ? 'Applied to editor. See configuration below.'
                  : 'Applied to editor. Undo available in the editor.',
                durationMs: Date.now() - startedAt
              }
            ]
          })
        }
      } catch (e) {
        setClarifyWizard(null)
        appendActivityLine(`error: ${summarizeAssistantError(e)}`)
        setMessages(prev => {
          const withoutTyping = prev.filter(m => m.id !== thinkingId)
          return [
            ...withoutTyping,
            {
              id: uid('assistant'),
              role: 'assistant',
              kind: 'error',
              content: summarizeAssistantError(e)
            }
          ]
        })
      } finally {
        setIsGenerating(false)
      }
    },
    [
      appendActivityLine,
      buildImplementationSummary,
      clearActivity,
      client,
      existing,
      formatProgressLine,
      isGenerating,
      mode,
      messages,
      onApply,
      sessionId
    ]
  )

  const retryLast = useCallback(async () => {
    if (!client) return
    if (isGenerating) return
    const last = lastRequestRef.current
    if (!last) return

    const thinkingId = uid('thinking')
    const startedAt = Date.now()
    setIsGenerating(true)
    clearActivity()
    setMessages(prev => [
      ...prev,
      {
        id: thinkingId,
        role: 'assistant',
        kind: 'thinking',
        content: 'Retrying…',
        phase: 'start',
        phases: ['start']
      }
    ])

    try {
      const res = await client.functionAssistantDraftStream(last.request as any, evt => {
        if (evt.type !== 'progress') return
        appendActivityLine(formatProgressLine({ phase: evt.phase, message: evt.message, data: evt.data as any }))
        const msg = evt.message || 'Working…'
        setMessages(prev =>
          prev.map(m => {
            if (m.id !== thinkingId || m.kind !== 'thinking') return m
            const phase = evt.phase || 'working'
            const prevPhases = Array.isArray(m.phases) ? m.phases : []
            const phases = prevPhases.includes(phase) ? prevPhases : [...prevPhases, phase]
            const data = evt.data as any
            const toolName = typeof data?.tool === 'string' ? data.tool : undefined
            const toolStatus = typeof data?.status === 'string' ? data.status : undefined
            const toolInput =
              data?.input && typeof data.input === 'object' ? (data.input as Record<string, unknown>) : undefined
            const toolSummary = typeof data?.summary === 'string' ? data.summary : undefined
            const toolUseId = typeof data?.toolUseId === 'string' ? data.toolUseId : undefined
            const toolEvt: AssistantToolEvent | null =
              phase === 'tool' &&
              toolName &&
              (toolStatus === 'start' || toolStatus === 'success' || toolStatus === 'error')
                ? {
                    id: toolUseId ? `tool-${toolUseId}` : uid('tool'),
                    toolUseId,
                    name: toolName,
                    status: toolStatus,
                    input: toolInput,
                    summary: toolSummary
                  }
                : null
            const prevTools = Array.isArray((m as any).toolEvents)
              ? ((m as any).toolEvents as AssistantToolEvent[])
              : []
            const toolEvents = (() => {
              if (!toolEvt) return prevTools
              if (toolEvt.toolUseId) {
                const idx = prevTools.findIndex(t => t.toolUseId === toolEvt.toolUseId)
                if (idx >= 0) {
                  const updated = [...prevTools]
                  updated[idx] = { ...updated[idx], ...toolEvt }
                  return updated.slice(-12)
                }
              }
              return [...prevTools, toolEvt].slice(-12)
            })()
            return { ...m, content: msg, phase, phases, toolEvents }
          })
        )
      })

      if (res?.kind === 'clarify' && Array.isArray(res.questions) && res.questions.length > 0) {
        const msgId = uid('assistant')
        const defaultDocsOption = 'Use a standard integration preset (no spec)'
        const docsQuestion = res.questions.find(q => q && q.id === 'docs')
        const shouldDefaultPreset =
          docsQuestion &&
          Array.isArray((docsQuestion as any).options) &&
          (docsQuestion as any).options.includes(defaultDocsOption)
        setClarifyWizard({
          messageId: msgId,
          questions: res.questions,
          index: 0,
          answers: shouldDefaultPreset ? { docs: { selectedOption: defaultDocsOption } } : {}
        })
        setMessages(prev => {
          const withoutTyping = prev.filter(m => m.id !== thinkingId)
          return [
            ...withoutTyping,
            {
              id: msgId,
              role: 'assistant',
              kind: 'clarify',
              content: res.notes || 'I need a bit more info before generating the function.',
              questions: res.questions as Array<{ id: string; question: string; options?: string[] }>
            }
          ]
        })
      } else {
        setClarifyWizard(null)
        if (!shouldApplyToEditor(res)) {
          const answer = String(res?.notes || '').trim()
          setMessages(prev => {
            const withoutTyping = prev.filter(m => m.id !== thinkingId)
            return [
              ...withoutTyping,
              {
                id: uid('assistant'),
                role: 'assistant',
                kind: 'text',
                content: answer ? answer : 'No changes were applied.'
              }
            ]
          })
          return
        }

        onApply(res)
        const implementationSummary = buildImplementationSummary(res)
        setMessages(prev => {
          const withoutTyping = prev.filter(m => m.id !== thinkingId)
          return [
            ...withoutTyping,
            {
              id: uid('assistant'),
              role: 'assistant',
              kind: 'draft',
              draft: res,
              applied: true,
              implementationSummary,
              hint: res?.testInstructions
                ? 'Applied to editor. See configuration below.'
                : 'Applied to editor. Undo available in the editor.',
              durationMs: Date.now() - startedAt
            }
          ]
        })
      }
    } catch (e) {
      setClarifyWizard(null)
      appendActivityLine(`error: ${summarizeAssistantError(e)}`)
      setMessages(prev => {
        const withoutTyping = prev.filter(m => m.id !== thinkingId)
        return [
          ...withoutTyping,
          {
            id: uid('assistant'),
            role: 'assistant',
            kind: 'error',
            content: summarizeAssistantError(e)
          }
        ]
      })
    } finally {
      setIsGenerating(false)
    }
  }, [
    appendActivityLine,
    buildImplementationSummary,
    clearActivity,
    client,
    existing,
    formatProgressLine,
    isGenerating,
    mode,
    onApply
  ])

  const send = useCallback(async () => {
    if (!client) {
      setMessages(prev => [
        ...prev,
        { id: uid('assistant'), role: 'assistant', kind: 'error', content: 'Access token missing.' }
      ])
      return
    }
    if (!input.trim()) return
    if (isGenerating) return

    const userText = input.trim()
    setInput('')
    await sendPrompt(userText)
  }, [client, input, isGenerating, sendPrompt])

  const sendText = useCallback(
    async (text: string) => {
      await sendPrompt(String(text || '').trim())
    },
    [sendPrompt]
  )

  const startUseCase = useCallback(
    async (useCase: UseCaseTemplate) => {
      if (!client) return
      if (isGenerating) return
      const kickoff = getUseCaseKickoffPrompt(useCase)
      const context = getUseCaseContext(useCase)
      setInput('')
      await sendPrompt(`${kickoff}\n\nDETAILS:\n${context}`, undefined, kickoff)
    },
    [client, getUseCaseContext, getUseCaseKickoffPrompt, isGenerating, sendPrompt]
  )

  const setClarifyAnswer = useCallback((questionId: string, update: Partial<ClarifyWizardAnswer>) => {
    setClarifyWizard(prev => {
      if (!prev) return prev
      const qid = String(questionId || '').trim()
      if (!qid) return prev
      const prevAns = prev.answers[qid] || {}
      return { ...prev, answers: { ...prev.answers, [qid]: { ...prevAns, ...update } } }
    })
  }, [])

  const goClarifyBack = useCallback(() => {
    setClarifyWizard(prev => {
      if (!prev) return prev
      return { ...prev, index: Math.max(0, prev.index - 1) }
    })
  }, [])

  const goClarifyNext = useCallback(() => {
    setClarifyWizard(prev => {
      if (!prev) return prev
      return { ...prev, index: Math.min(prev.questions.length - 1, prev.index + 1) }
    })
  }, [])

  const submitClarify = useCallback(async () => {
    const wiz = clarifyWizard
    if (!wiz) return

    const getValue = (id: string) => {
      const q = wiz.questions.find(q => q.id === id)
      const ans = wiz.answers[id]
      const selectedValue = String(ans?.selectedOptionValue || '').trim()
      const selectedLabel =
        selectedValue && q?.optionsV2?.length ? q.optionsV2.find(o => o && o.value === selectedValue)?.label : undefined
      const selected = String(selectedLabel || ans?.selectedOption || selectedValue || '').trim()
      const free = String(ans?.freeText || '').trim()
      return { selected, free, value: (free || selected).trim() }
    }

    const auth = getValue('auth')
    const config = getValue('config')
    const goal = getValue('goal')
    const integrationNotes = getValue('integrationNotes')

    const lines: string[] = []
    if (goal.value) lines.push(`Goal: ${goal.value}`)
    if (auth.value) lines.push(`Auth: ${auth.value}`)
    if (config.value) lines.push(`Config keys (UPPERCASE): ${config.value}`)
    if (integrationNotes.value) lines.push(`Integration notes: ${integrationNotes.value}`)

    let docSource: FunctionAssistantDocSource | undefined
    const structuredAnswers: FunctionAssistantAnswers = {}
    for (const q of wiz.questions) {
      const ans = wiz.answers[q.id]
      const selectedOption = String(ans?.selectedOption || '').trim()
      const selectedOptionValue = String(ans?.selectedOptionValue || '').trim()
      const selectedOptionId = String(ans?.selectedOptionId || '').trim()
      const freeText = String(ans?.freeText || '').trim()
      if (!selectedOption && !selectedOptionValue && !freeText) continue
      structuredAnswers[q.id] = {
        selectedOption: selectedOption || undefined,
        selectedOptionValue: selectedOptionValue || undefined,
        selectedOptionId: selectedOptionId || undefined,
        freeText: freeText || undefined
      }
    }

    // Optional: derive a docSource from the stable docs option value/meta.
    const docsAns = structuredAnswers.docs
    const docsQ = wiz.questions.find(q => q.id === 'docs')
    const docsOpt =
      docsQ?.optionsV2 && docsAns?.selectedOptionValue
        ? docsQ.optionsV2.find(o => o && o.value === docsAns.selectedOptionValue)
        : undefined
    const docsType = docsOpt?.meta?.docSourceType
    const docsFree = String(docsAns?.freeText || '').trim()
    if (docsType === 'url' && docsFree) docSource = { type: 'url', url: docsFree }
    if (docsType === 'openapiDirectory' && docsFree) docSource = { type: 'openapiDirectory', name: docsFree }
    if (docsType === 'content' && docsFree) docSource = { type: 'content', content: docsFree }

    // Include any additional answers as "<id>: <value>"
    for (const q of wiz.questions) {
      if (q.id === 'docs' || q.id === 'auth' || q.id === 'config' || q.id === 'goal') continue
      const extra = getValue(q.id)
      if (!extra.value) continue
      lines.push(`${q.id}: ${extra.value}`)
    }

    // Persist submitted answers on the clarify message so it can render read-only selections in history.
    const submittedAnswers: Record<
      string,
      { selectedOptionLabel?: string; selectedOptionValue?: string; freeTextPreview?: string; hasFreeText?: boolean }
    > = {}
    for (const q of wiz.questions) {
      const ans = wiz.answers[q.id]
      const selectedValue = String(ans?.selectedOptionValue || '').trim() || undefined
      const selectedLabel = (() => {
        if (selectedValue && q.optionsV2 && q.optionsV2.length) {
          const opt = q.optionsV2.find(o => o && o.value === selectedValue)
          return opt?.label
        }
        return String(ans?.selectedOption || '').trim() || undefined
      })()
      const freeText = String(ans?.freeText || '').trim()
      const hasFreeText = Boolean(freeText)
      const preview = !hasFreeText ? undefined : freeText.length > 240 ? `${freeText.slice(0, 240)}…` : freeText
      submittedAnswers[q.id] = {
        selectedOptionLabel: selectedLabel,
        selectedOptionValue: selectedValue,
        freeTextPreview: preview,
        hasFreeText
      }
    }
    setMessages(prev =>
      prev.map(m => {
        if (m.kind !== 'clarify') return m
        if (m.id !== wiz.messageId) return m
        return { ...m, submittedAnswers }
      })
    )

    setClarifyWizard(null)
    if (lines.length === 0) return
    await sendPrompt(lines.join('\n'), docSource, undefined, structuredAnswers)
  }, [clarifyWizard, sendPrompt])

  const fixTest = useCallback(
    async (args: AssistantFixTestArgs) => {
      if (!client) {
        setMessages(prev => [
          ...prev,
          { id: uid('assistant'), role: 'assistant', kind: 'error', content: 'Access token missing.' }
        ])
        return
      }
      if (isGenerating) return
      const source = String(args?.source || '').trim()
      if (!source) return

      const thinkingId = uid('thinking')
      const startedAt = Date.now()
      setIsGenerating(true)
      const errorText = String(args?.lastError || '').trim()
      const resultText = String(args?.lastResult || '').trim()
      const frontendError = errorText || (resultText ? 'Non-200 response or failed test (see result).' : '')
      setMessages(prev => [
        ...prev,
        {
          id: uid('user'),
          role: 'user',
          kind: 'text',
          content:
            `Fix my failing test. Use my configured credentials from Settings (context.config) and make the function pass.\n` +
            `Last error: ${errorText || 'unknown'}`
        },
        {
          id: thinkingId,
          role: 'assistant',
          kind: 'thinking',
          content: 'Fixing function…',
          phase: 'fix',
          phases: ['fix']
        }
      ])

      try {
        const res = await client.functionAssistantIterate({
          instruction:
            args?.instruction ||
            'Fix the current function so that it passes the sandbox test for the given payload and configured credentials (context.config). Do not log or return secrets.',
          source,
          inputSchema: args?.inputSchema,
          outputSchema: args?.outputSchema,
          configKeys: args?.configKeys,
          payload: args?.payload,
          frontendError: frontendError || undefined,
          frontendResult: resultText || undefined,
          maxFixIterations: 2
        })

        // Auto-apply fixes to the editor; user can undo in the editor UI.
        onApply(res)

        const changedTabs: Array<'source' | 'inputSchema' | 'outputSchema' | 'settings'> = []
        if (String(args?.source || '').trim() !== String(res?.source || '').trim()) changedTabs.push('source')
        if (JSON.stringify(args?.inputSchema || {}) !== JSON.stringify(res?.inputSchema || {}))
          changedTabs.push('inputSchema')
        if (JSON.stringify(args?.outputSchema || {}) !== JSON.stringify(res?.outputSchema || {}))
          changedTabs.push('outputSchema')
        const oldKeys = Array.isArray(args?.configKeys) ? args.configKeys : Object.keys(args?.config || {})
        const newKeys = Array.isArray(res?.configKeys) ? res.configKeys : []
        const oldSet = new Set(
          oldKeys
            .map(k =>
              String(k || '')
                .trim()
                .toUpperCase()
            )
            .filter(Boolean)
        )
        const newSet = new Set(
          newKeys
            .map(k =>
              String(k || '')
                .trim()
                .toUpperCase()
            )
            .filter(Boolean)
        )
        const keysChanged =
          oldSet.size !== newSet.size ||
          Array.from(oldSet).some(k => !newSet.has(k)) ||
          Array.from(newSet).some(k => !oldSet.has(k))
        if (keysChanged) changedTabs.push('settings')

        setMessages(prev => {
          const withoutThinking = prev.filter(m => m.id !== thinkingId)
          return [
            ...withoutThinking,
            {
              id: uid('assistant'),
              role: 'assistant',
              kind: 'draft',
              draft: res,
              hint: res?.notes || 'Applied to editor. You can undo the change in the editor.',
              applied: true,
              implementationSummary: buildImplementationSummary(res),
              changedTabs,
              durationMs: Date.now() - startedAt
            }
          ]
        })
      } catch (e) {
        setMessages(prev => {
          const withoutThinking = prev.filter(m => m.id !== thinkingId)
          return [
            ...withoutThinking,
            {
              id: uid('assistant'),
              role: 'assistant',
              kind: 'error',
              content: summarizeAssistantError(e)
            }
          ]
        })
      } finally {
        setIsGenerating(false)
      }
    },
    [buildImplementationSummary, client, isGenerating, onApply]
  )

  return {
    input,
    setInput,
    isGenerating,
    messages,
    activityLines,
    clarifyWizard,
    canSend,
    canRetryLast: Boolean(lastRequestRef.current) && !isGenerating,
    reset,
    send,
    sendText,
    retryLast,
    fixTest,
    applyDraft,
    insertExample,
    insertUseCase,
    startUseCase,
    setClarifyAnswer,
    goClarifyBack,
    goClarifyNext,
    submitClarify
  }
}
