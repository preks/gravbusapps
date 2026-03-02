/**
 * Slide Template Types - Define template-related types for the slide editor
 */

import type { SlideData } from '../components/slideElements'

/**
 * Template category for organization
 */
export type TemplateCategory = 'business' | 'creative' | 'minimal' | 'custom'

/**
 * Template summary for list/grid views
 */
export interface SlideTemplateSummary {
  id: string
  name: string
  description?: string
  category: TemplateCategory
  thumbnailUrl?: string
  slideCount: number
  createdAt: string
  updatedAt: string
  createdBy: string
  isPublic: boolean
  isOwner?: boolean
}

/**
 * Full template data including slide content
 */
export interface SlideTemplate {
  id: string
  name: string
  description?: string
  category: TemplateCategory
  thumbnailUrl?: string
  contentJson: {
    slides: SlideData[]
    themeId: string
  }
  createdAt: string
  updatedAt: string
  createdBy: string
  isPublic: boolean
  isOwner?: boolean
}

/**
 * Request payload for creating a new template
 */
export interface CreateTemplateRequest {
  name: string
  description?: string
  category: TemplateCategory
  isPublic: boolean
  contentJson: {
    slides: SlideData[]
    themeId: string
  }
}

/**
 * Request payload for updating a template
 */
export interface UpdateTemplateRequest {
  name?: string
  description?: string
  category?: TemplateCategory
  isPublic?: boolean
  contentJson?: {
    slides: SlideData[]
    themeId: string
  }
}

/**
 * Filter options for listing templates
 */
export interface TemplateFilters {
  category?: TemplateCategory
  search?: string
  isPublic?: boolean
  createdBy?: string
}
