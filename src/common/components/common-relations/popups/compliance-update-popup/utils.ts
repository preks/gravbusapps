export interface ExtractEntityIdOptions {
  additionalData: unknown
  initialId?: string
  idKeys: string[]
}

const parseMaybeObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>
      }
    } catch {
      return {}
    }
  }

  return {}
}

const getFirstStringByKeys = (source: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return value
    }
  }

  return ''
}

const findFirstIdByKeys = (source: unknown, keys: string[], visited = new Set<unknown>()): string => {
  if (source === null || typeof source !== 'object') {
    return ''
  }

  if (visited.has(source)) {
    return ''
  }
  visited.add(source)

  const record = source as Record<string, unknown>
  const directId = getFirstStringByKeys(record, keys)
  if (directId) {
    return directId
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      const nestedId = findFirstIdByKeys(value, keys, visited)
      if (nestedId) {
        return nestedId
      }
    }
  }

  return ''
}

export const extractEntityId = ({ additionalData, initialId, idKeys }: ExtractEntityIdOptions): string => {
  const normalizedAdditionalData = parseMaybeObject(additionalData)
  const externalContextData = parseMaybeObject(normalizedAdditionalData.externalContextData)
  const psiTaskPayload = parseMaybeObject(normalizedAdditionalData.psi_taskPayload)
  const psiInitialParameters = parseMaybeObject(psiTaskPayload.psi_initialParameters)
  const platformContext = parseMaybeObject(normalizedAdditionalData.platformContext)
  const payload = parseMaybeObject(normalizedAdditionalData.payload)
  const payloadPlatformContext = parseMaybeObject(payload.platformContext)
  const lowcoderPlatformContext = parseMaybeObject((globalThis as { lowcoder?: unknown }).lowcoder)
  const lowcoderPlatform = parseMaybeObject(lowcoderPlatformContext.platformContext)
  const urlSearch = globalThis.window?.location?.search ?? ''
  const urlParams = new URLSearchParams(urlSearch)
  const urlId = getFirstStringByKeys(Object.fromEntries(urlParams.entries()), idKeys)
  const deepId = findFirstIdByKeys(normalizedAdditionalData, idKeys)

  const idCandidates: string[] = [
    getFirstStringByKeys(externalContextData, idKeys),
    getFirstStringByKeys(platformContext, idKeys),
    getFirstStringByKeys(payloadPlatformContext, idKeys),
    getFirstStringByKeys(psiInitialParameters, idKeys),
    getFirstStringByKeys(lowcoderPlatform, idKeys),
    getFirstStringByKeys(normalizedAdditionalData, idKeys),
    typeof normalizedAdditionalData.id === 'string' ? normalizedAdditionalData.id : '',
    deepId,
    initialId || '',
    urlId
  ]

  for (const candidate of idCandidates) {
    if (candidate.trim() !== '') {
      return candidate
    }
  }

  return ''
}
