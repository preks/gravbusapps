function redactStringSecrets(value) {
  if (typeof value !== 'string') {
    return value
  }

  return value
    .replace(/(client_secret=)[^&\s]+/gi, '$1***redacted***')
    .replace(/(access_token=)[^&\s]+/gi, '$1***redacted***')
}

function redactHeaders(headers = {}) {
  const sensitiveKeys = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'proxy-authorization']
  const normalized = {}

  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      normalized[key] = '***redacted***'
      continue
    }

    normalized[key] = typeof value === 'string' ? redactStringSecrets(value) : value
  }

  return normalized
}

function toSerializableValue(input, maxLength = 12000) {
  if (input == null) {
    return input
  }

  const seen = new WeakSet()
  const serialized = JSON.stringify(
    input,
    (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]'
        }
        seen.add(value)
      }
      if (typeof value === 'string') {
        return redactStringSecrets(value)
      }
      return value
    },
    2
  )

  if (serialized.length > maxLength) {
    return `${serialized.slice(0, maxLength)}... [truncated]`
  }

  return serialized
}

function serializeErrorObject(error, maxLength = 6000) {
  const payload = {
    name: error?.name,
    message: error?.message,
    stack: error?.stack
  }
  return toSerializableValue(payload, maxLength)
}

function isAxiosError(error) {
  return Boolean(error?.isAxiosError || error?.config || error?.response)
}

function toTruncatedString(value, maxLength = 8000) {
  const normalized = redactStringSecrets(String(value))
  if (normalized.length > maxLength) {
    return `${normalized.slice(0, maxLength)}... [truncated]`
  }
  return normalized
}

function getResponseDataDetails(responseData) {
  if (responseData == null) {
    return { dataParsed: null, dataRaw: null }
  }

  if (typeof responseData === 'string') {
    try {
      const parsed = JSON.parse(responseData)
      return {
        dataParsed: parsed,
        dataRaw: toTruncatedString(responseData)
      }
    } catch {
      return {
        dataParsed: null,
        dataRaw: toTruncatedString(responseData)
      }
    }
  }

  return {
    dataParsed: responseData,
    dataRaw: toSerializableValue(responseData, 8000)
  }
}

function logAxiosError(context, error, extra = {}) {
  const timestamp = new Date().toISOString()

  if (!isAxiosError(error)) {
    console.error(
      `[API_ERROR] ${context} ${toSerializableValue(
        {
          timestamp,
          context,
          extra,
          error: serializeErrorObject(error)
        },
        10000
      )}`
    )
    return
  }

  const responseDataDetails = getResponseDataDetails(error?.response?.data)

  const payload = {
    timestamp,
    context,
    extra,
    message: error?.message,
    code: error?.code,
    request: {
      method: error?.config?.method,
      url: error?.config?.url,
      baseURL: error?.config?.baseURL,
      headers: redactHeaders(error?.config?.headers || {}),
      params: error?.config?.params || null,
      data: redactStringSecrets(
        typeof error?.config?.data === 'string'
          ? error.config.data
          : toSerializableValue(error?.config?.data || null, 4000)
      )
    },
    response: {
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      headers: redactHeaders(error?.response?.headers || {}),
      dataParsed: responseDataDetails.dataParsed,
      dataRaw: responseDataDetails.dataRaw
    }
  }

  console.error(`[API_ERROR] ${context} ${toSerializableValue(payload, 20000)}`)
}

export { logAxiosError }
