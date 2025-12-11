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
