// ─── Base Types ──────────────────────────────────────────────────────────────

export interface CompensationBandPolicy {
  id: string
  compensationBandId: string
  compensationBand: {
    id: string
    name: string
    description: string | null
  } | null
  jobLevelId: string
  jobLevel: {
    id: string
    code: string
    name: string
    hierarchyOrder: number
  } | null
  jobFamilyId: string
  jobFamily: {
    id: string
    code: string
    name: string
  } | null
  geoZoneId: string
  geoZone: {
    id: string
    name: string
  } | null
  priority: number
  isActive: boolean
  version: number | null
}

// ─── Mutation Types ──────────────────────────────────────────────────────────

export interface CompensationBandPolicyMutation {
  compensationBandId: string
  jobLevelId: string
  jobFamilyId: string
  geoZoneId: string
  priority: number
  id?: string
  version?: number | null
}

export interface CompensationBandPolicyMutationPayload {
  changeMode: 'INSERT'
  compensationBandPolicy: CompensationBandPolicyMutation
}

export interface CompensationBandPolicyDeletionPayload {
  changeMode: 'DELETE'
  compensationBandPolicy: {
    id: string
    version?: number | null
  }
}

// ─── Response Types ──────────────────────────────────────────────────────────

export interface GetCompensationBandPoliciesResponse {
  compensationBandPolicies: CompensationBandPolicy[]
  CompensationBandPolicyAggregate: {
    aggregate: {
      count: number
    }
  }
}
