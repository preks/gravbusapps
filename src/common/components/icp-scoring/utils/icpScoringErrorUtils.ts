import { IcpScoringClientError, isIcpScoringClientError } from '../types/icpScoringTypes'

const REST_FAILED_PATTERN = /REST request failed:\s*(\d+)/

function extractHttpStatus(error: unknown): number | undefined {
  if (!(error instanceof Error)) {
    return undefined
  }

  const match = REST_FAILED_PATTERN.exec(error.message)
  if (!match) {
    return undefined
  }

  const status = Number.parseInt(match[1], 10)
  return Number.isNaN(status) ? undefined : status
}

export function toIcpScoringError(error: unknown): IcpScoringClientError {
  if (error instanceof IcpScoringClientError) {
    return error
  }

  const status = extractHttpStatus(error)

  if (status === 400) {
    return new IcpScoringClientError(
      'INVALID_ENTITY_ID',
      'The entity ID or entity IDs are invalid for scoring.',
      status
    )
  }

  if (status === 401) {
    return new IcpScoringClientError('AUTH_ERROR', 'Your session expired. Refresh the page and try again.', status)
  }

  if (status === 404) {
    return new IcpScoringClientError(
      'NOT_FOUND',
      'The entity or ICP profile could not be found, or you do not have access to it.',
      status
    )
  }

  if (status === 502) {
    return new IcpScoringClientError(
      'UPSTREAM_ERROR',
      'ICP scoring is temporarily unavailable because an upstream data source failed.',
      status
    )
  }

  if (error instanceof Error) {
    return new IcpScoringClientError('UNKNOWN_ERROR', error.message, status)
  }

  return new IcpScoringClientError('UNKNOWN_ERROR', 'An unknown error occurred while scoring.', status)
}

export function resolveIcpScoringErrorMessage(
  caughtError: unknown,
  fallbackMessage: string,
  authErrorMessage?: string
): string {
  if (isIcpScoringClientError(caughtError)) {
    if (caughtError.code === 'AUTH_ERROR' && authErrorMessage) {
      return authErrorMessage
    }

    return caughtError.message
  }

  if (caughtError instanceof Error) {
    return caughtError.message
  }

  return fallbackMessage
}
