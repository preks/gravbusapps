import { isLeadScoringClientError } from '../types/leadScoringTypes'

export function resolveLeadScoringErrorMessage(caughtError: unknown, fallbackMessage: string): string {
  if (isLeadScoringClientError(caughtError)) {
    return caughtError.message
  }

  if (caughtError instanceof Error) {
    return caughtError.message
  }

  return fallbackMessage
}
