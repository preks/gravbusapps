/**
 * PDF export utility for slide presentations.
 * Uses html-to-image to capture slides and PDFKit for PDF generation.
 */

import { toPng } from 'html-to-image'
import PDFKitModule from 'pdfkit/js/pdfkit.standalone.js'
import { buildFilename, triggerDownload } from '@/common/utils/excelExportUtils'
import type { SlideData } from '../components/slideElements'
import type { SlideTheme } from '../components/slideThemes'

const SLIDE_WIDTH = 1280
const SLIDE_HEIGHT = 720

// PDF page dimensions in points (1 inch = 72 points)
// US Letter landscape: 11" x 8.5" = 792 x 612 points
const PDF_PAGE_WIDTH = 792
const PDF_PAGE_HEIGHT = 612

export type PdfQuality = 'low' | 'medium' | 'high'
export type SlideRange = 'all' | 'current' | number[]
export type NotesPosition = 'none' | 'separate-page' | 'footer'
export type SlidesPerPage = 1 | 2 | 4 | 6

export interface PdfExportOptions {
  slides: SlideData[]
  theme: SlideTheme
  title: string
  author?: string
  currentSlideIndex?: number
  slideRange: SlideRange
  quality: PdfQuality
  includeNotes: NotesPosition
  includePageNumbers: boolean
  slidesPerPage: SlidesPerPage
  onProgress?: (current: number, total: number) => void
}

const QUALITY_SCALE: Record<PdfQuality, number> = {
  low: 1,
  medium: 2,
  high: 3
}

/**
 * Get slide indices to export based on the range option.
 */
function getSlideIndices(options: PdfExportOptions): number[] {
  const { slides, slideRange, currentSlideIndex } = options

  if (slideRange === 'all') {
    return slides.map((_, index) => index)
  }

  if (slideRange === 'current') {
    return currentSlideIndex !== undefined ? [currentSlideIndex] : [0]
  }

  return slideRange.filter(index => index >= 0 && index < slides.length)
}

/**
 * Capture a slide element as a PNG data URL.
 */
async function captureSlide(slideElement: HTMLElement, quality: PdfQuality): Promise<string> {
  const scale = QUALITY_SCALE[quality]

  const dataUrl = await toPng(slideElement, {
    width: SLIDE_WIDTH * scale,
    height: SLIDE_HEIGHT * scale,
    pixelRatio: scale,
    cacheBust: true,
    style: {
      transform: `scale(${scale})`,
      transformOrigin: 'top left'
    }
  })

  return dataUrl
}

/**
 * Calculate layout for multiple slides per page.
 */
function calculateSlideLayout(
  slidesPerPage: SlidesPerPage,
  pageWidth: number,
  pageHeight: number,
  margin: number
): { width: number; height: number; positions: { x: number; y: number }[] } {
  const availableWidth = pageWidth - margin * 2
  const availableHeight = pageHeight - margin * 2

  switch (slidesPerPage) {
    case 1:
      return {
        width: availableWidth,
        height: availableHeight,
        positions: [{ x: margin, y: margin }]
      }

    case 2: {
      const slideWidth = availableWidth
      const slideHeight = (availableHeight - margin) / 2
      return {
        width: slideWidth,
        height: slideHeight,
        positions: [
          { x: margin, y: margin },
          { x: margin, y: margin + slideHeight + margin }
        ]
      }
    }

    case 4: {
      const slideWidth = (availableWidth - margin) / 2
      const slideHeight = (availableHeight - margin) / 2
      return {
        width: slideWidth,
        height: slideHeight,
        positions: [
          { x: margin, y: margin },
          { x: margin + slideWidth + margin, y: margin },
          { x: margin, y: margin + slideHeight + margin },
          { x: margin + slideWidth + margin, y: margin + slideHeight + margin }
        ]
      }
    }

    case 6: {
      const slideWidth = (availableWidth - margin) / 2
      const slideHeight = (availableHeight - margin * 2) / 3
      return {
        width: slideWidth,
        height: slideHeight,
        positions: [
          { x: margin, y: margin },
          { x: margin + slideWidth + margin, y: margin },
          { x: margin, y: margin + slideHeight + margin },
          { x: margin + slideWidth + margin, y: margin + slideHeight + margin },
          { x: margin, y: margin + (slideHeight + margin) * 2 },
          { x: margin + slideWidth + margin, y: margin + (slideHeight + margin) * 2 }
        ]
      }
    }

    default:
      return {
        width: availableWidth,
        height: availableHeight,
        positions: [{ x: margin, y: margin }]
      }
  }
}

/**
 * Main PDF export function.
 */
export async function exportToPdf(options: PdfExportOptions, renderContainer: HTMLElement): Promise<void> {
  const {
    slides,
    title,
    author = 'NEWWORK',
    quality,
    includeNotes,
    includePageNumbers,
    slidesPerPage,
    onProgress
  } = options

  const slideIndices = getSlideIndices(options)
  const totalSlides = slideIndices.length

  if (totalSlides === 0) {
    throw new Error('No slides to export')
  }

  // Initialize PDFKit
  const globalShim = globalThis as unknown as { global?: unknown }
  if (globalShim.global === undefined) {
    globalShim.global = globalShim
  }

  const PDFDocument = (PDFKitModule as { default?: new (...args: unknown[]) => unknown }).default
  const PdfCtor = PDFDocument ?? (PDFKitModule as unknown as new (...args: unknown[]) => unknown)

  const doc = new (PdfCtor as any)({
    size: [PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT],
    margin: 0,
    info: {
      Title: title,
      Author: author,
      Creator: 'NEWWORK Slides',
      Producer: 'PDFKit'
    }
  })

  // Collect PDF chunks
  const chunks: Uint8Array[] = []
  doc.on('data', (chunk: unknown) => chunks.push(chunk as Uint8Array))

  const resultPromise = new Promise<void>((resolve, reject) => {
    doc.on('end', () => {
      try {
        const total = chunks.reduce((acc, c) => acc + c.length, 0)
        const out = new Uint8Array(total)
        let offset = 0
        for (const c of chunks) {
          out.set(c, offset)
          offset += c.length
        }
        const blob = new Blob([out], { type: 'application/pdf' })
        const filename = buildFilename(title.trim().split(/\s+/).join('-'), 'pdf')
        triggerDownload(blob, filename)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
    doc.on('error', reject)
  })

  const margin = 36
  const layout = calculateSlideLayout(slidesPerPage, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, margin)

  // Find all slide elements in the render container
  const slideElements = renderContainer.querySelectorAll<HTMLElement>('[data-export-slide]')

  let currentPage = 0
  let slideOnPage = 0

  for (let i = 0; i < slideIndices.length; i++) {
    const slideIndex = slideIndices[i]
    const slide = slides[slideIndex]

    onProgress?.(i + 1, totalSlides)

    // Find the corresponding rendered slide element
    const slideElement = slideElements[i]
    if (!slideElement) {
      console.warn(`[pdfExport] Slide element not found for index ${slideIndex}`)
      continue
    }

    // Capture slide as image
    const imageData = await captureSlide(slideElement, quality)

    // Start a new page if needed
    if (slideOnPage === 0 && currentPage > 0) {
      doc.addPage()
    }

    // Add slide image to PDF
    const pos = layout.positions[slideOnPage]
    const aspectRatio = SLIDE_WIDTH / SLIDE_HEIGHT
    let imgWidth = layout.width
    let imgHeight = imgWidth / aspectRatio

    if (imgHeight > layout.height) {
      imgHeight = layout.height
      imgWidth = imgHeight * aspectRatio
    }

    const imgX = pos.x + (layout.width - imgWidth) / 2
    const imgY = pos.y + (layout.height - imgHeight) / 2

    doc.image(imageData, imgX, imgY, {
      width: imgWidth,
      height: imgHeight
    })

    // Add page number if enabled (only on last slide of each page or single slide per page)
    if (
      includePageNumbers &&
      (slidesPerPage === 1 || slideOnPage === slidesPerPage - 1 || i === slideIndices.length - 1)
    ) {
      const pageNum = currentPage + 1
      const totalPages = Math.ceil(totalSlides / slidesPerPage)
      doc.fontSize(10).fillColor('#666666')
      doc.text(`${pageNum} / ${totalPages}`, 0, PDF_PAGE_HEIGHT - 24, {
        align: 'center',
        width: PDF_PAGE_WIDTH
      })
    }

    slideOnPage++

    // Handle notes on separate page
    if (includeNotes === 'separate-page' && slide.notes && slide.notes.trim()) {
      doc.addPage()
      doc.fontSize(14).fillColor('#333333')
      doc.text(`Slide ${slideIndex + 1} - Notes`, margin, margin)
      doc.moveDown()
      doc.fontSize(11).fillColor('#444444')
      doc.text(slide.notes, margin, doc.y, {
        width: PDF_PAGE_WIDTH - margin * 2,
        align: 'left'
      })

      if (includePageNumbers) {
        const pageNum = currentPage + 2
        const totalPages = Math.ceil(totalSlides / slidesPerPage) + totalSlides
        doc.fontSize(10).fillColor('#666666')
        doc.text(`${pageNum} / ${totalPages}`, 0, PDF_PAGE_HEIGHT - 24, {
          align: 'center',
          width: PDF_PAGE_WIDTH
        })
      }

      currentPage++
      slideOnPage = 0
    }

    // Move to next page if current page is full
    if (slideOnPage >= slidesPerPage) {
      currentPage++
      slideOnPage = 0
    }
  }

  doc.end()
  return resultPromise
}

/**
 * Default export options.
 */
export const defaultPdfExportOptions: Omit<PdfExportOptions, 'slides' | 'theme' | 'title'> = {
  slideRange: 'all',
  quality: 'medium',
  includeNotes: 'none',
  includePageNumbers: true,
  slidesPerPage: 1
}
