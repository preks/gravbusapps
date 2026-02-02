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
      isActive
      ratingScaleId
      performanceCycleParticipant(where: { isDeleted: { _eq: false }, isEnabled: { _eq: true } }) {
        participantType
      }
      performanceCycleCompanyValue(where: { isDeleted: { _eq: false } }) {
        companyValueId
      }
    }
  }
`

export interface PerformanceCycleParticipantApi {
  participantType: string | null
}

export interface PerformanceCycleCompanyValueApi {
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
  isActive: boolean | null
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
    CompanyValue(where: { isDeleted: { _eq: false } }, orderBy: [{ title: ASC }]) {
      id
      version
      title
      description
      isActive
    }
  }
`

export interface CompanyValueApi {
  id: string
  version: number | null
  title: string | null
  description: string | null
  isActive: boolean | null
}

export interface GetCompanyValuesResponse {
  CompanyValue: CompanyValueApi[]
}
