export interface AllowanceRegionDetailFormData {
  id?: string
  countryRef: string
  travelRegion: string
  travelRegionRef?: string
  currencyRef: string
  home: boolean
  activeFrom: string
  activeTo?: string
  amounts: number[]
}

export interface TravelRegionRuleFormData {
  id?: string
  code: string
  name: string
  activeFrom?: string
  activeTo?: string
  details: AllowanceRegionDetailFormData[]
}

export interface CatalogOption {
  id: string
  value: string
  code?: string
}

export interface SmartColumnGroup {
  key: string
  countryRef: string
  countryName: string
  travelRegion: string
  currencyRef: string
  currencyCode: string
  homeFlag: boolean
  activeFrom: string
  activeTo?: string
  amounts: number[]
  detailIds: string[]
}
