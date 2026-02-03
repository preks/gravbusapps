import type {
  AgentType,
  ResponseStyle,
  CitationMode,
  KnowledgeSource,
  WorkspaceODM,
  AIServiceODM,
  AIModelODM
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Unified tool representation for the capabilities catalog
 */
export interface UnifiedCapability {
  id: string
  code: string
  name: string
  description?: string | null
  kind: 'internal' | 'function' | 'mcp'
  category?: string
  supportsVersion: boolean
  sourceMeta?: {
    functionId?: string
    mcpUrl?: string
    transport?: 'http' | 'sse' | 'websocket'
    promptManagerToolId?: string
    internal?: boolean
  }
}

/**
 * Shared state for the Agent Builder tabs
 */
export interface AgentBuilderState {
  // Core identity
  name: string
  description: string
  workspaceId: string
  agentType: AgentType

  // Behavior
  systemContent: string
  userContent: string
  responseStyle: ResponseStyle
  citationMode: CitationMode

  // EveryAI specific
  specialty: string
  expertColor: string
  isPublic: boolean
  tags: string[]

  // Capabilities
  selectedToolIds: string[]
  selectedToolVersion: Record<string, string>

  // Advanced
  serviceId: string
  modelId: string
  temperature: number
  responseType: 'text' | 'json'
  responseSchema: string
  knowledgeSources: KnowledgeSource[]
}

/**
 * Actions to update the Agent Builder state
 */
export interface AgentBuilderActions {
  setName: (v: string) => void
  setDescription: (v: string) => void
  setWorkspaceId: (v: string) => void
  setAgentType: (v: AgentType) => void
  setSystemContent: (v: string) => void
  setUserContent: (v: string) => void
  setResponseStyle: (v: ResponseStyle) => void
  setCitationMode: (v: CitationMode) => void
  setSpecialty: (v: string) => void
  setExpertColor: (v: string) => void
  setIsPublic: (v: boolean) => void
  setTags: (v: string[]) => void
  setSelectedToolIds: (v: string[]) => void
  setSelectedToolVersion: (v: Record<string, string>) => void
  setServiceId: (v: string) => void
  setModelId: (v: string) => void
  setTemperature: (v: number) => void
  setResponseType: (v: 'text' | 'json') => void
  setResponseSchema: (v: string) => void
  setKnowledgeSources: (v: KnowledgeSource[]) => void
}

/**
 * Catalog data available to tabs
 */
export interface AgentBuilderCatalogs {
  workspaces: WorkspaceODM[]
  services: AIServiceODM[]
  models: AIModelODM[]
  capabilities: UnifiedCapability[]
  capabilitiesLoading: boolean
  capabilitiesError: string | null
  reloadCapabilities: () => Promise<void>
}

/**
 * Props shared by all tab components
 */
export interface TabProps {
  context: BusinessAppContextProps
  state: AgentBuilderState
  actions: AgentBuilderActions
  catalogs: AgentBuilderCatalogs
  mode: 'create' | 'edit'
  promptId?: string | null
}
