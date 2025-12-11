// Day Type Version Details and Catalog - shared types

export interface DayTypeVersionDetailResponse {
  DayTypeVersionDetail: Array<{
    id: string
    version: number
    timeValue: string
    fieldType: string
    appliedDay: string
  }>
}

export interface TransformedDayTypeVersionDetail {
  id: string
  version: number
  timeValue: string
  fieldType: string
  appliedDay: string
}

export interface FieldTypesCatalogResponse {
  Catalog: Array<{
    catalogEntries: Array<{
      id: string
      code: string
      value: string
      translations: Array<{
        value: string
      }>
    }>
  }>
}

export interface FieldTypeOption {
  code: string
  value: string
  displayValue: string
}
