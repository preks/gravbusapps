/**
 * Friendly labels for the canonical tool categories.
 *
 * The picker UX is the only place these labels live — the backend
 * resolver continues to emit the raw category id (``hr``, ``crm``,
 * ``irm``, …) sourced from the existing
 * :data:`CATEGORY_TO_TOOL_NAMES` taxonomy in the deep agent's policy
 * layer. Keeping the labels client-side avoids round-tripping
 * presentation strings through the API and keeps i18n changes scoped
 * to the frontend.
 *
 * Design principle (per the team rules): the picker groups tools by
 * **business domain** — what the user is trying to do — rather than by
 * **provider** — who happens to ship the implementation. Source
 * (``flowbot``, ``functions``, ``prompt_manager``, ``mcp``,
 * ``builtin``) appears only as a small per-row hint, never as a
 * primary navigation control.
 */

export const TOOL_CATEGORY_LABELS: Record<string, string> = {
  // High-priority business domains (most common selections).
  hr: 'HR & Employees',
  crm: 'CRM',
  irm: 'Investments',
  office: 'Office & Intranet',
  flow: 'Flows & Automations',
  flowbot_actions: 'Business Actions',
  expert: 'Experts',
  create_expert: 'Create Expert',
  documents: 'Documents',
  knowledge: 'Knowledge',
  email: 'Email',
  meeting: 'Meetings',
  calendar: 'Calendar',
  analytics: 'Analytics',
  commerce: 'Commerce',
  service: 'Service Desk',
  charts: 'Charts',
  web: 'Web',
  // Connectors / advanced surfaces.
  mcp: 'MCP Connectors',
  structured_connectors: 'Structured Data',
  unstructured_connectors: 'Unstructured Data',
  // Agent-runtime baselines (rarely need to be picked manually but kept
  // visible so the catalog is not lying about what is available).
  control: 'Control & Approval',
  memory: 'Memory',
  session_documents: 'Session Documents',
  policies: 'Policies',
  graphql: 'GraphQL (advanced)',
  // Catch-all bucket — stays last in display order.
  uncategorized: 'Other'
}

/**
 * Display order for the category pill row and the grouped sections.
 *
 * Buckets up top reflect the most common author intents (HR, CRM,
 * documents, flows, …); advanced/baseline buckets sit further down so
 * they don't crowd the primary navigation.
 */
export const TOOL_CATEGORY_ORDER: ReadonlyArray<string> = [
  'hr',
  'crm',
  'irm',
  'office',
  'flow',
  'flowbot_actions',
  'documents',
  'knowledge',
  'email',
  'meeting',
  'calendar',
  'charts',
  'analytics',
  'commerce',
  'service',
  'web',
  'expert',
  'create_expert',
  'mcp',
  'structured_connectors',
  'unstructured_connectors',
  'policies',
  'control',
  'memory',
  'session_documents',
  'graphql',
  'uncategorized'
]

const CATEGORY_RANK: ReadonlyMap<string, number> = new Map(TOOL_CATEGORY_ORDER.map((cat, idx) => [cat, idx]))

const RANK_TAIL = TOOL_CATEGORY_ORDER.length

/**
 * Friendly label for a category id. Unknown categories fall back to a
 * Title-Cased version of the raw id so a backend-side change cannot
 * accidentally hide tools from the UI — they will just show under
 * their raw label until the frontend ships the matching translation.
 */
export const formatCategoryLabel = (category: string | null | undefined): string => {
  if (!category) return TOOL_CATEGORY_LABELS.uncategorized
  const known = TOOL_CATEGORY_LABELS[category]
  if (known) return known
  return category
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

/**
 * Stable comparator for category ids — known categories follow
 * :data:`TOOL_CATEGORY_ORDER`, unknown ones fall back to alphabetical
 * order at the tail. The ``uncategorized`` sentinel is always last.
 */
export const compareToolCategories = (a: string, b: string): number => {
  const ra = CATEGORY_RANK.get(a) ?? RANK_TAIL
  const rb = CATEGORY_RANK.get(b) ?? RANK_TAIL
  if (ra !== rb) return ra - rb
  return a.localeCompare(b)
}

/**
 * Human-facing tool label. Prefers the backend's ``display_name``; falls
 * back to humanizing the canonical (runtime) name for responses from an
 * older backend. Mirrors the server-side derivation: strip the
 * source-history prefix (``newwork_``, ``function_``, …), swap underscores
 * for spaces, sentence-case. Never derives from ``tool_ref`` so the runtime
 * name stays an implementation detail.
 */
export const formatToolDisplayName = (displayName: string | null | undefined, canonicalName: string): string => {
  const provided = (displayName ?? '').trim()
  if (provided) return provided
  const stripped = canonicalName.replace(/^(newwork_|enterprise_|function_|builtin_)/, '')
  const spaced = stripped.replace(/_/g, ' ').trim()
  if (!spaced) return canonicalName
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Presentation label for the canonical entry's ``source`` field. */
export const formatToolSourceLabel = (source: string): string => {
  if (source === 'functions') return 'Tools'
  if (source === 'prompt_manager') return 'Native'
  if (source === 'flowbot') return 'FlowBot'
  if (source === 'mcp') return 'MCP'
  if (source === 'builtin') return 'Built-in'
  return source.charAt(0).toUpperCase() + source.slice(1)
}
