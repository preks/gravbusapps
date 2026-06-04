// Agent Authoring Standard — shared compliance checks.
//
// Encodes the must-follow rules from
// `enterprise-agents-brain/standards/agent-authoring-standard.md` so the create
// and config surfaces can guide authors toward agents that actually work:
// a real system prompt, at least one skill, and skills that have tools.
//
// The three layers must reinforce each other:
//   System prompt = WHO · Skill = HOW · Tool = WHAT.

/** Minimum system prompt length (chars) we accept on create. Below this the
 *  prompt is a one-liner and the agent is effectively useless. */
export const SYSTEM_PROMPT_MIN_LENGTH = 80

/** Length (chars) below which we still warn even though it passes the hard gate. */
export const SYSTEM_PROMPT_RECOMMENDED_LENGTH = 200

const IDENTITY_RE = /\byou are\b/i
const CONSTRAINT_RE = /\b(must|never|always|do not|don't|refuse|important)\b/i

export interface SystemPromptSignals {
  length: number
  /** Declares an identity ("You are …"). */
  hasIdentity: boolean
  /** States at least one hard constraint (MUST / NEVER / Refuse / …). */
  hasConstraints: boolean
  /** Has multiple lines / sections rather than a single sentence. */
  hasStructure: boolean
  /** Meets the recommended length for a substantial prompt. */
  isSubstantial: boolean
  /** Passes the hard minimum required to create an agent. */
  meetsMinimum: boolean
  /** 0–4 quality signals satisfied. */
  score: number
}

/** Evaluate a system prompt against the standard's quality signals. */
export function evaluateSystemPrompt(text: string): SystemPromptSignals {
  const value = (text ?? '').trim()
  const length = value.length
  const hasIdentity = IDENTITY_RE.test(value)
  const hasConstraints = CONSTRAINT_RE.test(value)
  const hasStructure = value.includes('\n') || length >= SYSTEM_PROMPT_RECOMMENDED_LENGTH
  const isSubstantial = length >= SYSTEM_PROMPT_RECOMMENDED_LENGTH
  const score = [hasIdentity, hasConstraints, hasStructure, isSubstantial].filter(Boolean).length
  return {
    length,
    hasIdentity,
    hasConstraints,
    hasStructure,
    isSubstantial,
    meetsMinimum: length >= SYSTEM_PROMPT_MIN_LENGTH,
    score
  }
}

/** Minimum description length (chars) we accept. Below this the description is
 *  too thin to help routing/discovery (description is the #1 selection signal). */
export const DESCRIPTION_MIN_LENGTH = 40

/** A strong, keyword-rich example description shown to authors on both surfaces. */
export const DESCRIPTION_EXAMPLE =
  'Resolves internal employee support tickets: routes issues to the right person or team, looks up ' +
  'employees and org structure, sends emails and Blink notifications, and schedules meetings.'

/** Inline hint for the agent name field. */
export const NAME_HINT =
  'Use a clear, specific name — it is matched when routing picks an agent and is the exact handle used to invoke it.'

/** Inline hint for the specialty field. */
export const SPECIALTY_HINT =
  'The domain this agent owns (e.g. "Employee support", "Procurement"). Used as a routing/discovery signal.'

export interface DescriptionSignals {
  length: number
  /** Passes the hard minimum required to create/save. */
  meetsMinimum: boolean
  /** Description is more than just a restatement of the name. */
  notJustName: boolean
  /** Has enough words to carry real domain vocabulary. */
  isSpecific: boolean
  /** All gates satisfied (safe to save). */
  isValid: boolean
}

/** Evaluate a description for quality. `name` (optional) lets us detect the
 *  common "description == name" anti-pattern. */
export function evaluateDescription(text: string, name?: string): DescriptionSignals {
  const value = (text ?? '').trim()
  const length = value.length
  const wordCount = value ? value.split(/\s+/).filter(Boolean).length : 0
  const meetsMinimum = length >= DESCRIPTION_MIN_LENGTH

  const normalizedName = (name ?? '').replace(/_/g, ' ').trim().toLowerCase()
  const normalizedValue = value.toLowerCase()
  const notJustName =
    !!value &&
    (normalizedName.length === 0 ||
      (normalizedValue !== normalizedName && normalizedValue.length > normalizedName.length + 8))

  const isSpecific = wordCount >= 6
  return {
    length,
    meetsMinimum,
    notJustName,
    isSpecific,
    isValid: meetsMinimum && notJustName
  }
}

export type ComplianceLevel = 'pass' | 'warn' | 'fail'

export interface ComplianceCheck {
  id: 'system_prompt' | 'has_skill' | 'skills_have_tools'
  label: string
  level: ComplianceLevel
  hint: string
}

export interface AgentComplianceInput {
  systemPrompt: string | null | undefined
  skillCount: number
  /** Names/ids of assigned skills that have no tools attached. */
  skillsWithoutTools: string[]
  /** True while we still don't know a skill's tools (avoid false "fail"). */
  toolsUnknown?: boolean
}

export interface AgentCompliance {
  checks: ComplianceCheck[]
  level: ComplianceLevel
  /** Number of checks at 'pass'. */
  passed: number
  total: number
}

/** System-prompt compliance: needs a real prompt with substance and hard constraints. */
function buildSystemPromptCheck(prompt: SystemPromptSignals): ComplianceCheck {
  const base = { id: 'system_prompt', label: 'System prompt' } as const
  if (!prompt.meetsMinimum) {
    return {
      ...base,
      level: 'fail',
      hint: 'Add a real system prompt: identity, capabilities, MUST/NEVER constraints, output.'
    }
  }
  if (!prompt.isSubstantial) {
    return { ...base, level: 'warn', hint: 'Prompt is thin. Add capabilities, constraints, and output expectations.' }
  }
  if (!prompt.hasConstraints) {
    return {
      ...base,
      level: 'warn',
      hint: 'Add hard constraints (MUST / NEVER / Refuse) so the agent stays in bounds.'
    }
  }
  return { ...base, level: 'pass', hint: 'Identity, constraints, and detail present.' }
}

/** Skill-count compliance: at least one skill must be assigned. */
function buildHasSkillCheck(skillCount: number): ComplianceCheck {
  const base = { id: 'has_skill', label: 'At least one skill' } as const
  if (skillCount > 0) {
    return { ...base, level: 'pass', hint: `${skillCount} skill${skillCount === 1 ? '' : 's'} assigned.` }
  }
  return { ...base, level: 'fail', hint: 'Assign at least one skill — skills are how the agent performs work.' }
}

/**
 * Tool-coverage compliance. Lenient rule: an agent is fine as long as at least
 * one of its skills provides tools. Having some tool-less skills among several
 * is acceptable (e.g. 1 of 7 with tools), so we only warn when NO skill has
 * tools — partial coverage passes with an informational hint.
 */
function buildSkillsHaveToolsCheck(input: AgentComplianceInput): ComplianceCheck {
  const base = { id: 'skills_have_tools', label: 'Skills have tools' } as const
  if (input.skillCount === 0) {
    return { ...base, level: 'fail', hint: 'No skills yet, so no tools are wired up.' }
  }
  if (input.toolsUnknown) {
    return { ...base, level: 'warn', hint: 'Checking which tools each skill provides…' }
  }
  const skillsWithTools = Math.max(0, input.skillCount - input.skillsWithoutTools.length)
  if (skillsWithTools === 0) {
    return {
      ...base,
      level: 'warn',
      hint: 'None of the assigned skills provide tools yet. Add tools to at least one skill.'
    }
  }
  if (input.skillsWithoutTools.length > 0) {
    return {
      ...base,
      level: 'pass',
      hint: `${skillsWithTools} of ${input.skillCount} skills provide tools. Optionally add tools to: ${input.skillsWithoutTools.join(', ')}.`
    }
  }
  return { ...base, level: 'pass', hint: 'Every assigned skill provides at least one tool.' }
}

/** Worst level wins: any fail → fail, otherwise any warn → warn, otherwise pass. */
function rollUpComplianceLevel(checks: ComplianceCheck[]): ComplianceLevel {
  if (checks.some(c => c.level === 'fail')) return 'fail'
  if (checks.some(c => c.level === 'warn')) return 'warn'
  return 'pass'
}

/** Roll up the agent's standard compliance from its prompt, skills, and tools. */
export function evaluateAgentCompliance(input: AgentComplianceInput): AgentCompliance {
  const prompt = evaluateSystemPrompt(input.systemPrompt ?? '')
  const checks = [
    buildSystemPromptCheck(prompt),
    buildHasSkillCheck(input.skillCount),
    buildSkillsHaveToolsCheck(input)
  ]
  return {
    checks,
    level: rollUpComplianceLevel(checks),
    passed: checks.filter(c => c.level === 'pass').length,
    total: checks.length
  }
}

/** Below this system-prompt length (chars) an agent card is flagged "not ready"
 *  (roughly under two short sentences). Tunable; intentionally lower than the
 *  recommended length so we only flag genuinely thin prompts. */
export const CARD_READY_PROMPT_MIN_LENGTH = 120

export interface AgentReadinessInput {
  skillCount: number
  toolsInSkillsCount: number
  /** System prompt length in chars; null/undefined when unknown (skip the prompt check). */
  systemPromptLength?: number | null
}

export interface AgentReadiness {
  ready: boolean
  reasons: string[]
}

/** Card-level readiness for the "Incomplete setup" badge. Lenient by design:
 *  an agent is flagged only if it has no skill at all, NONE of its skills carry
 *  any tools, or its system prompt is too thin. Partial tool coverage (e.g. 1
 *  of several skills has tools) is considered ready. */
export function evaluateAgentReadiness(input: AgentReadinessInput): AgentReadiness {
  const reasons: string[] = []
  if (input.skillCount <= 0) reasons.push('No skill assigned')
  else if (input.toolsInSkillsCount <= 0) reasons.push('Skills have no tools')
  if (input.systemPromptLength != null && input.systemPromptLength < CARD_READY_PROMPT_MIN_LENGTH) {
    reasons.push('System prompt is too thin')
  }
  return { ready: reasons.length === 0, reasons }
}

/** A standard-compliant starter system prompt for the create flow. */
export function buildSystemPromptTemplate(displayName: string, specialty: string): string {
  const name = displayName.trim() || 'this agent'
  const domain = specialty.trim() || 'its domain'
  return [
    `You are ${name}, an expert in ${domain}. Your mission is to <one-line mission>.`,
    '',
    'Capabilities:',
    '- You handle requests end to end by following your assigned skills.',
    '- You work through the tools your skills provide; you do not act outside them.',
    '',
    'Constraints:',
    '- IMPORTANT: You MUST <most important hard rule>.',
    '- You NEVER <forbidden action>.',
    '- If the request is ambiguous, STOP and ask for clarification.',
    '',
    'Output:',
    '- Be concise. Cite sources when relevant.',
    '- IMPORTANT: <repeat the single most critical rule here>.'
  ].join('\n')
}
