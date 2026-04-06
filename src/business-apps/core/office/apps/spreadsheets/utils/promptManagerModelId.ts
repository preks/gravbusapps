/**
 * Prompt Manager list/get payloads may expose Mongo ids as `_id` or `id` depending on serializer.
 * Use this when appending `model_id` (or matching service ids) for execute calls.
 */
export function getPromptManagerDocumentId(
  entity: { _id?: string; id?: string } | null | undefined
): string | undefined {
  const raw = entity?._id ?? entity?.id
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim()
  }
  return undefined
}
