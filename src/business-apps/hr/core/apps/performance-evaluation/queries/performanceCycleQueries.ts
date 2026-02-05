/**
 * GraphQL queries for Performance Cycle (nw_employee.performance_cycle) via Hasura
 */

export const GET_PERFORMANCE_CYCLES = /* GraphQL */ `
  query GetPerformanceCycles {
    PerformanceCycle(where: { isDeleted: { _eq: false } }, orderBy: [{ startDate: DESC }]) {
      id
      version
      name
      startDate
      endDate
      frequency
      status
      recordState
      ratingScaleId
      performanceCycleParticipant(where: { isDeleted: { _eq: false } }) {
        id
        version
        participantType
        enabled
      }
      performanceCycleCompanyValue(where: { isDeleted: { _eq: false } }) {
        id
        version
        companyValueId
      }
    }
  }
`

export interface PerformanceCycleParticipantApi {
  id: string
  version: number | null
  participantType: string | null
  enabled: boolean | null
}

export interface PerformanceCycleCompanyValueApi {
  id: string
  version: number | null
  companyValueId: string | null
}

export interface PerformanceCycleApi {
  id: string
  version: number | null
  name: string | null
  startDate: string | null
  endDate: string | null
  frequency: string | null
  status: string | null
  recordState: string | null
  ratingScaleId: string | null
  performanceCycleParticipant: PerformanceCycleParticipantApi[]
  performanceCycleCompanyValue: PerformanceCycleCompanyValueApi[] | null
}

export interface GetPerformanceCyclesResponse {
  PerformanceCycle: PerformanceCycleApi[]
}

/**
 * GraphQL query for RatingScale (nw_employee.rating_scale) via Hasura
 */
export const GET_RATING_SCALES = /* GraphQL */ `
  query GetRatingScales {
    RatingScale(where: { isDeleted: { _eq: false } }, orderBy: [{ name: ASC }]) {
      id
      version
      name
      description
      scaleType
      ratingScaleValue(where: { isDeleted: { _eq: false } }, orderBy: [{ displayOrder: ASC }]) {
        id
        label
        displayOrder
        numericEquivalent
      }
    }
  }
`

export interface RatingScaleValueApi {
  id: string
  label: string | null
  displayOrder: number | null
  numericEquivalent: number | string | null
}

export interface RatingScaleApi {
  id: string
  version: number | null
  name: string | null
  description: string | null
  scaleType: string | null
  ratingScaleValue: RatingScaleValueApi[]
}

export interface GetRatingScalesResponse {
  RatingScale: RatingScaleApi[]
}

/**
 * GraphQL query for CompanyValue (company values) via Hasura – same pattern as RatingScale
 */
export const GET_COMPANY_VALUES = /* GraphQL */ `
  query GetCompanyValues {
    CompanyValue(orderBy: [{ title: ASC }]) {
      id
      version
      title
      description
      recordState
    }
  }
`

export interface CompanyValueApi {
  id: string
  version: number | null
  title: string | null
  description: string | null
  recordState: string | null
}

export interface GetCompanyValuesResponse {
  CompanyValue: CompanyValueApi[]
}
