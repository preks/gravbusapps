import { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type {
  AIModelODM,
  AIServiceODM,
  PromptODM,
  WorkspaceODM,
  AgentType,
  ResponseStyle,
  CitationMode,
  KnowledgeSource,
  ToolPolicies
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { AgentBuilderState, AgentBuilderActions } from '../components/task-expert-builder/types'
import { useUnifiedCapabilitiesCatalog } from './useUnifiedCapabilitiesCatalog'

export interface UseAgentBuilderStateResult {
  state: AgentBuilderState
  actions: AgentBuilderActions
  catalogs: {
    workspaces: WorkspaceODM[]
    services: AIServiceODM[]
    models: AIModelODM[]
    capabilities: ReturnType<typeof useUnifiedCapabilitiesCatalog>['capabilities']
    capabilitiesLoading: boolean
    capabilitiesError: string | null
    reloadCapabilities: ReturnType<typeof useUnifiedCapabilitiesCatalog>['reload']
  }
  prompt: PromptODM | null
  isLoadingPrompt: boolean
  error: string | null
  setError: (e: string | null) => void
  isValid: boolean
}

export interface AgentBuilderInitialState {
  name?: string
  description?: string
  agentType?: AgentType
  specialty?: string
  responseStyle?: ResponseStyle
  citationMode?: CitationMode
  expertColor?: string
  isPublic?: boolean
  tags?: string[]
  knowledgeSources?: KnowledgeSource[]
}

export const useAgentBuilderState = (
  context: BusinessAppContextProps,
  mode: 'create' | 'edit',
  promptId?: string | null,
  onNameLoaded?: (name: string) => void,
  initialState?: AgentBuilderInitialState
): UseAgentBuilderStateResult => {
  const client = usePromptManagerClient(context.accessToken)

  // Loading states
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState<PromptODM | null>(null)

  // Core state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')
  const [agentType, setAgentType] = useState<AgentType>('flow')
  const [systemContent, setSystemContent] = useState('')
  const [userContent, setUserContent] = useState('')
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('conversational')
  const [citationMode, setCitationMode] = useState<CitationMode>('when_needed')
  const [specialty, setSpecialty] = useState('')
  const [expertColor, setExpertColor] = useState('#1890ff')
  const [isPublic, setIsPublic] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])
  const [selectedToolVersion, setSelectedToolVersion] = useState<Record<string, string>>({})
  const [toolPolicies, setToolPolicies] = useState<ToolPolicies>({})
  const [serviceId, setServiceId] = useState('')
  const [modelId, setModelId] = useState('')
  const [temperature, setTemperature] = useState(0)
  const [responseType, setResponseType] = useState<'text' | 'json'>('text')
  const [responseSchema, setResponseSchema] = useState('')
  const [decisionOptions, setDecisionOptions] = useState<string[]>([])
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([])
  const [agentCardDivision, setAgentCardDivision] = useState('')
  const [agentCardDataDomains, setAgentCardDataDomains] = useState('')
  const [agentCardCapabilities, setAgentCardCapabilities] = useState('')
  const [agentCardAccessPolicy, setAgentCardAccessPolicy] = useState('public')
  const [didApplyInitial, setDidApplyInitial] = useState(false)

  const normalizeEscapedNewlines = (v: string): string => {
    // Previous versions accidentally stored literal "\n" sequences.
    // Normalize to real newlines for display/editing.
    return String(v || '').replace(/\\n/g, '\n')
  }

  const getDecisionOptionsCanonical = (opts: string[]): string[] =>
    Array.from(new Set(opts.map(o => String(o ?? '').trim()).filter(Boolean)))

  const buildDecisionSystemContent = (opts: string[]): string => {
    const canonical = getDecisionOptionsCanonical(opts)
    const optionLines = canonical.length > 0 ? canonical.map(o => `- ${o}`).join('\n') : '- (no options configured)'

    return [
      'You are a Decision Expert for workflow branching.',
      '',
      'You will receive Decision instructions from the user. You MUST follow them.',
      '',
      'Allowed decisionResult values:',
      optionLines,
      '',
      'Return a JSON object that matches the provided JSON Schema.',
      '',
      'Rules:',
      '- decisionResult must be one of the allowed values',
      '- Always include reasoning as a concise explanation (1-3 sentences)',
      '- Always include escalate as true or false',
      '- If you cannot decide from the context, set escalate=true and explain why in reasoning',
      '- Always include confidence as a number between 0 and 1',
      '- Use higher confidence for clear matches and lower confidence for ambiguous cases'
    ].join('\n')
  }

  const buildDecisionSchema = (opts: string[]): string => {
    const enumVals = getDecisionOptionsCanonical(opts)
    const schema = {
      type: 'object',
      properties: {
        decisionResult: { type: 'string', enum: enumVals },
        reasoning: { type: 'string', minLength: 1 },
        escalate: { type: 'boolean' },
        escalationReason: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1 }
      },
      required: ['decisionResult', 'reasoning', 'escalate', 'confidence'],
      additionalProperties: true
    }
    return JSON.stringify(schema, null, 2)
  }

  const extractDecisionOptions = (schema: unknown): string[] => {
    if (!schema || typeof schema !== 'object') return []
    const props = (schema as any).properties
    const dr = props && typeof props === 'object' ? (props as any).decisionResult : null
    const en = dr && typeof dr === 'object' ? (dr as any).enum : null
    if (!Array.isArray(en)) return []
    return en.map(v => (typeof v === 'string' ? v : '')).filter(v => v !== '')
  }
  // Catalogs
  const [workspaces, setWorkspaces] = useState<WorkspaceODM[]>([])
  const [services, setServices] = useState<AIServiceODM[]>([])
  const [models, setModels] = useState<AIModelODM[]>([])
  const {
    capabilities,
    isLoading: capabilitiesLoading,
    error: capabilitiesError,
    reload: reloadCapabilities
  } = useUnifiedCapabilitiesCatalog(context)

  // Load static data
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [ws, sv] = await Promise.all([client.getWorkspaces({ limit: 100 }), client.getAiServices({ limit: 100 })])
        if (!mounted) return
        setWorkspaces(ws.data)
        setServices(sv.data)
        if (!workspaceId && ws.data.length > 0) {
          const defaultWs = ws.data.find(w => w.default && w._id)?._id
          const fallbackWs = ws.data.find(w => w._id)?._id
          setWorkspaceId(defaultWs || fallbackWs || '')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data')
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // Apply initial state for create mode (once)
  useEffect(() => {
    if (mode !== 'create' || didApplyInitial) return
    if (!initialState) return

    if (initialState.name) setName(prev => (prev.trim() ? prev : initialState.name || ''))
    if (initialState.description) setDescription(prev => (prev.trim() ? prev : initialState.description || ''))
    if (initialState.agentType) setAgentType(prev => (prev === 'flow' ? initialState.agentType || 'flow' : prev))
    if (initialState.specialty) setSpecialty(prev => (prev.trim() ? prev : initialState.specialty || ''))
    if (initialState.responseStyle)
      setResponseStyle(prev => (prev === 'conversational' ? initialState.responseStyle || 'conversational' : prev))
    if (initialState.citationMode)
      setCitationMode(prev => (prev === 'when_needed' ? initialState.citationMode || 'when_needed' : prev))
    if (initialState.expertColor)
      setExpertColor(prev => (prev === '#1890ff' ? initialState.expertColor || '#1890ff' : prev))
    if (typeof initialState.isPublic === 'boolean') setIsPublic(initialState.isPublic)
    if (initialState.tags && initialState.tags.length > 0)
      setTags(prev => (prev.length > 0 ? prev : initialState.tags || []))
    if (initialState.knowledgeSources && initialState.knowledgeSources.length > 0) {
      setKnowledgeSources(prev => (prev.length > 0 ? prev : initialState.knowledgeSources || []))
    }

    setDidApplyInitial(true)
  }, [mode, didApplyInitial, initialState])

  // Load models when service changes
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const md = await client.getAiModels({ serviceId: serviceId || null, limit: 100 })
        if (!mounted) return
        setModels(md.data)
        if (!modelId && md.data.length > 0) setModelId(md.data[0]._id || '')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load models')
      }
    })()
    return () => {
      mounted = false
    }
  }, [serviceId])

  // Load prompt for edit mode
  useEffect(() => {
    if (mode === 'edit' && promptId) {
      let mounted = true
      setIsLoadingPrompt(true)
      ;(async () => {
        try {
          const loadedPrompt = await client.getPrompt(promptId)
          if (!mounted) return
          setPrompt(loadedPrompt)
          if (loadedPrompt.name && onNameLoaded) onNameLoaded(loadedPrompt.name)

          // Populate state from prompt
          setName(loadedPrompt.name || '')
          setDescription(loadedPrompt.description || '')
          setWorkspaceId(loadedPrompt.workspace?.id || '')
          setModelId(loadedPrompt.model?.id || '')
          const loadedAgentType = loadedPrompt.agent_type || 'flow'
          setUserContent(
            loadedAgentType === 'decision'
              ? normalizeEscapedNewlines(loadedPrompt.user_content?.template || '')
              : loadedPrompt.user_content?.template || ''
          )
          setSystemContent(
            loadedAgentType === 'decision'
              ? normalizeEscapedNewlines(loadedPrompt.system_content?.template || '')
              : loadedPrompt.system_content?.template || ''
          )
          setAgentType(loadedPrompt.agent_type || 'flow')
          setSpecialty(loadedPrompt.specialty || '')
          setResponseStyle(loadedPrompt.response_style || 'conversational')
          setExpertColor(loadedPrompt.color || '#1890ff')
          setCitationMode(loadedPrompt.citation_mode || 'when_needed')
          setKnowledgeSources(loadedPrompt.knowledge_sources || [])
          setIsPublic(loadedPrompt.is_public || false)
          setTags(loadedPrompt.tags || [])
          setToolPolicies((loadedPrompt.toolPolicies || {}) as ToolPolicies)

          // Load Agent Card fields
          if (loadedPrompt.agent_card) {
            setAgentCardDivision(loadedPrompt.agent_card.division || '')
            setAgentCardDataDomains((loadedPrompt.agent_card.data_domains || []).join(', '))
            setAgentCardCapabilities((loadedPrompt.agent_card.capabilities || []).join(', '))
            setAgentCardAccessPolicy(loadedPrompt.agent_card.access_policy || 'public')
          }

          if (loadedPrompt.response_schema) {
            setResponseType('json')
            setResponseSchema(JSON.stringify(loadedPrompt.response_schema, null, 2))
          }
          if (loadedPrompt.agent_type === 'decision') {
            setDecisionOptions(extractDecisionOptions(loadedPrompt.response_schema))
          } else {
            setDecisionOptions([])
          }

          // Parse tool codes
          if (loadedPrompt.tools) {
            const toolCodes =
              typeof loadedPrompt.tools === 'string'
                ? loadedPrompt.tools
                    .split(',')
                    .map(t => t.trim())
                    .filter(Boolean)
                : loadedPrompt.tools
            const toolIds = capabilities.filter(c => toolCodes.includes(c.code)).map(c => c.id)
            setSelectedToolIds(toolIds)
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to load agent')
        } finally {
          if (mounted) setIsLoadingPrompt(false)
        }
      })()
      return () => {
        mounted = false
      }
    }
  }, [mode, promptId, capabilities])
  // Decision Expert enforcement (UI-level)
  useEffect(() => {
    if (agentType !== 'decision') return
    if (responseType !== 'json') setResponseType('json')
    if (decisionOptions.length === 0) setDecisionOptions([''])

    const nextSystem = buildDecisionSystemContent(decisionOptions)
    if (systemContent !== nextSystem) setSystemContent(nextSystem)

    // Keep response schema canonical for decision experts.
    setResponseSchema(buildDecisionSchema(decisionOptions))
  }, [agentType, decisionOptions, responseType, systemContent])

  // Validation
  const isValid = useMemo(() => {
    if (!name || !workspaceId || !modelId || !userContent) return false
    if (agentType === 'everyai' && !specialty) return false
    if (agentType === 'decision') {
      if (responseType !== 'json') return false
      const trimmed = decisionOptions.map(o => String(o ?? '').trim()).filter(Boolean)
      if (trimmed.length === 0) return false
      if (new Set(trimmed).size !== trimmed.length) return false
      if (!userContent.includes('{context}')) return false
    }
    return true
  }, [name, workspaceId, modelId, userContent, agentType, specialty, responseType, decisionOptions])

  const state: AgentBuilderState = {
    name,
    description,
    workspaceId,
    agentType,
    systemContent,
    userContent,
    responseStyle,
    citationMode,
    specialty,
    expertColor,
    isPublic,
    tags,
    selectedToolIds,
    selectedToolVersion,
    toolPolicies,
    agentCardDivision,
    agentCardDataDomains,
    agentCardCapabilities,
    agentCardAccessPolicy,
    serviceId,
    modelId,
    temperature,
    responseType,
    responseSchema,
    decisionOptions,
    knowledgeSources
  }

  const actions: AgentBuilderActions = {
    setName,
    setDescription,
    setWorkspaceId,
    setAgentType,
    setSystemContent,
    setUserContent,
    setResponseStyle,
    setCitationMode,
    setSpecialty,
    setExpertColor,
    setIsPublic,
    setTags,
    setSelectedToolIds,
    setSelectedToolVersion,
    setToolPolicies,
    setAgentCardDivision,
    setAgentCardDataDomains,
    setAgentCardCapabilities,
    setAgentCardAccessPolicy,
    setServiceId,
    setModelId,
    setTemperature,
    setResponseType,
    setResponseSchema,
    setDecisionOptions,
    setKnowledgeSources
  }

  const createWorkspace = useCallback(
    async (wsName: string) => {
      const created = await client.createWorkspace({ name: wsName, default: false })
      setWorkspaces(prev => [...prev, created])
      setWorkspaceId(String(created._id))
      return created
    },
    [client]
  )

  const catalogs = {
    workspaces,
    services,
    models,
    capabilities,
    capabilitiesLoading,
    capabilitiesError,
    reloadCapabilities,
    createWorkspace
  }

  return { state, actions, catalogs, prompt, isLoadingPrompt, error, setError, isValid }
}

export default useAgentBuilderState
