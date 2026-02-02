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

export interface SimpleBreakTypeResponse {
  BreakType: Array<{
    id: string
    name: string
    version: number
    code: string
  }>
}

export interface SimpleBreakType {
  id: string
  name: string
  version: number
  code: string
}
