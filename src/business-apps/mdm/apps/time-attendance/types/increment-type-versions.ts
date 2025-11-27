// Increment Type Versions - shared types

export interface IncrementTypeVersionResponse {
  IncrementTypeVersion: Array<{
    id: string
    activeFrom: string | null
    activeTo: string | null
    version: number
    activeVersion: string
    incrementType: {
      id: string
      name: string
      code: string
    } | null
    incrementTypeVersionDetailAggregate: {
      aggregate: {
        count: number
      }
    }
  }>
}

export interface TransformedIncrementTypeVersion {
  id: string
  increments: number
  activeVersion: string
  activeFrom: string | null
  activeTo: string | null
  version: number
  status: 'active' | 'expired' | 'inactive' | 'planned'
  incrementType: {
    id: string
    name: string
    code: string
  } | null
}
