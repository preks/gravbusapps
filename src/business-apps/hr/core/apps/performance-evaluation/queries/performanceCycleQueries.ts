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
    }
  }
`

export interface PerformanceCycleParticipantApi {
  participantType: string | null
}

export interface PerformanceCycleApi {
  id: string
  version: number | null
  name: string | null
  startDate: string | null
  endDate: string | null
  frequency: string | null
  status: string | null
  /** Table/API use "active"; GraphQL may expose as isActive, aliased above as active */
  active: boolean | null
  ratingScaleId: string | null
  performanceCycleParticipant: PerformanceCycleParticipantApi[]
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
