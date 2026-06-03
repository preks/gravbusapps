export interface IcpScoringCandidate {
  id: string
  title: string
  subtitle?: string | null
}

export interface IcpScoringCandidateQuery {
  search?: string
  createdAtFrom?: string
  createdAtTo?: string
  unscoredOnly?: boolean
}

export interface IcpScoringCandidatesApi {
  items: IcpScoringCandidate[]
  total: number
  loading: boolean
  error: string | null
  loadFirstPage: (query: IcpScoringCandidateQuery) => void
  loadMore: (query: IcpScoringCandidateQuery) => void
  fetchEntityIds: (query: IcpScoringCandidateQuery, limit: number) => Promise<string[]>
  fetchUnscoredEntityIdsWithinWindow: (query: IcpScoringCandidateQuery, windowSize: number) => Promise<string[]>
  fetchAllEntityIds: (query: IcpScoringCandidateQuery) => Promise<string[]>
}
