// Recommendation API helpers for Selgros Product Recommendation System

import { ProductAlternative, RecommendedProduct } from './types'

export interface ExtractMenuRecommendationsParams {
  accessToken: string
  pdfFile: File
  llmModel?: string
  scoreThreshold?: number
}

interface ExtractedMenuProduct {
  id: string
  articol?: string
  name: string
  category: string
  quantity?: number
  score?: number
  price_eur?: number
  stock?: number
}

interface ExtractedMenuResponse {
  menu_items?: string[]
  products_by_category?: Record<string, ExtractedMenuProduct[]>
}

const EXTRACT_MENU_API_URL = 'https://pourable-aja-uninterpretively.ngrok-free.dev/flowbot/api/agent/v2/extract-items'
const FLOWBOT_API_BASE_URL = 'https://pourable-aja-uninterpretively.ngrok-free.dev/flowbot/api'
const AVAILABLE_PRODUCTS_LIMIT = 20
const NGROK_SKIP_WARNING_VALUE = '1'

const parseNumber = (value: string | number | undefined, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(',', '.'))
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const parseJsonResponse = async <T>(response: Response, context: string): Promise<T> => {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(`${context} returned an unexpected response format`)
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new Error(`${context} returned invalid JSON`)
  }
}

const withNgrokSkipWarning = (url: string): string => {
  const parsed = new URL(url)
  parsed.searchParams.set('ngrok-skip-browser-warning', NGROK_SKIP_WARNING_VALUE)
  return parsed.toString()
}

export interface ExtractMenuRecommendationsResult {
  recommended: RecommendedProduct[]
  alternativesByCategory: Record<string, ProductAlternative[]>
}

interface FlowbotProduct {
  id: string
  articol?: string
  descriere_articol?: string
  stoc_disponibil?: string | number
  uv_de_baza?: string
  grup_marfa?: string
  nume_magazin?: string
  tip_material?: string
  category?: string
  price_eur?: string | number
}

interface FlowbotProductsResponse {
  products?: FlowbotProduct[]
}

const mapExtractedProductToRecommendation = (product: ExtractedMenuProduct): RecommendedProduct => {
  // Set stock to 0 for testing product with articol = "169509"
  const stock = product.articol === '169509' ? 0 : (product.stock ?? 0)
  const quantity = product.quantity ?? 1

  // Auto-deselect products that exceed stock or have no stock
  const isSelected = stock > 0 && quantity <= stock

  return {
    id: product.id,
    name: product.name,
    imageUrl: '',
    quantity: quantity,
    stock: stock,
    unitOfMeasure: 'unit',
    pricePerUnit: product.price_eur ?? 0,
    currency: 'EUR',
    category: product.category,
    brand: 'AI',
    sku: product.articol || product.id,
    isSelected: isSelected,
    source: 'recommended'
  }
}

const mapExtractedProductToAlternative = (product: ExtractedMenuProduct): ProductAlternative => ({
  id: product.id,
  name: product.name,
  imageUrl: '',
  pricePerUnit: product.price_eur ?? 0,
  currency: 'EUR',
  brand: 'AI',
  sku: product.articol || product.id,
  description: product.score ? `Score: ${product.score.toFixed(2)}` : undefined,
  quantity: product.quantity,
  stock: product.stock
})

export const extractMenuRecommendations = async ({
  accessToken,
  pdfFile,
  llmModel = 'gpt-4.1',
  scoreThreshold = 0.62
}: ExtractMenuRecommendationsParams): Promise<ExtractMenuRecommendationsResult> => {
  if (!accessToken) {
    throw new Error('Access token missing')
  }

  if (!pdfFile) {
    throw new Error('PDF file missing')
  }

  const formData = new FormData()
  formData.append('pdf_file', pdfFile)
  formData.append('pdf_url', '')
  formData.append('llm_model', llmModel)
  formData.append('score_threshold', String(scoreThreshold))

  const response = await fetch(withNgrokSkipWarning(EXTRACT_MENU_API_URL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
      'ngrok-skip-browser-warning': NGROK_SKIP_WARNING_VALUE
    },
    body: formData
  })

  if (!response.ok) {
    throw new Error('Failed to extract menu items')
  }

  const payload = (await response.json()) as ExtractedMenuResponse
  const byCategory = payload.products_by_category || {}

  const recommended: RecommendedProduct[] = []
  const alternativesByCategory: Record<string, ProductAlternative[]> = {}

  Object.entries(byCategory).forEach(([category, products]) => {
    if (!Array.isArray(products) || products.length === 0) return

    const normalized = products.map(product => ({ ...product, category }))
    const [first, ...rest] = normalized

    if (first) {
      recommended.push(mapExtractedProductToRecommendation(first))
    }

    alternativesByCategory[category] = rest.map(mapExtractedProductToAlternative)
  })

  return { recommended, alternativesByCategory }
}

const mapFlowbotProduct = (product: FlowbotProduct): RecommendedProduct | null => {
  const sku = product.articol?.trim()
  const name = product.descriere_articol?.trim()

  if (!sku || !name) return null

  return {
    id: product.id,
    name,
    imageUrl: '',
    quantity: 1,
    stock: parseNumber(product.stoc_disponibil, 0),
    unitOfMeasure: product.uv_de_baza?.trim() || 'BUC',
    pricePerUnit: parseNumber(product.price_eur, 0),
    currency: 'EUR',
    category: product.category?.trim() || product.grup_marfa?.trim() || 'General',
    brand: product.nume_magazin?.trim() || product.tip_material?.trim() || 'ACME',
    sku,
    isSelected: false,
    source: 'manual'
  }
}

export interface FetchAvailableProductsParams {
  accessToken: string
}

export const fetchAvailableProducts = async ({
  accessToken
}: FetchAvailableProductsParams): Promise<RecommendedProduct[]> => {
  if (!accessToken) {
    throw new Error('Access token missing')
  }

  const url = withNgrokSkipWarning(`${FLOWBOT_API_BASE_URL}/products?limit=${AVAILABLE_PRODUCTS_LIMIT}&offset=0`)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      accept: 'application/json',
      'ngrok-skip-browser-warning': NGROK_SKIP_WARNING_VALUE
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch available products')
  }
  const payload = await parseJsonResponse<FlowbotProductsResponse>(response, 'Products list API')
  const products = Array.isArray(payload.products) ? payload.products : []

  return products
    .map(mapFlowbotProduct)
    .filter((item): item is RecommendedProduct => Boolean(item))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export interface SearchAvailableProductsParams {
  accessToken: string
  query: string
}

export const searchAvailableProducts = async ({
  accessToken,
  query
}: SearchAvailableProductsParams): Promise<RecommendedProduct[]> => {
  if (!accessToken) {
    throw new Error('Access token missing')
  }

  if (!query.trim()) {
    return []
  }

  const url = withNgrokSkipWarning(
    `${FLOWBOT_API_BASE_URL}/products/search?q=${encodeURIComponent(query)}&limit=${AVAILABLE_PRODUCTS_LIMIT}`
  )

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
      'ngrok-skip-browser-warning': NGROK_SKIP_WARNING_VALUE
    }
  })

  if (!response.ok) {
    throw new Error('Failed to search available products')
  }

  const payload = await parseJsonResponse<FlowbotProductsResponse>(response, 'Products search API')
  const products = Array.isArray(payload.products) ? payload.products : []

  return products
    .map(mapFlowbotProduct)
    .filter((item): item is RecommendedProduct => Boolean(item))
    .sort((a, b) => a.name.localeCompare(b.name))
}
