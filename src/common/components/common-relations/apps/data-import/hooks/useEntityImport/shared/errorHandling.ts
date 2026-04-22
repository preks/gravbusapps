/**
 * Shared error-handling helpers for the import pipeline.
 *
 * Each submission strategy may supplement these with domain-specific error
 * matchers, but every strategy falls back to `extractErrorMessage` when no
 * pattern matches.
 */

export function toRecordObject(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, any>
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function messageFromError(error: unknown): string | undefined {
  return error instanceof Error ? nonEmptyString(error.message) : undefined
}

function messageFromString(error: unknown): string | undefined {
  return typeof error === 'string' ? nonEmptyString(error) : undefined
}

function messageFromErrorObject(candidate: Record<string, unknown>): string | undefined {
  return nonEmptyString(candidate.message) ?? nonEmptyString(candidate.detail)
}

function messageFromResponseData(candidate: Record<string, unknown>): string | undefined {
  const response = candidate.response
  if (!response || typeof response !== 'object') return undefined
  const responseData = (response as Record<string, unknown>).data
  if (!responseData || typeof responseData !== 'object') return undefined
  const data = responseData as Record<string, unknown>
  return nonEmptyString(data.message) ?? nonEmptyString(data.detail)
}

export function extractErrorMessage(error: unknown): string {
  const fromError = messageFromError(error) ?? messageFromString(error)
  if (fromError) return fromError
  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>
    const fromObject = messageFromErrorObject(candidate) ?? messageFromResponseData(candidate)
    if (fromObject) return fromObject
  }
  return 'Import failed'
}

/**
 * Shared communication-channel error matcher (applies to both CRM and IRM
 * contact/account imports). Returns a friendly message or undefined when the
 * error does not match.
 */
export function matchCommunicationChannelError(message: string, entityType: string): string | undefined {
  const normalized = message.toLowerCase()
  if (normalized.includes('communicationchannel') && entityType === 'contact') {
    return 'Import failed: invalid contact communication channel reference or value.'
  }
  if (normalized.includes('communicationchannel') && entityType === 'account') {
    return 'Import failed: invalid account communication channel reference or value.'
  }
  return undefined
}

export function shouldRetryWithUiMappings(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return msg.includes('targetfield') && msg.includes('not in graphql schema')
}
