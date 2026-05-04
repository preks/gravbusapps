// Maps agent source identifiers to display labels and badge styles.

interface SourceDisplay {
  label: string
  badgeClass: string
  description: string
}

const SOURCE_CONFIG: Record<string, SourceDisplay> = {
  prompt_odm: {
    label: 'Expert',
    badgeClass: 'gba:bg-blue-100 gba:text-blue-700',
    description: 'Created in the prompt-manager UI with custom prompts, tools, and knowledge sources.'
  },
  autonomous_agent: {
    label: 'Specialist',
    badgeClass: 'gba:bg-purple-100 gba:text-purple-700',
    description: 'LangGraph-powered specialist with typed tool configurations.'
  },
  builtin_subagent: {
    label: 'Built-in',
    badgeClass: 'gba:bg-amber-100 gba:text-amber-700',
    description: 'Code-defined template activated automatically by the Enterprise Agent based on your request.'
  }
}

const FALLBACK: SourceDisplay = {
  label: 'Unknown',
  badgeClass: 'gba:bg-muted gba:text-muted-foreground',
  description: ''
}

export function getSourceDisplay(source: string): SourceDisplay {
  return SOURCE_CONFIG[source] ?? FALLBACK
}

export function getAllSourceTypes(): Array<{ key: string } & SourceDisplay> {
  return Object.entries(SOURCE_CONFIG).map(([key, value]) => ({ key, ...value }))
}
