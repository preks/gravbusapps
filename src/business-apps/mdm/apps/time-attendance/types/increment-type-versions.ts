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
  }>
}

export interface TransformedIncrementTypeVersion {
  id: string
  activeVersion: string
  activeFrom: string | null
  activeTo: string | null
  version: number
  incrementType: {
    id: string
    name: string
    code: string
  } | null
}
