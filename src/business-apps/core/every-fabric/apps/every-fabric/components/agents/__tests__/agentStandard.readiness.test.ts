import { evaluateAgentReadiness, CARD_READY_PROMPT_MIN_LENGTH } from '../agentStandard'

describe('evaluateAgentReadiness', () => {
  it('flags an agent with no skills', () => {
    const result = evaluateAgentReadiness({
      skillCount: 0,
      toolsInSkillsCount: 0,
      systemPromptLength: 500
    })
    expect(result.ready).toBe(false)
    expect(result.reasons).toContain('No skill assigned')
  })

  it('flags skills that carry no tools', () => {
    const result = evaluateAgentReadiness({
      skillCount: 2,
      toolsInSkillsCount: 0,
      systemPromptLength: 500
    })
    expect(result.ready).toBe(false)
    expect(result.reasons).toContain('Skills have no tools')
  })

  it('flags a thin system prompt', () => {
    const result = evaluateAgentReadiness({
      skillCount: 1,
      toolsInSkillsCount: 3,
      systemPromptLength: CARD_READY_PROMPT_MIN_LENGTH - 1
    })
    expect(result.ready).toBe(false)
    expect(result.reasons).toContain('System prompt is too thin')
  })

  it('skips the prompt check when length is unknown (workforce agents)', () => {
    const result = evaluateAgentReadiness({
      skillCount: 1,
      toolsInSkillsCount: 3,
      systemPromptLength: null
    })
    expect(result.ready).toBe(true)
    expect(result.reasons).toHaveLength(0)
  })

  it('is ready when skills, tools and prompt all meet the bar', () => {
    const result = evaluateAgentReadiness({
      skillCount: 1,
      toolsInSkillsCount: 2,
      systemPromptLength: CARD_READY_PROMPT_MIN_LENGTH
    })
    expect(result.ready).toBe(true)
    expect(result.reasons).toHaveLength(0)
  })
})
