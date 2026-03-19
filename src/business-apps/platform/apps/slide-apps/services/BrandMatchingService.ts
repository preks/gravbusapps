/**
 * Brand Matching Service - Keyword-based company detection for branded templates
 */

import type { SlideTemplate, BrandIdentity, BrandColors } from '../types/template'

/**
 * Result of a brand match operation
 */
export interface BrandMatch {
  templateId: string
  companyName: string
  confidence: number
  matchedKeywords: string[]
  branding: BrandIdentity
}

/**
 * Options for brand matching
 */
export interface BrandMatchOptions {
  minConfidence?: number
  caseSensitive?: boolean
}

const DEFAULT_OPTIONS: BrandMatchOptions = {
  minConfidence: 0.1,
  caseSensitive: false
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string, caseSensitive: boolean): string {
  return caseSensitive ? text.trim() : text.toLowerCase().trim()
}

/**
 * Check if a keyword matches in the topic
 */
function keywordMatches(topic: string, keyword: string, caseSensitive: boolean): boolean {
  const normalizedKeyword = normalizeText(keyword, caseSensitive)

  if (normalizedKeyword.length === 0) return false

  // Check for word boundary match to avoid partial matches
  const wordBoundaryRegex = new RegExp(`\\b${escapeRegExp(normalizedKeyword)}\\b`, caseSensitive ? '' : 'i')

  return wordBoundaryRegex.test(topic)
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Calculate match confidence based on keyword matches
 */
function calculateConfidence(matchedKeywords: string[], totalKeywords: number): number {
  if (totalKeywords === 0) return 0

  // Base confidence from keyword ratio
  const baseConfidence = matchedKeywords.length / totalKeywords

  // Boost confidence for exact company name matches (longer keywords)
  const longestMatch = Math.max(...matchedKeywords.map(k => k.length))
  const lengthBonus = Math.min(longestMatch / 20, 0.2)

  // Boost for multiple keyword matches
  const multiMatchBonus = matchedKeywords.length > 1 ? 0.1 : 0

  return Math.min(baseConfidence + lengthBonus + multiMatchBonus, 1.0)
}

/**
 * Find branded templates that match the given topic
 */
export function findBrandedTemplate(
  topic: string,
  templates: SlideTemplate[],
  options: BrandMatchOptions = {}
): BrandMatch | null {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  if (!topic || topic.trim().length === 0) {
    return null
  }

  const matches: BrandMatch[] = []

  for (const template of templates) {
    const branding = template.branding || template.contentJson?._templateMeta?.branding
    if (!branding?.keywords || branding.keywords.length === 0) {
      continue
    }

    const matchedKeywords = branding.keywords.filter(keyword =>
      keywordMatches(topic, keyword, opts.caseSensitive ?? false)
    )

    if (matchedKeywords.length > 0) {
      const confidence = calculateConfidence(matchedKeywords, branding.keywords.length)

      if (confidence >= (opts.minConfidence ?? 0.1)) {
        matches.push({
          templateId: template.id,
          companyName: branding.companyName,
          confidence,
          matchedKeywords,
          branding
        })
      }
    }
  }

  if (matches.length === 0) {
    return null
  }

  // Sort by confidence (descending) and return the best match
  matches.sort((a, b) => b.confidence - a.confidence)
  return matches[0]
}

/**
 * Find all branded templates that match the given topic
 */
export function findAllBrandMatches(
  topic: string,
  templates: SlideTemplate[],
  options: BrandMatchOptions = {}
): BrandMatch[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  if (!topic || topic.trim().length === 0) {
    return []
  }

  const matches: BrandMatch[] = []

  for (const template of templates) {
    const branding = template.branding || template.contentJson?._templateMeta?.branding
    if (!branding?.keywords || branding.keywords.length === 0) {
      continue
    }

    const matchedKeywords = branding.keywords.filter(keyword =>
      keywordMatches(topic, keyword, opts.caseSensitive ?? false)
    )

    if (matchedKeywords.length > 0) {
      const confidence = calculateConfidence(matchedKeywords, branding.keywords.length)

      if (confidence >= (opts.minConfidence ?? 0.1)) {
        matches.push({
          templateId: template.id,
          companyName: branding.companyName,
          confidence,
          matchedKeywords,
          branding
        })
      }
    }
  }

  // Sort by confidence (descending)
  matches.sort((a, b) => b.confidence - a.confidence)
  return matches
}

/**
 * Check if a template has valid branding configuration
 */
export function isValidBrandedTemplate(template: SlideTemplate): boolean {
  const branding = template.branding || template.contentJson?._templateMeta?.branding
  if (!branding) return false

  return (
    typeof branding.companyName === 'string' &&
    branding.companyName.length > 0 &&
    Array.isArray(branding.keywords) &&
    branding.keywords.length > 0 &&
    branding.logo != null &&
    typeof branding.logo.lightUrl === 'string' &&
    typeof branding.logo.darkUrl === 'string' &&
    branding.colors != null &&
    typeof branding.colors.primary === 'string'
  )
}

/**
 * Filter templates to only branded ones
 */
export function filterBrandedTemplates(templates: SlideTemplate[]): SlideTemplate[] {
  return templates.filter(template => {
    const branding = template.branding || template.contentJson?._templateMeta?.branding
    return branding?.keywords && branding.keywords.length > 0
  })
}

/**
 * Get brand colors with fallbacks
 */
export function getBrandColorsWithFallbacks(branding: BrandIdentity): BrandColors {
  return {
    primary: branding.colors?.primary || '#e91e8c',
    secondary: branding.colors?.secondary || '#1a1a2e',
    accent: branding.colors?.accent || '#00d4aa',
    text: branding.colors?.text || '#ffffff',
    mutedText: branding.colors?.mutedText || 'rgba(255,255,255,0.7)'
  }
}

/**
 * Get logo URL based on background darkness
 */
export function getLogoUrlForBackground(branding: BrandIdentity, isDarkBackground: boolean): string {
  return isDarkBackground ? branding.logo.lightUrl : branding.logo.darkUrl
}
