export interface FilterOption {
  readonly id: string
  readonly label: string
}

export interface DataDisplayFilterConfiguration {
  readonly id: string
  readonly name: string
  readonly groups: {
    readonly id: string
    readonly label: string
    readonly collapsible: boolean
    readonly filters: {
      readonly id: string
      readonly field: string
      readonly label: string
      readonly type: 'multi-select'
      readonly config: {
        readonly options: FilterOption[]
      }
    }[]
  }[]
}

export interface DataDisplaySection {
  readonly id: string
  readonly label: string
  readonly metadata?: {
    readonly count: number
  }
}
