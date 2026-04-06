/**
 * Slide Template Types - Define template-related types for the slide editor
 */

import type { SlideData } from '../components/slideElements'
import type { SlideMaster } from './slideMaster'

/**
 * Template category for organization
 */
export type TemplateCategory = 'business' | 'creative' | 'minimal' | 'custom' | 'branded'

/**
 * Slide purpose - semantic meaning of what the slide is for
 */
export type SlidePurpose =
  | 'cover'
  | 'agenda'
  | 'section-divider'
  | 'content'
  | 'key-point'
  | 'bullets'
  | 'two-column'
  | 'image-focus'
  | 'data-viz'
  | 'quote'
  | 'timeline'
  | 'comparison'
  | 'team'
  | 'process'
  | 'conclusion'
  | 'cta'
  | 'thank-you'

/**
 * Position constraints for slide placement in presentation
 */
export type SlidePosition = 'first' | 'early' | 'middle' | 'late' | 'last' | 'any'

/**
 * Content capabilities that a slide template supports
 */
export interface SlideCapabilities {
  title: boolean
  subtitle: boolean
  bullets: boolean
  maxBullets?: number
  image: boolean
  chart: boolean
  table: boolean
  icons: boolean
  multiColumn: boolean
  columnCount?: number
}

/**
 * Metadata for a single slide within a template
 */
export interface SlideTemplateMeta {
  purpose: SlidePurpose
  position: SlidePosition
  capabilities: SlideCapabilities
  maxUsage?: number
  contentHints?: string[]
}

/**
 * Template-level hints for AI generation
 */
export interface TemplateHints {
  recommendedSlideCount?: { min: number; max: number }
  bestFor?: string[]
  tone?: 'professional' | 'creative' | 'minimal' | 'bold'
}

/**
 * Logo position options for branded templates
 */
export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/**
 * Logo size options
 */
export type LogoSize = 'small' | 'medium' | 'large'

/**
 * Brand logo configuration
 */
export interface BrandLogo {
  lightUrl: string
  darkUrl: string
  position: LogoPosition
  size: LogoSize
}

/**
 * Brand color palette
 */
export interface BrandColors {
  primary: string
  secondary: string
  accent: string
  text: string
  mutedText: string
}

/**
 * Brand typography settings
 */
export interface BrandTypography {
  headingFont?: string
  bodyFont?: string
}

/**
 * Brand footer configuration
 */
export interface BrandFooter {
  text: string
  showOnAllSlides: boolean
}

/**
 * Complete brand identity for a company template
 */
export interface BrandIdentity {
  companyName: string
  keywords: string[]
  logo: BrandLogo
  colors: BrandColors
  typography?: BrandTypography
  footer?: BrandFooter
}

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
  isBranded?: boolean
  branding?: BrandIdentity
  hasStructuredMeta?: boolean
}

/**
 * Template metadata stored in contentJson._templateMeta
 */
export interface TemplateMeta {
  isTemplate: boolean
  category: TemplateCategory
  isPublic: boolean
  thumbnailUrl?: string
  isBranded?: boolean
  branding?: BrandIdentity
  slideMeta?: SlideTemplateMeta[]
  templateHints?: TemplateHints
  masters?: SlideMaster[]
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
    masters?: SlideMaster[]
    _templateMeta?: TemplateMeta
  }
  createdAt: string
  updatedAt: string
  createdBy: string
  isPublic: boolean
  isOwner?: boolean
  isBranded?: boolean
  branding?: BrandIdentity
  slideMeta?: SlideTemplateMeta[]
  templateHints?: TemplateHints
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
    _templateMeta?: TemplateMeta
  }
  branding?: BrandIdentity
  slideMeta?: SlideTemplateMeta[]
  templateHints?: TemplateHints
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
    _templateMeta?: TemplateMeta
  }
  branding?: BrandIdentity
  slideMeta?: SlideTemplateMeta[]
  templateHints?: TemplateHints
}

/**
 * Filter options for listing templates
 */
export interface TemplateFilters {
  category?: TemplateCategory
  search?: string
  isPublic?: boolean
  createdBy?: string
  isBranded?: boolean
}
