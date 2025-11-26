// Break Types - shared types

export interface BreakType {
  id: string
  code: string
  name: string
  version: number
}

export interface BreakTypesResponse {
  BreakType: BreakType[]
}
