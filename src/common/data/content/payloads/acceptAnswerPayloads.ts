/**
 * Accept Answer Payload Builder
 * Builds GraphQL mutation payload to accept/unaccept an answer
 */

export interface BuildAcceptAnswerPayloadParams {
  answerId: string
  questionId: string
  accepted: boolean
  employeeId: string
}

/**
 * Builds the payload for accepting/unaccepting an answer
 *
 * Requirements:
 * - Set the answer's accepted field to true/false
 * - Set acceptorEmployeeId to current user when accepting
 * - Ensure only one answer can be accepted per question (handled by backend constraint)
 *
 * @param params - Accept answer parameters
 * @returns GraphQL mutation payload
 */
export function buildAcceptAnswerPayload(params: BuildAcceptAnswerPayloadParams): any {
  const { answerId, accepted, employeeId } = params

  return {
    contentEntry: {
      id: answerId,
      accepted,
      acceptorEmployeeId: accepted ? employeeId : null,
      updatedBy: employeeId
    }
  }
}
