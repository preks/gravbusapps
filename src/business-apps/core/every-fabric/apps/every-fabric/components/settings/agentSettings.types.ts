export const SETTINGS_KEY = 'every-fabric-agent-settings'

export interface AgentSettings {
  enableMemory: boolean
  enableReflection: 'adaptive' | 'always' | 'disabled'
  maxIterations?: number
  defaultSkillId?: string
}

export const DEFAULT_SETTINGS: AgentSettings = {
  enableMemory: true,
  enableReflection: 'adaptive'
}

export interface MemoryEntry {
  key: string
  value: string
  namespace?: string
}

export const MEMORY_NAMESPACES = ['preferences', 'domain', 'skills'] as const
export type MemoryNamespace = (typeof MEMORY_NAMESPACES)[number]
