// Time Types - shared types

export enum TimeTypeEnum {
  TIME_TYPE_SYSTEM = 'TIME_TYPE_SYSETM',
  TIME_TYPE_CUSTOM = 'TIME_TYPE_CUSTOM',
  TIME_TYPE_UNKNOWN = 'UNKNOWN_TIME_TYPE'
}

export interface TimeTypeResponse {
  TimeType: Array<{
    id: string
    name: string
    visible: boolean
    type: string
    code: string
    version: number
  }>
}

export interface SystemTimeTypeResponse {
  Catalog: Array<{
    id: string
    catalogEntries: Array<{
      code: string
      value: string
      visible?: boolean
    }>
  }>
}

export interface TransformedTimeType {
  id: string
  name: string
  visible: boolean
  type: 'System' | 'Custom' | 'Unknown'
  code: string
  version: number
}

export interface TransformedSystemTimeType {
  label: string
  value: string
  code: string
  visible: boolean
}
