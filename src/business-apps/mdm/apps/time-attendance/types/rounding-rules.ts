// Rounding Rules - shared types

export interface RoundingRule {
  id: string
  code: string
  name: string
  version: number
}

export interface RoundingRulesResponse {
  RoundingRule: RoundingRule[]
}

export interface SimpleRoundingRuleResponse {
  RoundingRule: Array<{
    id: string
    name: string
    version: number
    code: string
    roundingRuleVersion: { id: string }[]
  }>
}

export interface SimpleRoundingRule {
  id: string
  name: string
  version: number
  code: string
  roundingRuleVersion: string[]
}
