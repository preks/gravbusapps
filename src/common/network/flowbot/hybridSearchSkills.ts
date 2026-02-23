import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'

const ENTITY_TYPE = 'skills'
const DEFAULT_LIMIT = 20

export interface HybridSearchSkillMatch {
  id: string
  name: string
  score?: number
  match_type?: string
  version: number
}

const parseEventChunk = (chunk: string): { eventType: string; data: string } => {
  let eventType = ''
  let data = ''
  for (const line of chunk.split('\n')) {
    if (line.startsWith('event: ')) eventType = line.slice(7).trim()
    else if (line.startsWith('data: ')) data = line.slice(6)
  }
  return { eventType, data }
}

const parseMatchData = (data: string): HybridSearchSkillMatch | null => {
  try {
    const parsed = JSON.parse(data) as {
      id: string
      name: string
      score?: number
      match_type?: string
      version?: number
    }
    return {
      id: parsed.id,
      name: parsed.name ?? '',
      score: parsed.score,
      match_type: parsed.match_type,
      version: typeof parsed.version === 'number' ? parsed.version : 0
    }
  } catch {
    return null
  }
}

const collectMatchesFromChunks = (chunks: string[], matches: HybridSearchSkillMatch[]): boolean => {
  for (const chunk of chunks) {
    const { eventType, data } = parseEventChunk(chunk)
    if (eventType === 'match' && data) {
      const match = parseMatchData(data)
      if (match) matches.push(match)
    }
    if (eventType === 'done') return true
  }
  return false
}

const readSseMatches = async (reader: ReadableStreamDefaultReader<string>): Promise<HybridSearchSkillMatch[]> => {
  const matches: HybridSearchSkillMatch[] = []
  let buffer = ''
  let isDoneEventSeen = false

  while (!isDoneEventSeen) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += value
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''
    isDoneEventSeen = collectMatchesFromChunks(chunks, matches)
  }

  return matches
}

/**
 * Flowbot hybrid-search API for skills (SSE).
 * API: GET /flowbot/hybrid-search/{entity_type}?q=...&limit=...
 * Response: Server-Sent Events with event: match (data: { id, name, score, match_type, version }) and event: done.
 */
export async function hybridSearchSkills(
  q: string,
  accessToken: string,
  limit: number = DEFAULT_LIMIT
): Promise<HybridSearchSkillMatch[]> {
  const trimmed = (q || '').trim()
  if (!trimmed || trimmed.length < 2) return []

  const baseUrl = resolveFlowbotBaseUrl()
  const url = `${baseUrl}/flowbot/hybrid-search/${ENTITY_TYPE}?${new URLSearchParams({
    q: trimmed,
    limit: String(limit)
  })}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'text/event-stream'
    }
  })

  if (!response.ok) {
    throw new Error(`Hybrid search failed: ${response.status} ${response.statusText}`)
  }

  const body = response.body
  if (!body) return []

  const reader = body.pipeThrough(new TextDecoderStream()).getReader()

  try {
    return await readSseMatches(reader)
  } finally {
    reader.releaseLock()
  }
}
