import type { FabricAgent } from '../../agents/agentTypes'
import { rankAgents, scoreAgent, tokenize } from '../agentMatching'

function makeAgent(overrides: Partial<FabricAgent>): FabricAgent {
  return {
    id: overrides.id ?? 'a',
    name: overrides.name ?? 'agent',
    description: overrides.description ?? '',
    agent_type: 'expert',
    specialty: overrides.specialty ?? null,
    domain: overrides.domain ?? null,
    avatar: null,
    color: '#000',
    is_public: true,
    tags: overrides.tags ?? [],
    tools_count: 0,
    knowledge_sources_count: 0,
    skill_ids: [],
    skills_count: 0,
    source: 'prompt_odm',
    status: 'active',
    created_at: null
  }
}

describe('tokenize', () => {
  it('lowercases, strips punctuation and removes short stopwords', () => {
    expect(tokenize('Translate this email to French!')).toEqual(['translate', 'email', 'french'])
  })

  it('handles snake_case and dashes', () => {
    expect(tokenize('translate_text email-summary')).toEqual(['translate', 'text', 'email', 'summary'])
  })

  it('returns empty array for whitespace only', () => {
    expect(tokenize('   ')).toEqual([])
  })
})

describe('scoreAgent', () => {
  it('weighs name hits highest, description hits lowest', () => {
    const nameAgent = makeAgent({ id: 'n', name: 'translate text' })
    const descAgent = makeAgent({
      id: 'd',
      name: 'helper',
      description: 'used when you need to translate text'
    })
    const tokens = tokenize('translate')
    expect(scoreAgent(nameAgent, tokens)).toBeGreaterThan(scoreAgent(descAgent, tokens))
  })

  it('returns 0 when no token matches', () => {
    const agent = makeAgent({ name: 'translator', description: 'translates text' })
    expect(scoreAgent(agent, tokenize('cook a meal'))).toBe(0)
  })
})

describe('rankAgents', () => {
  const agents = [
    makeAgent({ id: '1', name: 'translate_text', description: 'translate any text to a language' }),
    makeAgent({ id: '2', name: 'shorten_text', description: 'summarise long text' }),
    makeAgent({
      id: '3',
      name: 'support_triage',
      specialty: 'customer support',
      description: 'classify a ticket by priority',
      tags: ['support', 'priority']
    })
  ]

  it('returns only matching agents sorted by score descending', () => {
    const results = rankAgents(agents, 'translate a marketing email')
    expect(results.map(r => r.agent.id)).toEqual(['1'])
  })

  it('normalises confidence so the best match is 100', () => {
    const results = rankAgents(agents, 'classify a support ticket by priority')
    expect(results[0].agent.id).toBe('3')
    expect(results[0].confidence).toBe(100)
    expect(results.every(r => r.confidence <= 100 && r.confidence > 0)).toBe(true)
  })

  it('returns an empty list when the query has no usable tokens', () => {
    expect(rankAgents(agents, '   the the and ')).toEqual([])
  })

  it('returns an empty list when nothing matches', () => {
    expect(rankAgents(agents, 'cook dinner for guests')).toEqual([])
  })
})
