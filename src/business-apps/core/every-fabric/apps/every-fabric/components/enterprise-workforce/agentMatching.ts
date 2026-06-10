// Lightweight heuristic for matching an agent to a free-text task
// description ("Find me an agent that…").
//
// Why not a real LLM call? Two reasons:
//   - Instant feedback (no network round-trip while typing / on enter).
//   - The workforce surface is small (low tens at most) so a weighted
//     token-overlap score works well in practice.
//
// Weights are tuned so a token hit in the agent's name dominates a tag
// hit, which in turn dominates a description hit. This matches how
// people actually phrase tasks ("translate", "summarise", "schedule").

export interface RankableAgent {
  id: string
  name: string
  specialty?: string | null
  domain?: string | null
  description?: string | null
  tags: string[]
}

export interface AgentMatch<TAgent extends RankableAgent = RankableAgent> {
  agent: TAgent
  score: number
  /** 0-100 normalised score for UI. */
  confidence: number
}

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'and',
  'or',
  'but',
  'i',
  'me',
  'we',
  'us',
  'you',
  'they',
  'need',
  'needs',
  'want',
  'wants',
  'help',
  'helps',
  'with',
  'to',
  'for',
  'on',
  'in',
  'of',
  'my',
  'our',
  'how',
  'do',
  'does',
  'can',
  'should',
  'would',
  'will',
  'be',
  'have',
  'has',
  'at',
  'by',
  'from',
  'that',
  'this',
  'these',
  'those',
  'it',
  'its',
  'as'
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t))
}

function uniqueTokens(text: string): Set<string> {
  return new Set(tokenize(text))
}

const WEIGHT_NAME = 6
const WEIGHT_SPECIALTY = 4
const WEIGHT_TAG = 3
const WEIGHT_DESCRIPTION = 1

export function scoreAgent(agent: RankableAgent, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0
  const nameTokens = uniqueTokens(agent.name)
  const specialtyTokens = uniqueTokens([agent.specialty ?? '', agent.domain ?? ''].join(' '))
  const tagTokens = uniqueTokens(agent.tags.join(' '))
  const descTokens = uniqueTokens(agent.description ?? '')

  let score = 0
  for (const token of queryTokens) {
    if (nameTokens.has(token)) score += WEIGHT_NAME
    if (specialtyTokens.has(token)) score += WEIGHT_SPECIALTY
    if (tagTokens.has(token)) score += WEIGHT_TAG
    if (descTokens.has(token)) score += WEIGHT_DESCRIPTION
  }
  return score
}

export function rankAgents<TAgent extends RankableAgent>(agents: TAgent[], query: string): AgentMatch<TAgent>[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []

  const scored = agents
    .map(agent => ({ agent, score: scoreAgent(agent, tokens) }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return []

  // Normalise: best match becomes 100, others scale relative to it. This
  // is more meaningful than a raw score because it tells the user "this
  // is the strongest available match" even when no agent is a perfect fit.
  const top = scored[0].score
  return scored.map(({ agent, score }) => ({
    agent,
    score,
    confidence: Math.round((score / top) * 100)
  }))
}
