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
  /** Human-readable label for auto-learned entries (falls back to a prettified key). */
  title?: string
  /** ISO timestamp of the last update, used to show how recent an entry is. */
  updatedAt?: string
}

// Namespaces surfaced in the settings UI. `preferences` is human-curatable;
// `domain` and `skills` are populated automatically by the agent after sessions
// (when DEEP_AGENT_AUTO_LEARN is enabled). The `episodes` namespace exists in the
// backend too but is intentionally not shown here (raw per-session summaries).
export const MEMORY_NAMESPACES = ['preferences', 'domain', 'skills'] as const
export type MemoryNamespace = (typeof MEMORY_NAMESPACES)[number]

// Display labels. We relabel `skills` to "Patterns" so it does not collide with
// the separate Skills section elsewhere on the screen (different concept).
export const MEMORY_NAMESPACE_LABELS: Record<MemoryNamespace, string> = {
  preferences: 'Preferences',
  domain: 'Domain facts',
  skills: 'Patterns'
}

// Per-namespace empty-state copy explaining who fills it and how.
export const MEMORY_NAMESPACE_EMPTY: Record<MemoryNamespace, string> = {
  preferences:
    'No saved preferences yet. Add things you want the agent to remember, e.g. “reply in a short, direct style”.',
  domain:
    'No domain facts yet. The agent records reusable workspace facts here automatically after sessions (e.g. “Q1 ends March 31”).',
  skills: 'No patterns yet. The agent saves “what workflow worked for what task” here automatically after sessions.'
}
