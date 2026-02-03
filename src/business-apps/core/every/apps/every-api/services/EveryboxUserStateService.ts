import { getEveryboxServiceApiUrl } from '../utils/everyboxServiceUrl'

type TaskSource = 'cflow' | 'kogito'

async function everyboxRequest<T>(params: {
  path: string
  method: 'GET' | 'POST' | 'PATCH'
  accessToken?: string
  body?: unknown
}): Promise<T> {
  const baseUrl = getEveryboxServiceApiUrl()
  const response = await fetch(`${baseUrl}${params.path}`, {
    method: params.method,
    headers: {
      'Content-Type': 'application/json',
      ...(params.accessToken ? { Authorization: `Bearer ${params.accessToken}` } : {})
    },
    body: params.body ? JSON.stringify(params.body) : undefined
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Everybox service HTTP ${response.status}: ${text || response.statusText}`)
  }

  return (await response.json()) as T
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
