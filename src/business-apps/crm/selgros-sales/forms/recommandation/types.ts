// Types for Selgros Product Recommendation System

export interface RecommendedProduct {
  id: string
  name: string
  imageUrl: string
  quantity: number // Quantity desired (editable)
  stock?: number // Available stock (read-only, from spreadsheet)
  unitOfMeasure: string
  pricePerUnit: number // Mock price (editable)
  currency: string
  category: string
  brand: string
  sku: string
  isSelected: boolean
  source?: 'recommended' | 'manual' // Track where product came from
}

export interface SimilarIngredient {
  id: string
  name: string
  imageUrl: string
  pricePerUnit: number
  currency: string
  category: string
  brand: string
}

export interface ProductAlternative {
  id: string
  name: string
  imageUrl: string
  pricePerUnit: number
  currency: string
  brand: string
  sku: string
  description?: string
  quantity?: number
  stock?: number
}

export interface RecommandationFormData {
  selectedProducts: RecommendedProduct[]
  clientName?: string
  clientType?: string
}
