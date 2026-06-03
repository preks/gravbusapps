/** @jest-environment jsdom */
import { TOKENS_PER_CREDIT, MIN_CREDITS_PER_BILLED_RUN, tokensToCredits } from '../workforceTypes'

describe('tokensToCredits', () => {
  it('treats null/undefined/zero/negative as zero credits', () => {
    expect(tokensToCredits(null)).toBe(0)
    expect(tokensToCredits(undefined)).toBe(0)
    expect(tokensToCredits(0)).toBe(0)
    expect(tokensToCredits(-100)).toBe(0)
  })

  it('rounds up to the minimum credit when any tokens are used', () => {
    expect(tokensToCredits(1)).toBe(MIN_CREDITS_PER_BILLED_RUN)
    expect(tokensToCredits(999)).toBe(MIN_CREDITS_PER_BILLED_RUN)
  })

  it('uses the configured tokens-per-credit boundary', () => {
    expect(tokensToCredits(TOKENS_PER_CREDIT)).toBe(1)
    expect(tokensToCredits(TOKENS_PER_CREDIT + 1)).toBe(2)
    expect(tokensToCredits(TOKENS_PER_CREDIT * 2)).toBe(2)
  })

  it.each([
    [500, 1],
    [1_500, 2],
    [5_001, 6],
    [10_000, 10]
  ])('converts %i tokens to %i credits', (tokens, credits) => {
    expect(tokensToCredits(tokens)).toBe(credits)
  })

  it('treats non-finite numbers as zero', () => {
    expect(tokensToCredits(Number.POSITIVE_INFINITY)).toBe(0)
    expect(tokensToCredits(Number.NaN)).toBe(0)
  })
})
