/**
 * Drawing API Service
 * Handles communication with the document-service drawings API for OCR processing
 */

// Lazy load environment variable to avoid module load issues on iPad/Safari
const getDocumentServiceUrl = (): string => {
  // Check environment variable first
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DOCUMENT_SERVICE_URL) {
    return import.meta.env.VITE_DOCUMENT_SERVICE_URL
  }

  // Determine base URL from current hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname.includes('newwork-dev')) {
      return 'https://newwork-dev.newwork.com/document/api/v1'
    }
    if (hostname.includes('newwork.com')) {
      return 'https://newwork.newwork.com/document/api/v1'
    }
  }

  // Local development fallback
  return 'http://localhost:3002/api/v1'
}

// Cache the base URL
let cachedBaseUrl: string | null = null
const getBaseUrl = (): string => {
  if (!cachedBaseUrl) {
    cachedBaseUrl = getDocumentServiceUrl()
    console.log('[DrawingApiService] Using base URL:', cachedBaseUrl)
  }
  return cachedBaseUrl
}

export interface CreateDrawingPayload {
  entityType: 'note' | 'document'
  entityId: string
  svgData: string
  strokeData?: {
    points: Array<{ x: number; y: number; pressure: number }>
    color?: string
    width?: number
  }
  width: number
  height: number
  strokeCount?: number
  metadata?: Record<string, unknown>
}

export interface DrawingResponse {
  id: string
  entityType: string
  entityId: string
  svgData: string
  strokeData?: {
    points: Array<{ x: number; y: number; pressure: number }>
    color?: string
    width?: number
  }
  ocrText?: string
  ocrConfidence?: number
  width?: number
  height?: number
  strokeCount?: number
  metadata?: Record<string, unknown>
  createdAt: string
  processedAt?: string
}

export class DrawingApiService {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  /**
   * Create a new drawing and trigger OCR processing
   */
  async createDrawing(payload: CreateDrawingPayload): Promise<DrawingResponse> {
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/drawings`

    console.log('[DrawingApiService] Creating drawing:', { url, payloadSize: JSON.stringify(payload).length })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[DrawingApiService] Create failed:', response.status, errorText)
      throw new Error(`Failed to create drawing: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('[DrawingApiService] Drawing created:', { id: result.id, ocrText: result.ocrText?.slice(0, 50) })
    return result
  }

  /**
   * Get all drawings for a specific entity
   */
  async getDrawingsForEntity(entityType: 'note' | 'document', entityId: string): Promise<DrawingResponse[]> {
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/drawings?entityType=${entityType}&entityId=${entityId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get drawings: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get a single drawing by ID
   */
  async getDrawing(drawingId: string): Promise<DrawingResponse> {
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/drawings/${drawingId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get drawing: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Manually trigger OCR processing for a drawing
   */
  async triggerOcr(drawingId: string): Promise<DrawingResponse> {
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/drawings/${drawingId}/ocr`

    console.log('[DrawingApiService] Triggering OCR:', { url, drawingId })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[DrawingApiService] OCR trigger failed:', response.status, errorText)
      throw new Error(`Failed to trigger OCR: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('[DrawingApiService] OCR result:', { ocrText: result.ocrText?.slice(0, 100) })
    return result
  }

  /**
   * Search drawings by OCR text
   */
  async searchDrawings(searchText: string): Promise<DrawingResponse[]> {
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/drawings/search?q=${encodeURIComponent(searchText)}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to search drawings: ${response.status}`)
    }

    return response.json()
  }
}
