// Rounding Rule Versions - shared types

export interface RoundingRuleVersionResponse {
  RoundingRuleVersion: Array<{
    id: string
    activeFrom: string | null
    activeTo: string | null
    version: number
    activeVersion: string
    roundingRule: {
      id: string
      name: string
      code: string
    } | null
  }>
}

export interface TransformedRoundingRuleVersion {
  id: string
  activeVersion: string
  activeFrom: string | null
  activeTo: string | null
  version: number
  status: 'active' | 'expired' | 'inactive' | 'planned'
  roundingRule: {
    id: string
    name: string
    code: string
  } | null
}
