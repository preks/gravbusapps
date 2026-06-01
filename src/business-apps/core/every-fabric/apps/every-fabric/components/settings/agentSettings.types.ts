export const SETTINGS_KEY = 'every-fabric-agent-settings'

export const AGENT_SETTINGS_CHANGED_EVENT = 'every-fabric-agent-settings-changed'

export interface AgentSettings {
  enableMemory: boolean
  enableReflection: 'adaptive' | 'always' | 'disabled'
  maxIterations?: number
  defaultSkillId?: string
  /** When true, show model picker, trace explorer, and debug trace tools. */
  devModeEnabled: boolean
}

export const DEFAULT_SETTINGS: AgentSettings = {
  enableMemory: true,
  enableReflection: 'adaptive',
  devModeEnabled: false
}

export interface MemoryEntry {
  key: string
  value: string
  namespace?: string
}

export const MEMORY_NAMESPACES = ['preferences', 'domain', 'skills'] as const
export type MemoryNamespace = (typeof MEMORY_NAMESPACES)[number]
