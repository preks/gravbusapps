// Day Types - shared types

export interface SimpleDayTypeResponse {
  DayType: Array<{
    id: string
    name: string
    version: number
    code: string
    dayTypeVersion: { id: string }[]
  }>
}

export interface SimpleDayType {
  id: string
  name: string
  version: number
  code: string
  dayTypeVersion: string[]
}

export interface DayTypeResponse {
  DayType: Array<{
    id: string
    name: string
    version: number
    code: string
    dayTypeVersion?: {
      dayTypeVersionDetail?: {
        id: string
        fieldType: string
        appliedDay: string
        timeValue: string
      }[]
      id: string
      breakRule?: {
        id: string
        name: string
      }
      incrementType?: {
        id: string
        name: string
      }
      roundingRule?: {
        id: string
        name: string
      }
      color?: string
    }[]
  }>
}

export interface TransformedDayType {
  id: string
  name: string
  version: number
  code: string
  breakRule: string
  incrementType: string
  roundingRule: string
  color: string
  dayTypeVersion: {
    id: string
    dayTypeVersionDetail: {
      id: string
      fieldType: string
      appliedDay: string
      timeValue: string
    }[]
  }[]
  dayTypeVersionId: string
  dayTypeVersionDetails: {
    id: string
    fieldType: string
    appliedDay: string
    timeValue: string
  }[]
}
