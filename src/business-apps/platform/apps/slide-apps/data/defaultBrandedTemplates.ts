/**
 * Default Branded Templates
 *
 * Pre-configured branded templates for common companies.
 * These templates can be used as reference implementations
 * or seeded into the database.
 */

import type { BrandIdentity, SlideTemplate, SlideTemplateMeta, TemplateHints } from '../types/template'
import type { SlideData } from '../components/slideElements'
import { getBrandedBackground } from '../components/slideElements'

/**
 * NEWWORK template slide metadata
 */
const NEWWORK_SLIDE_META: SlideTemplateMeta[] = [
  {
    purpose: 'cover',
    position: 'first',
    capabilities: {
      title: true,
      subtitle: true,
      bullets: false,
      image: false,
      chart: false,
      table: false,
      icons: false,
      multiColumn: false
    },
    maxUsage: 1,
    contentHints: ['presentation title', 'subtitle', 'date', 'company name']
  },
  {
    purpose: 'agenda',
    position: 'early',
    capabilities: {
      title: true,
      subtitle: false,
      bullets: true,
      maxBullets: 6,
      image: false,
      chart: false,
      table: false,
      icons: false,
      multiColumn: false
    },
    maxUsage: 1,
    contentHints: ['agenda items', 'overview', 'table of contents']
  },
  {
    purpose: 'content',
    position: 'any',
    capabilities: {
      title: true,
      subtitle: false,
      bullets: true,
      maxBullets: 8,
      image: true,
      chart: false,
      table: false,
      icons: false,
      multiColumn: false
    },
    contentHints: ['main content', 'body text', 'details']
  },
  {
    purpose: 'thank-you',
    position: 'last',
    capabilities: {
      title: true,
      subtitle: true,
      bullets: false,
      image: false,
      chart: false,
      table: false,
      icons: false,
      multiColumn: false
    },
    maxUsage: 1,
    contentHints: ['thank you', 'closing', 'contact information']
  }
]

/**
 * NEWWORK template hints
 */
const NEWWORK_TEMPLATE_HINTS: TemplateHints = {
  recommendedSlideCount: { min: 5, max: 15 },
  bestFor: ['corporate presentations', 'product demos', 'company overviews', 'sales pitches'],
  tone: 'professional'
}

/**
 * NEWWORK brand identity configuration
 */
export const NEWWORK_BRAND_IDENTITY: BrandIdentity = {
  companyName: 'NEWWORK',
  keywords: [
    'NEWWORK',
    'newwork',
    'NW Software',
    'EveryOffice',
    'NW EveryOffice',
    'NEWWORK Software',
    'NEWWORK GmbH',
    'NEWWORK Software GmbH'
  ],
  logo: {
    lightUrl: '/assets/newwork-logo-white.svg',
    darkUrl: '/assets/newwork-logo-dark.svg',
    position: 'top-right',
    size: 'medium'
  },
  colors: {
    primary: '#e91e8c',
    secondary: '#1a1a2e',
    accent: '#00d4aa',
    text: '#ffffff',
    mutedText: 'rgba(255,255,255,0.7)'
  },
  typography: {
    headingFont: 'Inter, system-ui, sans-serif',
    bodyFont: 'Inter, system-ui, sans-serif'
  },
  footer: {
    text: '© 2026 NEWWORK Software GmbH',
    showOnAllSlides: true
  }
}

/**
 * Generate NEWWORK branded cover slide
 */
function createNewworkCoverSlide(): SlideData {
  return {
    id: 'newwork-cover-1',
    background: getBrandedBackground('newwork-dark'),
    elements: [
      {
        id: 'cover-title',
        type: 'text',
        content: '[Presentation Title]',
        position: { x: 100, y: 250 },
        size: { width: 1080, height: 100 },
        color: '#ffffff',
        fontSize: '56px',
        fontWeight: 'bold',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        zIndex: 2
      },
      {
        id: 'cover-subtitle',
        type: 'text',
        content: '[Subtitle or Date]',
        position: { x: 100, y: 360 },
        size: { width: 1080, height: 50 },
        color: 'rgba(255,255,255,0.7)',
        fontSize: '24px',
        fontWeight: 'normal',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        zIndex: 2
      },
      {
        id: 'cover-company',
        type: 'text',
        content: 'NEWWORK Software GmbH',
        position: { x: 100, y: 600 },
        size: { width: 400, height: 40 },
        color: '#e91e8c',
        fontSize: '20px',
        fontWeight: '600',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        zIndex: 2
      }
    ]
  }
}

/**
 * Generate NEWWORK branded agenda slide
 */
function createNewworkAgendaSlide(): SlideData {
  return {
    id: 'newwork-agenda-1',
    background: getBrandedBackground('newwork-dark'),
    elements: [
      {
        id: 'agenda-title',
        type: 'text',
        content: 'Agenda',
        position: { x: 100, y: 80 },
        size: { width: 400, height: 60 },
        color: '#ffffff',
        fontSize: '40px',
        fontWeight: 'bold',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        zIndex: 2
      },
      {
        id: 'agenda-item-1',
        type: 'text',
        content: '1. [Agenda Item 1]',
        position: { x: 100, y: 200 },
        size: { width: 800, height: 50 },
        color: '#ffffff',
        fontSize: '24px',
        fontWeight: 'normal',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        zIndex: 2
      },
      {
        id: 'agenda-item-2',
        type: 'text',
        content: '2. [Agenda Item 2]',
        position: { x: 100, y: 270 },
        size: { width: 800, height: 50 },
        color: '#ffffff',
        fontSize: '24px',
        fontWeight: 'normal',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        zIndex: 2
      },
      {
        id: 'agenda-item-3',
        type: 'text',
        content: '3. [Agenda Item 3]',
        position: { x: 100, y: 340 },
        size: { width: 800, height: 50 },
        color: '#ffffff',
        fontSize: '24px',
        fontWeight: 'normal',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        zIndex: 2
      },
      {
        id: 'agenda-item-4',
        type: 'text',
        content: '4. [Agenda Item 4]',
        position: { x: 100, y: 410 },
        size: { width: 800, height: 50 },
        color: '#ffffff',
        fontSize: '24px',
        fontWeight: 'normal',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        zIndex: 2
      }
    ]
  }
}

/**
 * Generate NEWWORK branded content slide
 */
function createNewworkContentSlide(): SlideData {
  return {
    id: 'newwork-content-1',
    background: getBrandedBackground('newwork-dark'),
    elements: [
      {
        id: 'content-title',
        type: 'text',
        content: '[Section Title]',
        position: { x: 100, y: 80 },
        size: { width: 1000, height: 60 },
        color: '#ffffff',
        fontSize: '36px',
        fontWeight: 'bold',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        zIndex: 2
      },
      {
        id: 'content-body',
        type: 'text',
        content: '[Add your content here...]',
        position: { x: 100, y: 180 },
        size: { width: 1080, height: 400 },
        color: 'rgba(255,255,255,0.9)',
        fontSize: '20px',
        fontWeight: 'normal',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        lineHeight: 1.6,
        zIndex: 2
      }
    ]
  }
}

/**
 * Generate NEWWORK branded closing slide
 */
function createNewworkClosingSlide(): SlideData {
  return {
    id: 'newwork-closing-1',
    background: getBrandedBackground('newwork-dark'),
    elements: [
      {
        id: 'closing-title',
        type: 'text',
        content: 'Thank You',
        position: { x: 100, y: 280 },
        size: { width: 1080, height: 80 },
        color: '#ffffff',
        fontSize: '56px',
        fontWeight: 'bold',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
        zIndex: 2
      },
      {
        id: 'closing-contact',
        type: 'text',
        content: 'www.newwork.io | contact@newwork.io',
        position: { x: 100, y: 400 },
        size: { width: 1080, height: 40 },
        color: 'rgba(255,255,255,0.7)',
        fontSize: '20px',
        fontWeight: 'normal',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
        zIndex: 2
      },
      {
        id: 'closing-company',
        type: 'text',
        content: 'NEWWORK Software GmbH',
        position: { x: 100, y: 600 },
        size: { width: 1080, height: 40 },
        color: '#e91e8c',
        fontSize: '18px',
        fontWeight: '600',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
        zIndex: 2
      }
    ]
  }
}

/**
 * Complete NEWWORK branded template
 */
export const NEWWORK_BRANDED_TEMPLATE: Partial<SlideTemplate> = {
  name: 'NEWWORK Corporate',
  description: 'Official NEWWORK branded presentation template with dark theme and professional styling',
  category: 'branded',
  isPublic: true,
  isBranded: true,
  branding: NEWWORK_BRAND_IDENTITY,
  slideMeta: NEWWORK_SLIDE_META,
  templateHints: NEWWORK_TEMPLATE_HINTS,
  contentJson: {
    slides: [
      createNewworkCoverSlide(),
      createNewworkAgendaSlide(),
      createNewworkContentSlide(),
      createNewworkClosingSlide()
    ],
    themeId: 'newwork-dark',
    _templateMeta: {
      isTemplate: true,
      category: 'branded',
      isPublic: true,
      isBranded: true,
      branding: NEWWORK_BRAND_IDENTITY,
      slideMeta: NEWWORK_SLIDE_META,
      templateHints: NEWWORK_TEMPLATE_HINTS
    }
  }
}

/**
 * All default branded templates
 */
export const DEFAULT_BRANDED_TEMPLATES: Partial<SlideTemplate>[] = [NEWWORK_BRANDED_TEMPLATE]

/**
 * Get branded template by company name
 */
export function getDefaultBrandedTemplate(companyName: string): Partial<SlideTemplate> | undefined {
  return DEFAULT_BRANDED_TEMPLATES.find(
    template => template.branding?.companyName.toLowerCase() === companyName.toLowerCase()
  )
}

/**
 * Check if a keyword matches any default branded template
 */
export function findDefaultBrandByKeyword(keyword: string): BrandIdentity | undefined {
  const lowercaseKeyword = keyword.toLowerCase()

  for (const template of DEFAULT_BRANDED_TEMPLATES) {
    if (template.branding?.keywords.some(k => lowercaseKeyword.includes(k.toLowerCase()))) {
      return template.branding
    }
  }

  return undefined
}
