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
