// Day Type Versions - shared types

export interface DayTypeVersionResponse {
  DayTypeVersion: Array<{
    id: string
    dayTypeVersionDetail: {
      id: string
      timeValue: string
      fieldType: string
      appliedDay: string
      version: number
    }[]
    color: string
    activeFrom: string | null
    activeTo: string | null
    version: number
    activeVersion: string
    roundingRule: {
      id: string
      name: string
    } | null
    incrementType: {
      id: string
      name: string
    } | null
    breakType: {
      id: string
      name: string
    } | null
    dayType: {
      id: string
      name: string
      code: string
    } | null
  }>
}

export interface TransformedDayTypeVersion {
  id: string
  activeVersion: string
  dayTypeVersionDetail: {
    id: string
    timeValue: string
    fieldType: string
    appliedDay: string
    version: number
  }[]
  color: string
  activeFrom: string | null
  activeTo: string | null
  version: number
  status: 'active' | 'expired' | 'inactive' | 'planned'
  roundingRule: {
    id: string
    name: string
  } | null
  incrementType: {
    id: string
    name: string
  } | null
  breakType: {
    id: string
    name: string
  } | null
  dayType: {
    id: string
    name: string
    code: string
  } | null
}
