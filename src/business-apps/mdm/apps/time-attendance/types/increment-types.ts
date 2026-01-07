// Increment Types - shared types

export interface IncrementType {
  id: string
  code: string
  name: string
  version: number
}

export interface IncrementTypesResponse {
  IncrementType: IncrementType[]
}

export interface SimpleIncrementTypeResponse {
  IncrementType: Array<{
    id: string
    name: string
    version: number
    code: string
    incrementTypeVersion: { id: string }[]
  }>
}

export interface SimpleIncrementType {
  id: string
  name: string
  version: number
  code: string
  incrementTypeVersion: string[]
}
