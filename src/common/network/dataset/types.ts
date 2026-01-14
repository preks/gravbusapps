export enum QueryType {
  DATASET = 'DATASET',
  TIMESERIES = 'TIMESERIES'
}

export enum QueryStatus {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT'
}

export enum ParameterType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  DATE_TIME = 'DATE_TIME',
  BOOLEAN = 'BOOLEAN',
  CONTROL = 'CONTROL',
  LIST_STRING = 'LIST_STRING'
}

export interface QueryParameter {
  name: string
  type: ParameterType
  description: string
  defaultValue?: string
  required: boolean
  allowedValues?: string[] | null
}

export interface AdditionalColumn {
  name: string
  type: string
}

export interface QueryDefinition {
  id?: string
  name: string
  description: string
  query: string
  queryType: QueryType
  status: QueryStatus
  parameters: QueryParameter[]
  additionalColumns: AdditionalColumn[]
  createdAt?: string
  updatedAt?: string
}

export interface DatasetElementDTO {
  category: string
  value: number
  date_category?: string
  displayLabel?: string
  [key: string]: any // For additional dynamic columns
}

export interface DatasetDTO {
  data: DatasetElementDTO[]
  categories: string[]
}

export interface QueryDefinitionListParams {
  queryType?: QueryType
  status?: QueryStatus
  search?: string
}

export interface QueryDefinitionPagedParams extends QueryDefinitionListParams {
  page?: number
  size?: number
  sort?: string
}

export interface QueryDefinitionPagedResponse {
  data: QueryDefinition[]
  paging: {
    limit: number
    offset: number
    totalRecords: number
    returnTotalRecords: boolean
  }
}

export interface QueryExecutionParams {
  [key: string]: string | number | boolean
}
