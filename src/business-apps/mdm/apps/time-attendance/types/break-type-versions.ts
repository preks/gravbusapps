// Break Type Versions - shared types

export interface BreakTypeVersionResponse {
  BreakTypeVersion: Array<{
    id: string
    activeFrom: string | null
    activeTo: string | null
    version: number
    activeVersion: string
    minBreakTime: string | null
    maxBreakTime: string | null
    minWorkTime: string | null
    minRemainderTime: string | null
    breakType: {
      id: string
      name: string
      code: string
    } | null
    breakTypeVersionDetailAggregate: {
      aggregate: {
        count: number
      }
    }
  }>
}

export interface TransformedBreakTypeVersion {
  id: string
  breaks: number
  activeVersion: string | null
  activeFrom: string | null
  activeTo: string | null
  version: number
  status: 'active' | 'expired' | 'inactive' | 'planned'
  minBreakTime: string | null
  maxBreakTime: string | null
  minWorkTime: string | null
  minRemainderTime: string | null
  breakType: {
    id: string
    name: string
    code: string
  } | null
}
