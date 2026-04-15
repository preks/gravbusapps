import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

const API_URL = getDocumentServiceApiUrl()

export type DeskOverviewItemType = 'document' | 'spreadsheet' | 'note' | 'slide' | 'whiteboard'

export interface DeskOverviewItem {
  id: string
  type: DeskOverviewItemType
  title: string | null
  createdAt: string
  updatedAt: string
  isShared: boolean
  isOwner: boolean
  isPdf?: boolean
}

export interface DeskOverviewResponse {
  counts: {
    documents: { total: number; shared: number }
    spreadsheets: { total: number; shared: number }
    notes: { total: number; shared: number }
    slides: { total: number; shared: number }
    whiteboards: { total: number; shared: number }
    totalItems: number
  }
  recentItems: DeskOverviewItem[]
}

type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type BasicListItem = {
  id: string
  title?: string | null
  name?: string | null
  createdAt: string
  updatedAt: string
  ownerId?: string
  isShared?: boolean
  sourceFileInfo?: { mimeType?: string }
}

async function fetchJson<T>(url: string, accessToken: string): Promise<{ ok: boolean; status: number; data?: T }> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    return { ok: false, status: response.status }
  }
  return { ok: true, status: response.status, data: (await response.json()) as T }
}

async function getOverviewFallback(accessToken: string, limit: number): Promise<DeskOverviewResponse> {
  const safeLimit = Math.max(1, Math.min(limit, 50))

  const [docsRes, sheetsRes, notesRes, slidesRes, whiteboardsRes] = await Promise.all([
    fetchJson<PaginatedResponse<BasicListItem>>(
      `${API_URL}/documents?includeShared=true&limit=${safeLimit}&page=1`,
      accessToken
    ),
    fetchJson<PaginatedResponse<BasicListItem>>(
      `${API_URL}/spreadsheets?includeShared=true&limit=${safeLimit}&page=1`,
      accessToken
    ),
    fetchJson<PaginatedResponse<BasicListItem>>(
      `${API_URL}/notes?includeShared=true&limit=${safeLimit}&page=1`,
      accessToken
    ),
    fetchJson<PaginatedResponse<BasicListItem>>(
      `${API_URL}/slides?includeShared=true&limit=${safeLimit}&page=1`,
      accessToken
    ),
    fetchJson<PaginatedResponse<BasicListItem>>(
      `${API_URL}/whiteboards?includeShared=true&limit=${safeLimit}&page=1`,
      accessToken
    )
  ])

  // If any call failed due to auth, surface it clearly.
  const failed = [docsRes, sheetsRes, notesRes, slidesRes, whiteboardsRes].find(r => !r.ok)
  if (failed && failed.status === 401) {
    throw new Error('Not authenticated')
  }

  const docs = docsRes.data?.items ?? []
  const sheets = sheetsRes.data?.items ?? []
  const notes = notesRes.data?.items ?? []
  const slides = slidesRes.data?.items ?? []
  const whiteboards = whiteboardsRes.data?.items ?? []

  const toDeskItem = (type: DeskOverviewItemType, item: BasicListItem): DeskOverviewItem => {
    const title =
      type === 'spreadsheet' ? (item.name ?? item.title ?? null) : (item.title ?? (type === 'note' ? null : null))

    const isPdf = type === 'document' && item.sourceFileInfo?.mimeType === 'application/pdf'

    return {
      id: item.id,
      type,
      title,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      // Backends for these list endpoints already compute isShared.
      isShared: item.isShared === true,
      // If isShared is true, it's not owned by the user (per current BE semantics).
      isOwner: item.isShared !== true,
      isPdf: isPdf || undefined
    }
  }

  const recentItems = [
    ...docs.map(d => toDeskItem('document', d)),
    ...sheets.map(s => toDeskItem('spreadsheet', s)),
    ...notes.map(n => toDeskItem('note', n)),
    ...slides.map(sl => toDeskItem('slide', sl)),
    ...whiteboards.map(wb => toDeskItem('whiteboard', wb))
  ]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, safeLimit)

  const documentsTotal = docsRes.data?.total ?? docs.length
  const spreadsheetsTotal = sheetsRes.data?.total ?? sheets.length
  const notesTotal = notesRes.data?.total ?? notes.length
  const slidesTotal = slidesRes.data?.total ?? slides.length
  const whiteboardsTotal = whiteboardsRes.data?.total ?? whiteboards.length

  return {
    counts: {
      documents: { total: documentsTotal, shared: 0 },
      spreadsheets: { total: spreadsheetsTotal, shared: 0 },
      notes: { total: notesTotal, shared: 0 },
      slides: { total: slidesTotal, shared: 0 },
      whiteboards: { total: whiteboardsTotal, shared: 0 },
      totalItems: documentsTotal + spreadsheetsTotal + notesTotal + slidesTotal + whiteboardsTotal
    },
    recentItems
  }
}

export const DeskApiService = {
  async getOverview(accessToken: string, options?: { limit?: number }): Promise<DeskOverviewResponse> {
    const params = new URLSearchParams()
    if (options?.limit) params.set('limit', String(options.limit))

    const url = `${API_URL}/desk/overview${params.toString() ? `?${params.toString()}` : ''}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      // Backward compatibility: environments that don't yet have /desk/overview.
      if (response.status === 404) {
        const limit = options?.limit ?? 20
        return getOverviewFallback(accessToken, limit)
      }

      const err = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(err.message || `Failed to load desk overview: ${response.status}`)
    }

    return response.json()
  }
}

export default DeskApiService
