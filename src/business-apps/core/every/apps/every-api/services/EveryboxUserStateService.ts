import { getEveryboxServiceApiUrl } from '../utils/everyboxServiceUrl'

type TaskSource = 'cflow' | 'kogito'

const LOG_PREFIX = '[EveryboxUserState]'

async function everyboxRequest<T>(params: {
  path: string
  method: 'GET' | 'POST' | 'PATCH'
  accessToken?: string
  body?: unknown
}): Promise<T> {
  const baseUrl = getEveryboxServiceApiUrl()
  const url = `${baseUrl}${params.path}`
  const startTime = performance.now()

  console.log(`${LOG_PREFIX} ${params.method} ${params.path}`, {
    url,
    body: params.body,
    hasToken: !!params.accessToken
  })

  try {
    const response = await fetch(url, {
      method: params.method,
      headers: {
        'Content-Type': 'application/json',
        ...(params.accessToken ? { Authorization: `Bearer ${params.accessToken}` } : {})
      },
      body: params.body ? JSON.stringify(params.body) : undefined
    })

    const duration = Math.round(performance.now() - startTime)

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.error(`${LOG_PREFIX} ${params.method} ${params.path} FAILED`, {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        errorBody: text
      })
      throw new Error(`Everybox service HTTP ${response.status}: ${text || response.statusText}`)
    }

    const data = (await response.json()) as T
    console.log(`${LOG_PREFIX} ${params.method} ${params.path} SUCCESS`, {
      status: response.status,
      duration: `${duration}ms`,
      response: data
    })

    return data
  } catch (error) {
    const duration = Math.round(performance.now() - startTime)
    console.error(`${LOG_PREFIX} ${params.method} ${params.path} ERROR`, {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function markTaskRead(accessToken: string | undefined, params: { source: TaskSource; taskId: string }) {
  return await everyboxRequest<{ status: 'success'; state: any }>({
    path: `/me/tasks/state/read`,
    method: 'POST',
    accessToken,
    body: params
  })
}

export async function markTaskUnread(accessToken: string | undefined, params: { source: TaskSource; taskId: string }) {
  return await everyboxRequest<{ status: 'success'; state: any }>({
    path: `/me/tasks/state/unread`,
    method: 'POST',
    accessToken,
    body: params
  })
}

export async function patchTaskState(
  accessToken: string | undefined,
  params: { source: TaskSource; taskId: string; isPinned?: boolean; userPriority?: number | null }
) {
  return await everyboxRequest<{ status: 'success'; state: any }>({
    path: `/me/tasks/state`,
    method: 'PATCH',
    accessToken,
    body: params
  })
}

export async function getEveryboxSettings(accessToken: string | undefined) {
  return await everyboxRequest<{ status: 'success'; settings: any }>({
    path: `/me/everybox/settings`,
    method: 'GET',
    accessToken
  })
}

export async function updateEveryboxSettings(accessToken: string | undefined, settings: Record<string, unknown>) {
  return await everyboxRequest<{ status: 'success'; settings: any }>({
    path: `/me/everybox/settings`,
    method: 'PATCH',
    accessToken,
    body: { settings }
  })
}
